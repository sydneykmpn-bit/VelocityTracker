'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LayoutDashboard, ShieldCheck, Users, Dumbbell, Plus, Trophy, CalendarDays } from 'lucide-react'

const SECOND_TAB: Record<string, { href: string; label: string; icon: typeof Users }> = {
  admin: { href: '/admin', label: 'Admin', icon: ShieldCheck },
  coach: { href: '/coach', label: 'Coach', icon: Users },
  member: { href: '/workouts', label: 'Workouts', icon: Dumbbell },
}

export default function BottomNav() {
  const pathname = usePathname()
  const supabase = createClient()
  const [role, setRole] = useState('member')

  useEffect(() => {
    const cachedRole = sessionStorage.getItem('vel_role')
    if (cachedRole) {
      setRole(cachedRole)
      return
    }
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role) {
        setRole(profile.role)
        sessionStorage.setItem('vel_role', profile.role)
      }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'))

  const second = SECOND_TAB[role] ?? SECOND_TAB.member
  const SecondIcon = second.icon

  return (
    <nav className="bottom-nav" aria-label="Primary">
      <Link href="/dashboard" className={isActive('/dashboard') ? 'bottom-nav-item active' : 'bottom-nav-item'}>
        <LayoutDashboard size={22} />
        <span>Home</span>
      </Link>
      <Link href={second.href} className={isActive(second.href) ? 'bottom-nav-item active' : 'bottom-nav-item'}>
        <SecondIcon size={22} />
        <span>{second.label}</span>
      </Link>
      <Link href="/workouts/new" aria-label="Log workout" className={isActive('/workouts/new') ? 'bottom-nav-item active' : 'bottom-nav-item'}>
        <span className="bottom-nav-log">
          <Plus size={26} strokeWidth={2.5} />
        </span>
        <span>Log</span>
      </Link>
      <Link href="/leaderboard" className={isActive('/leaderboard') ? 'bottom-nav-item active' : 'bottom-nav-item'}>
        <Trophy size={22} />
        <span>Board</span>
      </Link>
      <Link href="/calendar" className={isActive('/calendar') ? 'bottom-nav-item active' : 'bottom-nav-item'}>
        <CalendarDays size={22} />
        <span>Calendar</span>
      </Link>
    </nav>
  )
}
