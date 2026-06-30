import type { Metadata, Viewport } from 'next'
import { Bebas_Neue, Inter } from 'next/font/google'
import AppShell from '@/components/AppShell'
import './globals.css'

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Velocity Fitness PH',
  description: 'Train harder. Track everything.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body
        style={{ fontFamily: 'var(--font-inter, Inter, sans-serif)' }}
        className={`${bebasNeue.variable} ${inter.variable}`}
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
