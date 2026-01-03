import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Octokit } from '@octokit/rest'

export const dynamic = 'force-dynamic'

// Helper to fetch contributor stats with polling for 202 responses
// GitHub returns 202 while computing stats - we need to poll until we get actual data
async function fetchContributorStatsWithRetry(
  octokit: Octokit,
  owner: string,
  repo: string,
  maxRetries = 5,
  delayMs = 1000
): Promise<{ additions: number; deletions: number }> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await octokit.repos.getContributorsStats({ owner, repo })
      
      // 202 means GitHub is computing stats - retry after delay
      if (response.status === 202) {
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs))
          continue
        }
        // Final attempt still 202 - return zeros
        return { additions: 0, deletions: 0 }
      }
      
      // Calculate totals from response
      let totalAdditions = 0
      let totalDeletions = 0
      
      if (Array.isArray(response.data) && response.data.length > 0) {
        for (const contributor of response.data) {
          if (contributor.weeks) {
            for (const week of contributor.weeks) {
              totalAdditions += week.a || 0
              totalDeletions += week.d || 0
            }
          }
        }
        
        // If we got 200 but totals are still 0, the data might not be ready
        // Only retry if we have no data at all (empty response is different from all-zero weeks)
        if (totalAdditions === 0 && totalDeletions === 0 && attempt < maxRetries - 1) {
          // Check if it's genuinely empty or just not computed
          const hasAnyWeeks = response.data.some(c => c.weeks && c.weeks.length > 0)
          if (!hasAnyWeeks) {
            await new Promise(resolve => setTimeout(resolve, delayMs))
            continue
          }
        }
      } else if (attempt < maxRetries - 1) {
        // Empty array - might still be computing
        await new Promise(resolve => setTimeout(resolve, delayMs))
        continue
      }
      
      return { additions: totalAdditions, deletions: totalDeletions }
    } catch (error) {
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs))
        continue
      }
      return { additions: 0, deletions: 0 }
    }
  }
  
  return { additions: 0, deletions: 0 }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { owner, repo } = body

    if (!owner || !repo) {
      return NextResponse.json({ error: 'Missing owner or repo' }, { status: 400 })
    }

    const octokit = new Octokit({
      auth: session.accessToken,
    })

    // Fetch all data in parallel for efficiency
    const [commitsResponse, contributorStats, languages, readmeResult, repoInfo] = await Promise.all([
      // Get commits (just for count and messages - single paginated call)
      octokit.paginate(octokit.repos.listCommits, {
        owner,
        repo,
        per_page: 100,
      }),
      
      // Get contributor stats with retry logic for 202 responses
      fetchContributorStatsWithRetry(octokit, owner, repo),
      
      // Get languages
      octokit.repos.listLanguages({ owner, repo }),
      
      // Get README
      octokit.repos.getReadme({ owner, repo }).catch(() => null),
      
      // Get repo info to determine if it's an org or personal repo
      octokit.repos.get({ owner, repo }).catch(() => null),
    ])

    const commits = commitsResponse

    // Parse README
    let readmeContent = null
    if (readmeResult?.data?.content) {
      readmeContent = Buffer.from(readmeResult.data.content, 'base64').toString('utf-8')
    }

    // Analyze commit authors to detect bot/Copilot commits
    const authorAnalysis = {
      totalCommits: commits.length,
      humanCommits: 0,
      botCommits: 0,
      copilotCommits: 0,
      coAuthoredWithCopilot: 0,
      uniqueAuthors: new Set<string>(),
      botAuthors: [] as string[],
    }
    
    for (const commit of commits) {
      const authorLogin = commit.author?.login || ''
      const authorName = commit.commit?.author?.name || ''
      const message = commit.commit?.message || ''
      
      // Detect bot authors (includes copilot, dependabot, github-actions, etc.)
      const isBot = authorLogin.includes('[bot]') || 
                   authorLogin === 'dependabot' ||
                   authorName.toLowerCase().includes('bot') ||
                   authorLogin.endsWith('-bot')
      
      const isCopilot = authorLogin.includes('copilot') || 
                       authorName.toLowerCase().includes('copilot')
      
      // Check for Co-authored-by with Copilot
      const hasCopilotCoAuthor = message.includes('Co-authored-by') && 
                                 message.toLowerCase().includes('copilot')
      
      if (isCopilot) {
        authorAnalysis.copilotCommits++
        authorAnalysis.botCommits++
        if (!authorAnalysis.botAuthors.includes(authorLogin)) {
          authorAnalysis.botAuthors.push(authorLogin)
        }
      } else if (isBot) {
        authorAnalysis.botCommits++
        if (!authorAnalysis.botAuthors.includes(authorLogin)) {
          authorAnalysis.botAuthors.push(authorLogin)
        }
      } else {
        authorAnalysis.humanCommits++
        if (authorLogin) authorAnalysis.uniqueAuthors.add(authorLogin)
      }
      
      if (hasCopilotCoAuthor) {
        authorAnalysis.coAuthoredWithCopilot++
      }
    }

    // Determine repo ownership type
    const ownerType = repoInfo?.data?.owner?.type || 'Unknown' // 'User' or 'Organization'
    const isOrgRepo = ownerType === 'Organization'

    // Extract commit dates for heatmap
    const commitDates = commits
      .map(c => c.commit?.author?.date || c.commit?.committer?.date)
      .filter((d): d is string => !!d)

    const stats = {
      commits: commits.length,
      additions: contributorStats.additions,
      deletions: contributorStats.deletions,
      net: contributorStats.additions - contributorStats.deletions,
      languages: languages.data,
      readme: readmeContent,
      commitMessages: commits.slice(0, 20).map(c => c.commit.message),
      commitDates,
      // New: author analysis for AI detection
      authorAnalysis: {
        humanCommits: authorAnalysis.humanCommits,
        botCommits: authorAnalysis.botCommits,
        copilotCommits: authorAnalysis.copilotCommits,
        coAuthoredWithCopilot: authorAnalysis.coAuthoredWithCopilot,
        uniqueHumanAuthors: authorAnalysis.uniqueAuthors.size,
        botAuthors: authorAnalysis.botAuthors,
      },
      // New: ownership context
      ownerType,
      isOrgRepo,
    }

    return NextResponse.json(stats)
  } catch (error: any) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
