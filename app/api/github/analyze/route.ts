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
  // Parse body outside try block so it's available in catch for fallback
  let body: any = {}
  
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

    body = await request.json()
    const { repoName, description, stats, readme, commitMessages, narrative } = body

    if (!repoName || !stats) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Build context for AI
    const contextParts = [
      `Repository: ${repoName}`,
      description ? `Description: ${description}` : '',
      `Statistics:`,
      `- Total Commits: ${stats.commits}`,
      `- Lines Added: ${stats.additions?.toLocaleString() || 'N/A'}`,
      `- Lines Deleted: ${stats.deletions?.toLocaleString() || 'N/A'}`,
      `- Net LOC: ${stats.net?.toLocaleString() || 'N/A'}`,
      `- Primary Language: ${stats.primaryLanguage || 'Unknown'}`,
    ]

    if (readme) {
      // Truncate README to fit in context
      const truncatedReadme = readme.substring(0, 2000)
      contextParts.push(`\nREADME:\n${truncatedReadme}`)
    }

    if (commitMessages && commitMessages.length > 0) {
      const recentCommits = commitMessages.slice(0, 10).join('\n- ')
      contextParts.push(`\nRecent commit messages:\n- ${recentCommits}`)
    }

    const context = contextParts.filter(Boolean).join('\n')

    // Add developer narrative context if provided
    const narrativeContext = narrative ? `

DEVELOPER CONTEXT: The developer has provided this note about the project:
"${narrative}"

Incorporate this context into your analysis. This provides insider knowledge
about the project's purpose, constraints, or achievements that may not be
obvious from the code alone.` : ''

    // Call OpenAI to generate summary
    // Using gpt-4o which supports response_format with json_object
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert software analyst. Generate a structured JSON summary of a GitHub repository based on the provided data. Focus on:
1. What problem the project solves for users
2. Any AI/ML features, intelligent automation, or technically interesting aspects
3. Standout technical implementations and features
4. Development highlights (bugs fixed, optimizations made, architecture decisions)

Always base your analysis on the actual data provided. Do not invent statistics.`
        },
        {
          role: 'user',
          content: `Analyze this repository and provide a JSON response with this exact structure:

{
  "project_function": "A concise 2-3 sentence description of what the project does in user-centric terms",
  "ai_integration": "Description of AI/ML features, intelligent automation, or most technically interesting aspects. If no AI, focus on the most innovative technical elements",
  "development_highlights": [
    "Key feature or technical achievement 1",
    "Key feature or technical achievement 2",
    "Key feature or technical achievement 3",
    "Key feature or technical achievement 4"
  ]
}

Repository Data:
${context}${narrativeContext}

Provide only the JSON response, no additional text.`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 1000,
    })

    const aiSummary = JSON.parse(completion.choices[0].message.content || '{}')

    return NextResponse.json({ 
      summary: aiSummary,
      usage: completion.usage 
    })
  } catch (error: any) {
    console.error('Error generating AI summary:', error)
    
    // Return a basic fallback summary if AI fails
    const fallbackSummary = {
      project_function: body.description || `A ${body.stats?.primaryLanguage || 'software'} project with ${body.stats?.commits || 0} commits.`,
      ai_integration: 'Technical analysis unavailable - AI service error.',
      development_highlights: [
        `${body.stats?.commits || 0} commits representing significant development effort`,
        `${body.stats?.net?.toLocaleString() || 'N/A'} net lines of code`,
        `Primary language: ${body.stats?.primaryLanguage || 'Not specified'}`,
        'Active development and maintenance'
      ]
    }

    return NextResponse.json(
      { 
        summary: fallbackSummary,
        error: error.message || 'AI generation failed, using fallback',
        fallback: true
      },
      { status: 200 } // Return 200 with fallback data
    )
  }
}
