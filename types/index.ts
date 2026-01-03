export interface Repository {
  id: number
  name: string
  full_name: string
  description: string | null
  language: string | null
  created_at: string
  updated_at: string
  pushed_at: string
  stargazers_count: number
  forks_count: number
  url: string
  homepage?: string | null // For auto-detecting deployment URLs
  owner: {
    login: string
    avatar_url: string
  }
  private: boolean
}

export interface RepositoryStats {
  commits: number
  additions: number
  deletions: number
  net: number
  languages: Record<string, number>
  readme: string | null
  commitMessages: string[]
  commitDates?: string[]  // ISO date strings for each commit
}

export interface AISummary {
  project_function: string
  ai_integration: string | Record<string, string>
  development_highlights: string[]
}

export interface AnalyzedRepository extends Repository {
  stats?: RepositoryStats
  aiSummary?: AISummary
  selected?: boolean
  analyzing?: boolean
  error?: string
}

export interface WrappedData {
  repositories: AnalyzedRepository[]
  totalCommits: number
  totalAdditions: number
  totalDeletions: number
  netLOC: number
  languages: Record<string, number>
  generatedAt: string
}

// ============================================
// Self-Reporting & Preferences Types
// ============================================

export type DevelopmentMode = 'ai' | 'manual' | 'mixed'

export interface DeploymentUrl {
  url: string
  label: string
  autoDetected: boolean
}

export interface RepoPreference {
  // AI assistance self-reporting (undefined = inherit from global default)
  aiAssisted?: boolean
  
  // Selection state for analysis
  selected?: boolean
  
  // Group override (user can move repo to different group)
  customGroup?: string
  
  // Deployment URLs (auto-detected + user-added)
  deploymentUrls: DeploymentUrl[]
  
  // User narrative/notes about the project
  narrative?: string
  
  // Scan tracking
  lastScanned?: string  // ISO date string
  scanCount?: number    // How many times scanned
}

export interface CustomGroup {
  name: string
  icon: string
  description: string
  color?: string
}

export interface RepoPreferences {
  // Global default for development style
  defaultMode: DevelopmentMode
  
  // Per-repo overrides
  repos: {
    [repoName: string]: RepoPreference
  }
  
  // Custom groups created by user
  customGroups: {
    [groupName: string]: CustomGroup
  }
}

// Available icons for custom groups
export const GROUP_ICONS = ['📁', '🚀', '🔧', '💡', '🎨', '🔬', '📊', '🌐'] as const

// ============================================
// Extended types with author analysis
// ============================================

export interface AuthorAnalysis {
  humanCommits: number
  botCommits: number
  copilotCommits: number
  coAuthoredWithCopilot: number
  uniqueHumanAuthors: number
  botAuthors: string[]
}

export interface ExtendedRepositoryStats extends RepositoryStats {
  authorAnalysis?: AuthorAnalysis
  ownerType?: string
  isOrgRepo?: boolean
  generatedAt: string
}
