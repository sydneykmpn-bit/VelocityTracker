'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'

const inputBase: React.CSSProperties = {
  background: '#0d1a1e',
  border: '1px solid #1a2e34',
  borderRadius: '0.5rem',
  padding: '0.6rem 0.875rem',
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
  marginBottom: '0.375rem',
}

const UNITS = ['kg', 'lbs', 'reps', 'seconds'] as const
type Unit = typeof UNITS[number]

const medals: Record<number, { emoji: string; color: string }> = {
  0: { emoji: '🥇', color: '#FFD700' },
  1: { emoji: '🥈', color: '#C0C0C0' },
  2: { emoji: '🥉', color: '#CD7F32' },
}

export default function LeaderboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [records, setRecords] = useState<any[]>([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [exercise, setExercise] = useState('')
  const [value, setValue] = useState('')
  const [unit, setUnit] = useState<Unit>('kg')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadRecords = async () => {
    let q = supabase
      .from('personal_records')
      .select('*, profiles(name)')
      .order('value', { ascending: false })
    const { data } = await q
    setRecords(data ?? [])
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      await loadRecords()
      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = filter.trim()
    ? records.filter(r => r.exercise.toLowerCase().includes(filter.toLowerCase()))
    : records

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!exercise.trim() || !value) return
    setSubmitting(true)
    setError('')
    setSuccess('')
    const { error: err } = await supabase.from('personal_records').insert({
      user_id: userId,
      exercise: exercise.trim(),
      value: parseFloat(value),
      unit,
      date,
    })
    if (err) {
      setError(err.message)
    } else {
      setSuccess('PR submitted!')
      setExercise('')
      setValue('')
      setUnit('kg')
      setDate(new Date().toISOString().split('T')[0])
      setShowForm(false)
      await loadRecords()
    }
    setSubmitting(false)
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
      <Navbar />
      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: '2.5rem', letterSpacing: '0.03em' }}>LEADERBOARD</h1>
          <button
            onClick={() => { setShowForm(!showForm); setError(''); setSuccess('') }}
            style={{
              background: showForm ? 'var(--surface)' : 'var(--teal-primary)',
              color: 'white', border: showForm ? '1px solid var(--border)' : 'none',
              borderRadius: '0.5rem', padding: '0.75rem 1.25rem',
              fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
            }}
          >
            {showForm ? 'Cancel' : '+ Submit PR'}
          </button>
        </div>

        {/* PR Submission Form */}
        {showForm && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '1rem', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.25rem', letterSpacing: '0.03em', marginBottom: '1rem' }}>SUBMIT YOUR PR</h2>
            {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', color: '#f87171', fontSize: '0.875rem' }}>{error}</div>}
            {success && <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', color: '#4ade80', fontSize: '0.875rem' }}>{success}</div>}
            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelBase}>Exercise Name *</label>
                <input type="text" value={exercise} onChange={e => setExercise(e.target.value)} required style={{ ...inputBase, width: '100%' }} placeholder="e.g. Back Squat" />
              </div>
              <div>
                <label style={labelBase}>Value *</label>
                <input type="number" value={value} onChange={e => setValue(e.target.value)} required min="0" step="0.01" style={{ ...inputBase, width: '100%' }} placeholder="100" />
              </div>
              <div>
                <label style={labelBase}>Unit</label>
                <select value={unit} onChange={e => setUnit(e.target.value as Unit)} style={{ ...inputBase, width: '100%', cursor: 'pointer' }}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label style={labelBase}>Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inputBase, width: '100%' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button type="submit" disabled={submitting} style={{
                  background: submitting ? '#0d1a1e' : 'var(--teal-primary)', color: 'white',
                  border: 'none', borderRadius: '0.5rem', padding: '0.65rem 1.5rem',
                  fontWeight: 700, fontSize: '0.875rem', cursor: submitting ? 'not-allowed' : 'pointer',
                }}>
                  {submitting ? 'Saving…' : 'Submit PR'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filter */}
        <div style={{ marginBottom: '1.25rem' }}>
          <input
            type="text"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filter by exercise…"
            style={{ ...inputBase, width: '100%', maxWidth: '320px' }}
          />
        </div>

        {/* Table */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '1rem', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Rank', 'Name', 'Exercise', 'Value', 'Unit', 'Date'].map(h => (
                  <th key={h} style={{
                    padding: '0.875rem 1rem', textAlign: 'left',
                    fontSize: '0.7rem', color: 'var(--text-secondary)',
                    textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    No records yet.
                  </td>
                </tr>
              ) : (
                filtered.map((r, idx) => {
                  const medal = medals[idx]
                  return (
                    <tr key={r.id} style={{
                      borderBottom: '1px solid var(--border)',
                      background: idx < 3 ? `${medal.color}08` : 'transparent',
                    }}>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        {medal ? (
                          <span style={{ fontSize: '1.1rem' }}>{medal.emoji}</span>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>#{idx + 1}</span>
                        )}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', fontWeight: 600, fontSize: '0.875rem' }}>
                        {r.profiles?.name ?? '—'}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem' }}>{r.exercise}</td>
                      <td style={{ padding: '0.875rem 1rem', fontFamily: 'var(--font-bebas)', fontSize: '1.1rem', color: 'var(--teal-secondary)' }}>
                        {r.value}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{r.unit}</td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
