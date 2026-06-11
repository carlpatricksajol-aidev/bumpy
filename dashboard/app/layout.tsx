import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Bumpy App Dashboard',
  description: 'Analytics Pro - Performance tracking and insights',
  icons: {
    icon: '/bumpy-logo.png',
    shortcut: '/bumpy-logo.png',
    apple: '/bumpy-logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning>{children}</body>
    </html>
  )
}