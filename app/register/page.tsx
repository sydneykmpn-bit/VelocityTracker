'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const VLogo = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path d="M4 6L16 26L28 6" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 6L16 18L22 6" stroke="#0877a0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <span style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.05em', fontSize: '1.5rem' }}>
      VELOCITY <span style={{ color: '#34bac2' }}>FITNESS</span>
    </span>
  </div>
)

const inputBase: React.CSSProperties = {
  width: '100%',
  background: '#0d1a1e',
  border: '1px solid #1a2e34',
  borderRadius: '0.5rem',
  padding: '0.75rem 1rem',
  color: '#F2F2F2',
  fontSize: '0.875rem',
  outline: 'none',
}

const labelBase: React.CSSProperties = {
  display: 'block',
  fontSize: '0.7rem',
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: '0.4rem',
}

type Role = 'member' | 'coach'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('member')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role } },
    })
    if (authError) {
      setError(authError.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--background)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
    }}>
      <div className="fade-in-up" style={{ width: '100%', maxWidth: '440px' }}>
        <div style={{ marginBottom: '2rem' }}>
          <VLogo />
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '1rem', padding: '2rem' }}>
          <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: '2rem', letterSpacing: '0.03em', marginBottom: '0.4rem' }}>
            CREATE ACCOUNT
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            Join Velocity Fitness PH
          </p>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem',
              color: '#f87171', fontSize: '0.875rem',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={labelBase}>Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required style={inputBase} placeholder="Your name" />
            </div>
            <div>
              <label style={labelBase}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputBase} placeholder="you@example.com" />
            </div>
            <div>
              <label style={labelBase}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required style={{ ...inputBase, paddingRight: '2.75rem' }}
                  placeholder="••••••••" minLength={6}
                />
                <button
                  type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--text-secondary)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Role selector */}
            <div>
              <label style={{ ...labelBase, marginBottom: '0.75rem' }}>I am a…</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {(['member', 'coach'] as Role[]).map((r) => (
                  <button
                    key={r} type="button" onClick={() => setRole(r)}
                    style={{
                      background: role === r ? 'rgba(8,119,160,0.15)' : '#0d1a1e',
                      border: `1px solid ${role === r ? 'var(--teal-primary)' : '#1a2e34'}`,
                      borderRadius: '0.5rem', padding: '1rem',
                      color: '#F2F2F2', cursor: 'pointer', textAlign: 'center',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>
                      {r === 'member' ? '🏋️' : '👨‍💼'}
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'capitalize' }}>
                      {r === 'member' ? 'Member' : 'Coach'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              style={{
                background: loading ? '#0d1a1e' : 'var(--teal-primary)',
                color: 'white', border: 'none', borderRadius: '0.5rem',
                padding: '0.875rem', fontWeight: 700, fontSize: '0.95rem',
                cursor: loading ? 'not-allowed' : 'pointer', marginTop: '0.25rem',
                transition: 'background 0.2s',
              }}
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--teal-secondary)', textDecoration: 'none' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
