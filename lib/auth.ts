import GithubProvider from "next-auth/providers/github"
import type { NextAuthOptions } from "next-auth"

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'read:user repo read:org',
        },
      },
      // Include the GitHub login (username) in the profile
      profile(profile) {
        return {
          id: profile.id.toString(),
          name: profile.name || profile.login,
          email: profile.email,
          image: profile.avatar_url,
          login: profile.login, // GitHub username - critical for allowlist security
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Persist the OAuth access_token and GitHub login to the token right after signin
      if (account && profile) {
        token.accessToken = account.access_token
        token.login = (profile as any).login // GitHub username for allowlist checks
      }
      return token
    },
    async session({ session, token }) {
      // Send properties to the client, including the verified GitHub login
      session.accessToken = token.accessToken as string
      session.user = {
        ...session.user,
        login: token.login as string, // Include verified GitHub username
      }
      return session
    },
  },
  pages: {
    signIn: '/',
  },
}
