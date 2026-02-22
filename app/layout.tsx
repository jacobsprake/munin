import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Munin — Sovereign Infrastructure Orchestration',
  description: 'Decision support for zero-latency crisis response. Pre-simulated playbooks, Byzantine multi-sig authorisation. Humans decide in 20–30 minutes instead of 2–6 hours.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}


