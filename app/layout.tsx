import type { Metadata } from 'next'
import { Bebas_Neue, Inter } from 'next/font/google'
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
        {children}
      </body>
    </html>
  )
}
