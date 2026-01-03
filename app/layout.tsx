import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import SessionProvider from '@/components/SessionProvider'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-sans',
})

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ['latin'],
  variable: '--font-mono',
})

export const metadata = {
  title: 'GitHub Wrapped - Automated Analytics',
  description: 'Generate beautiful analytics summaries of your GitHub contributions',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
