import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Sovereign Orchestration Prototype',
  description: 'Command and control digital twin interface',
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

