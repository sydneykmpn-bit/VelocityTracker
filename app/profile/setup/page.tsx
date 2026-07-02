'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import VLogo from '@/components/VLogo'

const inputBase: React.CSSProperties = {
  width: '100%', background: '#0d1a1e', border: '1px solid #1a2e34', borderRadius: '0.5rem',
  padding: '0.75rem 1rem', color: '#F2F2F2', fontSize: '1rem', outline: 'none',
}
const labelBase: React.CSSProperties = {
  display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)',
  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem',
}

const GENDERS = [
  { value: 'male', label: '♂ Male' },
  { value: 'female', label: '♀ Female' },
  { value: 'other', label: 'Other' },
]

export default function ProfileSetupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', age: '', gender: '', city: '', contact_number: '', medical_info: '',
  })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setForm({
          name: data.name || '',
          age: data.age?.toString() || '',
          gender: data.gender || '',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true); setError('')
    const { error: err } = await supabase.from('profiles').update({
      name: form.name.trim(),
      age: form.age ? parseInt(form.age) : null,
      gender: form.gender || null,
      city: form.city.trim() || null,
      contact_number: form.contact_number.trim() || null,
      medical_info: form.medical_info.trim() || null,
      profile_completed: true,
    }).eq('id', userId)
    if (err) { setError(err.message); setSaving(false); return }
    router.push('/dashboard')
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--pure-black)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--pure-black)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div className="fade-in-up" style={{ width: '100%', maxWidth: '440px' }}>
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center' }}>
          <VLogo height={54} />
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '1rem', padding: '2rem' }}>
          <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: '2rem', letterSpacing: '0.03em', marginBottom: '0.4rem' }}>
            COMPLETE YOUR PROFILE
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            Just a few details before you get started.
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

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div>
              <label style={labelBase}>Full Name</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required style={inputBase} placeholder="Your name" />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div style={{ flex: 1 }}>
                <label style={labelBase}>Age</label>
                <input type="number" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} style={inputBase} placeholder="e.g. 22" min="10" max="100" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelBase}>City</label>
                <input type="text" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} style={inputBase} placeholder="e.g. Manila" />
              </div>
            </div>

            <div>
              <label style={labelBase}>Gender</label>
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

            <div>
              <label style={labelBase}>Contact Number</label>
              <input type="tel" value={form.contact_number} onChange={e => setForm({ ...form, contact_number: e.target.value })} style={inputBase} placeholder="e.g. 0917 123 4567" />
            </div>

            <div>
              <label style={labelBase}>Injury / Medical Information</label>
              <textarea
                value={form.medical_info} onChange={e => setForm({ ...form, medical_info: e.target.value })}
                style={{ ...inputBase, minHeight: '90px', resize: 'vertical', fontFamily: 'inherit' }}
                placeholder="Any injuries, conditions, or medications your coach should know about"
              />
              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                🔒 Only visible to you, your coaches, and admins.
              </p>
            </div>

            <button
              type="submit" disabled={saving}
              style={{
                background: saving ? '#0d1a1e' : 'var(--teal-primary)',
                color: 'white', border: 'none', borderRadius: '0.5rem',
                padding: '0.875rem', fontWeight: 700, fontSize: '0.95rem',
                cursor: saving ? 'not-allowed' : 'pointer', marginTop: '0.25rem',
              }}
            >
              {saving ? 'Saving…' : 'Continue to Dashboard'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
