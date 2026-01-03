import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

// Check if user is in the allowlist (env var is comma-separated usernames)
function isUserAllowlisted(username: string): boolean {
  if (!username || username.trim() === '') return false // Reject empty usernames
  const allowlist = process.env.ALLOWED_USERS?.split(',')
    .map(u => u.trim().toLowerCase())
    .filter(u => u.length > 0) || [] // Filter out empty entries
  return allowlist.includes(username.toLowerCase())
}

// Get OpenAI client - uses server key for allowlisted users, or provided key for BYOK
function getOpenAIClient(userApiKey?: string): OpenAI {
  return new OpenAI({
    apiKey: userApiKey || process.env.OPENAI_API_KEY,
  })
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check allowlist or BYOK - use verified GitHub login from OAuth
    const username = session.user?.login || ''
    const userApiKey = request.headers.get('x-openai-key')
    
    if (!isUserAllowlisted(username) && !userApiKey) {
      return NextResponse.json({ 
        error: 'API key required',
        code: 'BYOK_REQUIRED',
        message: 'Please provide your OpenAI API key to use AI features'
      }, { status: 403 })
    }
    
    // Use user's key if provided, otherwise use server key (for allowlisted users)
    const openai = getOpenAIClient(isUserAllowlisted(username) ? undefined : userApiKey || undefined)

    const body = await request.json()
    const { repositories, totalStats, userPreferences } = body

    if (!repositories || !Array.isArray(repositories) || repositories.length === 0) {
      return NextResponse.json({ error: 'No repositories provided' }, { status: 400 })
    }

    // Analyze the data to provide context to the AI
    let totalCopilotCommits = 0
    let totalBotCommits = 0
    let totalCoAuthoredWithCopilot = 0
    let orgRepos = 0
    let personalRepos = 0
    
    // Track user-reported AI assistance
    let userReportedAiRepos = 0
    let userReportedManualRepos = 0
    
    // Build a rich summary of all repos for the AI to analyze
    const repoSummaries = repositories.map((repo: any) => {
      // Count AI/bot stats
      const authorAnalysis = repo.stats?.authorAnalysis || {}
      totalCopilotCommits += authorAnalysis.copilotCommits || 0
      totalBotCommits += authorAnalysis.botCommits || 0
      totalCoAuthoredWithCopilot += authorAnalysis.coAuthoredWithCopilot || 0
      
      // Count repo types
      if (repo.stats?.isOrgRepo) {
        orgRepos++
      } else {
        personalRepos++
      }
      
      // Get user preference for this repo
      const repoPref = userPreferences?.repos?.[repo.name]
      const userNarrative = repoPref?.narrative || ''
      const userReportedAi = repoPref?.aiAssisted ?? null
      const userCustomGroup = repoPref?.customGroup || null
      
      if (userReportedAi === true) userReportedAiRepos++
      if (userReportedAi === false) userReportedManualRepos++
      
      return {
        name: repo.name,
        description: repo.description || '',
        language: repo.language || 'Unknown',
        aiSummary: repo.aiSummary?.project_function || '',
        aiIntegration: repo.aiSummary?.ai_integration || 'None',
        highlights: repo.aiSummary?.development_highlights || [],
        commits: repo.stats?.commits || 0,
        additions: repo.stats?.additions || 0,
        deletions: repo.stats?.deletions || 0,
        // Include author analysis for AI detection
        copilotCommits: authorAnalysis.copilotCommits || 0,
        botCommits: authorAnalysis.botCommits || 0,
        coAuthoredWithCopilot: authorAnalysis.coAuthoredWithCopilot || 0,
        humanAuthors: authorAnalysis.uniqueHumanAuthors || 1,
        isOrgRepo: repo.stats?.isOrgRepo || false,
        // User-provided context
        userNarrative,
        userReportedAi,
        userCustomGroup,
      }
    })

    // Calculate derived metrics
    const totalCommits = totalStats?.totalCommits || repositories.reduce((sum: number, r: any) => sum + (r.stats?.commits || 0), 0)
    const aiAssistedPercentage = totalCommits > 0 
      ? Math.round(((totalCopilotCommits + totalCoAuthoredWithCopilot) / totalCommits) * 100)
      : 0
    
    // Calculate user-reported AI usage (more accurate than auto-detection)
    const userReportedTotal = userReportedAiRepos + userReportedManualRepos
    const userReportedAiPercentage = userReportedTotal > 0
      ? Math.round((userReportedAiRepos / userReportedTotal) * 100)
      : null
    
    // Determine the dominant pattern
    const repoTypeContext = orgRepos > personalRepos 
      ? 'primarily organization/work repositories' 
      : orgRepos > 0 
        ? 'a mix of personal and organization repositories'
        : 'personal repositories'

    // Use user-reported data if available, otherwise fall back to auto-detection
    const effectiveAiPercentage = userReportedAiPercentage !== null ? userReportedAiPercentage : aiAssistedPercentage
    const aiUsageContext = userReportedAiPercentage !== null
      ? (userReportedAiPercentage > 50
          ? `developer self-reported ${userReportedAiPercentage}% AI-assisted development`
          : userReportedAiPercentage > 0
            ? `developer self-reported ${userReportedAiPercentage}% AI-assisted development`
            : 'developer reports primarily manual development')
      : (aiAssistedPercentage > 50
          ? 'heavily AI-assisted development (Copilot/bots)'
          : aiAssistedPercentage > 10
            ? 'some AI-assisted development'
            : totalCopilotCommits > 0 || totalCoAuthoredWithCopilot > 0
              ? 'occasional AI assistance'
              : 'traditional development (no detected AI commits)')

    // Collect user custom groups for the AI to respect
    const userCustomGroups = userPreferences?.customGroups || {}
    const customGroupsList = Object.values(userCustomGroups).map((g: any) => `${g.icon} ${g.name}: ${g.description || 'User-defined group'}`).join('\n')

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert developer portfolio analyst. Given a comprehensive list of repositories with their statistics and metadata, you will create a data-driven year-in-review.

CRITICAL RULES:
1. Let the DATA drive your analysis - don't assume side projects, AI usage, etc.
2. **EVERY repository MUST be included in exactly ONE group** - no repos left out!
3. Look for naming patterns in repos (e.g., "focusai-*", "walkies-*", "mealsage-*") and group related projects together
4. Base your narrative entirely on what the numbers and repo characteristics tell you.
5. If a repo has a userCustomGroup specified, respect that assignment.
6. If a repo has userNarrative, incorporate that context into your analysis of that project.
7. Trust userReportedAi over auto-detected AI metrics - the developer knows best.`
        },
        {
          role: 'user',
          content: `Analyze this developer's year of coding:

OVERALL STATS:
- Total Commits: ${totalStats?.totalCommits || totalCommits}
- Lines Added: ${totalStats?.totalAdditions || 'N/A'}
- Lines Deleted: ${totalStats?.totalDeletions || 'N/A'}
- Net Lines: ${totalStats?.totalNet || 'N/A'}
- Total Repositories: ${repositories.length}

AI/AUTOMATION ANALYSIS:
- Copilot Coding Agent Commits: ${totalCopilotCommits}
- Co-authored with Copilot: ${totalCoAuthoredWithCopilot}
- Total Bot Commits (Copilot, Dependabot, etc.): ${totalBotCommits}
- AI-Assisted Percentage (auto-detected): ${aiAssistedPercentage}%
${userReportedAiPercentage !== null ? `- User-Reported AI Repos: ${userReportedAiRepos}/${userReportedTotal} (${userReportedAiPercentage}%)` : ''}
- Pattern: ${aiUsageContext}

REPOSITORY OWNERSHIP:
- Organization Repos: ${orgRepos}
- Personal Repos: ${personalRepos}
- Pattern: ${repoTypeContext}
${customGroupsList ? `\nUSER-DEFINED CUSTOM GROUPS (respect these assignments):\n${customGroupsList}` : ''}

REPOSITORIES (you MUST include ALL ${repositories.length} repos in groups):
${JSON.stringify(repoSummaries, null, 2)}

CRITICAL: Your groups MUST contain ALL ${repositories.length} repositories listed above. Every single repo name must appear in exactly one group.

GROUPING TIPS:
- Look for naming patterns: repos starting with same prefix (focusai-*, walkies-*, mealsage-*) are likely related
- Group by product/project family first, then by technology or purpose
- A repo can only be in ONE group

Respond with JSON in this exact format:
{
  "groups": [
    {
      "name": "Group Name (based on actual project types/themes or naming patterns)",
      "icon": "🤖",
      "description": "Brief description of this category",
      "repos": ["repo-name-1", "repo-name-2"]
    }
  ],
  "featuredProjects": [
    {
      "repoName": "project-name",
      "category": "Category based on what project does",
      "categoryIcon": "🍳",
      "headline": "Short catchy title based on actual project",
      "description": "2-3 sentences about what makes this project impressive (use actual data)",
      "color": "cyan"
    }
  ],
  "yearNarrative": {
    "title": "Data-driven year title (reflect actual patterns - work, AI, scale, etc.)",
    "intro": "2-3 sentence intro based on what the DATA shows",
    "context": "Context derived from the data (e.g., 'Across X org repos and Y personal projects...')"
  },
  "aiInsights": {
    "headline": "Compelling title like 'AI-Augmented Development' or 'Modern Development Workflow' based on detected patterns",
    "description": "2-3 sentence overview of how the developer works, their productivity patterns, and what makes their approach effective",
    "toolsUsed": ["List actual tools detected - Copilot if copilot commits found, Dependabot if bot commits, CI/CD tools, etc."],
    "whatChanged": [
      "Provide 4-6 specific, data-driven insights about HOW the developer works",
      "Examples: 'Shifted to TypeScript-first development across 8 projects'",
      "'Adopted AI pair programming for rapid prototyping'",
      "'Established consistent CI/CD pipelines across org repos'",
      "'Focused on full-stack development with Next.js dominance'",
      "Use actual repo names, languages, and numbers from the data"
    ],
    "honestTake": [
      "Provide 4-6 balanced, thoughtful observations about the work",
      "Examples: 'High velocity output suggests AI assistance or exceptional productivity'",
      "'Mix of org and personal projects shows both professional and passion work'",
      "'Consistent commit patterns indicate disciplined development habits'",
      "'Breadth of languages shows adaptability, depth in TypeScript shows specialization'",
      "Be specific and use real metrics from the data"
    ]
  },
  "achievements": [
    {
      "icon": "🏆",
      "title": "Achievement based on actual data",
      "description": "Brief description with real numbers"
    }
  ],
  "topLanguages": [
    { "name": "TypeScript", "count": 15, "percentage": 62 }
  ],
  "developmentPattern": {
    "type": "work|personal|mixed",
    "aiAssisted": true/false,
    "scale": "small|medium|large"
  }
}

Create 4-8 groups to ensure ALL repos are covered. Use naming patterns to identify product families.
3-4 featured projects, 4-6 achievements. Use actual project names and REAL numbers!

IMPORTANT for aiInsights:
- whatChanged: 4-6 specific, actionable insights about development patterns and workflow evolution
- honestTake: 4-6 balanced observations mixing achievements with honest assessments
- Make both sections substantive and data-driven, not generic platitudes`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 3000,
    })

    const analysisResult = JSON.parse(completion.choices[0].message.content || '{}')

    // Ensure ALL repos are included in groups - AI sometimes misses some
    const allRepoNames = repositories.map((r: any) => r.name)
    const groupedRepoNames = new Set<string>()
    
    const groups = analysisResult.groups || []
    groups.forEach((group: any) => {
      if (group.repos) {
        group.repos.forEach((name: string) => groupedRepoNames.add(name))
      }
    })
    
    // Find any repos that weren't grouped
    const ungroupedRepos = allRepoNames.filter((name: string) => !groupedRepoNames.has(name))
    
    // Add an "Other Projects" group if there are ungrouped repos
    if (ungroupedRepos.length > 0) {
      groups.push({
        name: 'Other Projects',
        icon: '📁',
        description: 'Additional projects and experiments',
        repos: ungroupedRepos,
      })
    }

    return NextResponse.json({
      groups,
      featuredProjects: analysisResult.featuredProjects || [],
      yearNarrative: analysisResult.yearNarrative || null,
      aiInsights: analysisResult.aiInsights || null,
      achievements: analysisResult.achievements || [],
      topLanguages: analysisResult.topLanguages || [],
      developmentPattern: analysisResult.developmentPattern || null,
      // Include raw stats for display
      detectedStats: {
        totalCopilotCommits,
        totalBotCommits,
        totalCoAuthoredWithCopilot,
        aiAssistedPercentage,
        orgRepos,
        personalRepos,
        // Include user-reported stats
        userReportedAiRepos,
        userReportedManualRepos,
        userReportedAiPercentage,
      },
      usage: completion.usage,
    })
  } catch (error: any) {
    console.error('Error analyzing repositories:', error)
    
    // Fallback: group by language
    let repositories: any[] = []
    try {
      const fallbackBody = await request.clone().json()
      repositories = fallbackBody.repositories || []
    } catch {
      repositories = []
    }
    
    const languageGroups: Record<string, string[]> = {}
    
    repositories.forEach((repo: any) => {
      const lang = repo.language || 'Other'
      if (!languageGroups[lang]) languageGroups[lang] = []
      languageGroups[lang].push(repo.name)
    })

    const fallbackGroups = Object.entries(languageGroups).map(([lang, repos]) => ({
      name: `${lang} Projects`,
      icon: lang === 'TypeScript' ? '🔷' : lang === 'JavaScript' ? '🟨' : lang === 'Python' ? '🐍' : '📦',
      description: `Projects built with ${lang}`,
      repos,
    }))

    return NextResponse.json({
      groups: fallbackGroups,
      featuredProjects: [],
      yearNarrative: null,
      aiInsights: null,
      achievements: [],
      topLanguages: [],
      fallback: true,
      error: error.message,
    })
  }
}
