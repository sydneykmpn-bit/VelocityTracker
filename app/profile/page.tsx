'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const inputBase: React.CSSProperties = {
  width: '100%', background: '#0d1a1e', border: '1px solid #1a2e34', borderRadius: '0.5rem',
  padding: '0.6rem 0.875rem', color: '#F2F2F2', fontSize: '1rem', outline: 'none',
}
const labelBase: React.CSSProperties = {
  display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)',
  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem',
}

const GENDERS = [
  { value: 'male', label: '♂ Male' },
  { value: 'female', label: '♀ Female' },
  { value: 'other', label: 'Other' },
]

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState<any>(null)
  const [form, setForm] = useState({
    name: '', gender: '', age: '', weight_kg: '', weight_unit: 'kg',
    city: '', contact_number: '', medical_info: '',
  })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setProfile(data)
        setForm({
          name: data.name || '',
          gender: data.gender || '',
          age: data.age?.toString() || '',
          weight_kg: data.weight_kg?.toString() || '',
          weight_unit: data.weight_unit || 'kg',
          city: data.city || '',
          contact_number: data.contact_number || '',
          medical_info: data.medical_info || '',
        })
      }
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async () => {
    setSaving(true); setError(''); setSuccess(false)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error: err } = await supabase.from('profiles').update({
      name: form.name,
      gender: form.gender || null,
      age: form.age ? parseInt(form.age) : null,
      weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
      weight_unit: form.weight_unit,
      city: form.city.trim() || null,
      contact_number: form.contact_number.trim() || null,
      medical_info: form.medical_info.trim() || null,
    }).eq('id', user.id)
    if (err) setError(err.message)
    else setSuccess(true)
    setSaving(false)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      <main style={{ maxWidth: '560px', margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <p style={{ color: 'var(--teal-secondary)', fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Account</p>
          <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: 'clamp(2.25rem, 6vw, 3.5rem)', letterSpacing: '0.03em' }}>EDIT PROFILE</h1>
        </div>

        {!profile?.gender && (
          <div style={{ background: 'rgba(8,119,160,0.1)', color: 'var(--teal-secondary)', border: '1px solid rgba(8,119,160,0.3)', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            ⚠️ Set your gender to appear on the leaderboard. Gender is required for leaderboard visibility.
          </div>
        )}

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '1rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1rem' }}>
          {/* Name */}
          <div>
            <label style={labelBase}>Full Name</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputBase} placeholder="Your name" />
          </div>

          {/* Gender */}
          <div>
            <label style={labelBase}>
              Gender <span style={{ color: 'var(--teal-secondary)' }}>*</span>
              <span style={{ marginLeft: '0.5rem', textTransform: 'none', fontSize: '0.65rem', color: 'var(--text-secondary)', letterSpacing: 0 }}>Required for leaderboard</span>
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {GENDERS.map(g => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setForm({ ...form, gender: form.gender === g.value ? '' : g.value })}
                  style={{
                    padding: '0.5rem 1rem', borderRadius: '999px', fontSize: '0.875rem', fontWeight: 500,
                    cursor: 'pointer', transition: 'all 0.15s',
                    background: form.gender === g.value ? 'var(--teal-primary)' : 'var(--surface-raised)',
                    color: form.gender === g.value ? '#fff' : 'var(--text-secondary)',
                    border: `1px solid ${form.gender === g.value ? 'var(--teal-primary)' : 'var(--border)'}`,
                    minHeight: 0,
                  }}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Age */}
          <div>
            <label style={labelBase}>Age</label>
            <input type="number" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} style={inputBase} placeholder="e.g. 22" min="10" max="100" />
          </div>

          {/* City */}
          <div>
            <label style={labelBase}>City</label>
            <input type="text" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} style={inputBase} placeholder="e.g. Manila" />
          </div>

          {/* Contact Number */}
          <div>
            <label style={labelBase}>Contact Number</label>
            <input type="tel" value={form.contact_number} onChange={e => setForm({ ...form, contact_number: e.target.value })} style={inputBase} placeholder="e.g. 0917 123 4567" />
          </div>

          {/* Weight */}
          <div>
            <label style={labelBase}>Body Weight</label>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input type="number" value={form.weight_kg} onChange={e => setForm({ ...form, weight_kg: e.target.value })} style={{ ...inputBase, flex: 1 }} placeholder="e.g. 70" min="30" max="300" step="0.1" />
              <div style={{ display: 'flex', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--border)', flexShrink: 0 }}>
                {['kg', 'lbs'].map(u => (
                  <button key={u} type="button" onClick={() => setForm({ ...form, weight_unit: u })} style={{
                    padding: '0.6rem 1rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', border: 'none',
                    background: form.weight_unit === u ? 'var(--teal-primary)' : '#0d1a1e',
                    color: form.weight_unit === u ? '#fff' : 'var(--text-secondary)',
                    minHeight: 0,
                  }}>{u}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Medical / Injury Info */}
          <div>
            <label style={labelBase}>Medical / Injury Info</label>
            <textarea
              value={form.medical_info} onChange={e => setForm({ ...form, medical_info: e.target.value })}
              style={{ ...inputBase, minHeight: '90px', resize: 'vertical', fontFamily: 'inherit' }}
              placeholder="Any injuries, conditions, or medications your coach should know about"
            />
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
              🔒 Visible to your coaches and admins only.
            </p>
          </div>

          {/* Role (read-only) */}
          <div>
            <label style={labelBase}>Role</label>
            <div style={{ background: '#0a1518', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.6rem 0.875rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--teal-secondary)', textTransform: 'capitalize' }}>
              {profile?.role}
            </div>
          </div>

          {error && <p style={{ fontSize: '0.875rem', color: '#fca5a5' }}>{error}</p>}
          {success && <p style={{ fontSize: '0.875rem', color: '#4ade80' }}>✅ Profile saved successfully!</p>}

          <button onClick={handleSave} disabled={saving} style={{
            background: saving ? '#0d1a1e' : 'var(--teal-primary)', color: 'white',
            border: 'none', borderRadius: '0.75rem', padding: '0.875rem',
            fontWeight: 700, fontSize: '1rem', cursor: saving ? 'not-allowed' : 'pointer',
          }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>

        <button
          onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
          style={{
            width: '100%', background: 'none', border: '1px solid var(--border)', borderRadius: '0.75rem',
            padding: '0.875rem', color: 'var(--text-secondary)', fontSize: '1rem', cursor: 'pointer',
          }}
        >
          Sign Out
        </button>
      </main>
    </div>
  )
}
