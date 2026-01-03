'use client'

import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { AnalyzedRepository, DevelopmentMode, RepoPreference, CustomGroup, GROUP_ICONS } from '@/types'
import {
  loadPreferences,
  savePreferences,
  setDefaultMode,
  getDefaultMode,
  getRepoPreference,
  setRepoPreference,
  toggleAiAssisted,
  createCustomGroup,
  getCustomGroups,
  mergeWithExistingPreferences,
  hasExistingPreferences,
  resetAllPreferences,
  addDeploymentUrl,
  removeDeploymentUrl,
  markReposScanned,
} from '@/utils/preferences'
import ApiKeyModal from '@/components/ApiKeyModal'
import styles from './dashboard.module.css'

// Available icons for custom groups
const AVAILABLE_ICONS = ['📁', '🚀', '🔧', '💡', '🎨', '🔬', '📊', '🌐'] as const

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

// Progress state for detailed tracking
interface ProgressState {
  phase: 'idle' | 'fetching-stats' | 'generating-ai' | 'complete'
  currentRepo: string
  completedCount: number
  totalCount: number
  currentStep: string
}

// Extended repository with preference info for display
interface RepoWithPrefs extends AnalyzedRepository {
  aiAssisted?: boolean
  narrative?: string
  customGroup?: string
  lastScanned?: string
  scanCount?: number
}

// Helper to format scan date in a friendly way
function formatScanDate(isoDate: string): string {
  const date = new Date(isoDate)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [repositories, setRepositories] = useState<RepoWithPrefs[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<ProgressState>({
    phase: 'idle',
    currentRepo: '',
    completedCount: 0,
    totalCount: 0,
    currentStep: '',
  })
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [languageFilter, setLanguageFilter] = useState<string>('all')
  const [yearFilter, setYearFilter] = useState<string>('all')
  
  // Self-reporting state
  const [developmentMode, setDevelopmentMode] = useState<DevelopmentMode>('mixed')
  const [showModeSelector, setShowModeSelector] = useState(true)
  const [customGroups, setCustomGroups] = useState<Record<string, CustomGroup>>({})
  
  // Modal state
  const [selectedRepoForDetails, setSelectedRepoForDetails] = useState<RepoWithPrefs | null>(null)
  const [showResetModal, setShowResetModal] = useState(false)
  const [showNewGroupModal, setShowNewGroupModal] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupIcon, setNewGroupIcon] = useState<string>('📁')
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [pendingAnalysis, setPendingAnalysis] = useState(false)
  
  // Returning user state
  const [isReturningUser, setIsReturningUser] = useState(false)
  const [showRestorePrompt, setShowRestorePrompt] = useState(false)
  const [hasWrappedData, setHasWrappedData] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    } else if (status === 'authenticated') {
      // Check if returning user
      const hasPrefs = hasExistingPreferences()
      setIsReturningUser(hasPrefs)
      
      // Check if wrapped data exists
      const wrappedRepos = localStorage.getItem('analyzedRepositories')
      if (wrappedRepos) {
        try {
          const repos = JSON.parse(wrappedRepos)
          setHasWrappedData(Array.isArray(repos) && repos.length > 0)
        } catch {
          setHasWrappedData(false)
        }
      }
      
      if (hasPrefs) {
        // Load existing preferences
        const prefs = loadPreferences()
        setDevelopmentMode(prefs.defaultMode)
        setCustomGroups(prefs.customGroups)
        setShowModeSelector(false) // Don't show selector if they already chose
        setShowRestorePrompt(true)
      }
      
      fetchRepositories()
    }
  }, [status, router])

  const fetchRepositories = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/github/repositories')
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      // Merge with existing preferences
      const prefs = mergeWithExistingPreferences(data.repositories)
      
      // Apply preferences to repositories
      const reposWithPrefs: RepoWithPrefs[] = data.repositories.map((repo: any) => {
        const repoPref = prefs.repos[repo.name] || {}
        return {
          ...repo,
          selected: repoPref.selected || false,
          // Keep undefined if not explicitly set to allow global default inheritance
          aiAssisted: repoPref.aiAssisted,
          narrative: repoPref.narrative,
          customGroup: repoPref.customGroup,
          lastScanned: repoPref.lastScanned,
          scanCount: repoPref.scanCount,
        }
      })
      
      setRepositories(reposWithPrefs)
      setCustomGroups(prefs.customGroups)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleRepository = (repoId: number) => {
    setRepositories(repos => 
      repos.map(repo => {
        if (repo.id === repoId) {
          const newSelected = !repo.selected
          // Persist selection state
          setRepoPreference(repo.name, { selected: newSelected })
          return { ...repo, selected: newSelected }
        }
        return repo
      })
    )
  }

  // Toggle AI-assisted badge on a repo
  const handleToggleAiAssisted = (repoName: string) => {
    const newValue = toggleAiAssisted(repoName)
    setRepositories(repos =>
      repos.map(repo =>
        repo.name === repoName ? { ...repo, aiAssisted: newValue } : repo
      )
    )
  }

  // Handle development mode change
  const handleModeChange = (mode: DevelopmentMode) => {
    setDevelopmentMode(mode)
    setDefaultMode(mode)
    setShowModeSelector(false)
    
    // Clear explicit aiAssisted values so repos inherit from global default
    const prefs = loadPreferences()
    
    // Count how many repos have explicit overrides
    const overriddenRepos = Object.entries(prefs.repos).filter(
      ([, pref]) => pref.aiAssisted !== undefined
    )
    
    if (mode !== 'mixed') {
      // Clear all explicit values so they inherit from the new global default
      Object.keys(prefs.repos).forEach(repoName => {
        if (prefs.repos[repoName]) {
          // Remove explicit aiAssisted to enable inheritance
          prefs.repos[repoName] = { ...prefs.repos[repoName], aiAssisted: undefined }
        }
      })
      
      savePreferences(prefs)
      
      // Update UI to show repos inheriting from global
      setRepositories(repos =>
        repos.map(repo => ({
          ...repo,
          aiAssisted: undefined, // Will inherit from developmentMode
        }))
      )
    }
  }

  // Open repo details modal
  const openRepoDetails = (repo: RepoWithPrefs) => {
    setSelectedRepoForDetails(repo)
  }

  // Save repo details from modal
  const saveRepoDetails = (
    repoName: string,
    updates: { aiAssisted: boolean; narrative?: string; customGroup?: string }
  ) => {
    setRepoPreference(repoName, updates)
    
    setRepositories(repos =>
      repos.map(repo =>
        repo.name === repoName
          ? { ...repo, ...updates }
          : repo
      )
    )
    
    setSelectedRepoForDetails(null)
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

  // Handle reset preferences
  const handleResetPreferences = () => {
    resetAllPreferences()
    setDevelopmentMode('mixed')
    setShowModeSelector(true)
    setCustomGroups({})
    setShowResetModal(false)
    
    // Reset UI state
    setRepositories(repos =>
      repos.map(repo => ({
        ...repo,
        selected: false,
        aiAssisted: undefined,
        narrative: undefined,
        customGroup: undefined,
      }))
    )
  }

  // Get unique languages and years for filter dropdowns
  const languages = [...new Set(repositories.map(r => r.language).filter(Boolean))] as string[]
  const years = [...new Set(repositories.map(r => new Date(r.created_at).getFullYear()))].sort((a, b) => b - a)

  // Filter repositories based on current filters
  const filteredRepositories = repositories.filter(repo => {
    const matchesSearch = searchQuery === '' || 
      repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesLanguage = languageFilter === 'all' || repo.language === languageFilter
    
    const matchesYear = yearFilter === 'all' || 
      new Date(repo.created_at).getFullYear().toString() === yearFilter
    
    return matchesSearch && matchesLanguage && matchesYear
  })

  // Select/deselect all filtered repositories
  const selectAll = () => {
    const filteredIds = new Set(filteredRepositories.map(r => r.id))
    const prefs = loadPreferences()
    
    setRepositories(repos =>
      repos.map(repo => {
        if (filteredIds.has(repo.id)) {
          prefs.repos[repo.name] = { ...prefs.repos[repo.name], selected: true }
          return { ...repo, selected: true }
        }
        return repo
      })
    )
    
    savePreferences(prefs)
  }

  const deselectAll = () => {
    const filteredIds = new Set(filteredRepositories.map(r => r.id))
    const prefs = loadPreferences()
    
    setRepositories(repos =>
      repos.map(repo => {
        if (filteredIds.has(repo.id)) {
          prefs.repos[repo.name] = { ...prefs.repos[repo.name], selected: false }
          return { ...repo, selected: false }
        }
        return repo
      })
    )
    
    savePreferences(prefs)
  }

  const filteredSelectedCount = filteredRepositories.filter(r => r.selected).length
  const allFilteredSelected = filteredRepositories.length > 0 && 
    filteredSelectedCount === filteredRepositories.length

  // Analyze a single repo - returns the analyzed result
  const analyzeRepo = async (repo: RepoWithPrefs): Promise<RepoWithPrefs> => {
    // Fetch stats
    setProgress(p => ({ ...p, currentStep: `Fetching stats for ${repo.name}...` }))
    
    const statsRes = await fetch('/api/github/stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        owner: repo.owner.login,
        repo: repo.name,
      }),
    })
    const stats = await statsRes.json()

    // Generate AI summary - include user narrative if provided
    setProgress(p => ({ ...p, currentStep: `Generating AI summary for ${repo.name}...` }))
    
    const repoPref = getRepoPreference(repo.name)
    
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
        narrative: repoPref.narrative, // Include user narrative for AI context
      }),
    })
    
    // Check if BYOK is required
    if (analyzeRes.status === 403) {
      const errorData = await analyzeRes.json()
      if (errorData.code === 'BYOK_REQUIRED') {
        throw new Error('BYOK_REQUIRED')
      }
    }
    
    const { summary } = await analyzeRes.json()

    return {
      ...repo,
      stats,
      aiSummary: summary,
      analyzing: false,
    }
  }

  const analyzeRepositories = async () => {
    const selectedRepos = repositories.filter(r => r.selected)
    
    if (selectedRepos.length === 0) {
      alert('Please select at least one repository')
      return
    }
    
    // Check if API key is needed before starting
    // Try a quick check by attempting to analyze - if it fails with BYOK_REQUIRED, show modal
    if (!getStoredApiKey()) {
      // Do a pre-flight check to see if user is allowlisted
      try {
        const checkRes = await fetch('/api/github/analyze', {
          method: 'POST',
          headers: getAIHeaders(),
          body: JSON.stringify({ repoName: '__check__', stats: {} }),
        })
        if (checkRes.status === 403) {
          const data = await checkRes.json()
          if (data.code === 'BYOK_REQUIRED') {
            setPendingAnalysis(true)
            setShowApiKeyModal(true)
            return
          }
        }
      } catch {
        // Continue anyway, will fail gracefully
      }
    }

    // Initialize progress
    setProgress({
      phase: 'fetching-stats',
      currentRepo: '',
      completedCount: 0,
      totalCount: selectedRepos.length,
      currentStep: 'Starting analysis...',
    })

    // Mark all selected as analyzing
    setRepositories(repos =>
      repos.map(r => r.selected ? { ...r, analyzing: true } : r)
    )

    const analyzedResults: AnalyzedRepository[] = []
    const BATCH_SIZE = 8 // Process 8 repos in parallel for speed

    // Process in batches for efficiency
    for (let i = 0; i < selectedRepos.length; i += BATCH_SIZE) {
      const batch = selectedRepos.slice(i, i + BATCH_SIZE)
      
      setProgress(p => ({
        ...p,
        currentStep: `Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(selectedRepos.length / BATCH_SIZE)}...`,
      }))

      // Process batch in parallel
      const batchPromises = batch.map(async (repo) => {
        try {
          const result = await analyzeRepo(repo)
          
          // Update UI as each repo completes
          setRepositories(repos =>
            repos.map(r => r.id === repo.id ? result : r)
          )
          
          setProgress(p => ({
            ...p,
            completedCount: p.completedCount + 1,
          }))
          
          return result
        } catch (err: any) {
          console.error(`Error analyzing ${repo.name}:`, err)
          
          // Update UI with error
          setRepositories(repos =>
            repos.map(r =>
              r.id === repo.id
                ? { ...r, error: err.message, analyzing: false }
                : r
            )
          )
          
          setProgress(p => ({
            ...p,
            completedCount: p.completedCount + 1,
          }))
          
          return null
        }
      })

      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises)
      
      // Add successful results
      batchResults.forEach(result => {
        if (result) analyzedResults.push(result)
      })
    }

    // Calculate total stats to pass to grouping API
    const totalStats = analyzedResults.reduce(
      (acc: any, repo: any) => {
        if (repo.stats) {
          acc.totalCommits += repo.stats.commits || 0
          acc.totalAdditions += repo.stats.additions || 0
          acc.totalDeletions += repo.stats.deletions || 0
          acc.totalNet += repo.stats.net || 0
        }
        return acc
      },
      { totalCommits: 0, totalAdditions: 0, totalDeletions: 0, totalNet: 0 }
    )

    // Now call the grouping API to categorize all repos and generate insights
    setProgress(p => ({
      ...p,
      currentStep: 'Generating intelligent groupings and year insights...',
    }))

    let analysisData: any = { groups: [] }
    try {
      // Include user preferences for the grouping API
      const userPreferences = loadPreferences()
      
      const groupRes = await fetch('/api/github/group', {
        method: 'POST',
        headers: getAIHeaders(),
        body: JSON.stringify({ 
          repositories: analyzedResults,
          totalStats,
          userPreferences, // Pass user preferences for AI context
        }),
      })
      
      // Check if BYOK is required
      if (groupRes.status === 403) {
        const errorData = await groupRes.json()
        if (errorData.code === 'BYOK_REQUIRED') {
          setPendingAnalysis(true)
          setShowApiKeyModal(true)
          return
        }
      }
      
      analysisData = await groupRes.json()
    } catch (err) {
      console.error('Error analyzing repositories:', err)
      // Fallback to no grouping/insights
    }

    // Complete
    setProgress(p => ({
      ...p,
      phase: 'complete',
      currentStep: 'Analysis complete!',
    }))

    // Mark all analyzed repos as scanned
    markReposScanned(analyzedResults.map(r => r.name))
    
    // Reload preferences to update UI with scan timestamps
    const updatedPrefs = loadPreferences()
    setRepositories(repos =>
      repos.map(repo => ({
        ...repo,
        lastScanned: updatedPrefs.repos[repo.name]?.lastScanned,
        scanCount: updatedPrefs.repos[repo.name]?.scanCount,
      }))
    )

    // Store analyzed repositories, groups, and insights in localStorage for wrapped page
    localStorage.setItem('analyzedRepositories', JSON.stringify(analyzedResults))
    localStorage.setItem('repositoryGroups', JSON.stringify(analysisData.groups || []))
    localStorage.setItem('featuredProjects', JSON.stringify(analysisData.featuredProjects || []))
    localStorage.setItem('yearNarrative', JSON.stringify(analysisData.yearNarrative || null))
    localStorage.setItem('aiInsights', JSON.stringify(analysisData.aiInsights || null))
    localStorage.setItem('achievements', JSON.stringify(analysisData.achievements || []))
    localStorage.setItem('developmentPattern', JSON.stringify(analysisData.developmentPattern || null))
    localStorage.setItem('detectedStats', JSON.stringify(analysisData.detectedStats || null))
    
    // Navigate to wrapped page
    router.push('/wrapped')
  }

  if (status === 'loading' || loading) {
    return (
      <div className={styles.loading}>
        <div className="spinner"></div>
        <p>Loading repositories...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.error}>
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={fetchRepositories} className="btn btn-primary">
          Retry
        </button>
      </div>
    )
  }

  const selectedCount = repositories.filter(r => r.selected).length
  const analyzingCount = repositories.filter(r => r.analyzing).length

  return (
    <>
      <div className="prism-background">
        <div className="prism-orb"></div>
        <div className="prism-orb"></div>
      </div>

      <div className={styles.container}>
        <header className={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              onClick={() => router.push('/')}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.9rem' }}
            >
              Home
            </button>
            <h1>Select Repositories</h1>
          </div>
          <div className={styles.headerActions}>
            {hasWrappedData && (
              <button 
                onClick={() => router.push('/wrapped')} 
                className={`btn btn-primary ${styles.viewWrappedBtn}`}
              >
                🎁 View Wrapped
              </button>
            )}
            <button 
              onClick={() => setShowResetModal(true)} 
              className={`btn btn-secondary ${styles.settingsBtn}`}
              title="Reset Preferences"
            >
              ⚙️
            </button>
            <span className={styles.userInfo}>
              {session?.user?.name || session?.user?.email}
            </span>
            <button onClick={() => signOut()} className="btn btn-secondary">
              Sign Out
            </button>
          </div>
        </header>

        {/* Returning User Prompt */}
        {showRestorePrompt && isReturningUser && (
          <div className={`glass-card ${styles.restorePrompt}`}>
            <div className={styles.restoreContent}>
              <span>👋 Welcome back! Your previous selections were restored.</span>
              <button 
                onClick={() => setShowRestorePrompt(false)} 
                className={styles.dismissBtn}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Development Style Selector */}
        {showModeSelector && (
          <div className={`glass-card ${styles.modeSelector}`}>
            <h3>How did you build this year?</h3>
            <p className={styles.modeSelectorSubtext}>
              Select your primary development style to help us analyze your work accurately.
              <br />
              <span style={{ fontSize: '0.9em', opacity: 0.8, display: 'block', marginTop: '8px' }}>
                This sets a default for all repositories, but you can easily <strong>override this setting per-repository</strong> below.
              </span>
            </p>
            <div className={styles.modeButtons}>
              <button
                className={`${styles.modeBtn} ${developmentMode === 'ai' ? styles.active : ''}`}
                onClick={() => handleModeChange('ai')}
              >
                <span className={styles.modeIcon}>🤖</span>
                <span className={styles.modeLabel}>AI-Assisted</span>
                <span className={styles.modeDesc}>Copilot, Cursor, Claude, etc.</span>
              </button>
              <button
                className={`${styles.modeBtn} ${developmentMode === 'manual' ? styles.active : ''}`}
                onClick={() => handleModeChange('manual')}
              >
                <span className={styles.modeIcon}>👤</span>
                <span className={styles.modeLabel}>Manual</span>
                <span className={styles.modeDesc}>Traditional coding</span>
              </button>
              <button
                className={`${styles.modeBtn} ${developmentMode === 'mixed' ? styles.active : ''}`}
                onClick={() => handleModeChange('mixed')}
              >
                <span className={styles.modeIcon}>🔀</span>
                <span className={styles.modeLabel}>Mixed</span>
                <span className={styles.modeDesc}>I'll specify per repo</span>
              </button>
            </div>
          </div>
        )}

        {/* Current Mode Indicator */}
        {!showModeSelector && (
          <div className={styles.currentMode}>
            <span>
              {developmentMode === 'ai' && '🤖 AI-Assisted mode'}
              {developmentMode === 'manual' && '👤 Manual mode'}
              {developmentMode === 'mixed' && '🔀 Mixed mode'}
            </span>
            <button 
              onClick={() => setShowModeSelector(true)}
              className={styles.changeModeBtn}
            >
              Change
            </button>
          </div>
        )}

        <div className={styles.instructions}>
          <p>Select the repositories you want to include in your GitHub Wrapped. We'll analyze commits, calculate stats, and generate AI summaries.</p>
        </div>

        {/* Filters and Selection Controls */}
        <div className={styles.filterBar}>
          <div className={styles.filters}>
            <input
              type="text"
              placeholder="Search repositories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
            
            <select
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">All Languages</option>
              {languages.map(lang => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
            
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">All Years</option>
              {years.map(year => (
                <option key={year} value={year.toString()}>{year}</option>
              ))}
            </select>
          </div>
          
          <div className={styles.selectionControls}>
            <span className={styles.filterCount}>
              Showing {filteredRepositories.length} of {repositories.length} repos
            </span>
            <button
              onClick={allFilteredSelected ? deselectAll : selectAll}
              className="btn btn-secondary"
              disabled={filteredRepositories.length === 0}
            >
              {allFilteredSelected ? 'Deselect All' : 'Select All'}
              {filteredRepositories.length > 0 && ` (${filteredRepositories.length})`}
            </button>
          </div>
        </div>

        <div className={styles.repoGrid}>
          {filteredRepositories.map(repo => (
            <div
              key={repo.id}
              className={`glass-card ${styles.repoCard} ${repo.selected ? styles.selected : ''}`}
            >
              <div className={styles.repoHeader}>
                <input
                  type="checkbox"
                  checked={repo.selected}
                  onChange={() => toggleRepository(repo.id)}
                  disabled={repo.analyzing}
                />
                <div className={styles.repoTitleArea}>
                  <h3>{repo.name}</h3>
                  {repo.language && (
                    <span className={styles.language}>{repo.language}</span>
                  )}
                </div>
                {/* AI/Manual Badge - respects repo-level → global default inheritance */}
                {(() => {
                  const isAi = repo.aiAssisted ?? (developmentMode === 'ai')
                  return (
                    <button
                      className={`${styles.aiBadge} ${isAi ? styles.aiMode : styles.manualMode}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleAiAssisted(repo.name)
                      }}
                      title={isAi ? 'AI-Assisted (click to toggle)' : 'Manual (click to toggle)'}
                    >
                      {isAi ? '🤖' : '👤'}
                    </button>
                  )
                })()}
              </div>
              
              {repo.description && (
                <p className={styles.description}>{repo.description}</p>
              )}
              
              <div className={styles.repoMeta}>
                <span>⭐ {repo.stargazers_count}</span>
                <span>🔱 {repo.forks_count}</span>
                <span>📅 {new Date(repo.created_at).getFullYear()}</span>
              </div>

              {/* Scan Status */}
              {repo.lastScanned && (
                <div className={styles.scanStatus}>
                  <span className={styles.scanBadge}>
                    ✅ Scanned {formatScanDate(repo.lastScanned)}
                    {repo.scanCount && repo.scanCount > 1 && (
                      <span className={styles.scanCount}>×{repo.scanCount}</span>
                    )}
                  </span>
                </div>
              )}

              {/* Repo Actions */}
              <div className={styles.repoActions}>
                <button
                  className={styles.detailsBtn}
                  onClick={() => openRepoDetails(repo)}
                >
                  ⚙️ Details
                </button>
                {repo.narrative && (
                  <span className={styles.hasNarrative} title="Has notes">📝</span>
                )}
              </div>

              {repo.analyzing && (
                <div className={styles.analyzing}>
                  <div className="spinner"></div>
                  <span>Analyzing...</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className={styles.footer}>
          <p className={styles.selectionInfo}>
            {selectedCount} {selectedCount === 1 ? 'repository' : 'repositories'} selected
          </p>
          
          {progress.phase !== 'idle' && (
            <div className={styles.progressInfo}>
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill} 
                  style={{ width: `${(progress.completedCount / progress.totalCount) * 100}%` }}
                />
              </div>
              <p className={styles.progressText}>
                {progress.currentStep} ({progress.completedCount}/{progress.totalCount})
              </p>
            </div>
          )}
          
          <button
            onClick={analyzeRepositories}
            disabled={selectedCount === 0 || progress.phase !== 'idle'}
            className="btn btn-primary"
          >
            {progress.phase !== 'idle' ? (
              <>
                <div className="spinner"></div>
                Analyzing... ({progress.completedCount}/{progress.totalCount})
              </>
            ) : (
              <>
                <span>🚀</span>
                Analyze & Generate Wrapped
              </>
            )}
          </button>
        </div>
      </div>

      {/* Repo Details Modal */}
      {selectedRepoForDetails && (
        <RepoDetailsModal
          repo={selectedRepoForDetails}
          customGroups={customGroups}
          onSave={saveRepoDetails}
          onClose={() => setSelectedRepoForDetails(null)}
          onCreateGroup={() => setShowNewGroupModal(true)}
        />
      )}

      {/* New Group Modal */}
      {showNewGroupModal && (
        <div className={styles.modalOverlay} onClick={() => setShowNewGroupModal(false)}>
          <div className={`glass-card ${styles.modal}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Create New Group</h3>
              <button onClick={() => setShowNewGroupModal(false)} className={styles.closeBtn}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <label className={styles.label}>Group Name</label>
              <input
                type="text"
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                placeholder="e.g., Work Projects"
                className={styles.input}
              />
              
              <label className={styles.label}>Icon</label>
              <div className={styles.iconPicker}>
                {AVAILABLE_ICONS.map(icon => (
                  <button
                    key={icon}
                    className={`${styles.iconOption} ${newGroupIcon === icon ? styles.selectedIcon : ''}`}
                    onClick={() => setNewGroupIcon(icon)}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button onClick={() => setShowNewGroupModal(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button 
                onClick={handleCreateGroup} 
                className="btn btn-primary"
                disabled={!newGroupName.trim()}
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Preferences Modal */}
      {showResetModal && (
        <div className={styles.modalOverlay} onClick={() => setShowResetModal(false)}>
          <div className={`glass-card ${styles.modal}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>⚠️ Reset Preferences</h3>
              <button onClick={() => setShowResetModal(false)} className={styles.closeBtn}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <p>This will clear:</p>
              <ul className={styles.resetList}>
                <li>Development style selection</li>
                <li>All AI/Manual markings</li>
                <li>Custom groups</li>
                <li>User-added deployment URLs</li>
                <li>Project narratives</li>
              </ul>
              <p className={styles.resetNote}>Auto-detected data will be preserved.</p>
            </div>
            <div className={styles.modalFooter}>
              <button onClick={() => setShowResetModal(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={handleResetPreferences} className={`btn ${styles.dangerBtn}`}>
                Reset Everything
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* API Key Modal for BYOK */}
      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => {
          setShowApiKeyModal(false)
          setPendingAnalysis(false)
        }}
        onSave={(apiKey) => {
          setShowApiKeyModal(false)
          // If there was a pending analysis, retry it
          if (pendingAnalysis) {
            setPendingAnalysis(false)
            // Small delay to ensure localStorage is updated
            setTimeout(() => analyzeRepositories(), 100)
          }
        }}
      />
    </>
  )
}

// Repo Details Modal Component
interface RepoDetailsModalProps {
  repo: RepoWithPrefs
  customGroups: Record<string, CustomGroup>
  onSave: (repoName: string, updates: { aiAssisted: boolean; narrative?: string; customGroup?: string }) => void
  onClose: () => void
  onCreateGroup: () => void
}

function RepoDetailsModal({ repo, customGroups, onSave, onClose, onCreateGroup }: RepoDetailsModalProps) {
  // Get the global default mode to use if repo doesn't have explicit preference
  const globalMode = getDefaultMode()
  const defaultAiAssisted = globalMode === 'ai'
  
  const [aiAssisted, setAiAssisted] = useState(repo.aiAssisted ?? defaultAiAssisted)
  const [narrative, setNarrative] = useState(repo.narrative || '')
  const [selectedGroup, setSelectedGroup] = useState(repo.customGroup || '')
  const [newUrl, setNewUrl] = useState('')
  const [deploymentUrls, setDeploymentUrls] = useState<Array<{url: string; label: string; autoDetected: boolean}>>([])
  
  // Load deployment URLs from preferences
  useEffect(() => {
    const pref = getRepoPreference(repo.name)
    setDeploymentUrls(pref.deploymentUrls || [])
  }, [repo.name])

  const handleSave = () => {
    onSave(repo.name, {
      aiAssisted,
      narrative: narrative.trim() || undefined,
      customGroup: selectedGroup || undefined,
    })
  }

  const handleAddUrl = () => {
    if (!newUrl.trim()) return
    addDeploymentUrl(repo.name, {
      url: newUrl.trim(),
      label: 'Custom',
      autoDetected: false,
    })
    setDeploymentUrls(getRepoPreference(repo.name).deploymentUrls)
    setNewUrl('')
  }

  const handleRemoveUrl = (url: string) => {
    removeDeploymentUrl(repo.name, url)
    setDeploymentUrls(getRepoPreference(repo.name).deploymentUrls)
  }

  // Get stats from repo if available
  const authorAnalysis = (repo.stats as any)?.authorAnalysis

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={`glass-card ${styles.modal} ${styles.detailsModal}`} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{repo.name}</h3>
          <button onClick={onClose} className={styles.closeBtn}>✕</button>
        </div>
        
        <div className={styles.modalBody}>
          {/* Development Style */}
          <div className={styles.detailSection}>
            <label className={styles.label}>Development Style</label>
            <div className={styles.radioGroup}>
              <label className={`${styles.radioLabel} ${aiAssisted ? styles.active : ''}`}>
                <input
                  type="radio"
                  checked={aiAssisted}
                  onChange={() => setAiAssisted(true)}
                />
                🤖 AI-Assisted
              </label>
              <label className={`${styles.radioLabel} ${!aiAssisted ? styles.active : ''}`}>
                <input
                  type="radio"
                  checked={!aiAssisted}
                  onChange={() => setAiAssisted(false)}
                />
                👤 Manual
              </label>
            </div>
          </div>

          {/* Detected Stats (if available) */}
          {authorAnalysis && (
            <div className={styles.detailSection}>
              <label className={styles.label}>Detected Commit Stats</label>
              <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                  <span className={styles.statValue}>{authorAnalysis.copilotCommits || 0}</span>
                  <span className={styles.statLabel}>Copilot Commits</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statValue}>{authorAnalysis.coAuthoredWithCopilot || 0}</span>
                  <span className={styles.statLabel}>Co-authored w/ Copilot</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statValue}>{authorAnalysis.humanCommits || 0}</span>
                  <span className={styles.statLabel}>Human Commits</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statValue}>{authorAnalysis.uniqueHumanAuthors || 1}</span>
                  <span className={styles.statLabel}>Contributors</span>
                </div>
              </div>
            </div>
          )}

          {/* Custom Group */}
          <div className={styles.detailSection}>
            <label className={styles.label}>Group</label>
            <div className={styles.groupRow}>
              <select
                value={selectedGroup}
                onChange={e => setSelectedGroup(e.target.value)}
                className={styles.select}
              >
                <option value="">Auto-detect</option>
                {Object.entries(customGroups).map(([key, group]) => (
                  <option key={key} value={key}>{group.icon} {group.name}</option>
                ))}
              </select>
              <button onClick={onCreateGroup} className={styles.newGroupBtn}>
                + New
              </button>
            </div>
          </div>

          {/* Deployment URLs */}
          <div className={styles.detailSection}>
            <label className={styles.label}>Deployment URLs</label>
            <div className={styles.urlList}>
              {deploymentUrls.map((urlObj, idx) => (
                <div key={idx} className={styles.urlItem}>
                  <a href={urlObj.url} target="_blank" rel="noopener noreferrer" className={styles.urlLink}>
                    {urlObj.url}
                  </a>
                  {urlObj.autoDetected && <span className={styles.autoTag}>auto</span>}
                  <button 
                    onClick={() => handleRemoveUrl(urlObj.url)}
                    className={styles.removeUrlBtn}
                  >
                    ✕
                  </button>
                </div>
              ))}
              {deploymentUrls.length === 0 && (
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
              />
              <button onClick={handleAddUrl} className="btn btn-secondary" disabled={!newUrl.trim()}>
                Add
              </button>
            </div>
          </div>

          {/* Narrative */}
          <div className={styles.detailSection}>
            <label className={styles.label}>Project Notes</label>
            <p className={styles.labelHint}>These notes will be used to enhance AI-generated summaries.</p>
            <textarea
              value={narrative}
              onChange={e => setNarrative(e.target.value)}
              placeholder="e.g., Built in 48hrs for a hackathon. Used Next.js with custom animations."
              className={styles.textarea}
              rows={3}
            />
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={handleSave} className="btn btn-primary">
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
