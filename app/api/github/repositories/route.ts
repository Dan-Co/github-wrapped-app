import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { Octokit } from '@octokit/rest'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const octokit = new Octokit({
      auth: session.accessToken,
    })

    // Fetch repositories where user has made contributions
    const { data: repos } = await octokit.repos.listForAuthenticatedUser({
      per_page: 100,
      sort: 'updated',
      affiliation: 'owner,collaborator',
    })

    // Filter and format repositories
    const formattedRepos = repos
      .filter(repo => !repo.fork) // Exclude forks by default
      .map(repo => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        language: repo.language,
        created_at: repo.created_at,
        updated_at: repo.updated_at,
        pushed_at: repo.pushed_at,
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        url: repo.html_url,
        homepage: repo.homepage, // For auto-detecting deployment URLs
        owner: {
          login: repo.owner?.login,
          avatar_url: repo.owner?.avatar_url,
        },
        private: repo.private,
      }))

    return NextResponse.json({ repositories: formattedRepos })
  } catch (error: any) {
    console.error('Error fetching repositories:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch repositories' },
      { status: 500 }
    )
  }
}
