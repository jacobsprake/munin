import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Munin — Sovereign Infrastructure Orchestration',
  description: 'Decision support for zero-latency crisis response. Pre-simulated playbooks, Byzantine multi-sig authorisation. Humans decide in 20–30 minutes instead of 2–6 hours.',
  robots: 'noindex, nofollow', // Classified systems must not be indexed
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Fixed workstation: prevent zoom (accessibility via OS)
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-w-[1280px]">{children}</body>
    </html>
  )
}


