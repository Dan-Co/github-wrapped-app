import 'next-auth'

declare module 'next-auth' {
  interface Session {
    accessToken?: string
    user?: {
      name?: string | null
      email?: string | null
      image?: string | null
      login?: string // GitHub username - verified from OAuth, used for allowlist
    }
  }
  
  interface User {
    login?: string // GitHub username
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string
    login?: string // GitHub username - verified from OAuth profile
  }
}
