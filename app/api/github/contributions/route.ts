import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

interface ContributionDay {
  contributionCount: number
  date: string
}

interface ContributionWeek {
  contributionDays: ContributionDay[]
}

interface ContributionCalendar {
  totalContributions: number
  weeks: ContributionWeek[]
}

interface GraphQLResponse {
  data?: {
    user?: {
      contributionsCollection?: {
        contributionCalendar: ContributionCalendar
      }
    }
  }
  errors?: Array<{ message: string }>
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || '2025')
    
    // First, get the authenticated user's login
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    })
    
    if (!userResponse.ok) {
      return NextResponse.json({ error: 'Failed to get user info' }, { status: userResponse.status })
    }
    
    const userData = await userResponse.json()
    const username = userData.login

    if (!username) {
      return NextResponse.json({ error: 'Could not determine username' }, { status: 400 })
    }

    // GraphQL query for contribution calendar
    const query = `
      query($username: String!, $from: DateTime!, $to: DateTime!) {
        user(login: $username) {
          contributionsCollection(from: $from, to: $to) {
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  contributionCount
                  date
                }
              }
            }
          }
        }
      }
    `

    const variables = {
      username,
      from: `${year}-01-01T00:00:00Z`,
      to: `${year}-12-31T23:59:59Z`,
    }

    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('GitHub GraphQL error:', errorText)
      return NextResponse.json(
        { error: 'Failed to fetch contribution data' },
        { status: response.status }
      )
    }

    const result: GraphQLResponse = await response.json()

    if (result.errors) {
      console.error('GraphQL errors:', result.errors)
      return NextResponse.json(
        { error: result.errors[0]?.message || 'GraphQL error' },
        { status: 400 }
      )
    }

    const calendar = result.data?.user?.contributionsCollection?.contributionCalendar

    if (!calendar) {
      return NextResponse.json(
        { error: 'No contribution data found' },
        { status: 404 }
      )
    }

    // Calculate active days
    const activeDays = calendar.weeks
      .flatMap(w => w.contributionDays)
      .filter(d => d.contributionCount > 0).length

    return NextResponse.json({
      year,
      totalContributions: calendar.totalContributions,
      activeDays,
      weeks: calendar.weeks,
    })
  } catch (error: any) {
    console.error('Error fetching contributions:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch contributions' },
      { status: 500 }
    )
  }
}
