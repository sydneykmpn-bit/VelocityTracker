'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Menu, X, ChevronDown } from 'lucide-react'
import VLogo from '@/components/VLogo'

export default function Navbar() {
  const supabase = createClient()
  const router = useRouter()
  const pathname = usePathname()
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userName, setUserName] = useState('')
  const [isStudent, setIsStudent] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const avatarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const cachedRole = sessionStorage.getItem('vel_role')
    const cachedName = sessionStorage.getItem('vel_name')
    const cachedIsStudent = sessionStorage.getItem('vel_is_student')
    if (cachedRole !== null) setUserRole(cachedRole)
    if (cachedName !== null) setUserName(cachedName)
    if (cachedIsStudent !== null) setIsStudent(cachedIsStudent === 'true')
  }, [])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [profileResult, membershipResult, workoutPlansResult, programAssignmentsResult] = await Promise.all([
        supabase.from('profiles').select('role, name').eq('id', user.id).single(),
        supabase.from('group_members').select('id').eq('member_id', user.id).limit(1),
        supabase.from('workout_plans').select('id').eq('member_id', user.id).limit(1),
        supabase.from('program_assignments').select('id').eq('member_id', user.id).limit(1),
      ])

      const profile = profileResult.data
      const membership = membershipResult.data
      const workoutPlans = workoutPlansResult.data
      const programAssignments = programAssignmentsResult.data
      if (!profile) return

      const studentStatus = profile.role === 'member' && (
        (membership?.length || 0) > 0 ||
        (workoutPlans?.length || 0) > 0 ||
        (programAssignments?.length || 0) > 0
      )

      let pending = 0
      if (profile.role === 'admin') {
        const { count } = await supabase
          .from('profiles').select('id', { count: 'exact', head: true }).eq('approved', false)
        pending = count || 0
      }

      // Set ALL state at once — prevents double render / flicker
      setUserRole(profile.role)
      setUserName(profile.name || '')
      setIsStudent(studentStatus)
      setPendingCount(pending)

      // Cache so next page navigation loads instantly without re-fetching
      sessionStorage.setItem('vel_role', profile.role ?? 'member')
      sessionStorage.setItem('vel_is_student', String(studentStatus))
      sessionStorage.setItem('vel_name', profile.name ?? '')

      await supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', user.id)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSignOut = async () => {
    sessionStorage.removeItem('vel_role')
    sessionStorage.removeItem('vel_is_student')
    sessionStorage.removeItem('vel_name')
    await supabase.auth.signOut()
    router.push('/login')
  }

  type NavLink = { href: string; label: string; badge?: number }

  function getNavLinks(): NavLink[] {
    if (userRole === null) return []
    if (userRole === 'admin') return [
      { href: '/workouts', label: 'My Workouts' },
      { href: '/admin', label: 'Admin Panel', badge: pendingCount > 0 ? pendingCount : 0 },
      { href: '/calendar', label: 'Calendar' },
      { href: '/leaderboard', label: 'Leaderboard' },
      { href: '/analytics', label: 'Analytics' },
      { href: '/templates', label: 'Templates' },
    ]
    if (userRole === 'coach') return [
      { href: '/workouts', label: 'My Workouts' },
      { href: '/coach', label: 'Coach Panel' },
      { href: '/calendar', label: 'Calendar' },
      { href: '/leaderboard', label: 'Leaderboard' },
      { href: '/analytics', label: 'Analytics' },
      { href: '/templates', label: 'Templates' },
    ]
    const base: NavLink[] = [
      { href: '/workouts', label: 'My Workouts' },
      { href: '/calendar', label: 'Calendar' },
      { href: '/leaderboard', label: 'Leaderboard' },
      { href: '/analytics', label: 'Analytics' },
      { href: '/templates', label: 'Templates' },
    ]
    if (isStudent) base.splice(1, 0, { href: '/student', label: 'Student Panel' })
    return base
  }

  const navLinks = getNavLinks()
  const isActive = (href: string) => pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'))

  // Exclude whatever BottomNav (mobile) is currently showing so links aren't duplicated on mobile.
  // BottomNav always shows /dashboard, /workouts/new, /calendar, plus a role/student-dependent
  // second and fourth tab — mirror that logic exactly (see components/BottomNav.tsx).
  const bottomNavHrefs = new Set<string>(['/dashboard', '/workouts/new', '/calendar'])
  if (userRole === 'admin') bottomNavHrefs.add('/admin')
  else if (userRole === 'coach') bottomNavHrefs.add('/coach')
  else if (isStudent) { bottomNavHrefs.add('/student'); bottomNavHrefs.add('/workouts') }
  else { bottomNavHrefs.add('/workouts'); bottomNavHrefs.add('/leaderboard') }
  const hamburgerLinks = navLinks.filter(link => !bottomNavHrefs.has(link.href))

  return (
    <>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'var(--pure-black)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
        padding: '0 1.25rem', minHeight: '60px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
      }}>
        {/* Logo */}
        <Link href="/dashboard" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', minHeight: 0, flexShrink: 0 }}>
          <VLogo />
        </Link>

        {/* Desktop nav links */}
        <div style={{ display: 'none', alignItems: 'center', gap: '0.25rem', flex: 1, justifyContent: 'center' }} className="nav-desktop">
          {navLinks.map(link => (
            <div key={link.href} style={{ position: 'relative' }}>
              <Link
                href={link.href}
                style={{
                  color: isActive(link.href) ? 'var(--text-primary)' : 'var(--text-secondary)',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: isActive(link.href) ? 700 : 500,
                  padding: '0.375rem 0.625rem',
                  borderRadius: '0.375rem',
                  background: isActive(link.href) ? 'rgba(8,119,160,0.14)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  whiteSpace: 'nowrap',
                  minHeight: 0,
                  borderBottom: isActive(link.href) ? '2px solid var(--teal-primary)' : '2px solid transparent',
                  paddingBottom: '2px',
                  transition: 'all 0.15s',
                }}
              >
                {link.label}
              </Link>
              {(link.badge || 0) > 0 && (
                <span style={{
                  position: 'absolute', top: '-6px', right: '-4px',
                  width: '16px', height: '16px', borderRadius: '50%',
                  background: '#f59e0b', color: '#000',
                  fontSize: '10px', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {link.badge}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Avatar dropdown */}
          {userRole !== null && (
            <div ref={avatarRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setAvatarOpen(!avatarOpen)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0, minHeight: 0,
                }}
                aria-label="Profile menu"
              >
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: 'var(--teal-primary)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '0.875rem', flexShrink: 0,
                }}>
                  {userName?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <ChevronDown size={14} style={{ color: 'var(--text-secondary)', display: 'none' }} className="chevron-desktop" />
              </button>

              {avatarOpen && (
                <div style={{
                  position: 'absolute', right: 0, top: '48px',
                  width: '200px', borderRadius: '0.75rem', overflow: 'hidden', zIndex: 100,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
                }}>
                  <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)' }}>
                    <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{userName}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--teal-secondary)', textTransform: 'capitalize' }}>{userRole}</p>
                  </div>
                  <Link href="/dashboard" onClick={() => setAvatarOpen(false)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.75rem 1rem', fontSize: '0.875rem', color: 'var(--text-secondary)', textDecoration: 'none', minHeight: 0 }}>
                    🏠 Dashboard
                  </Link>
                  <Link href="/profile" onClick={() => setAvatarOpen(false)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.75rem 1rem', fontSize: '0.875rem', color: 'var(--text-secondary)', textDecoration: 'none', borderTop: '1px solid var(--border)', minHeight: 0 }}>
                    👤 View Profile
                  </Link>
                  <button
                    onClick={handleSignOut}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: '0.625rem',
                      padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#ef4444',
                      background: 'transparent', border: 'none', borderTop: '1px solid var(--border)',
                      cursor: 'pointer', textAlign: 'left', minHeight: 0,
                    }}
                  >
                    🚪 Sign Out
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '0.375rem', padding: '0.4rem', cursor: 'pointer',
              color: 'var(--text-primary)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', minHeight: 36, width: 36,
            }}
            className="hamburger"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          style={{
            position: 'fixed', top: '60px', left: 0, right: 0, bottom: 0,
            zIndex: 49, background: 'rgba(0,0,0,0.5)',
          }}
          onClick={() => setMenuOpen(false)}
        >
          <div
            style={{ background: 'var(--pure-black)', borderBottom: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}
          >
            {userName && (
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{userName}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--teal-secondary)', textTransform: 'capitalize' }}>{userRole}</p>
              </div>
            )}
            {hamburgerLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '1rem 1.25rem', fontSize: '1rem', fontWeight: 500,
                  color: isActive(link.href) ? 'var(--teal-secondary)' : 'var(--text-primary)',
                  textDecoration: 'none', minHeight: 0,
                  borderBottom: '1px solid var(--border)',
                  background: isActive(link.href) ? 'rgba(8,119,160,0.08)' : 'transparent',
                }}
              >
                {link.label}
                {(link.badge || 0) > 0 && (
                  <span style={{
                    width: '20px', height: '20px', borderRadius: '50%',
                    background: '#f59e0b', color: '#000',
                    fontSize: '11px', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {link.badge}
                  </span>
                )}
              </Link>
            ))}
            <Link href="/profile" onClick={() => setMenuOpen(false)}
              style={{ display: 'flex', alignItems: 'center', padding: '1rem 1.25rem', fontSize: '1rem', color: 'var(--text-secondary)', textDecoration: 'none', borderBottom: '1px solid var(--border)', minHeight: 0 }}>
              👤 Profile
            </Link>
            <button
              onClick={handleSignOut}
              style={{
                width: '100%', display: 'flex', alignItems: 'center',
                padding: '1rem 1.25rem', fontSize: '1rem', color: '#ef4444',
                background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', minHeight: 0,
              }}
            >
              🚪 Sign Out
            </button>
          </div>
        </div>
      )}

      <style>{`
        @media (min-width: 900px) {
          .nav-desktop { display: flex !important; }
          .hamburger { display: none !important; }
          .chevron-desktop { display: block !important; }
        }
      `}</style>
    </>
  )
}
