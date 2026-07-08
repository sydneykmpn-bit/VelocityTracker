'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Mars, Venus, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import VLogo from '@/components/VLogo'

const inputBase: React.CSSProperties = {
  width: '100%',
  background: '#0d1a1e',
  border: '1px solid #1a2e34',
  borderRadius: '0.5rem',
  padding: '0.75rem 1rem',
  color: '#F2F2F2',
  fontSize: '1rem',
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

const GENDERS: { key: string; label: string; icon?: typeof Mars }[] = [
  { key: 'male', label: 'Male', icon: Mars },
  { key: 'female', label: 'Female', icon: Venus },
  { key: 'other', label: 'Other' },
]

export default function RegisterForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [age, setAge] = useState('')
  const [city, setCity] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [gender, setGender] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [medicalInfo, setMedicalInfo] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()

    const cleanUsername = username.toLowerCase().trim()

    if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      setError('Username must be 3–20 characters, letters/numbers/underscores only.')
      setLoading(false)
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      setLoading(false)
      return
    }
    if (!name.trim() || !age || !city.trim() || !contactNumber.trim() || !gender) {
      setError('Please fill in all required fields.')
      setLoading(false)
      return
    }

    const { data: existing } = await supabase
      .from('profiles')
      .select('id, approved')
      .ilike('username', cleanUsername)
      .maybeSingle()

    if (existing) {
      setError(existing.approved ? 'This username is already taken. Please choose another.' : 'This username is pending approval. Please wait for an admin to approve the account.')
      setLoading(false)
      return
    }

    const { error: authError } = await supabase.auth.signUp({
      email: `${cleanUsername}@velocity.local`,
      password,
      options: {
        data: {
          name: name.trim(), role: 'member', gender, username: cleanUsername,
          age: String(age), city: city.trim(), contact_number: contactNumber.trim(),
          medical_info: medicalInfo.trim() || null,
        },
      },
    })

    if (authError) {
      setError(authError.message.toLowerCase().includes('already registered')
        ? 'This username is already taken. Please choose another.'
        : authError.message)
      setLoading(false)
    } else {
      router.push('/pending-approval')
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--background)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
    }}>
      <div className="fade-in-up" style={{ width: '100%', maxWidth: '440px' }}>
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center' }}>
          <VLogo height={54} />
        </div>
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '1rem', padding: '2rem',
          margin: '0 -0.25rem',
        }}>
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
              <label style={labelBase}>Username</label>
              <input
                type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                required style={inputBase} placeholder="e.g. juan_dc" autoCapitalize="none" autoCorrect="off"
              />
              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                3–20 characters, letters/numbers/underscores only.
              </p>
            </div>

            <div>
              <label style={labelBase}>Age</label>
              <input type="number" value={age} onChange={(e) => setAge(e.target.value)} required style={inputBase} placeholder="e.g. 22" min="10" max="100" />
            </div>

            <div>
              <label style={labelBase}>City</label>
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)} required style={inputBase} placeholder="e.g. Manila" />
            </div>

            <div>
              <label style={labelBase}>Contact Number</label>
              <input type="tel" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} required style={inputBase} placeholder="e.g. 0917 123 4567" />
            </div>

            {/* Gender */}
            <div>
              <label style={labelBase}>Gender</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {GENDERS.map(g => (
                  <button
                    key={g.key}
                    type="button"
                    onClick={() => setGender(gender === g.key ? '' : g.key)}
                    style={{
                      background: gender === g.key ? 'rgba(8,119,160,0.2)' : '#0d1a1e',
                      border: `1px solid ${gender === g.key ? 'var(--teal-primary)' : '#1a2e34'}`,
                      borderRadius: '999px',
                      padding: '0.4rem 0.875rem',
                      color: gender === g.key ? 'var(--teal-secondary)' : 'var(--text-secondary)',
                      fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.15s',
                      fontWeight: gender === g.key ? 700 : 400, minHeight: 36,
                      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                    }}
                  >
                    {g.icon && <g.icon size={12} />} {g.label}
                  </button>
                ))}
              </div>
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
                    cursor: 'pointer', display: 'flex', alignItems: 'center', minHeight: 0,
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label style={labelBase}>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required style={{ ...inputBase, paddingRight: '2.75rem' }}
                  placeholder="••••••••" minLength={6}
                />
                <button
                  type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--text-secondary)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', minHeight: 0,
                  }}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label style={labelBase}>Injuries / Medical Info</label>
              <textarea
                value={medicalInfo} onChange={(e) => setMedicalInfo(e.target.value)}
                style={{ ...inputBase, minHeight: '90px', resize: 'vertical', fontFamily: 'inherit' }}
                placeholder="Any injuries, conditions, or medications your coach should know about"
              />
              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Lock size={11} /> Only visible to you, your coaches, and admins.
              </p>
            </div>

            <button
              type="submit" disabled={loading}
              style={{
                background: loading ? '#0d1a1e' : 'var(--teal-primary)',
                color: 'white', border: 'none', borderRadius: '0.5rem',
                padding: '0.875rem', fontWeight: 700, fontSize: '1rem',
                cursor: loading ? 'not-allowed' : 'pointer', marginTop: '0.25rem',
                transition: 'background 0.2s', width: '100%',
              }}
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--teal-secondary)', textDecoration: 'none', minHeight: 0, display: 'inline' }}>Sign in</Link>
          </p>
          <p style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Contact your coach or admin to update your role.
          </p>
        </div>
      </div>
    </div>
  )
}
