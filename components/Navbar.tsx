'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LogOut, Menu, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const VLogo = () => (
  <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
    <path d="M4 6L16 26L28 6" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10 6L16 18L22 6" stroke="#0877a0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

function NavLinks({ role, onClick }: { role: string; onClick?: () => void }) {
  const linkStyle: React.CSSProperties = {
    color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem',
    transition: 'color 0.15s', minHeight: 44, display: 'flex', alignItems: 'center',
  }
  return (
    <>
      <Link href="/dashboard" style={linkStyle} onClick={onClick}>Dashboard</Link>
      <Link href="/calendar" style={linkStyle} onClick={onClick}>Calendar</Link>
      {role === 'admin' && (
        <>
          <Link href="/leaderboard" style={linkStyle} onClick={onClick}>Leaderboard</Link>
          <Link href="/admin" style={linkStyle} onClick={onClick}>Admin Panel</Link>
        </>
      )}
      {role === 'coach' && (
        <>
          <Link href="/coach" style={linkStyle} onClick={onClick}>My Members</Link>
          <Link href="/leaderboard" style={linkStyle} onClick={onClick}>Leaderboard</Link>
        </>
      )}
      {(role === 'member' || role === '') && (
        <>
          <Link href="/workouts" style={linkStyle} onClick={onClick}>My Workouts</Link>
          <Link href="/leaderboard" style={linkStyle} onClick={onClick}>Leaderboard</Link>
        </>
      )}
    </>
  )
}

export default function Navbar() {
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [userRole, setUserRole] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('name, role').eq('id', user.id).single()
        .then(({ data }) => {
          if (data) {
            setUserName(data.name ?? '')
            setUserRole(data.role ?? 'member')
          }
        })
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
            <span style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.05em', fontSize: '1.1rem', color: 'white' }}>
              VELOCITY <span style={{ color: '#34bac2' }}>PH</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div style={{ display: 'none', gap: '1.25rem' }} className="md-flex">
            <NavLinks role={userRole} />
          </div>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Desktop user info */}
          {userName && (
            <div style={{ textAlign: 'right', display: 'none' }} className="md-block">
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{userName}</p>
              <p style={{ fontSize: '0.65rem', color: 'var(--teal-primary)', textTransform: 'capitalize' }}>{userRole}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            title="Logout"
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
              <p style={{ fontSize: '0.75rem', color: 'var(--teal-primary)', textTransform: 'capitalize' }}>{userRole}</p>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', padding: '0.5rem 0' }}>
            <NavLinksVertical role={userRole} onClose={() => setMenuOpen(false)} />
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

function NavLinksVertical({ role, onClose }: { role: string; onClose: () => void }) {
  const linkStyle: React.CSSProperties = {
    color: 'var(--text-primary)', textDecoration: 'none', fontSize: '1rem',
    padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)',
    display: 'block', minHeight: 52,
  }
  return (
    <>
      <Link href="/dashboard" style={linkStyle} onClick={onClose}>Dashboard</Link>
      <Link href="/calendar" style={linkStyle} onClick={onClose}>📅 Calendar</Link>
      {role === 'admin' && (
        <>
          <Link href="/leaderboard" style={linkStyle} onClick={onClose}>🏆 Leaderboard</Link>
          <Link href="/admin" style={linkStyle} onClick={onClose}>⚙️ Admin Panel</Link>
        </>
      )}
      {role === 'coach' && (
        <>
          <Link href="/coach" style={linkStyle} onClick={onClose}>👥 My Members</Link>
          <Link href="/leaderboard" style={linkStyle} onClick={onClose}>🏆 Leaderboard</Link>
        </>
      )}
      {(role === 'member' || role === '') && (
        <>
          <Link href="/workouts" style={linkStyle} onClick={onClose}>💪 My Workouts</Link>
          <Link href="/leaderboard" style={linkStyle} onClick={onClose}>🏆 Leaderboard</Link>
        </>
      )}
    </>
  )
}
