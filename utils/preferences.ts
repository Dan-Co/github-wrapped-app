import type { RepoPreferences, RepoPreference, DevelopmentMode, DeploymentUrl, CustomGroup } from '@/types'

const PREFERENCES_KEY = 'githubWrapped_preferences'

// Default preferences for new users
const DEFAULT_PREFERENCES: RepoPreferences = {
  defaultMode: 'mixed',
  repos: {},
  customGroups: {},
}

// Default preference for a new repo
const DEFAULT_REPO_PREFERENCE: RepoPreference = {
  aiAssisted: false,
  selected: false,
  deploymentUrls: [],
}

/**
 * Load all preferences from localStorage
 */
export function loadPreferences(): RepoPreferences {
  if (typeof window === 'undefined') {
    return DEFAULT_PREFERENCES
  }
  
  try {
    const stored = localStorage.getItem(PREFERENCES_KEY)
    if (!stored) {
      return DEFAULT_PREFERENCES
    }
    
    const parsed = JSON.parse(stored)
    // Ensure all required fields exist (migration safety)
    return {
      defaultMode: parsed.defaultMode || 'mixed',
      repos: parsed.repos || {},
      customGroups: parsed.customGroups || {},
    }
  } catch (error) {
    console.error('Error loading preferences:', error)
    return DEFAULT_PREFERENCES
  }
}

/**
 * Save all preferences to localStorage
 */
export function savePreferences(prefs: RepoPreferences): void {
  if (typeof window === 'undefined') {
    return
  }
  
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs))
  } catch (error) {
    console.error('Error saving preferences:', error)
  }
}

/**
 * Get preference for a specific repo
 */
export function getRepoPreference(repoName: string): RepoPreference {
  const prefs = loadPreferences()
  return prefs.repos[repoName] || { ...DEFAULT_REPO_PREFERENCE }
}

/**
 * Set preference for a specific repo (partial update)
 */
export function setRepoPreference(repoName: string, update: Partial<RepoPreference>): void {
  const prefs = loadPreferences()
  const existing = prefs.repos[repoName] || { ...DEFAULT_REPO_PREFERENCE }
  
  prefs.repos[repoName] = {
    ...existing,
    ...update,
  }
  
  savePreferences(prefs)
}

/**
 * Set the default development mode
 */
export function setDefaultMode(mode: DevelopmentMode): void {
  const prefs = loadPreferences()
  prefs.defaultMode = mode
  savePreferences(prefs)
}

/**
 * Get the default development mode
 */
export function getDefaultMode(): DevelopmentMode {
  const prefs = loadPreferences()
  return prefs.defaultMode
}

/**
 * Toggle AI-assisted status for a repo (creates explicit override)
 * Takes into account the global default when determining current effective value
 */
export function toggleAiAssisted(repoName: string): boolean {
  const prefs = loadPreferences()
  const existing = prefs.repos[repoName] || { ...DEFAULT_REPO_PREFERENCE }
  
  // Determine current effective value (explicit or inherited from global)
  const currentValue = existing.aiAssisted ?? (prefs.defaultMode === 'ai')
  const newValue = !currentValue
  
  prefs.repos[repoName] = {
    ...existing,
    aiAssisted: newValue,
  }
  
  savePreferences(prefs)
  return newValue
}

/**
 * Mark a repo as scanned (updates lastScanned timestamp and increments scanCount)
 */
export function markRepoScanned(repoName: string): void {
  const prefs = loadPreferences()
  const existing = prefs.repos[repoName] || { ...DEFAULT_REPO_PREFERENCE }
  
  prefs.repos[repoName] = {
    ...existing,
    lastScanned: new Date().toISOString(),
    scanCount: (existing.scanCount || 0) + 1,
  }
  
  savePreferences(prefs)
}

/**
 * Mark multiple repos as scanned
 */
export function markReposScanned(repoNames: string[]): void {
  const prefs = loadPreferences()
  const now = new Date().toISOString()
  
  repoNames.forEach(repoName => {
    const existing = prefs.repos[repoName] || { ...DEFAULT_REPO_PREFERENCE }
    prefs.repos[repoName] = {
      ...existing,
      lastScanned: now,
      scanCount: (existing.scanCount || 0) + 1,
    }
  })
  
  savePreferences(prefs)
}

/**
 * Add a deployment URL to a repo
 */
export function addDeploymentUrl(repoName: string, url: DeploymentUrl): void {
  const prefs = loadPreferences()
  const existing = prefs.repos[repoName] || { ...DEFAULT_REPO_PREFERENCE }
  
  // Avoid duplicates
  const exists = existing.deploymentUrls.some(u => u.url === url.url)
  if (!exists) {
    existing.deploymentUrls.push(url)
    prefs.repos[repoName] = existing
    savePreferences(prefs)
  }
}

/**
 * Remove a deployment URL from a repo
 */
export function removeDeploymentUrl(repoName: string, url: string): void {
  const prefs = loadPreferences()
  const existing = prefs.repos[repoName]
  
  if (existing) {
    existing.deploymentUrls = existing.deploymentUrls.filter(u => u.url !== url)
    prefs.repos[repoName] = existing
    savePreferences(prefs)
  }
}

/**
 * Set narrative for a repo
 */
export function setNarrative(repoName: string, narrative: string): void {
  setRepoPreference(repoName, { narrative })
}

/**
 * Create a custom group
 */
export function createCustomGroup(name: string, icon: string, description: string = ''): void {
  const prefs = loadPreferences()
  prefs.customGroups[name] = { name, icon, description }
  savePreferences(prefs)
}

/**
 * Delete a custom group
 */
export function deleteCustomGroup(name: string): void {
  const prefs = loadPreferences()
  delete prefs.customGroups[name]
  
  // Also remove this group from any repos that reference it
  for (const repoName in prefs.repos) {
    if (prefs.repos[repoName].customGroup === name) {
      prefs.repos[repoName] = { ...prefs.repos[repoName], customGroup: undefined }
    }
  }
  
  savePreferences(prefs)
}

/**
 * Get all custom groups
 */
export function getCustomGroups(): Record<string, CustomGroup> {
  const prefs = loadPreferences()
  return prefs.customGroups
}

/**
 * Assign a repo to a custom group
 */
export function assignRepoToGroup(repoName: string, groupName: string | undefined): void {
  setRepoPreference(repoName, { customGroup: groupName })
}

/**
 * Merge new repos with existing preferences (used on re-scan)
 * Preserves existing preferences, applies defaults to new repos
 */
export function mergeWithExistingPreferences(
  newRepos: Array<{ name: string; homepage?: string | null }>
): RepoPreferences {
  const prefs = loadPreferences()
  
  for (const repo of newRepos) {
    if (!prefs.repos[repo.name]) {
      // New repo - apply defaults based on defaultMode
      const aiAssisted = prefs.defaultMode === 'ai' ? true : 
                         prefs.defaultMode === 'manual' ? false : 
                         false // 'mixed' defaults to false, user must specify
      
      const deploymentUrls: DeploymentUrl[] = repo.homepage ? [{
        url: repo.homepage,
        label: 'Website',
        autoDetected: true,
      }] : []
      
      prefs.repos[repo.name] = {
        aiAssisted,
        selected: false,
        deploymentUrls,
      }
    } else {
      // Existing repo - update auto-detected URLs only if not already present
      const existing = prefs.repos[repo.name]
      if (repo.homepage) {
        const hasAutoUrl = existing.deploymentUrls.some(u => u.autoDetected && u.url === repo.homepage)
        if (!hasAutoUrl) {
          // Check if any auto-detected URL exists, update it; otherwise add
          const autoIndex = existing.deploymentUrls.findIndex(u => u.autoDetected)
          if (autoIndex >= 0) {
            existing.deploymentUrls[autoIndex].url = repo.homepage
          } else {
            existing.deploymentUrls.push({
              url: repo.homepage,
              label: 'Website',
              autoDetected: true,
            })
          }
        }
      }
    }
  }
  
  savePreferences(prefs)
  return prefs
}

/**
 * Reset all preferences to defaults
 */
export function resetAllPreferences(): void {
  savePreferences(DEFAULT_PREFERENCES)
}

/**
 * Reset preferences but keep selection state
 */
export function resetPreferencesKeepSelection(): void {
  const prefs = loadPreferences()
  const reset: RepoPreferences = {
    defaultMode: 'mixed',
    repos: {},
    customGroups: {},
  }
  
  // Keep only selection state and auto-detected URLs
  for (const [name, pref] of Object.entries(prefs.repos)) {
    reset.repos[name] = {
      aiAssisted: false,
      selected: pref.selected,
      deploymentUrls: pref.deploymentUrls.filter(u => u.autoDetected),
    }
  }
  
  savePreferences(reset)
}

/**
 * Check if user has any saved preferences (returning user detection)
 */
export function hasExistingPreferences(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  
  const stored = localStorage.getItem(PREFERENCES_KEY)
  if (!stored) {
    return false
  }
  
  try {
    const parsed = JSON.parse(stored)
    // Has preferences if defaultMode is set OR has any repo preferences
    return parsed.defaultMode !== undefined || Object.keys(parsed.repos || {}).length > 0
  } catch {
    return false
  }
}

/**
 * Bulk update AI-assisted status for multiple repos
 */
export function bulkSetAiAssisted(repoNames: string[], aiAssisted: boolean): void {
  const prefs = loadPreferences()
  
  for (const name of repoNames) {
    const existing = prefs.repos[name] || { ...DEFAULT_REPO_PREFERENCE }
    prefs.repos[name] = {
      ...existing,
      aiAssisted,
    }
  }
  
  savePreferences(prefs)
}

/**
 * Bulk update selection status for multiple repos
 */
export function bulkSetSelected(repoNames: string[], selected: boolean): void {
  const prefs = loadPreferences()
  
  for (const name of repoNames) {
    const existing = prefs.repos[name] || { ...DEFAULT_REPO_PREFERENCE }
    prefs.repos[name] = {
      ...existing,
      selected,
    }
  }
  
  savePreferences(prefs)
}
