'use client'

import type React from 'react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  CalendarDays,
  Dumbbell,
  Home,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Trophy,
  Users,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import VLogo from '@/components/VLogo'

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>
}

function getNavItems(role: string | null, isStudent: boolean): NavItem[] {
  if (role === 'admin') {
    return [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/admin', label: 'Admin', icon: ShieldCheck },
      { href: '/coach', label: 'Coach', icon: Users },
      { href: '/calendar', label: 'Calendar', icon: CalendarDays },
      { href: '/leaderboard', label: 'Reports', icon: Trophy },
      { href: '/profile', label: 'Settings', icon: Settings },
    ]
  }

  if (role === 'coach') {
    return [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/coach', label: 'Students', icon: Users },
      { href: '/templates', label: 'Templates', icon: Dumbbell },
      { href: '/calendar', label: 'Calendar', icon: CalendarDays },
      { href: '/leaderboard', label: 'Reviews', icon: Trophy },
      { href: '/profile', label: 'Profile', icon: Settings },
    ]
  }

  return [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    ...(isStudent ? [{ href: '/student', label: 'Student Panel', icon: LineChart }] : []),
    { href: '/workouts', label: 'Workouts', icon: Dumbbell },
    { href: '/calendar', label: 'Calendar', icon: CalendarDays },
    { href: '/leaderboard', label: 'Progress', icon: Trophy },
    { href: '/profile', label: 'Profile', icon: Settings },
  ]
}

function NavLinks({ items, onClick, compact = false }: { items: NavItem[]; onClick?: () => void; compact?: boolean }) {
  const pathname = usePathname()

  return (
    <>
      {items.map(item => {
        const Icon = item.icon
        const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`))
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClick}
            style={{
              color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
              textDecoration: 'none',
              fontSize: compact ? '1rem' : '0.875rem',
              fontWeight: active ? 700 : 500,
              minHeight: compact ? 52 : 40,
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: compact ? '0 1.25rem' : '0 0.45rem',
              borderRadius: compact ? 0 : '0.375rem',
              borderBottom: compact ? '1px solid rgba(255,255,255,0.05)' : 'none',
              background: active && !compact ? 'rgba(8,119,160,0.14)' : 'transparent',
              whiteSpace: 'nowrap',
            }}
          >
            <Icon size={compact ? 17 : 15} style={{ color: active ? 'var(--teal-secondary)' : 'var(--text-secondary)', flexShrink: 0 }} />
            {item.label}
          </Link>
        )
      })}
    </>
  )
}

export default function Navbar() {
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [userRole, setUserRole] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isStudent, setIsStudent] = useState(false)
  const navItems = getNavItems(userRole, isStudent)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase.from('profiles').select('name, role').eq('id', user.id).single()
      if (!data) return

      setUserName(data.name ?? '')
      setUserRole(data.role ?? 'member')

      const { data: membership } = await supabase
        .from('group_members')
        .select('id')
        .eq('member_id', user.id)
        .limit(1)
      setIsStudent((membership?.length || 0) > 0)
    })
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <>
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: '#000000',
        borderBottom: '1px solid var(--border)',
        padding: '0 1.25rem',
        minHeight: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', minWidth: 0 }}>
          <Link href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', minHeight: 0, flexShrink: 0 }}>
            <VLogo />
          </Link>

          <div style={{ display: 'none', gap: '0.35rem', alignItems: 'center' }} className="lg-flex">
            <NavLinks items={navItems} />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {(userRole === 'admin' || userRole === 'coach') && (
            <Link
              href={userRole === 'admin' ? '/admin' : '/coach'}
              title="Open workspace"
              aria-label="Open workspace"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '0.375rem',
                flexShrink: 0,
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                display: 'none',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
              }}
              className="md-flex"
            >
              <Search size={15} />
            </Link>
          )}

          {userName && (
            <div style={{ textAlign: 'right', display: 'none' }} className="md-block">
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{userName}</p>
              <p style={{ fontSize: '0.65rem', color: 'var(--teal-secondary)', textTransform: 'capitalize' }}>{userRole ?? ''}</p>
            </div>
          )}

          <Link href="/profile" style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            flexShrink: 0,
            background: 'var(--teal-primary)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.875rem',
            fontWeight: 700,
            textDecoration: 'none',
          }}>
            {userName?.charAt(0)?.toUpperCase() || '?'}
          </Link>

          <button
            onClick={handleLogout}
            aria-label="Sign out"
            title="Sign out"
            style={{
              background: 'none',
              border: '1px solid var(--border)',
              borderRadius: '0.375rem',
              padding: '0.4rem',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 36,
              width: 36,
            }}
          >
            <LogOut size={15} />
          </button>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            style={{
              background: 'none',
              border: '1px solid var(--border)',
              borderRadius: '0.375rem',
              padding: '0.4rem',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 36,
              width: 36,
            }}
            className="lg-hide"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div style={{
          position: 'fixed',
          top: '64px',
          left: 0,
          right: 0,
          zIndex: 49,
          background: '#000000',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
        }} className="lg-hide">
          {userName && (
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{userName}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--teal-secondary)', textTransform: 'capitalize' }}>{userRole ?? ''}</p>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', padding: '0.5rem 0' }}>
            <NavLinks items={navItems} onClick={() => setMenuOpen(false)} compact />
          </div>
        </div>
      )}

      <style>{`
        @media (min-width: 768px) {
          .md-flex { display: flex !important; }
          .md-block { display: block !important; }
        }
        @media (min-width: 1080px) {
          .lg-flex { display: flex !important; }
          .lg-hide { display: none !important; }
        }
        @media (max-width: 1079px) {
          .lg-flex { display: none !important; }
        }
      `}</style>
    </>
  )
}
