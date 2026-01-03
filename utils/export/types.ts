/**
 * Export Types
 */

import type { AnalyzedRepository, RepoPreference, CustomGroup } from '@/types'

export interface ExportData {
  repositories: AnalyzedRepository[]
  stats: {
    totalCommits: number
    totalAdditions: number
    totalDeletions: number
    totalNet: number
    languages: Record<string, number>
  }
  repositoryGroups: Array<{
    name: string
    icon: string
    description: string
    repos: string[]
  }>
  impactMetrics: {
    avgCommitsPerRepo: number
    yourActiveDays: number
    yourHours: number
    traditionalDays: number
    traditionalHours: number
    productivityMultiplier: number
    yourLinesPerDay: number
    longestStreak: number
    totalProjects: number
    aiEnhancedProjects: number
    aiAssistedRepos: number
    manualRepos: number
    selfReportedAiPercentage: number
    aiAssistedLOC: number
    manualLOC: number
    deployedRepos: number
    documentedRepos: number
    topAiLanguage: string | null
    topManualLanguage: string | null
  }
  repoPreferences: Record<string, RepoPreference>
  customGroups: Record<string, CustomGroup>
  developmentMode: 'ai' | 'manual' | 'mixed'
  aiInsights?: {
    headline: string
    description: string
    toolsUsed?: string[]
    whatChanged: string[]
    honestTake: string[]
  } | null
  achievements?: Array<{
    icon: string
    title: string
    description: string
    rarity?: string
  }>
  featuredProjects?: Array<{
    repoName: string
    category: string
    categoryIcon: string
    headline: string
    description: string
    color: string
  }>
  yearNarrative?: {
    title: string
    intro: string
    context?: string
  } | null
  exportedAt?: string  // ISO date string when the export was generated
  contributionData?: {
    year: number
    totalContributions: number
    activeDays: number
    weeks: Array<{
      contributionDays: Array<{
        contributionCount: number
        date: string
      }>
    }>
  } | null
}

export interface RepoDetail {
  index: number
  name: string
  description: string | null
  language: string | null
  languages?: string[]
  isAi: boolean
  stats?: {
    commits: number
    additions: number
    deletions: number
    net: number
  }
  aiSummary?: {
    project_function: string
    ai_integration: string | Record<string, string>
    development_highlights?: string[]
  }
  narrative?: string
  deploymentUrls?: Array<{ url: string; label: string; autoDetected?: boolean }>
  lastScanned?: string  // ISO date string when repo was analyzed
}
