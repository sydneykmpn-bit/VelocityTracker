'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LogOut, Menu, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import VLogo from '@/components/VLogo'

function NavLinks({ role, onClick, isStudent }: { role: string | null; onClick?: () => void; isStudent?: boolean }) {
  const linkStyle: React.CSSProperties = {
    color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem',
    transition: 'color 0.15s', minHeight: 44, display: 'flex', alignItems: 'center',
  }
  return (
    <>
      {role === 'admin' && <Link href="/admin" style={linkStyle} onClick={onClick}>Admin Panel</Link>}
      {role === 'coach' && <Link href="/coach" style={linkStyle} onClick={onClick}>Coach Panel</Link>}
      <Link href="/workouts" style={linkStyle} onClick={onClick}>My Workouts</Link>
      <Link href="/templates" style={linkStyle} onClick={onClick}>Templates</Link>
      <Link href="/calendar" style={linkStyle} onClick={onClick}>Calendar</Link>
      <Link href="/leaderboard" style={linkStyle} onClick={onClick}>Leaderboard</Link>
      {role === 'member' && isStudent && <Link href="/student" style={linkStyle} onClick={onClick}>Student Panel</Link>}
    </>
  )
}

export default function Navbar() {
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [userRole, setUserRole] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isStudent, setIsStudent] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase.from('profiles').select('name, role').eq('id', user.id).single()
      if (data) {
        setUserName(data.name ?? '')
        setUserRole(data.role ?? 'member')
        // Check if member is in any group (for Student Panel link)
        const { data: membership } = await supabase
          .from('group_members')
          .select('id')
          .eq('member_id', user.id)
          .limit(1)
        setIsStudent((membership?.length || 0) > 0)
      }
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
        position: 'sticky', top: 0, zIndex: 50,
        background: '#000000', borderBottom: '1px solid var(--border)',
        padding: '0 1.25rem', height: '60px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Left: Logo + desktop nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <Link href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', minHeight: 0 }}>
            <VLogo />
          </Link>

          {/* Desktop nav */}
          <div style={{ display: 'none', gap: '1.25rem' }} className="md-flex">
            <NavLinks role={userRole} isStudent={isStudent} />
          </div>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Desktop user info */}
          {userName && (
            <div style={{ textAlign: 'right', display: 'none' }} className="md-block">
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{userName}</p>
              <p style={{ fontSize: '0.65rem', color: 'var(--teal-primary)', textTransform: 'capitalize' }}>{userRole ?? ''}</p>
            </div>
          )}
          {/* Profile avatar */}
          <Link href="/profile" style={{
            width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
            background: 'var(--teal-primary)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.875rem', fontWeight: 700, textDecoration: 'none',
          }}>
            {userName?.charAt(0)?.toUpperCase() || '?'}
          </Link>
          <button
            onClick={handleLogout}
            aria-label="Sign out"
            title="Sign out"
            style={{
              background: 'none', border: '1px solid var(--border)', borderRadius: '0.375rem',
              padding: '0.4rem', cursor: 'pointer', color: 'var(--text-secondary)',
              display: 'flex', alignItems: 'center', minHeight: 36, width: 36,
            }}
          >
            <LogOut size={15} />
          </button>
          {/* Hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            style={{
              background: 'none', border: '1px solid var(--border)', borderRadius: '0.375rem',
              padding: '0.4rem', cursor: 'pointer', color: 'var(--text-primary)',
              display: 'flex', alignItems: 'center', minHeight: 36, width: 36,
            }}
            className="md-hide"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div style={{
          position: 'fixed', top: '60px', left: 0, right: 0, zIndex: 49,
          background: '#000000', borderBottom: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
        }} className="md-hide">
          {userName && (
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{userName}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--teal-primary)', textTransform: 'capitalize' }}>{userRole ?? ''}</p>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', padding: '0.5rem 0' }}>
            <NavLinksVertical role={userRole} onClose={() => setMenuOpen(false)} isStudent={isStudent} />
          </div>
        </div>
      )}

      <style>{`
        @media (min-width: 768px) {
          .md-flex { display: flex !important; }
          .md-block { display: block !important; }
          .md-hide { display: none !important; }
        }
        @media (max-width: 767px) {
          .md-flex { display: none !important; }
          .md-block { display: none !important; }
        }
      `}</style>
    </>
  )
}

function NavLinksVertical({ role, onClose, isStudent }: { role: string | null; onClose: () => void; isStudent?: boolean }) {
  const linkStyle: React.CSSProperties = {
    color: 'var(--text-primary)', textDecoration: 'none', fontSize: '1rem',
    padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)',
    display: 'block', minHeight: 52,
  }
  return (
    <>
      {role === 'admin' && <Link href="/admin" style={linkStyle} onClick={onClose}>⚙️ Admin Panel</Link>}
      {role === 'coach' && <Link href="/coach" style={linkStyle} onClick={onClose}>👥 Coach Panel</Link>}
      <Link href="/workouts" style={linkStyle} onClick={onClose}>💪 My Workouts</Link>
      <Link href="/templates" style={linkStyle} onClick={onClose}>📋 Templates</Link>
      <Link href="/calendar" style={linkStyle} onClick={onClose}>📅 Calendar</Link>
      <Link href="/leaderboard" style={linkStyle} onClick={onClose}>🏆 Leaderboard</Link>
      {role === 'member' && isStudent && <Link href="/student" style={linkStyle} onClick={onClose}>🎓 Student Panel</Link>}
    </>
  )
}
