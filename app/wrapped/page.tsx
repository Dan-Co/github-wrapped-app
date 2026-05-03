'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import type { CSSProperties } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { gsap } from 'gsap'
import type { AnalyzedRepository, DevelopmentMode, RepoPreference, CustomGroup } from '@/types'
import {
  loadPreferences,
  savePreferences,
  getDefaultMode,
  setDefaultMode,
  getRepoPreference,
  setRepoPreference,
  addDeploymentUrl,
  removeDeploymentUrl,
  getCustomGroups,
  createCustomGroup,
  markRepoScanned,
} from '@/utils/preferences'
import { generateInteractiveHTML, downloadHTML } from '@/utils/exportHTML'
import ApiKeyModal from '@/components/ApiKeyModal'
import styles from './wrapped.module.css'

// Helper to get stored OpenAI API key
function getStoredApiKey(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('openai_api_key')
}

// Helper to get headers with optional API key
function getAIHeaders(): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  const apiKey = getStoredApiKey()
  if (apiKey) {
    headers['x-openai-key'] = apiKey
  }
  return headers
}

interface RepositoryGroup {
  name: string
  icon: string
  description: string
  repos: string[]
}

interface FeaturedProject {
  repoName: string
  category: string
  categoryIcon: string
  headline: string
  description: string
  color: string
}

interface YearNarrative {
  title: string
  intro: string
  context?: string
}

interface AIInsights {
  headline: string
  description: string
  toolsUsed?: string[]  // Tools detected from commit analysis
  whatChanged: string[]
  honestTake: string[]
}

interface Achievement {
  icon: string
  title: string
  description: string
}

interface DetectedStats {
  totalCopilotCommits: number
  totalBotCommits: number
  totalCoAuthoredWithCopilot: number
  aiAssistedPercentage: number
  orgRepos: number
  personalRepos: number
  // User-reported stats
  userReportedAiRepos?: number
  userReportedManualRepos?: number
  userReportedAiPercentage?: number | null
}

interface DevelopmentPattern {
  type: 'work' | 'personal' | 'mixed'
  aiAssisted: boolean
  scale: 'small' | 'medium' | 'large'
}

function getHeatLevel(count: number): string {
  if (count === 0) return ''
  if (count < 3) return styles.level1
  if (count < 6) return styles.level2
  if (count < 10) return styles.level3
  return styles.level4
}

const LANGUAGE_ACCENTS: Record<string, string> = {
  typescript: '#3178c6',
  javascript: '#f7df1e',
  python: '#3572a5',
  css: '#563d7c',
  html: '#e34c26',
  go: '#00add8',
  rust: '#dea584',
  java: '#b07219',
}

function getLanguageAccent(language?: string | null): string {
  if (!language) return '#00fff9'
  return LANGUAGE_ACCENTS[language.toLowerCase()] || '#00b8ff'
}

function formatAnimatedNumber(value: number, decimals = 0): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function AnimatedNumber({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  className,
}: {
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!ref.current) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      ref.current.textContent = `${prefix}${formatAnimatedNumber(value, decimals)}${suffix}`
      return
    }

    const state = { value: 0 }
    const tween = gsap.to(state, {
      value,
      duration: 1.25,
      ease: 'power3.out',
      onUpdate: () => {
        if (ref.current) {
          ref.current.textContent = `${prefix}${formatAnimatedNumber(state.value, decimals)}${suffix}`
        }
      },
    })

    return () => {
      tween.kill()
    }
  }, [decimals, prefix, suffix, value])

  return <span ref={ref} className={className}>{prefix}{formatAnimatedNumber(value, decimals)}{suffix}</span>
}

export default function WrappedPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pageRef = useRef<HTMLElement>(null)
  const [repositories, setRepositories] = useState<AnalyzedRepository[]>([])
  const [repositoryGroups, setRepositoryGroups] = useState<RepositoryGroup[]>([])
  const [featuredProjects, setFeaturedProjects] = useState<FeaturedProject[]>([])
  const [yearNarrative, setYearNarrative] = useState<YearNarrative | null>(null)
  const [aiInsights, setAiInsights] = useState<AIInsights | null>(null)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [detectedStats, setDetectedStats] = useState<DetectedStats | null>(null)
  const [developmentPattern, setDevelopmentPattern] = useState<DevelopmentPattern | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedRepo, setSelectedRepo] = useState<AnalyzedRepository | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // Contribution calendar data (from GitHub profile)
  const [contributionData, setContributionData] = useState<{
    year: number
    totalContributions: number
    activeDays: number
    weeks: Array<{ contributionDays: Array<{ contributionCount: number; date: string }> }>
  } | null>(null)
  
  // Self-reporting state
  const [developmentMode, setDevelopmentMode] = useState<DevelopmentMode>('mixed')
  const [showModeSelector, setShowModeSelector] = useState(false)
  const [repoPreferences, setRepoPreferences] = useState<Record<string, RepoPreference>>({})
  const [customGroups, setCustomGroups] = useState<Record<string, CustomGroup>>({})
  
  // Editing modal state
  const [editingRepo, setEditingRepo] = useState<AnalyzedRepository | null>(null)
  const [editAiAssisted, setEditAiAssisted] = useState(false)
  const [editNarrative, setEditNarrative] = useState('')
  const [editGroup, setEditGroup] = useState('')
  const [editUrls, setEditUrls] = useState<Array<{url: string; label: string; autoDetected: boolean}>>([])
  const [newUrl, setNewUrl] = useState('')
  const [showNewGroupModal, setShowNewGroupModal] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupIcon, setNewGroupIcon] = useState('📁')
  
  // Rescan state
  const [rescanningRepo, setRescanningRepo] = useState<string | null>(null)
  
  // API Key modal state
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)

  useEffect(() => {
    if (isLoading || !pageRef.current) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        '[data-animate="card"]',
        { autoAlpha: 0, y: 28, scale: 0.98 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.65, stagger: 0.06, ease: 'power3.out' }
      )
    }, pageRef)

    return () => ctx.revert()
  }, [activeTab, isLoading])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
      return
    }
    
    // Load all data from localStorage
    const storedRepos = localStorage.getItem('analyzedRepositories')
    const storedGroups = localStorage.getItem('repositoryGroups')
    const storedFeatured = localStorage.getItem('featuredProjects')
    const storedNarrative = localStorage.getItem('yearNarrative')
    const storedAiInsights = localStorage.getItem('aiInsights')
    const storedAchievements = localStorage.getItem('achievements')
    const storedDetectedStats = localStorage.getItem('detectedStats')
    const storedDevPattern = localStorage.getItem('developmentPattern')
    
    if (storedRepos) setRepositories(JSON.parse(storedRepos))
    if (storedGroups) setRepositoryGroups(JSON.parse(storedGroups))
    if (storedFeatured) setFeaturedProjects(JSON.parse(storedFeatured))
    if (storedNarrative) setYearNarrative(JSON.parse(storedNarrative))
    if (storedAiInsights) setAiInsights(JSON.parse(storedAiInsights))
    if (storedAchievements) setAchievements(JSON.parse(storedAchievements))
    if (storedDetectedStats) setDetectedStats(JSON.parse(storedDetectedStats))
    if (storedDevPattern) setDevelopmentPattern(JSON.parse(storedDevPattern))
    
    // Load preferences
    const mode = getDefaultMode()
    setDevelopmentMode(mode)
    
    const prefs = loadPreferences()
    setRepoPreferences(prefs.repos)
    setCustomGroups(getCustomGroups())
    
    // Fetch real contribution data from GitHub profile
    const fetchContributions = async () => {
      try {
        const response = await fetch('/api/github/contributions?year=2025')
        if (response.ok) {
          const data = await response.json()
          setContributionData(data)
          // Cache it for the export
          localStorage.setItem('contributionData', JSON.stringify(data))
        }
      } catch (error) {
        console.error('Failed to fetch contribution data:', error)
        // Try to load from cache
        const cached = localStorage.getItem('contributionData')
        if (cached) {
          setContributionData(JSON.parse(cached))
        }
      }
    }
    
    fetchContributions()
    setIsLoading(false)
  }, [status, router])

  // Handle mode change - clears explicit overrides so all repos inherit from global
  const handleModeChange = (mode: DevelopmentMode) => {
    setDevelopmentMode(mode)
    setDefaultMode(mode)
    setShowModeSelector(false)
    
    // Clear all explicit aiAssisted values so repos inherit from global
    if (mode !== 'mixed') {
      const prefs = loadPreferences()
      Object.keys(prefs.repos).forEach(repoName => {
        if (prefs.repos[repoName]) {
          prefs.repos[repoName] = { ...prefs.repos[repoName], aiAssisted: undefined }
        }
      })
      savePreferences(prefs)
      
      // Reload preferences to reflect changes
      const updatedPrefs = loadPreferences()
      setRepoPreferences(updatedPrefs.repos)
    }
  }

  // Helper: Check if a repo is AI-assisted (repo-level preference → global default)
  const isRepoAiAssisted = (repoName: string): boolean => {
    const pref = repoPreferences[repoName]
    // If repo has an explicit preference, use it
    if (pref?.aiAssisted !== undefined) {
      return pref.aiAssisted
    }
    // Otherwise fall back to global default
    return developmentMode === 'ai'
  }
  
  // Open edit modal for a repo
  const openEditModal = (repo: AnalyzedRepository) => {
    const pref = getRepoPreference(repo.name)
    setEditingRepo(repo)
    // Use inheritance: repo-level preference → global default
    setEditAiAssisted(pref.aiAssisted ?? (developmentMode === 'ai'))
    setEditNarrative(pref.narrative || '')
    setEditGroup(pref.customGroup || '')
    setEditUrls(pref.deploymentUrls || [])
    setNewUrl('')
  }
  
  // Save edit modal changes
  const saveEditModal = () => {
    if (!editingRepo) return
    
    setRepoPreference(editingRepo.name, {
      aiAssisted: editAiAssisted,
      narrative: editNarrative.trim() || undefined,
      customGroup: editGroup || undefined,
    })
    
    // Update local state
    setRepoPreferences(loadPreferences().repos)
    setEditingRepo(null)
  }
  
  // Handle adding URL in edit modal
  const handleAddEditUrl = () => {
    if (!newUrl.trim() || !editingRepo) return
    addDeploymentUrl(editingRepo.name, {
      url: newUrl.trim(),
      label: 'Custom',
      autoDetected: false,
    })
    setEditUrls(getRepoPreference(editingRepo.name).deploymentUrls)
    setNewUrl('')
  }
  
  // Handle removing URL in edit modal
  const handleRemoveEditUrl = (url: string) => {
    if (!editingRepo) return
    removeDeploymentUrl(editingRepo.name, url)
    setEditUrls(getRepoPreference(editingRepo.name).deploymentUrls)
  }
  
  // Create new custom group
  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return
    createCustomGroup(newGroupName.trim(), newGroupIcon)
    setCustomGroups(getCustomGroups())
    setNewGroupName('')
    setNewGroupIcon('📁')
    setShowNewGroupModal(false)
  }

  // Rescan a single repository
  const rescanRepo = async (repo: AnalyzedRepository) => {
    setRescanningRepo(repo.name)
    
    try {
      // Fetch stats
      const statsRes = await fetch('/api/github/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: repo.owner.login,
          repo: repo.name,
        }),
      })

      if (!statsRes.ok) {
        const errorPayload = await statsRes.json().catch(() => ({}))
        throw new Error(errorPayload.error || `Failed to fetch stats (${statsRes.status})`)
      }

      const stats = await statsRes.json()

      // Get narrative from preferences
      const repoPref = getRepoPreference(repo.name)
      
      // Generate new AI summary
      const analyzeRes = await fetch('/api/github/analyze', {
        method: 'POST',
        headers: getAIHeaders(),
        body: JSON.stringify({
          repoName: repo.name,
          description: repo.description,
          stats: {
            ...stats,
            primaryLanguage: repo.language,
          },
          readme: stats.readme,
          commitMessages: stats.commitMessages,
          narrative: repoPref.narrative,
        }),
      })
      
      // Check if BYOK is required
      if (analyzeRes.status === 403) {
        const errorData = await analyzeRes.json()
        if (errorData.code === 'BYOK_REQUIRED') {
          setShowApiKeyModal(true)
          return
        }
      }

      if (!analyzeRes.ok) {
        const errorPayload = await analyzeRes.json().catch(() => ({}))
        throw new Error(errorPayload.error || `Failed to generate AI summary (${analyzeRes.status})`)
      }
      
      const { summary } = await analyzeRes.json()

      // Update repository in state
      const updatedRepos = repositories.map(r =>
        r.name === repo.name ? { ...r, stats, aiSummary: summary } : r
      )
      setRepositories(updatedRepos)
      
      // Mark as scanned in preferences
      markRepoScanned(repo.name)
      
      // Update localStorage
      localStorage.setItem('analyzedRepositories', JSON.stringify(updatedRepos))
      
      // Update selected repo if it's the one being rescanned
      if (selectedRepo?.name === repo.name) {
        setSelectedRepo({ ...repo, stats, aiSummary: summary })
      }
    } catch (error) {
      console.error('Error rescanning repo:', error)
    } finally {
      setRescanningRepo(null)
    }
  }

  // Calculate aggregate statistics
  const stats = useMemo(() => repositories.reduce(
    (acc, repo) => {
      if (repo.stats) {
        acc.totalCommits += repo.stats.commits || 0

        // Only include LOC when GitHub contributor stats are fully ready.
        if (repo.stats.locComputation === 'ready') {
          acc.totalAdditions += repo.stats.additions || 0
          acc.totalDeletions += repo.stats.deletions || 0
          acc.totalNet += repo.stats.net || 0
        }
        
        Object.entries(repo.stats.languages || {}).forEach(([lang, bytes]) => {
          acc.languages[lang] = (acc.languages[lang] || 0) + bytes
        })
      }
      return acc
    },
    {
      totalCommits: 0,
      totalAdditions: 0,
      totalDeletions: 0,
      totalNet: 0,
      languages: {} as Record<string, number>,
    }
  ), [repositories])

  // Calculate primary language
  const primaryLanguage = Object.entries(stats.languages).sort(
    ([, a], [, b]) => b - a
  )[0]?.[0] || 'Unknown'

  const locQuality = useMemo(() => {
    const reposWithStats = repositories.filter(repo => repo.stats)
    const ready = reposWithStats.filter(repo => repo.stats?.locComputation === 'ready').length
    const pending = reposWithStats.filter(repo => repo.stats?.locComputation === 'pending').length
    const unavailable = reposWithStats.filter(repo => repo.stats?.locComputation === 'unavailable').length
    const error = reposWithStats.filter(repo => repo.stats?.locComputation === 'error').length
    const unknown = reposWithStats.filter(repo => !repo.stats?.locComputation).length
    const total = reposWithStats.length

    return {
      total,
      ready,
      pending,
      unavailable,
      error,
      unknown,
      coverage: total > 0 ? Math.round((ready / total) * 100) : 0,
    }
  }, [repositories])

  // Calculate impact metrics
  const impactMetrics = useMemo(() => {
    const avgCommitsPerRepo = repositories.length > 0 
      ? Math.round(stats.totalCommits / repositories.length) 
      : 0
    
    // Estimate YOUR actual coding days based on commits (avg ~2-3 commits per active day)
    const yourActiveDays = Math.round(stats.totalCommits / 2.5)
    const yourHours = yourActiveDays * 8
    
    // How long would a TRADITIONAL developer take at 300 lines/day?
    const traditionalDays = Math.round(stats.totalAdditions / 300)
    const traditionalHours = traditionalDays * 8
    
    // Productivity multiplier: traditional time / your time
    const productivityMultiplier = yourActiveDays > 0 
      ? Math.round((traditionalDays / yourActiveDays) * 10) / 10
      : 1.0
    
    // Lines per day YOU achieved
    const yourLinesPerDay = yourActiveDays > 0 
      ? Math.round(stats.totalAdditions / yourActiveDays)
      : 0
    
    // Calculate longest streak (simulated based on commit density)
    const longestStreak = Math.min(Math.floor(stats.totalCommits / 3), 90)
    
    // Count AI-enhanced projects - check if aiSummary exists and has meaningful AI integration
    const aiEnhancedProjects = repositories.filter(r => {
      if (!r.aiSummary?.ai_integration) return false
      
      // If it's an object with properties, it's AI-enhanced
      if (typeof r.aiSummary.ai_integration === 'object') {
        return Object.keys(r.aiSummary.ai_integration).length > 0
      }
      
      // If it's a string, check if it indicates AI usage (not "None", "N/A", etc.)
      const aiText = String(r.aiSummary.ai_integration).toLowerCase()
      const negativeIndicators = ['none', 'n/a', 'no ai', 'not applicable', 'no integration']
      return !negativeIndicators.some(neg => aiText.includes(neg))
    }).length
    
    // === SELF-REPORTED METRICS ===
    
    // Helper to check AI status with inheritance (inline for useMemo)
    const checkAiAssisted = (repoName: string): boolean => {
      const pref = repoPreferences[repoName]
      if (pref?.aiAssisted !== undefined) return pref.aiAssisted
      return developmentMode === 'ai'
    }
    
    // Count repos by self-reported status (respects inheritance)
    const aiAssistedRepos = repositories.filter(r => checkAiAssisted(r.name)).length
    const manualRepos = repositories.length - aiAssistedRepos
    const selfReportedAiPercentage = repositories.length > 0 
      ? Math.round((aiAssistedRepos / repositories.length) * 100)
      : 0
    
    // Calculate lines of code by development style (respects inheritance)
    const aiAssistedLOC = repositories
      .filter(r => checkAiAssisted(r.name))
      .reduce((sum, r) => sum + (r.stats?.additions || 0), 0)
    const manualLOC = stats.totalAdditions - aiAssistedLOC
    
    // Count repos with deployment URLs
    const deployedRepos = repositories.filter(r => 
      repoPreferences[r.name]?.deploymentUrls?.length > 0
    ).length
    
    // Count repos with narratives
    const documentedRepos = repositories.filter(r => 
      repoPreferences[r.name]?.narrative
    ).length
    
    // Get languages used in AI-assisted vs manual repos (respects inheritance)
    const aiLanguages: Record<string, number> = {}
    const manualLanguages: Record<string, number> = {}
    
    repositories.forEach(r => {
      if (r.stats?.languages) {
        const target = checkAiAssisted(r.name) ? aiLanguages : manualLanguages
        Object.entries(r.stats.languages).forEach(([lang, bytes]) => {
          target[lang] = (target[lang] || 0) + bytes
        })
      }
    })
    
    // Top AI-assisted language
    const topAiLanguage = Object.entries(aiLanguages).sort(([,a], [,b]) => b - a)[0]?.[0] || null
    const topManualLanguage = Object.entries(manualLanguages).sort(([,a], [,b]) => b - a)[0]?.[0] || null
    
    return {
      avgCommitsPerRepo,
      yourActiveDays,
      yourHours,
      traditionalDays,
      traditionalHours,
      productivityMultiplier,
      yourLinesPerDay,
      longestStreak,
      totalProjects: repositories.length,
      aiEnhancedProjects,
      // Self-reported metrics
      aiAssistedRepos,
      manualRepos,
      selfReportedAiPercentage,
      aiAssistedLOC,
      manualLOC,
      deployedRepos,
      documentedRepos,
      topAiLanguage,
      topManualLanguage,
    }
  }, [repositories, stats, repoPreferences, developmentMode])

  const displayAchievements = useMemo<Achievement[]>(() => {
    const generated: Achievement[] = []

    if (impactMetrics.totalProjects >= 20) {
      generated.push({
        icon: '🌌',
        title: 'Repo Universe Builder',
        description: `You carried ${impactMetrics.totalProjects} projects through the year.`,
      })
    }

    if (Object.keys(stats.languages).length >= 5) {
      generated.push({
        icon: '🧬',
        title: 'Polyglot Energy',
        description: `${Object.keys(stats.languages).length} languages showed up in your work.`,
      })
    }

    if (locQuality.coverage >= 90 && locQuality.total > 0) {
      generated.push({
        icon: '🛰️',
        title: 'High Signal Scan',
        description: `${locQuality.coverage}% of repository LOC data is verified and ready.`,
      })
    }

    if (impactMetrics.selfReportedAiPercentage >= 50) {
      generated.push({
        icon: '🤖',
        title: 'AI-Accelerated Builder',
        description: `${impactMetrics.selfReportedAiPercentage}% of your repos were marked AI-assisted.`,
      })
    }

    if (impactMetrics.deployedRepos > 0) {
      generated.push({
        icon: '🚀',
        title: 'Shipped To The World',
        description: `${impactMetrics.deployedRepos} repositories have deployment links attached.`,
      })
    }

    return [...achievements, ...generated].slice(0, 8)
  }, [achievements, impactMetrics, locQuality, stats.languages])

  const repoUniverse = useMemo(() => {
    const repos = [...repositories]
      .filter(repo => repo.stats)
      .sort((a, b) => (b.stats?.commits || 0) - (a.stats?.commits || 0))
      .slice(0, 24)

    const maxCommits = Math.max(1, ...repos.map(repo => repo.stats?.commits || 0))
    const orbitCount = Math.max(1, repos.length)

    return repos.map((repo, index) => {
      const commits = repo.stats?.commits || 0
      const angle = (index / orbitCount) * Math.PI * 2 - Math.PI / 2
      const ring = index % 3
      const radius = 28 + ring * 11 + (index % 2) * 5
      const x = 50 + Math.cos(angle) * radius
      const y = 50 + Math.sin(angle) * radius
      const size = 18 + Math.round((commits / maxCommits) * 44)

      return {
        repo,
        x: Math.max(8, Math.min(92, x)),
        y: Math.max(8, Math.min(92, y)),
        size,
        color: getLanguageAccent(repo.language),
        isAi: isRepoAiAssisted(repo.name),
      }
    })
  }, [repositories, repoPreferences, developmentMode])

  // Get language-specific bar class
  const getLanguageClass = (lang: string): string => {
    const l = lang.toLowerCase()
    if (l === 'typescript') return styles.typescript
    if (l === 'javascript') return styles.javascript
    if (l === 'python') return styles.python
    return styles.default
  }

  // Find repo by name for grouped view
  const findRepoByName = (name: string): AnalyzedRepository | undefined => {
    return repositories.find(r => r.name === name)
  }

  const exportAsHTML = () => {
    const htmlContent = generateInteractiveHTML({
      repositories,
      stats,
      repositoryGroups,
      impactMetrics,
      repoPreferences,
      customGroups,
      developmentMode,
      aiInsights,
      achievements,
      featuredProjects,
      yearNarrative,
      exportedAt: new Date().toISOString(),
      contributionData,
    })
    downloadHTML(htmlContent)
  }

  if (isLoading) {
    return (
      <>
        <div className="prism-background">
          <div className="prism-orb"></div>
          <div className="prism-orb"></div>
        </div>
        <main className={styles.main}>
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <div className={styles.loadingText}>Loading your wrapped...</div>
          </div>
        </main>
      </>
    )
  }

  if (repositories.length === 0) {
    return (
      <>
        <div className="prism-background">
          <div className="prism-orb"></div>
          <div className="prism-orb"></div>
        </div>
        <main className={styles.main}>
          <div className={`glass-card ${styles.emptyState}`}>
            <div className={styles.emptyIcon}>📊</div>
            <h2 className={styles.emptyTitle}>No Repositories Analyzed</h2>
            <p className={styles.emptyMessage}>
              Head back to the dashboard to select and analyze your repositories.
            </p>
            <button className={styles.backButton} onClick={() => router.push('/dashboard')}>
              Go to Dashboard
            </button>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <div className="prism-background">
        <div className="prism-orb"></div>
        <div className="prism-orb"></div>
      </div>

      <nav className={styles.nav}>
        <div className={styles.navLeft}>
          <div className={styles.navLogo}>GitHub Wrapped {new Date().getFullYear()}</div>
          <button 
            className={styles.editSelectionBtn}
            onClick={() => router.push('/dashboard')}
          >
            ✏️ Edit Selection
          </button>
        </div>
        <div className={styles.navTabs}>
          <button
            className={styles.navTab}
            onClick={() => router.push('/')}
          >
            Home
          </button>
          <button
            className={`${styles.navTab} ${activeTab === 'overview' ? styles.active : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`${styles.navTab} ${activeTab === 'impact' ? styles.active : ''}`}
            onClick={() => setActiveTab('impact')}
          >
            Impact
          </button>
          <button
            className={`${styles.navTab} ${activeTab === 'repositories' ? styles.active : ''}`}
            onClick={() => setActiveTab('repositories')}
          >
            Repositories
          </button>
          <button
            className={`${styles.navTab} ${activeTab === 'universe' ? styles.active : ''}`}
            onClick={() => setActiveTab('universe')}
          >
            Universe
          </button>
          <button
            className={`${styles.navTab} ${activeTab === 'export' ? styles.active : ''}`}
            onClick={() => setActiveTab('export')}
          >
            Export
          </button>
        </div>
        {/* Development Mode Indicator */}
        <div className={styles.modeIndicator}>
          <button 
            className={styles.modeDropdownToggle}
            onClick={() => setShowModeSelector(!showModeSelector)}
          >
            {developmentMode === 'ai' && '🤖 AI-Assisted'}
            {developmentMode === 'manual' && '👤 Manual'}
            {developmentMode === 'mixed' && '🔀 Mixed'}
            <span style={{ marginLeft: '6px', opacity: 0.6 }}>▼</span>
          </button>
          {showModeSelector && (
            <div className={styles.modeDropdown}>
              <button 
                onClick={() => handleModeChange('ai')} 
                className={`${styles.modeOption} ${developmentMode === 'ai' ? styles.active : ''}`}
              >
                🤖 AI-Assisted
              </button>
              <button 
                onClick={() => handleModeChange('manual')} 
                className={`${styles.modeOption} ${developmentMode === 'manual' ? styles.active : ''}`}
              >
                👤 Manual
              </button>
              <button 
                onClick={() => handleModeChange('mixed')} 
                className={`${styles.modeOption} ${developmentMode === 'mixed' ? styles.active : ''}`}
              >
                🔀 Mixed
              </button>
            </div>
          )}
        </div>
      </nav>

      <main ref={pageRef} className={styles.main}>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className={styles.section}>
            <section className={styles.cinematicHero} data-animate="card">
              <div className={styles.cinematicEyebrow}>Developer Observatory</div>
              <h1>Your code year, mapped like a living system.</h1>
              <p>
                Every project becomes a signal: velocity, language energy, confidence, and the work that actually shipped.
              </p>
              <div className={styles.heroSignalRow}>
                <span>{repositories.length} repos scanned</span>
                <span>{primaryLanguage} dominant language</span>
                <span>{locQuality.coverage}% LOC confidence</span>
              </div>
            </section>

            {/* Hero Stats - Larger cards */}
            <div className={styles.heroGrid}>
              <div className={`glass-card ${styles.heroCard} ${styles.reveal}`} data-animate="card">
                <div className={styles.label}>Total Commits</div>
                <div className={`${styles.bigNumber} ${styles.mega}`}>
                  <AnimatedNumber value={stats.totalCommits} />
                </div>
                <div className={styles.heroTitle}>commits across {repositories.length} repositories</div>
              </div>

              <div className={`glass-card ${styles.heroCard} ${styles.reveal} ${styles.delay1}`} data-animate="card">
                <div className={styles.label}>Lines of Code (Net)</div>
                <div className={`${styles.bigNumber} ${styles.mega}`}>
                  <AnimatedNumber value={stats.totalNet} />
                </div>
                <div className={styles.heroTitle}>net lines from repos with ready GitHub stats</div>
              </div>
            </div>

            <div className={styles.statsGrid}>
              <div className={`glass-card ${styles.reveal} ${styles.delay2}`} data-animate="card">
                <div className={styles.label}>Lines Added</div>
                <div className={`${styles.monoValue} ${styles.green}`}>
                  <AnimatedNumber value={stats.totalAdditions} prefix="+" />
                </div>
              </div>

              <div className={`glass-card ${styles.reveal} ${styles.delay3}`} data-animate="card">
                <div className={styles.label}>Lines Deleted</div>
                <div className={`${styles.monoValue} ${styles.red}`}>
                  <AnimatedNumber value={stats.totalDeletions} prefix="-" />
                </div>
              </div>

              <div className={`glass-card ${styles.reveal} ${styles.delay4}`} data-animate="card">
                <div className={styles.label}>Primary Language</div>
                <div className={`${styles.monoValue} ${styles.small}`}>{primaryLanguage}</div>
              </div>

              <div className={`glass-card ${styles.reveal} ${styles.delay5}`} data-animate="card">
                <div className={styles.label}>Languages Used</div>
                <div className={styles.monoValue}>
                  <AnimatedNumber value={Object.keys(stats.languages).length} />
                </div>
              </div>
            </div>

            <div className={`${styles.signalPanel} glass-card`} data-animate="card">
              <div>
                <div className={styles.label}>Data Confidence</div>
                <h2>{locQuality.coverage}% LOC coverage</h2>
                <p>
                  {locQuality.ready} of {locQuality.total} repositories have ready LOC stats. Pending or unavailable repos are excluded from LOC totals instead of being counted as zero.
                </p>
              </div>
              <div className={styles.confidenceMeter} aria-label={`${locQuality.coverage}% LOC coverage`}>
                <div className={styles.confidenceRing} style={{ '--coverage': `${locQuality.coverage * 3.6}deg` } as CSSProperties}>
                  <span>{locQuality.coverage}%</span>
                </div>
              </div>
              <div className={styles.signalChips}>
                <span className={styles.readyChip}>{locQuality.ready} ready</span>
                {locQuality.pending > 0 && <span className={styles.pendingChip}>{locQuality.pending} pending</span>}
                {locQuality.unavailable > 0 && <span className={styles.mutedChip}>{locQuality.unavailable} unavailable</span>}
                {locQuality.error > 0 && <span className={styles.errorChip}>{locQuality.error} error</span>}
                {locQuality.unknown > 0 && <span className={styles.mutedChip}>{locQuality.unknown} legacy</span>}
              </div>
            </div>

            {/* Year Narrative Section */}
            {yearNarrative && (
              <div className={`glass-card ${styles.yearNarrative} ${styles.reveal}`} style={{ marginTop: '32px' }}>
                <h2 className={styles.narrativeTitle}>🎯 {yearNarrative.title}</h2>
                <p className={styles.narrativeIntro}>{yearNarrative.intro}</p>
                
                {yearNarrative.context && (
                  <div className={styles.narrativeContext}>
                    <strong>Important context:</strong> {yearNarrative.context}
                  </div>
                )}

                {/* Featured Projects */}
                {featuredProjects.length > 0 && (
                  <div className={styles.narrativeGrid}>
                    {featuredProjects.slice(0, 4).map((project, index) => (
                      <div 
                        key={index} 
                        className={`${styles.narrativeCard} ${styles[project.color] || styles.cyan}`}
                      >
                        <div className={`${styles.narrativeLabel} ${styles[project.color] || styles.cyan}`}>
                          {project.categoryIcon} {project.category}
                        </div>
                        <div className={styles.narrativeCardTitle}>{project.headline}</div>
                        <p className={styles.narrativeCardText}>{project.description}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* AI Insights */}
                {aiInsights && (
                  <div className={styles.aiInsightsSection}>
                    <div className={styles.aiInsightsHeadline}>
                      🤖 {aiInsights.headline}
                    </div>
                    <p className={styles.aiInsightsDescription}>
                      {aiInsights.description}
                    </p>
                    
                    <div className={styles.impactCardsGrid}>
                      {aiInsights.whatChanged && aiInsights.whatChanged.length > 0 && (
                        <div className={`${styles.impactCardLarge} ${styles.cyan}`}>
                          <div className={`${styles.impactCardHeader} ${styles.cyan}`}>🔄 What Changed</div>
                          <ul className={styles.impactList}>
                            {aiInsights.whatChanged.map((item, i) => (
                              <li key={i}>
                                <span className={`${styles.arrow} ${styles.cyan}`}>→</span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {aiInsights.honestTake && aiInsights.honestTake.length > 0 && (
                        <div className={`${styles.impactCardLarge} ${styles.purple}`}>
                          <div className={`${styles.impactCardHeader} ${styles.purple}`}>⚖️ The Honest Take</div>
                          <ul className={styles.impactList}>
                            {aiInsights.honestTake.map((item, i) => (
                              <li key={i}>
                                <span className={`${styles.arrow} ${styles.purple}`}>✓</span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Contribution Heatmap */}
            <div className={`glass-card ${styles.reveal} ${styles.delay6}`} style={{ marginTop: '32px' }}>
              <h2 className={styles.sectionTitle}>Contribution Activity</h2>
              {contributionData ? (
                <div className={styles.heatmapContainer}>
                  {/* Stats Header */}
                  <div className={styles.heatmapStats}>
                    <div className={styles.heatmapStatItem}>
                      <span className={styles.heatmapStatIcon}>📅</span>
                      <span className={styles.heatmapStatValue}>{contributionData.year}</span>
                      <span className={styles.heatmapStatLabel}>Year</span>
                    </div>
                    <div className={styles.heatmapStatItem}>
                      <span className={styles.heatmapStatValue}>{contributionData.totalContributions.toLocaleString()}</span>
                      <span className={styles.heatmapStatLabel}>Contributions</span>
                    </div>
                    <div className={styles.heatmapStatItem}>
                      <span className={styles.heatmapStatIcon}>🔥</span>
                      <span className={styles.heatmapStatValue}>{contributionData.activeDays}</span>
                      <span className={styles.heatmapStatLabel}>Active Days</span>
                    </div>
                  </div>
                  
                  {/* Month Labels */}
                  <div className={styles.heatmapMonths}>
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(month => (
                      <span key={month} className={styles.heatmapMonth}>{month}</span>
                    ))}
                  </div>
                  
                  {/* Heatmap Grid */}
                  <div className={styles.heatmapGrid}>
                    {contributionData.weeks.map((week, weekIndex) => (
                      <div key={weekIndex} className={styles.heatWeek}>
                        {week.contributionDays.map((day, dayIndex) => (
                          <div
                            key={dayIndex}
                            className={`${styles.heatCell} ${getHeatLevel(day.contributionCount)}`}
                            title={`${day.contributionCount} contributions on ${day.date}`}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                  
                  {/* Legend */}
                  <div className={styles.heatmapLegend}>
                    <span>Less</span>
                    <div className={styles.heatCell}></div>
                    <div className={`${styles.heatCell} ${styles.level1}`}></div>
                    <div className={`${styles.heatCell} ${styles.level2}`}></div>
                    <div className={`${styles.heatCell} ${styles.level3}`}></div>
                    <div className={`${styles.heatCell} ${styles.level4}`}></div>
                    <span>More</span>
                  </div>
                </div>
              ) : (
                <div className={styles.heatmapContainer}>
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
                    Loading contribution data...
                  </div>
                </div>
              )}
            </div>

            {/* Language Breakdown */}
            <div className="glass-card" style={{ marginTop: '32px' }}>
              <h2 className={styles.sectionTitle}>Language Breakdown</h2>
              <div className={styles.languageBars}>
                {Object.entries(stats.languages)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 6)
                  .map(([lang, bytes]) => {
                    const total = Object.values(stats.languages).reduce((a, b) => a + b, 0)
                    const percentage = (bytes / total) * 100
                    return (
                      <div key={lang} className={styles.languageBar}>
                        <div className={styles.languageName}>{lang}</div>
                        <div className={styles.languageProgress}>
                          <div
                            className={`${styles.languageFill} ${getLanguageClass(lang)}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className={styles.languagePercentage}>
                          {percentage.toFixed(1)}%
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          </div>
        )}

        {/* Impact Tab */}
        {activeTab === 'impact' && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Developer Time Impact</h2>
            
            {/* Main Time Comparison - Full width */}
            <div className={`glass-card ${styles.reveal}`} style={{ marginBottom: '24px' }}>
              <div className={styles.timeComparison}>
                <div className={styles.timeBlock}>
                  <div className={styles.timeLabel}>Traditional Development</div>
                  <div className={styles.timeValue}>{impactMetrics.traditionalDays.toLocaleString()}</div>
                  <div className={styles.subtitle}>developer days at 200-300 LOC/day</div>
                </div>
                <div className={styles.vsBadge}>VS</div>
                <div className={styles.timeBlock}>
                  <div className={styles.timeLabel}>Your Actual Output</div>
                  <div className={`${styles.timeValue} ${styles.highlight}`}>
                    ~{impactMetrics.yourActiveDays}
                  </div>
                  <div className={styles.subtitle}>
                    {detectedStats && detectedStats.aiAssistedPercentage > 10 
                      ? 'days with AI assistance'
                      : 'active development days'}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className={styles.statsGrid} style={{ marginBottom: '32px' }}>
              <div className={`glass-card ${styles.reveal} ${styles.delay1}`}>
                <div className={styles.label}>Productivity Multiplier</div>
                <div className={`${styles.bigNumber}`}>{impactMetrics.productivityMultiplier}x</div>
                <div className={styles.subtitle}>vs traditional development baseline</div>
              </div>

              <div className={`glass-card ${styles.reveal} ${styles.delay2}`}>
                <div className={styles.label}>Time Equivalent</div>
                <div className={styles.monoValue}>
                  {((impactMetrics.traditionalDays - impactMetrics.yourActiveDays) / 365).toFixed(1)} years
                </div>
                <div className={styles.subtitle}>of traditional development time</div>
              </div>

              <div className={`glass-card ${styles.reveal} ${styles.delay3}`}>
                <div className={styles.label}>Daily Output</div>
                <div className={styles.monoValue}>{impactMetrics.yourLinesPerDay.toLocaleString()} LOC</div>
                <div className={styles.subtitle}>average lines per coding day</div>
              </div>

              <div className={`glass-card ${styles.reveal} ${styles.delay4}`}>
                <div className={styles.label}>Projects Shipped</div>
                <div className={styles.monoValue}>{impactMetrics.totalProjects}</div>
                <div className={styles.subtitle}>complete repositories built</div>
              </div>
            </div>

            {/* Development Style Profile - Self-Reported */}
            <div className={`glass-card ${styles.reveal} ${styles.delay5}`} style={{ marginBottom: '32px' }}>
              <h2 className={styles.sectionTitle}>🎯 Your Development Profile</h2>
              
              {/* AI vs Manual Split */}
              <div className={styles.devStyleGrid}>
                <div className={styles.devStyleCard}>
                  <div className={styles.devStyleIcon}>🤖</div>
                  <div className={styles.devStyleValue}>{impactMetrics.aiAssistedRepos}</div>
                  <div className={styles.devStyleLabel}>AI-Assisted Repos</div>
                  <div className={styles.devStyleSub}>
                    {impactMetrics.aiAssistedLOC.toLocaleString()} lines
                    {impactMetrics.topAiLanguage && <span className={styles.langTag}>{impactMetrics.topAiLanguage}</span>}
                  </div>
                </div>
                
                <div className={styles.devStyleCard}>
                  <div className={styles.devStyleIcon}>👤</div>
                  <div className={styles.devStyleValue}>{impactMetrics.manualRepos}</div>
                  <div className={styles.devStyleLabel}>Manual Repos</div>
                  <div className={styles.devStyleSub}>
                    {impactMetrics.manualLOC.toLocaleString()} lines
                    {impactMetrics.topManualLanguage && <span className={styles.langTag}>{impactMetrics.topManualLanguage}</span>}
                  </div>
                </div>
                
                <div className={styles.devStyleCard}>
                  <div className={styles.devStyleIcon}>🌐</div>
                  <div className={styles.devStyleValue}>{impactMetrics.deployedRepos}</div>
                  <div className={styles.devStyleLabel}>Deployed Live</div>
                  <div className={styles.devStyleSub}>with deployment URLs</div>
                </div>
                
                <div className={styles.devStyleCard}>
                  <div className={styles.devStyleIcon}>📝</div>
                  <div className={styles.devStyleValue}>{impactMetrics.documentedRepos}</div>
                  <div className={styles.devStyleLabel}>Documented</div>
                  <div className={styles.devStyleSub}>with project notes</div>
                </div>
              </div>

              {/* AI Percentage Bar */}
              <div className={styles.aiPercentageSection}>
                <div className={styles.aiPercentageHeader}>
                  <span>Development Style Distribution</span>
                  <span className={styles.aiPercentageValue}>
                    {impactMetrics.selfReportedAiPercentage}% AI-Assisted
                  </span>
                </div>
                <div className={styles.aiPercentageBar}>
                  <div 
                    className={styles.aiPercentageFill} 
                    style={{ width: `${impactMetrics.selfReportedAiPercentage}%` }}
                  />
                </div>
                <div className={styles.aiPercentageLabels}>
                  <span>🤖 AI ({impactMetrics.aiAssistedRepos})</span>
                  <span>👤 Manual ({impactMetrics.manualRepos})</span>
                </div>
              </div>
            </div>

            {/* Achievements Section */}
            {displayAchievements.length > 0 && (
              <div className={`glass-card ${styles.reveal} ${styles.delay5}`} style={{ marginBottom: '32px' }}>
                <h2 className={styles.sectionTitle}>🏆 Key Achievements</h2>
                <div className={styles.achievementsGrid}>
                  {displayAchievements.map((achievement, index) => (
                    <div key={`${achievement.title}-${index}`} className={styles.achievementCard} data-animate="card">
                      <div className={styles.achievementIcon}>{achievement.icon}</div>
                      <div className={styles.achievementTitle}>{achievement.title}</div>
                      <div className={styles.achievementDescription}>{achievement.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Year in Review - Only show if AI usage detected */}
            {aiInsights && (
              <div className={`glass-card ${styles.reveal} ${styles.delay6}`}>
                <h2 className={styles.sectionTitle}>📊 {aiInsights.headline || 'Development Workflow Insights'}</h2>
                
                {/* Show detected tools if any */}
                {aiInsights.toolsUsed && aiInsights.toolsUsed.length > 0 && (
                  <div className={styles.toolsDetected}>
                    <span className={styles.toolsLabel}>Detected Tools:</span>
                    {aiInsights.toolsUsed.map((tool, i) => (
                      <span key={i} className={styles.toolChip}>{tool}</span>
                    ))}
                  </div>
                )}
                
                {/* Show Self-Reported AI Stats (primary) + Detected markers (secondary) */}
                <div className={styles.aiStatsRow}>
                  {/* Self-Reported AI Percentage - Primary stat */}
                  <div className={styles.aiStatBadge} style={{ background: 'linear-gradient(135deg, rgba(0, 255, 249, 0.2), rgba(255, 0, 249, 0.2))' }}>
                    <span className={styles.aiStatIcon}>🤖</span>
                    <span>{impactMetrics.selfReportedAiPercentage}% AI-Assisted (self-reported)</span>
                  </div>
                  
                  {/* Show AI-Assisted commits based on self-reported repos */}
                  {impactMetrics.aiAssistedRepos > 0 && (
                    <div className={styles.aiStatBadge}>
                      <span className={styles.aiStatIcon}>📊</span>
                      <span>{impactMetrics.aiAssistedRepos} repos / {stats.totalCommits.toLocaleString()} commits</span>
                    </div>
                  )}
                  
                  {/* Detected Copilot signatures - supplementary info */}
                  {detectedStats && detectedStats.totalCopilotCommits > 0 && (
                    <div className={styles.aiStatBadge} style={{ opacity: 0.7 }}>
                      <span className={styles.aiStatIcon}>🔍</span>
                      <span>{detectedStats.totalCopilotCommits} with Copilot markers</span>
                    </div>
                  )}
                </div>
                
                {/* Note about self-reporting */}
                <p className={styles.aiStatsNote}>
                  Stats based on your development style settings. Copilot markers only capture explicit signatures - 
                  most AI-assisted work (inline completions, chat, agent mode) doesn&apos;t leave markers.
                </p>
                
                <div className={styles.impactCardsGrid}>
                  {aiInsights.whatChanged && aiInsights.whatChanged.length > 0 && (
                    <div className={`${styles.impactCardLarge} ${styles.cyan}`}>
                      <div className={`${styles.impactCardHeader} ${styles.cyan}`}>🔄 What The Data Shows</div>
                      <ul className={styles.impactList}>
                        {aiInsights.whatChanged.map((item, i) => (
                          <li key={i}>
                            <span className={`${styles.arrow} ${styles.cyan}`}>→</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {aiInsights.honestTake && aiInsights.honestTake.length > 0 && (
                    <div className={`${styles.impactCardLarge} ${styles.purple}`}>
                      <div className={`${styles.impactCardHeader} ${styles.purple}`}>⚖️ Observations</div>
                      <ul className={styles.impactList}>
                        {aiInsights.honestTake.map((item, i) => (
                          <li key={i}>
                            <span className={`${styles.arrow} ${styles.purple}`}>✓</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Development Insights - Fallback if no AI insights */}
            {!aiInsights && (
              <div className={`glass-card ${styles.reveal} ${styles.delay5}`}>
                <h2 className={styles.sectionTitle}>Development Insights</h2>
                <div className={styles.insightsList}>
                  <div className={`glass-card ${styles.insightItem}`}>
                    <span className={styles.insightIcon}>🔥</span>
                    <div className={styles.insightContent}>
                      <h4>Longest Commit Streak</h4>
                      <p>You maintained consistent activity for up to {impactMetrics.longestStreak} days</p>
                    </div>
                  </div>
                  <div className={`glass-card ${styles.insightItem}`}>
                    <span className={styles.insightIcon}>🚀</span>
                    <div className={styles.insightContent}>
                      <h4>Most Productive Language</h4>
                      <p>{primaryLanguage} powered most of your development work</p>
                    </div>
                  </div>
                  <div className={`glass-card ${styles.insightItem}`}>
                    <span className={styles.insightIcon}>�</span>
                    <div className={styles.insightContent}>
                      <h4>Repository Breakdown</h4>
                      <p>
                        {detectedStats 
                          ? detectedStats.orgRepos > 0 && detectedStats.personalRepos > 0
                            ? `${detectedStats.orgRepos} organization + ${detectedStats.personalRepos} personal repos`
                            : detectedStats.orgRepos > 0
                              ? `${detectedStats.orgRepos} organization repositories`
                              : `${detectedStats.personalRepos} personal repositories`
                          : `${repositories.length} total repositories analyzed`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Repositories Tab */}
        {activeTab === 'repositories' && (
          <div className={styles.section}>
            {/* Grouped View */}
            {repositoryGroups.length > 0 ? (
              repositoryGroups.map((group) => (
                <div key={group.name} className={styles.repoGroup}>
                  <div className={styles.repoGroupHeader}>
                    <span className={styles.repoGroupIcon}>{group.icon}</span>
                    <span className={styles.repoGroupTitle}>{group.name}</span>
                    <span className={styles.repoGroupCount}>{group.repos.length} repos</span>
                  </div>
                  <div className={styles.reposGrid}>
                    {group.repos.map((repoName) => {
                      const repo = findRepoByName(repoName)
                      if (!repo) return null
                      return (
                        <div
                          key={repo.id}
                          className={`glass-card ${styles.repoCard}`}
                          onClick={() => setSelectedRepo(repo)}
                          data-animate="card"
                          style={{ '--repo-accent': getLanguageAccent(repo.language) } as CSSProperties}
                        >
                          <div className={styles.repoCardTopline}>
                            <h3 className={styles.repoName}>{repo.name}</h3>
                            {repo.stats?.locComputation && (
                              <span className={`${styles.locBadge} ${styles[`loc${repo.stats.locComputation}`] || styles.locunknown}`}>
                                {repo.stats.locComputation}
                              </span>
                            )}
                          </div>
                          {repo.language && (
                            <span className={styles.repoLanguage}>{repo.language}</span>
                          )}
                          
                          {repo.description && (
                            <p className={styles.repoDescription}>{repo.description}</p>
                          )}

                          {repo.stats && (
                            <div className={styles.repoStats}>
                              <div>
                                <div className={styles.statLabel}>Commits</div>
                                <div className={styles.statValue}>{repo.stats.commits}</div>
                              </div>
                              <div>
                                <div className={styles.statLabel}>Added</div>
                                <div className={`${styles.statValue} ${styles.green}`}>
                                  +{repo.stats.additions?.toLocaleString()}
                                </div>
                              </div>
                              <div>
                                <div className={styles.statLabel}>Net</div>
                                <div className={styles.statValue}>
                                  {repo.stats.net?.toLocaleString()}
                                </div>
                              </div>
                            </div>
                          )}

                          {repo.aiSummary && (
                            <div className={styles.aiSummary}>
                              <div className={styles.summaryLabel}>AI Summary</div>
                              <p className={styles.summaryText}>
                                {repo.aiSummary.project_function}
                              </p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            ) : (
              /* Ungrouped View */
              <div className={styles.reposGrid}>
                {repositories.map((repo) => (
                  <div
                    key={repo.id}
                    className={`glass-card ${styles.repoCard}`}
                    onClick={() => setSelectedRepo(repo)}
                    data-animate="card"
                    style={{ '--repo-accent': getLanguageAccent(repo.language) } as CSSProperties}
                  >
                    <div className={styles.repoCardTopline}>
                      <h3 className={styles.repoName}>{repo.name}</h3>
                      {repo.stats?.locComputation && (
                        <span className={`${styles.locBadge} ${styles[`loc${repo.stats.locComputation}`] || styles.locunknown}`}>
                          {repo.stats.locComputation}
                        </span>
                      )}
                    </div>
                    {repo.language && (
                      <span className={styles.repoLanguage}>{repo.language}</span>
                    )}
                    
                    {repo.description && (
                      <p className={styles.repoDescription}>{repo.description}</p>
                    )}

                    {repo.stats && (
                      <div className={styles.repoStats}>
                        <div>
                          <div className={styles.statLabel}>Commits</div>
                          <div className={styles.statValue}>{repo.stats.commits}</div>
                        </div>
                        <div>
                          <div className={styles.statLabel}>Added</div>
                          <div className={`${styles.statValue} ${styles.green}`}>
                            +{repo.stats.additions?.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className={styles.statLabel}>Net</div>
                          <div className={styles.statValue}>
                            {repo.stats.net?.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    )}

                    {repo.aiSummary && (
                      <div className={styles.aiSummary}>
                        <div className={styles.summaryLabel}>AI Summary</div>
                        <p className={styles.summaryText}>
                          {repo.aiSummary.project_function}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Universe Tab */}
        {activeTab === 'universe' && (
          <div className={styles.section}>
            <div className={styles.universeHeader} data-animate="card">
              <div>
                <div className={styles.cinematicEyebrow}>Repository Universe</div>
                <h2>Your projects as an interactive constellation</h2>
                <p>
                  Planet size follows commit volume, color follows primary language, and rings show your AI/manual development mode.
                </p>
              </div>
              <div className={styles.universeLegend}>
                <span><i className={styles.aiLegendDot}></i> AI-assisted ring</span>
                <span><i className={styles.manualLegendDot}></i> Manual ring</span>
              </div>
            </div>

            <div className={`${styles.universeStage} glass-card`} data-animate="card">
              <div className={`${styles.orbit} ${styles.orbitOne}`}></div>
              <div className={`${styles.orbit} ${styles.orbitTwo}`}></div>
              <div className={`${styles.orbit} ${styles.orbitThree}`}></div>
              <div className={styles.universeCore}>
                <span>{repositories.length}</span>
                <small>repos</small>
              </div>
              {repoUniverse.map(({ repo, x, y, size, color, isAi }) => (
                <button
                  key={repo.id}
                  className={`${styles.repoPlanet} ${isAi ? styles.aiPlanet : styles.manualPlanet}`}
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    width: `${size}px`,
                    height: `${size}px`,
                    '--planet-color': color,
                  } as CSSProperties}
                  onClick={() => setSelectedRepo(repo)}
                  title={`${repo.name}: ${repo.stats?.commits || 0} commits`}
                >
                  <span>{repo.name.slice(0, 2).toUpperCase()}</span>
                </button>
              ))}
            </div>

            <div className={styles.universeCards}>
              {repoUniverse.slice(0, 6).map(({ repo, color, isAi }) => (
                <button
                  key={repo.id}
                  className={`${styles.universeRepoCard} glass-card`}
                  onClick={() => setSelectedRepo(repo)}
                  data-animate="card"
                  style={{ '--planet-color': color } as CSSProperties}
                >
                  <div className={styles.universeRepoTopline}>
                    <span>{isAi ? '🤖 AI-assisted' : '👤 Manual'}</span>
                    <span>{repo.language || 'Unknown'}</span>
                  </div>
                  <h3>{repo.name}</h3>
                  <p>{repo.aiSummary?.project_function || repo.description || 'A signal in your GitHub universe.'}</p>
                  <div className={styles.universeRepoStats}>
                    <span>{repo.stats?.commits || 0} commits</span>
                    <span>{repo.stats?.locComputation === 'ready' ? 'LOC ready' : repo.stats?.locComputation || 'stats loaded'}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Export Tab */}
        {activeTab === 'export' && (
          <div className={styles.section}>
            <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
              <h2 className={styles.sectionTitle}>Export Your Wrapped</h2>
              <p style={{ color: 'var(--text-dim)', marginBottom: '32px' }}>
                Download your GitHub Wrapped as a standalone HTML file that you can share or archive.
              </p>

              <button onClick={exportAsHTML} className="btn btn-primary" style={{ width: '100%' }}>
                <span>📥</span>
                Download as HTML
              </button>

              <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(0, 184, 255, 0.1)', borderRadius: '8px' }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>
                  <strong>What's included:</strong>
                  <br />
                  • All your statistics and metrics
                  <br />
                  • AI-generated repository summaries
                  <br />
                  • Contribution heatmap
                  <br />
                  • Impact analytics
                  <br />
                  • Beautiful glassmorphism UI
                  <br />
                  • Self-contained (no external dependencies)
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Enhanced Repository Detail Modal - Now with Edit Capability */}
      {selectedRepo && (
        <div className={styles.modalOverlay} onClick={() => setSelectedRepo(null)}>
          <div 
            className={`${styles.modalContent} ${styles.modalEnhanced}`} 
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <h2>{selectedRepo.name}</h2>
                <div className={styles.modalHeaderMeta}>
                  {selectedRepo.language && (
                    <span className={styles.repoLanguage}>{selectedRepo.language}</span>
                  )}
                  {/* AI/Manual Badge - respects inheritance */}
                  <span className={`${styles.modeBadge} ${isRepoAiAssisted(selectedRepo.name) ? styles.aiMode : styles.manualMode}`}>
                    {isRepoAiAssisted(selectedRepo.name) ? '🤖 AI-Assisted' : '👤 Manual'}
                    {repoPreferences[selectedRepo.name]?.aiAssisted === undefined && (
                      <span className={styles.inheritedBadge}>(inherited)</span>
                    )}
                  </span>
                </div>
              </div>
              <div className={styles.modalHeaderActions}>
                <button 
                  onClick={() => openEditModal(selectedRepo)} 
                  className={styles.editBtn}
                >
                  ✏️ Edit
                </button>
                <button 
                  onClick={() => rescanRepo(selectedRepo)} 
                  className={styles.rescanBtn}
                  disabled={rescanningRepo === selectedRepo.name}
                >
                  {rescanningRepo === selectedRepo.name ? '⏳ Rescanning...' : '🔄 Rescan'}
                </button>
                <button onClick={() => setSelectedRepo(null)} className={styles.modalClose}>
                  ×
                </button>
              </div>
            </div>
            <div className={styles.modalBody}>
              {/* User Narrative if exists */}
              {repoPreferences[selectedRepo.name]?.narrative && (
                <div className={`${styles.modalSection} ${styles.narrativeSection}`}>
                  <h3>📝 Your Notes</h3>
                  <p className={styles.narrativeText}>{repoPreferences[selectedRepo.name]?.narrative}</p>
                </div>
              )}

              {/* Deployment URLs */}
              {repoPreferences[selectedRepo.name]?.deploymentUrls?.length > 0 && (
                <div className={styles.modalSection}>
                  <h3>🌐 Deployment URLs</h3>
                  <div className={styles.deploymentUrls}>
                    {repoPreferences[selectedRepo.name]?.deploymentUrls.map((urlObj, idx) => (
                      <a 
                        key={idx} 
                        href={urlObj.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={styles.deploymentLink}
                      >
                        {urlObj.url}
                        {urlObj.autoDetected && <span className={styles.autoTag}>auto</span>}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats Row */}
              {selectedRepo.stats && (
                <div className={styles.modalStats}>
                  <div className={styles.modalStat}>
                    <span className={styles.modalStatValue}>{selectedRepo.stats.commits}</span>
                    <span className={styles.modalStatLabel}>Commits</span>
                  </div>
                  <div className={styles.modalStat}>
                    <span className={`${styles.modalStatValue}`} style={{ color: '#00ff88' }}>
                      +{selectedRepo.stats.additions?.toLocaleString()}
                    </span>
                    <span className={styles.modalStatLabel}>Added</span>
                  </div>
                  <div className={styles.modalStat}>
                    <span className={`${styles.modalStatValue}`} style={{ color: '#ff6b6b' }}>
                      -{selectedRepo.stats.deletions?.toLocaleString()}
                    </span>
                    <span className={styles.modalStatLabel}>Deleted</span>
                  </div>
                </div>
              )}

              {/* Commit Attribution - Based on Self-Reported Mode */}
              {selectedRepo.stats?.commits && (
                <div className={styles.modalSection}>
                  <h3>📊 Commit Attribution</h3>
                  <div className={styles.authorAnalysisGrid}>
                    {isRepoAiAssisted(selectedRepo.name) ? (
                      <>
                        <div className={styles.analysisItem}>
                          <span className={styles.analysisValue}>{selectedRepo.stats.commits || 0}</span>
                          <span className={styles.analysisLabel}>🤖 AI-Assisted Commits</span>
                        </div>
                        <div className={styles.analysisItem}>
                          <span className={styles.analysisValue} style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>
                            {(selectedRepo.stats as any).authorAnalysis?.copilotCommits || 0} with markers
                          </span>
                          <span className={styles.analysisLabel}>Detected Copilot</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className={styles.analysisItem}>
                          <span className={styles.analysisValue}>{selectedRepo.stats.commits || 0}</span>
                          <span className={styles.analysisLabel}>👤 Manual Commits</span>
                        </div>
                      </>
                    )}
                    <div className={styles.analysisItem}>
                      <span className={styles.analysisValue}>{(selectedRepo.stats as any).authorAnalysis?.uniqueHumanAuthors || 1}</span>
                      <span className={styles.analysisLabel}>Contributors</span>
                    </div>
                  </div>
                  <p className={styles.attributionNote}>
                    Attribution based on your {repoPreferences[selectedRepo.name]?.aiAssisted !== undefined ? 'repo setting' : 'global setting'}: {isRepoAiAssisted(selectedRepo.name) ? '🤖 AI-Assisted' : '👤 Manual'}
                  </p>
                </div>
              )}

              {selectedRepo.aiSummary && (
                <>
                  <div className={styles.modalSection}>
                    <h3>Project Function</h3>
                    <p>{selectedRepo.aiSummary.project_function}</p>
                  </div>

                  <div className={styles.modalSection}>
                    <h3>AI Integration</h3>
                    <p>
                      {typeof selectedRepo.aiSummary.ai_integration === 'string'
                        ? selectedRepo.aiSummary.ai_integration
                        : Object.entries(selectedRepo.aiSummary.ai_integration).map(
                            ([key, value]) => (
                              <div key={key}>
                                <strong>{key.replace(/_/g, ' ')}:</strong> {value}
                              </div>
                            )
                          )}
                    </p>
                  </div>

                  <div className={styles.modalSection}>
                    <h3>Development Highlights</h3>
                    <ul>
                      {selectedRepo.aiSummary.development_highlights.map((highlight, i) => (
                        <li key={i}>{highlight}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Tech Tags */}
                  <div className={styles.modalTags}>
                    {selectedRepo.language && (
                      <span className={styles.modalTag}>{selectedRepo.language}</span>
                    )}
                    {selectedRepo.stats?.languages && 
                      Object.keys(selectedRepo.stats.languages).slice(0, 4).map(lang => (
                        <span key={lang} className={styles.modalTag}>{lang}</span>
                      ))
                    }
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Repository Modal */}
      {editingRepo && (
        <div className={styles.modalOverlay} onClick={() => setEditingRepo(null)}>
          <div 
            className={`${styles.modalContent} ${styles.editModal}`} 
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2>Edit: {editingRepo.name}</h2>
              <button onClick={() => setEditingRepo(null)} className={styles.modalClose}>
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              {/* Development Style */}
              <div className={styles.editSection}>
                <label className={styles.editLabel}>Development Style</label>
                <div className={styles.radioGroup}>
                  <label className={`${styles.radioOption} ${editAiAssisted ? styles.active : ''}`}>
                    <input
                      type="radio"
                      checked={editAiAssisted}
                      onChange={() => setEditAiAssisted(true)}
                    />
                    🤖 AI-Assisted
                  </label>
                  <label className={`${styles.radioOption} ${!editAiAssisted ? styles.active : ''}`}>
                    <input
                      type="radio"
                      checked={!editAiAssisted}
                      onChange={() => setEditAiAssisted(false)}
                    />
                    👤 Manual
                  </label>
                </div>
              </div>

              {/* Custom Group */}
              <div className={styles.editSection}>
                <label className={styles.editLabel}>Group</label>
                <div className={styles.groupRow}>
                  <select
                    value={editGroup}
                    onChange={e => setEditGroup(e.target.value)}
                    className={styles.select}
                  >
                    <option value="">Auto-detect</option>
                    {Object.entries(customGroups).map(([key, group]) => (
                      <option key={key} value={key}>{group.icon} {group.name}</option>
                    ))}
                  </select>
                  <button onClick={() => setShowNewGroupModal(true)} className={styles.newGroupBtn}>
                    + New
                  </button>
                </div>
              </div>

              {/* Deployment URLs */}
              <div className={styles.editSection}>
                <label className={styles.editLabel}>Deployment URLs</label>
                <div className={styles.urlList}>
                  {editUrls.map((urlObj, idx) => (
                    <div key={idx} className={styles.urlItem}>
                      <a href={urlObj.url} target="_blank" rel="noopener noreferrer" className={styles.urlLink}>
                        {urlObj.url}
                      </a>
                      {urlObj.autoDetected && <span className={styles.autoTag}>auto</span>}
                      <button 
                        onClick={() => handleRemoveEditUrl(urlObj.url)}
                        className={styles.removeUrlBtn}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {editUrls.length === 0 && (
                    <p className={styles.noUrls}>No deployment URLs</p>
                  )}
                </div>
                <div className={styles.addUrlRow}>
                  <input
                    type="url"
                    value={newUrl}
                    onChange={e => setNewUrl(e.target.value)}
                    placeholder="https://..."
                    className={styles.input}
                    onKeyDown={e => e.key === 'Enter' && handleAddEditUrl()}
                  />
                  <button onClick={handleAddEditUrl} className={styles.addBtn} disabled={!newUrl.trim()}>
                    Add
                  </button>
                </div>
              </div>

              {/* Narrative */}
              <div className={styles.editSection}>
                <label className={styles.editLabel}>Project Notes</label>
                <p className={styles.editHint}>These notes enhance AI-generated summaries. Rescan after editing.</p>
                <textarea
                  value={editNarrative}
                  onChange={e => setEditNarrative(e.target.value)}
                  placeholder="e.g., Built in 48hrs for a hackathon. Used Next.js with custom animations."
                  className={styles.textarea}
                  rows={3}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button onClick={() => setEditingRepo(null)} className={styles.cancelBtn}>
                Cancel
              </button>
              <button onClick={saveEditModal} className={styles.saveBtn}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Group Modal */}
      {showNewGroupModal && (
        <div className={styles.modalOverlay} onClick={() => setShowNewGroupModal(false)}>
          <div 
            className={`${styles.modalContent} ${styles.smallModal}`} 
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2>New Group</h2>
              <button onClick={() => setShowNewGroupModal(false)} className={styles.modalClose}>
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.editSection}>
                <label className={styles.editLabel}>Group Name</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  placeholder="e.g., Side Projects"
                  className={styles.input}
                />
              </div>
              <div className={styles.editSection}>
                <label className={styles.editLabel}>Icon</label>
                <div className={styles.iconPicker}>
                  {['📁', '🚀', '💼', '🎮', '🔧', '📱', '🌐', '🤖'].map(icon => (
                    <button
                      key={icon}
                      className={`${styles.iconBtn} ${newGroupIcon === icon ? styles.active : ''}`}
                      onClick={() => setNewGroupIcon(icon)}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button onClick={() => setShowNewGroupModal(false)} className={styles.cancelBtn}>
                Cancel
              </button>
              <button onClick={handleCreateGroup} className={styles.saveBtn} disabled={!newGroupName.trim()}>
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* API Key Modal for BYOK */}
      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onSave={() => setShowApiKeyModal(false)}
      />
    </>
  )
}
