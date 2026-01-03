export { default } from 'next-auth/middleware'

export const config = {
  // Protect both pages and API routes (defense-in-depth for APIs)
  matcher: [
    '/dashboard/:path*',
    '/wrapped/:path*',
    '/api/github/:path*',
  ],
}
