'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface NavbarProps {
  userName: string
  userRole: string
}

const VLogo = () => (
  <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
    <path d="M4 6L16 26L28 6" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10 6L16 18L22 6" stroke="#0877a0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export default function Navbar({ userName, userRole }: NavbarProps) {
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: '#000000',
        borderBottom: '1px solid var(--border)',
        padding: '0 1.5rem',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <Link
          href="/dashboard"
          style={{
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <VLogo />
          <span
            style={{
              fontFamily: 'var(--font-bebas)',
              letterSpacing: '0.05em',
              fontSize: '1.1rem',
              color: 'white',
            }}
          >
            VELOCITY <span style={{ color: '#34bac2' }}>PH</span>
          </span>
        </Link>
        <div style={{ display: 'flex', gap: '1.25rem' }}>
          <Link
            href="/dashboard"
            style={{
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              fontSize: '0.875rem',
            }}
          >
            Dashboard
          </Link>
          <Link
            href="/workouts"
            style={{
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              fontSize: '0.875rem',
            }}
          >
            Workouts
          </Link>
          {userRole === 'coach' && (
            <Link
              href="/coach"
              style={{
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                fontSize: '0.875rem',
              }}
            >
              Coach
            </Link>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ textAlign: 'right' }}>
          <p
            style={{
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            {userName}
          </p>
          <p
            style={{
              fontSize: '0.65rem',
              color: 'var(--teal-primary)',
              textTransform: 'capitalize',
            }}
          >
            {userRole}
          </p>
        </div>
        <button
          onClick={handleLogout}
          title="Logout"
          style={{
            background: 'none',
            border: '1px solid var(--border)',
            borderRadius: '0.375rem',
            padding: '0.4rem',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <LogOut size={15} />
        </button>
      </div>
    </nav>
  )
}
