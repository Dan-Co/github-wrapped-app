/**
 * HTML Export - Main entry point
 * 
 * Generates a self-contained, interactive HTML file from the Wrapped page
 * that can be hosted anywhere as a static file.
 */

import { getExportStyles } from './export/styles'
import { 
  generateRepoCardsHTML, 
  generateAchievementsHTML, 
  generateFeaturedHTML,
  generateLanguageBarsHTML,
  generateOverviewTab,
  generateImpactTab,
  generateModalScript
} from './export/templates'
import type { ExportData, RepoDetail } from './export/types'

// Re-export types
export type { ExportData } from './export/types'

/**
 * Generate a complete interactive HTML export
 */
export function generateInteractiveHTML(data: ExportData): string {
  const year = new Date().getFullYear()
  const {
    repositories,
    stats,
    impactMetrics,
    repoPreferences,
    developmentMode,
    achievements,
    featuredProjects,
    exportedAt,
  } = data

  // Format export date for display
  const exportDate = exportedAt 
    ? new Date(exportedAt).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })

  // Helper to check if repo is AI-assisted
  const isAiAssisted = (repoName: string): boolean => {
    const pref = repoPreferences[repoName]
    if (pref?.aiAssisted !== undefined) return pref.aiAssisted
    return developmentMode === 'ai'
  }

  // Generate template parts
  const languageBarsHTML = generateLanguageBarsHTML(stats.languages)
  const achievementsHTML = generateAchievementsHTML(achievements)
  const featuredHTML = generateFeaturedHTML(featuredProjects)
  const repoCardsHTML = generateRepoCardsHTML(data, isAiAssisted)
  
  // Generate tab content
  const overviewTab = generateOverviewTab(data, languageBarsHTML, featuredHTML)
  const impactTab = generateImpactTab(data, achievementsHTML)
  
  // Generate repo details for modal
  const repoDetails: RepoDetail[] = repositories.map((repo, idx) => {
    // Get languages from the repo stats
    const languages = repo.stats?.languages 
      ? Object.keys(repo.stats.languages).slice(0, 4) 
      : (repo.language ? [repo.language] : [])
    
    return {
      index: idx,
      name: repo.name,
      description: repo.description,
      language: repo.language,
      languages,
      isAi: isAiAssisted(repo.name),
      stats: repo.stats ? {
        commits: repo.stats.commits,
        additions: repo.stats.additions,
        deletions: repo.stats.deletions,
        net: repo.stats.net,
      } : undefined,
      aiSummary: repo.aiSummary ? {
        project_function: repo.aiSummary.project_function,
        ai_integration: repo.aiSummary.ai_integration,
        development_highlights: repo.aiSummary.development_highlights,
      } : undefined,
      narrative: repoPreferences[repo.name]?.narrative,
      deploymentUrls: repoPreferences[repo.name]?.deploymentUrls?.map(u => ({
        url: u.url,
        label: u.label,
        autoDetected: u.autoDetected,
      })),
      lastScanned: repoPreferences[repo.name]?.lastScanned,
    }
  })
  
  const modalScript = generateModalScript(repoDetails)
  const styles = getExportStyles()

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GitHub Wrapped ${year}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    ${styles}
  </style>
</head>
<body>
  <div class="prism-background">
    <div class="prism-orb"></div>
    <div class="prism-orb"></div>
  </div>
  
  <nav class="nav">
    <div class="nav-left">
      <div class="nav-logo">GitHub Wrapped ${year}</div>
      <div class="export-date">📅 Exported: ${exportDate}</div>
    </div>
    <div class="nav-tabs">
      <button class="nav-tab active" data-tab="overview">Overview</button>
      <button class="nav-tab" data-tab="impact">Impact</button>
      <button class="nav-tab" data-tab="repositories">Repositories</button>
    </div>
    <div class="mode-indicator">
      ${developmentMode === 'ai' ? '🤖 AI-Assisted' : developmentMode === 'manual' ? '👤 Manual' : '🔀 Mixed'}
    </div>
  </nav>
  
  <main class="main">
    <!-- Overview Tab -->
    <div id="tab-overview" class="tab-content active">
      ${overviewTab}
    </div>
    
    <!-- Impact Tab -->
    <div id="tab-impact" class="tab-content">
      ${impactTab}
    </div>
    
    <!-- Repositories Tab -->
    <div id="tab-repositories" class="tab-content">
      <div class="glass-card">
        <h2 class="section-title">All Repositories (${repositories.length})</h2>
      </div>
      ${repoCardsHTML}
    </div>
  </main>
  
  <footer class="footer">
    Generated with GitHub Wrapped • ${year}
  </footer>
  
  <!-- Repo Detail Modal -->
  <div class="modal-overlay" id="repo-modal">
    <div class="modal-content">
      <div class="modal-header">
        <div>
          <h2 id="modal-repo-name"></h2>
          <div id="modal-repo-meta" style="margin-top: 8px;"></div>
        </div>
        <button class="modal-close" onclick="closeModal()">&times;</button>
      </div>
      <div id="modal-body"></div>
    </div>
  </div>
  
  <script>
    ${modalScript}
  </script>
</body>
</html>`.trim()
}

/**
 * Trigger download of HTML file
 */
export function downloadHTML(html: string, filename?: string): void {
  const year = new Date().getFullYear()
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || `github-wrapped-${year}.html`
  a.click()
  URL.revokeObjectURL(url)
}
