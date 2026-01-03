# GitHub Wrapped - Quick Start Guide

This guide will help you get the automated GitHub Wrapped application running locally in under 10 minutes.

## Prerequisites Checklist

- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm or yarn installed (`npm --version`)
- [ ] GitHub account
- [ ] OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

This will install:
- Next.js 14
- React 18
- NextAuth.js (GitHub OAuth)
- Octokit (GitHub API client)
- OpenAI SDK
- TypeScript and development tools

### 2. Create GitHub OAuth App

1. Go to https://github.com/settings/developers
2. Click **"New OAuth App"**
3. Fill in the form:
   - **Application name**: `GitHub Wrapped Local` (or any name)
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. Click **"Register application"**
5. Copy your **Client ID**
6. Click **"Generate a new client secret"** and copy the secret

### 3. Get OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Click **"Create new secret key"**
3. Give it a name (e.g., "GitHub Wrapped")
4. Copy the key immediately (you won't see it again!)

### 4. Configure Environment Variables

```bash
# Copy the example file
cp .env.example .env
```

Edit `.env` and add your credentials:

```bash
# GitHub OAuth (from step 2)
GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here

# NextAuth (generate a random secret)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=run_this_command_to_generate: openssl rand -base64 32

# OpenAI (from step 3)
OPENAI_API_KEY=sk-your_key_here
```

To generate `NEXTAUTH_SECRET`, run:
```bash
openssl rand -base64 32
```

### 5. Run the Application

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Testing the App

### First Login Flow

1. Click **"Login with GitHub"**
2. GitHub will ask you to authorize the app
3. Click **"Authorize"**
4. You'll be redirected to the dashboard

### Select Repositories

1. You'll see all your repositories (owned and collaborated)
2. Check the boxes for repositories you want to analyze
3. Click **"Analyze & Generate Wrapped"**

### Wait for Analysis

- The app will fetch commit data for each repository
- AI will generate summaries (this may take 30-60 seconds per repo)
- Progress is shown in real-time

### View Your Wrapped

- Once analysis is complete, you'll see your GitHub Wrapped!
- Navigate between tabs: Overview, Repositories, Export
- Click on repository cards for detailed AI summaries
- Export as HTML to save or share

## Troubleshooting

### Error: "Invalid client credentials"
- Check your `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`
- Make sure there are no extra spaces or quotes

### Error: "OpenAI API key invalid"
- Verify your `OPENAI_API_KEY` starts with `sk-`
- Check you have API credits available

### Error: "Failed to fetch repositories"
- Check your GitHub OAuth callback URL matches exactly
- Try logging out and back in

### Rate Limiting Issues
- GitHub API has a limit of 5,000 requests/hour
- If you hit the limit, wait an hour or analyze fewer repos

### AI Summary Generation Fails
- Check your OpenAI API key is valid
- Verify you have credits/quota available
- The app will use fallback summaries if AI fails

## Production Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Go to https://vercel.com
3. Click **"Import Project"**
4. Select your repository
5. Add environment variables in Vercel dashboard:
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
   - `NEXTAUTH_URL` (your production URL, e.g., https://yourapp.vercel.app)
   - `NEXTAUTH_SECRET`
   - `OPENAI_API_KEY`
6. Click **"Deploy"**

### Update GitHub OAuth App

After deployment, update your GitHub OAuth app:
1. Go to https://github.com/settings/developers
2. Edit your OAuth app
3. Update **Authorization callback URL** to:
   `https://yourapp.vercel.app/api/auth/callback/github`

## Next Steps

- Customize the UI styling in `app/globals.css`
- Add more AI providers (Anthropic Claude) as fallback
- Implement database for persistent storage
- Add export to PDF functionality
- Create shareable wrapped URLs

## Need Help?

- Check `IMPLEMENTATION_GUIDE.md` for detailed architecture
- Review API documentation in code comments
- Open an issue on GitHub
- Check existing issues for solutions

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npx tsc --noEmit

# Lint code
npm run lint
```

## File Structure Reference

```
app/
├── api/              # API routes
│   ├── auth/        # NextAuth OAuth
│   └── github/      # GitHub API endpoints
├── dashboard/       # Repository selection
├── wrapped/         # Final results
├── layout.tsx       # Root layout
└── page.tsx         # Landing page

components/          # Reusable components
types/              # TypeScript types
```

## Environment Variables Explained

| Variable | Purpose | Example |
|----------|---------|---------|
| `GITHUB_CLIENT_ID` | GitHub OAuth app ID | `Iv1.a1b2c3d4e5f6g7h8` |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth secret | `abc123...` |
| `NEXTAUTH_URL` | Your app URL | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Random secret for JWT | `generate with openssl` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-proj-...` |

## Success Checklist

- [✓] App runs on http://localhost:3000
- [✓] Can login with GitHub
- [✓] See list of repositories
- [✓] Can select and analyze repos
- [✓] AI summaries generate successfully
- [✓] Can view wrapped results
- [✓] Can export as HTML

## What's Included

✅ **Automated Data Collection**: Fetches commits, stats, README from GitHub
✅ **AI Analysis**: OpenAI GPT-4 generates intelligent summaries
✅ **Beautiful UI**: Glassmorphism design with animations
✅ **Accurate Stats**: Real data from GitHub API (no fake numbers)
✅ **Export**: Download as standalone HTML file
✅ **Privacy**: No permanent storage, session-based only

Happy Wrapping! 🎉
