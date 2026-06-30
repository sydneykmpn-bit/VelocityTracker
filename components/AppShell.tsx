'use client'

import { usePathname } from 'next/navigation'
import Navbar from '@/components/Navbar'

const NO_NAVBAR_ROUTES = ['/', '/login', '/register', '/forgot-password', '/pending-approval']

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const showNavbar = !NO_NAVBAR_ROUTES.includes(pathname)

  return (
    <>
      {showNavbar && <Navbar />}
      {children}
    </>
  )
}
