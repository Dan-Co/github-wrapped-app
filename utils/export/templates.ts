/**
 * Export Templates - HTML template generators
 */

import type { ExportData, RepoDetail } from './types'

/**
 * Get language-specific CSS class for language bars
 */
function getLanguageClass(lang: string): string {
  const langLower = lang.toLowerCase()
  if (langLower === 'typescript') return 'typescript'
  if (langLower === 'javascript') return 'javascript'
  if (langLower === 'python') return 'python'
  return 'default'
}

/**
 * Generate repo cards HTML
 */
export function generateRepoCardsHTML(
  data: ExportData,
  isAiAssisted: (repoName: string) => boolean
): string {
  const { repositories, repoPreferences, repositoryGroups } = data
  
  // Helper to get global index for a repo
  const getGlobalIndex = (repoName: string): number => {
    return repositories.findIndex(r => r.name === repoName)
  }
  
  // If we have groups, render grouped view
  if (repositoryGroups.length > 0) {
    return repositoryGroups.map(group => {
      const groupRepos = group.repos
        .map(name => repositories.find(r => r.name === name))
        .filter(Boolean)
      
      if (groupRepos.length === 0) return ''
      
      return `
        <div class="repo-group">
          <div class="repo-group-header">
            <span class="repo-group-icon">${group.icon}</span>
            <span class="repo-group-title">${group.name}</span>
            <span class="repo-group-count">${groupRepos.length} repos</span>
          </div>
          <div class="repos-grid">
            ${groupRepos.map((repo) => {
              const globalIdx = getGlobalIndex(repo!.name)
              return generateRepoCard(repo!, globalIdx, isAiAssisted, repoPreferences)
            }).join('')}
          </div>
        </div>
      `
    }).join('')
  }
  
  // Ungrouped view
  return `
    <div class="repos-grid">
      ${repositories.map((repo, idx) => generateRepoCard(repo, idx, isAiAssisted, repoPreferences)).join('')}
    </div>
  `
}

function generateRepoCard(
  repo: ExportData['repositories'][0],
  idx: number,
  isAiAssisted: (name: string) => boolean,
  repoPreferences: ExportData['repoPreferences']
): string {
  const isAi = isAiAssisted(repo.name)
  const pref = repoPreferences[repo.name]
  
  // Format scan date
  const scanDateStr = pref?.lastScanned 
    ? new Date(pref.lastScanned).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      })
    : null
  
  return `
    <div class="glass-card repo-card" data-repo-index="${idx}">
      <div class="repo-header">
        <span class="repo-name">${repo.name}</span>
        <span class="mode-badge ${isAi ? 'ai-mode' : 'manual-mode'}">
          ${isAi ? '🤖' : '👤'}
        </span>
      </div>
      ${repo.language ? `<span class="repo-lang">${repo.language}</span>` : ''}
      ${repo.description ? `<p class="repo-desc">${repo.description}</p>` : ''}
      ${repo.aiSummary?.project_function ? `<p class="repo-summary">${repo.aiSummary.project_function}</p>` : ''}
      ${pref?.narrative ? `<p class="repo-narrative"><em>"${pref.narrative}"</em></p>` : ''}
      ${repo.stats ? `
        <div class="repo-stats">
          <div class="stat">
            <span class="stat-value">${repo.stats.commits || 0}</span>
            <span class="stat-label">Commits</span>
          </div>
          <div class="stat">
            <span class="stat-value green">+${(repo.stats.additions || 0).toLocaleString()}</span>
            <span class="stat-label">Added</span>
          </div>
          <div class="stat">
            <span class="stat-value">${(repo.stats.net || 0).toLocaleString()}</span>
            <span class="stat-label">Net</span>
          </div>
        </div>
      ` : ''}
      ${pref?.deploymentUrls?.length ? `
        <div class="deployment-links">
          ${pref.deploymentUrls.map(u => `<a href="${u.url}" target="_blank" class="deploy-link">🔗 ${u.label || 'Live'}</a>`).join('')}
        </div>
      ` : ''}
      ${scanDateStr ? `<div class="scan-date">📅 Scanned: ${scanDateStr}</div>` : ''}
    </div>
  `
}

/**
 * Generate achievements HTML
 */
export function generateAchievementsHTML(achievements: ExportData['achievements']): string {
  if (!achievements?.length) return ''
  
  return achievements.map(a => `
    <div class="achievement ${(a.rarity || 'common').toLowerCase()}">
      <span class="achievement-icon">${a.icon}</span>
      <div class="achievement-content">
        <span class="achievement-title">${a.title}</span>
        <span class="achievement-desc">${a.description}</span>
      </div>
      ${a.rarity ? `<span class="achievement-rarity">${a.rarity}</span>` : ''}
    </div>
  `).join('')
}

/**
 * Generate featured projects HTML
 */
export function generateFeaturedHTML(featuredProjects: ExportData['featuredProjects']): string {
  if (!featuredProjects?.length) return ''
  
  return featuredProjects.map(p => `
    <div class="featured-card" style="border-color: ${p.color}">
      <div class="featured-category">
        <span>${p.categoryIcon}</span>
        <span>${p.category}</span>
      </div>
      <h3 class="featured-name">${p.repoName}</h3>
      <p class="featured-headline">${p.headline}</p>
      <p class="featured-desc">${p.description}</p>
    </div>
  `).join('')
}

/**
 * Generate language bars HTML
 */
export function generateLanguageBarsHTML(languages: Record<string, number>): string {
  const topLanguages = Object.entries(languages)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 6)
  
  if (topLanguages.length === 0) return ''
  
  const maxBytes = topLanguages[0]?.[1] as number || 1
  
  return topLanguages.map(([lang, bytes]) => {
    const percent = Math.round(((bytes as number) / maxBytes) * 100)
    return `
      <div class="language-item">
        <span class="language-name">${lang}</span>
        <div class="language-bar-container">
          <div class="language-bar ${getLanguageClass(lang)}" style="width: ${percent}%"></div>
        </div>
        <span class="language-percent">${percent}%</span>
      </div>
    `
  }).join('')
}

/**
 * Generate Overview tab HTML
 */
export function generateOverviewTab(data: ExportData, languageBarsHTML: string, featuredHTML: string): string {
  const { stats, repositories, aiInsights, yearNarrative, contributionData } = data
  const primaryLang = Object.entries(stats.languages).sort(
    ([, a], [, b]) => (b as number) - (a as number)
  )[0]?.[0] || 'Unknown'
  
  // Generate heatmap HTML from real contribution data
  const heatmapHTML = generateContributionHeatmapHTML(contributionData)
  
  return `
    <div class="hero-grid">
      <div class="glass-card hero-card">
        <div class="label">Total Commits</div>
        <div class="big-number mega">${stats.totalCommits.toLocaleString()}</div>
        <div class="hero-title">commits across ${repositories.length} repositories</div>
      </div>
      <div class="glass-card hero-card">
        <div class="label">Lines of Code (Net)</div>
        <div class="big-number mega">${stats.totalNet.toLocaleString()}</div>
        <div class="hero-title">net lines added to your projects</div>
      </div>
    </div>
    
    <div class="stats-grid">
      <div class="glass-card">
        <div class="label">Lines Added</div>
        <div class="mono-value green">+${stats.totalAdditions.toLocaleString()}</div>
        <div class="subtitle">new code written</div>
      </div>
      <div class="glass-card">
        <div class="label">Lines Deleted</div>
        <div class="mono-value red">-${stats.totalDeletions.toLocaleString()}</div>
        <div class="subtitle">code removed</div>
      </div>
      <div class="glass-card">
        <div class="label">Primary Language</div>
        <div class="mono-value small">${primaryLang}</div>
        <div class="subtitle">most used language</div>
      </div>
      <div class="glass-card">
        <div class="label">Languages Used</div>
        <div class="mono-value">${Object.keys(stats.languages).length}</div>
        <div class="subtitle">programming languages</div>
      </div>
    </div>
    
    ${yearNarrative ? `
      <div class="glass-card year-narrative" style="margin-top: 32px;">
        <h2 class="narrative-title">🎯 ${yearNarrative.title}</h2>
        <p class="narrative-intro">${yearNarrative.intro}</p>
        ${yearNarrative.context ? `
          <div class="narrative-context">
            <strong>Important context:</strong> ${yearNarrative.context}
          </div>
        ` : ''}
      </div>
    ` : ''}
    
    ${featuredHTML ? `
      <div class="glass-card" style="margin-top: 32px;">
        <h2 class="section-title">Featured Projects</h2>
        <div class="featured-grid">
          ${featuredHTML}
        </div>
      </div>
    ` : ''}
    
    ${aiInsights ? `
      <div class="glass-card ai-insights-section" style="margin-top: 32px;">
        <div class="ai-insights-headline">🤖 ${aiInsights.headline || 'AI-Assisted Development Insights'}</div>
        ${aiInsights.description ? `<p class="ai-insights-description">${aiInsights.description}</p>` : ''}
        
        <div class="impact-cards-grid">
          ${aiInsights.whatChanged && aiInsights.whatChanged.length > 0 ? `
            <div class="impact-card-large cyan">
              <div class="impact-card-header cyan">🔄 What Changed</div>
              <ul class="impact-list">
                ${aiInsights.whatChanged.map(item => `
                  <li><span class="arrow cyan">→</span>${item}</li>
                `).join('')}
              </ul>
            </div>
          ` : ''}
          
          ${aiInsights.honestTake && aiInsights.honestTake.length > 0 ? `
            <div class="impact-card-large purple">
              <div class="impact-card-header purple">⚖️ The Honest Take</div>
              <ul class="impact-list">
                ${aiInsights.honestTake.map(item => `
                  <li><span class="arrow purple">✓</span>${item}</li>
                `).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      </div>
    ` : ''}
    
    <div class="glass-card" style="margin-top: 32px;">
      <h2 class="section-title">Contribution Activity</h2>
      ${heatmapHTML}
    </div>
    
    <div class="glass-card" style="margin-top: 32px;">
      <h2 class="section-title">Language Distribution</h2>
      <div class="language-list">
        ${languageBarsHTML}
      </div>
    </div>
  `
}

/**
 * Generate contribution heatmap HTML from real GitHub data
 */
function generateContributionHeatmapHTML(contributionData: ExportData['contributionData']): string {
  const getHeatLevel = (count: number): string => {
    if (count === 0) return ''
    if (count < 3) return 'level1'
    if (count < 6) return 'level2'
    if (count < 10) return 'level3'
    return 'level4'
  }
  
  if (!contributionData) {
    return `
      <div class="heatmap-container">
        <div style="text-align: center; padding: 40px; color: var(--text-dim);">
          Contribution data not available
        </div>
      </div>
    `
  }
  
  const { year, totalContributions, activeDays, weeks } = contributionData
  
  const weeksHTML = weeks.map(week => {
    const cellsHTML = week.contributionDays.map(day => 
      `<div class="heat-cell ${getHeatLevel(day.contributionCount)}" title="${day.contributionCount} contributions on ${day.date}"></div>`
    ).join('')
    return `<div class="heat-week">${cellsHTML}</div>`
  }).join('')
  
  // Generate month labels for 12-column grid
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    .map(m => `<span class="heatmap-month">${m}</span>`)
    .join('')
  
  return `
    <div class="heatmap-container">
      <div class="heatmap-stats">
        <div class="heatmap-stat-item">
          <span class="heatmap-stat-icon">📅</span>
          <span class="heatmap-stat-value">${year}</span>
          <span class="heatmap-stat-label">Year</span>
        </div>
        <div class="heatmap-stat-item">
          <span class="heatmap-stat-value">${totalContributions.toLocaleString()}</span>
          <span class="heatmap-stat-label">Contributions</span>
        </div>
        <div class="heatmap-stat-item">
          <span class="heatmap-stat-icon">🔥</span>
          <span class="heatmap-stat-value">${activeDays}</span>
          <span class="heatmap-stat-label">Active Days</span>
        </div>
      </div>
      
      <div class="heatmap-months">
        ${monthLabels}
      </div>
      
      <div class="heatmap-grid">
        ${weeksHTML}
      </div>
      
      <div class="heatmap-legend">
        <span>Less</span>
        <div class="heat-cell"></div>
        <div class="heat-cell level1"></div>
        <div class="heat-cell level2"></div>
        <div class="heat-cell level3"></div>
        <div class="heat-cell level4"></div>
        <span>More</span>
      </div>
    </div>
  `
}

/**
 * Generate Impact tab HTML
 */
export function generateImpactTab(
  data: ExportData,
  achievementsHTML: string
): string {
  const { impactMetrics, aiInsights, stats } = data
  
  return `
    <h2 class="section-title">Developer Time Impact</h2>
    
    <!-- Time Comparison -->
    <div class="glass-card">
      <div class="time-comparison">
        <div class="time-block">
          <div class="time-label">Traditional Development</div>
          <div class="time-value">${impactMetrics.traditionalDays.toLocaleString()}</div>
          <div class="subtitle">developer days at 200-300 LOC/day</div>
        </div>
        <div class="vs-badge">VS</div>
        <div class="time-block">
          <div class="time-label">Your Actual Output</div>
          <div class="time-value highlight">~${impactMetrics.yourActiveDays}</div>
          <div class="subtitle">active development days</div>
        </div>
      </div>
    </div>
    
    <div class="stats-grid">
      <div class="glass-card">
        <div class="label">Productivity Multiplier</div>
        <div class="big-number">${impactMetrics.productivityMultiplier}x</div>
        <div class="subtitle">vs traditional development</div>
      </div>
      <div class="glass-card">
        <div class="label">Time Equivalent</div>
        <div class="mono-value">
          ${((impactMetrics.traditionalDays - impactMetrics.yourActiveDays) / 365).toFixed(1)} years
        </div>
        <div class="subtitle">of traditional development</div>
      </div>
      <div class="glass-card">
        <div class="label">Daily Output</div>
        <div class="mono-value">${impactMetrics.yourLinesPerDay.toLocaleString()} LOC</div>
        <div class="subtitle">average lines per day</div>
      </div>
      <div class="glass-card">
        <div class="label">Projects Shipped</div>
        <div class="mono-value">${impactMetrics.totalProjects}</div>
        <div class="subtitle">complete repositories</div>
      </div>
    </div>
    
    <!-- Development Profile -->
    <div class="glass-card">
      <h2 class="section-title">🎯 Your Development Profile</h2>
      <div class="dev-style-grid">
        <div class="dev-style-card">
          <div class="dev-style-icon">🤖</div>
          <div class="dev-style-value">${impactMetrics.aiAssistedRepos}</div>
          <div class="dev-style-label">AI-Assisted Repos</div>
          <div class="dev-style-sub">
            ${impactMetrics.aiAssistedLOC.toLocaleString()} lines
            ${impactMetrics.topAiLanguage ? `<span class="lang-tag">${impactMetrics.topAiLanguage}</span>` : ''}
          </div>
        </div>
        <div class="dev-style-card">
          <div class="dev-style-icon">👤</div>
          <div class="dev-style-value">${impactMetrics.manualRepos}</div>
          <div class="dev-style-label">Manual Repos</div>
          <div class="dev-style-sub">
            ${impactMetrics.manualLOC.toLocaleString()} lines
            ${impactMetrics.topManualLanguage ? `<span class="lang-tag">${impactMetrics.topManualLanguage}</span>` : ''}
          </div>
        </div>
        <div class="dev-style-card">
          <div class="dev-style-icon">🌐</div>
          <div class="dev-style-value">${impactMetrics.deployedRepos}</div>
          <div class="dev-style-label">Deployed Live</div>
          <div class="dev-style-sub">with deployment URLs</div>
        </div>
        <div class="dev-style-card">
          <div class="dev-style-icon">📝</div>
          <div class="dev-style-value">${impactMetrics.documentedRepos}</div>
          <div class="dev-style-label">Documented</div>
          <div class="dev-style-sub">with project notes</div>
        </div>
      </div>
      
      <div class="ai-percentage-section">
        <div class="ai-percentage-header">
          <span>Development Style Distribution</span>
          <span class="ai-percentage-value">${impactMetrics.selfReportedAiPercentage}% AI-Assisted</span>
        </div>
        <div class="ai-percentage-bar">
          <div class="ai-percentage-fill" style="width: ${impactMetrics.selfReportedAiPercentage}%"></div>
        </div>
        <div class="ai-percentage-labels">
          <span>🤖 AI (${impactMetrics.aiAssistedRepos})</span>
          <span>👤 Manual (${impactMetrics.manualRepos})</span>
        </div>
      </div>
    </div>
    
    ${achievementsHTML ? `
      <div class="glass-card">
        <h2 class="section-title">🏆 Achievements</h2>
        <div class="achievements-grid">
          ${achievementsHTML}
        </div>
      </div>
    ` : ''}
    
    ${aiInsights ? `
      <div class="glass-card">
        <h2 class="section-title">📊 ${aiInsights.headline || 'Development Insights'}</h2>
        
        <div class="ai-stats-row">
          <div class="ai-stat-badge" style="background: linear-gradient(135deg, rgba(0, 255, 249, 0.2), rgba(255, 0, 249, 0.2));">
            <span>🤖</span>
            <span>${impactMetrics.selfReportedAiPercentage}% AI-Assisted (self-reported)</span>
          </div>
          <div class="ai-stat-badge">
            <span>📊</span>
            <span>${impactMetrics.aiAssistedRepos} repos / ${stats.totalCommits.toLocaleString()} commits</span>
          </div>
        </div>
        
        <p class="ai-stats-note">
          Stats based on your development style settings. Copilot markers only capture explicit signatures - 
          most AI-assisted work (inline completions, chat, agent mode) doesn't leave markers.
        </p>
        
        <div class="impact-cards-grid">
          ${aiInsights.whatChanged?.length ? `
            <div class="impact-card-large cyan">
              <div class="impact-card-header">🔄 What The Data Shows</div>
              <ul class="impact-list">
                ${aiInsights.whatChanged.map(item => `<li><span class="arrow cyan">→</span>${item}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
          ${aiInsights.honestTake?.length ? `
            <div class="impact-card-large purple">
              <div class="impact-card-header">⚖️ Observations</div>
              <ul class="impact-list">
                ${aiInsights.honestTake.map(item => `<li><span class="arrow purple">✓</span>${item}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      </div>
    ` : ''}
  `
}

/**
 * Generate modal script
 */
export function generateModalScript(repoDetails: RepoDetail[]): string {
  const repoDetailsJSON = JSON.stringify(repoDetails)
  
  return `
    // Repository data
    const repoDetails = ${repoDetailsJSON};
    
    // Tab switching
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
      });
    });
    
    // Repo card click
    document.querySelectorAll('.repo-card').forEach(card => {
      card.addEventListener('click', () => {
        const index = parseInt(card.dataset.repoIndex);
        if (!isNaN(index) && repoDetails[index]) {
          openRepoModal(repoDetails[index]);
        }
      });
    });
    
    function openRepoModal(repo) {
      document.getElementById('modal-repo-name').textContent = repo.name;
      
      // Meta badges
      const meta = [];
      if (repo.language) meta.push('<span class="modal-lang-chip">' + repo.language + '</span>');
      meta.push('<span class="modal-mode-badge ' + (repo.isAi ? 'ai' : 'manual') + '">' + (repo.isAi ? '🤖 AI-Assisted' : '👤 Manual') + '</span>');
      document.getElementById('modal-repo-meta').innerHTML = meta.join('');
      
      let body = '';
      
      // Deployment URLs section
      if (repo.deploymentUrls?.length) {
        body += '<div class="modal-section">';
        body += '<h3 class="modal-section-title">🌐 Deployment URLs</h3>';
        body += '<div class="modal-deploy-links">';
        repo.deploymentUrls.forEach(u => {
          body += '<a href="' + u.url + '" target="_blank" rel="noopener" class="modal-deploy-chip">';
          body += u.url;
          if (u.autoDetected) body += '<span class="auto-badge">AUTO</span>';
          body += '</a>';
        });
        body += '</div></div>';
      }
      
      // Stats cards
      if (repo.stats) {
        body += '<div class="modal-stats-grid">';
        body += '<div class="modal-stat-card"><div class="modal-stat-value cyan">' + repo.stats.commits + '</div><div class="modal-stat-label">COMMITS</div></div>';
        body += '<div class="modal-stat-card"><div class="modal-stat-value green">+' + (repo.stats.additions || 0).toLocaleString() + '</div><div class="modal-stat-label">ADDED</div></div>';
        body += '<div class="modal-stat-card"><div class="modal-stat-value red">-' + (repo.stats.deletions || 0).toLocaleString() + '</div><div class="modal-stat-label">DELETED</div></div>';
        body += '</div>';
        
        // Attribution section
        body += '<div class="modal-section">';
        body += '<h3 class="modal-section-title">📊 Commit Attribution</h3>';
        body += '<div class="modal-stats-grid three-col">';
        body += '<div class="modal-stat-card"><div class="modal-stat-value cyan">' + repo.stats.commits + '</div><div class="modal-stat-label">AI-ASSISTED<br>COMMITS</div></div>';
        body += '<div class="modal-stat-card"><div class="modal-stat-value">0 with markers</div><div class="modal-stat-label">DETECTED COPILOT</div></div>';
        body += '<div class="modal-stat-card"><div class="modal-stat-value">1</div><div class="modal-stat-label">CONTRIBUTORS</div></div>';
        body += '</div>';
        body += '<div class="modal-attribution-note">Attribution based on your global setting: ' + (repo.isAi ? '🤖 AI-Assisted' : '👤 Manual') + '</div>';
        body += '</div>';
      }
      
      // Project Function
      if (repo.aiSummary?.project_function) {
        body += '<div class="modal-section">';
        body += '<h3 class="modal-section-title cyan">Project Function</h3>';
        body += '<p class="modal-text">' + repo.aiSummary.project_function + '</p>';
        body += '</div>';
      }
      
      // AI Integration
      if (repo.aiSummary?.ai_integration) {
        const integration = typeof repo.aiSummary.ai_integration === 'string' 
          ? repo.aiSummary.ai_integration 
          : JSON.stringify(repo.aiSummary.ai_integration);
        body += '<div class="modal-section">';
        body += '<h3 class="modal-section-title cyan">AI Integration</h3>';
        body += '<p class="modal-text">' + integration + '</p>';
        body += '</div>';
      }
      
      // Development Highlights
      if (repo.aiSummary?.development_highlights?.length) {
        body += '<div class="modal-section">';
        body += '<h3 class="modal-section-title cyan">Development Highlights</h3>';
        body += '<ul class="modal-highlights">';
        repo.aiSummary.development_highlights.forEach(h => {
          body += '<li><span class="highlight-arrow">→</span>' + h + '</li>';
        });
        body += '</ul></div>';
      }
      
      // Project Notes (narrative)
      if (repo.narrative) {
        body += '<div class="modal-section">';
        body += '<h3 class="modal-section-title">📝 Project Notes</h3>';
        body += '<p class="modal-narrative">"' + repo.narrative + '"</p>';
        body += '</div>';
      }
      
      // Language chips at bottom
      if (repo.languages?.length) {
        body += '<div class="modal-lang-chips">';
        repo.languages.forEach(lang => {
          body += '<span class="modal-lang-chip-bottom">' + lang + '</span>';
        });
        body += '</div>';
      }
      
      document.getElementById('modal-body').innerHTML = body;
      document.getElementById('repo-modal').classList.add('active');
      document.body.classList.add('modal-open');
    }
    
    function closeModal() {
      document.getElementById('repo-modal').classList.remove('active');
      document.body.classList.remove('modal-open');
    }
    
    // Close modal on overlay click
    document.getElementById('repo-modal').addEventListener('click', (e) => {
      if (e.target.id === 'repo-modal') closeModal();
    });
    
    // Close modal on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  `
}
