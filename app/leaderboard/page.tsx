'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'
import { Trash2 } from 'lucide-react'

type LeaderTab = 'public' | 'mine'
const UNITS = ['kg', 'lbs', 'reps', 'seconds'] as const
type Unit = typeof UNITS[number]

const inputBase: React.CSSProperties = {
  background: '#0d1a1e', border: '1px solid #1a2e34', borderRadius: '0.5rem',
  padding: '0.6rem 0.875rem', color: '#F2F2F2', fontSize: '0.875rem', outline: 'none',
}
const labelBase: React.CSSProperties = {
  display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)',
  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.375rem',
}
const MEDALS: Record<number, { emoji: string; color: string }> = {
  0: { emoji: '🥇', color: '#FFD700' },
  1: { emoji: '🥈', color: '#C0C0C0' },
  2: { emoji: '🥉', color: '#CD7F32' },
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      style={{
        width: '42px', height: '22px', borderRadius: '999px', flexShrink: 0,
        background: on ? 'var(--teal-primary)' : '#2a3a40',
        position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
        border: `1px solid ${on ? 'var(--teal-primary)' : '#3a4a50'}`,
      }}
    >
      <div style={{
        position: 'absolute', top: '2px',
        left: on ? '21px' : '2px',
        width: '16px', height: '16px', borderRadius: '50%',
        background: 'white', transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
      }} />
    </div>
  )
}

export default function LeaderboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<LeaderTab>('public')
  const [publicRecords, setPublicRecords] = useState<any[]>([])
  const [myRecords, setMyRecords] = useState<any[]>([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [exercise, setExercise] = useState('')
  const [value, setValue] = useState('')
  const [unit, setUnit] = useState<Unit>('kg')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [isPublic, setIsPublic] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadData = async (uid: string) => {
    const [{ data: publicPRs }, { data: myPRs }] = await Promise.all([
      supabase
        .from('personal_records')
        .select('*, profiles(name)')
        .eq('is_public', true)
        .order('value', { ascending: false }),
      supabase
        .from('personal_records')
        .select('*')
        .eq('user_id', uid)
        .order('recorded_at', { ascending: false }),
    ])
    setPublicRecords(publicPRs ?? [])
    setMyRecords(myPRs ?? [])
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      await loadData(user.id)
      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!exercise.trim() || !value || !userId) return
    setSubmitting(true); setError(''); setSuccess('')
    const { error: err } = await supabase.from('personal_records').insert({
      user_id: userId,
      exercise_name: exercise.trim(),
      value: Number(value),
      unit,
      date,
      recorded_at: new Date(date).toISOString(),
      is_public: isPublic,
    })
    if (err) {
      setError(err.message)
    } else {
      setSuccess('PR submitted!')
      setExercise(''); setValue(''); setUnit('kg')
      setDate(new Date().toISOString().split('T')[0]); setIsPublic(true)
      setShowForm(false)
      await loadData(userId)
    }
    setSubmitting(false)
  }

  const handleTogglePublic = async (record: any) => {
    if (!userId) return
    setUpdating(record.id)
    await supabase.from('personal_records').update({ is_public: !record.is_public }).eq('id', record.id)
    await loadData(userId)
    setUpdating(null)
  }

  const handleDelete = async (id: string) => {
    if (!userId) return
    setDeleting(id)
    await supabase.from('personal_records').delete().eq('id', id)
    await loadData(userId)
    setDeleting(null)
  }

  const filteredPublic = filter.trim()
    ? publicRecords.filter(r => (r.exercise_name ?? r.exercise ?? '').toLowerCase().includes(filter.toLowerCase()))
    : publicRecords

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>
      </div>
    )
  }

  const tabs: { value: LeaderTab; label: string }[] = [
    { value: 'public', label: 'PUBLIC LEADERBOARD' },
    { value: 'mine', label: 'MY PRs' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      <Navbar />
      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Toggle on={isPublic} onToggle={() => setIsPublic(!isPublic)} />
                <span style={{ fontSize: '0.8rem', color: isPublic ? '#F2F2F2' : 'var(--text-secondary)' }}>
                  Show on public leaderboard
                </span>
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
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

        {/* Tab Bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }}>
          {tabs.map(t => (
            <button key={t.value} onClick={() => setActiveTab(t.value)} style={{
              background: 'none', border: 'none',
              borderBottom: activeTab === t.value ? '2px solid var(--teal-primary)' : '2px solid transparent',
              color: activeTab === t.value ? 'var(--teal-secondary)' : 'var(--text-secondary)',
              padding: '0.75rem 1.25rem', cursor: 'pointer',
              fontFamily: 'var(--font-bebas)', fontSize: '1rem', letterSpacing: '0.04em',
              marginBottom: '-1px', transition: 'all 0.15s',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── PUBLIC LEADERBOARD TAB ── */}
        {activeTab === 'public' && (
          <>
            <div style={{ marginBottom: '1.25rem' }}>
              <input
                type="text" value={filter} onChange={e => setFilter(e.target.value)}
                placeholder="Filter by exercise…"
                style={{ ...inputBase, width: '100%', maxWidth: '320px' }}
              />
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '1rem', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Rank', 'Name', 'Exercise', 'Value', 'Unit', 'Date'].map(h => (
                      <th key={h} style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredPublic.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No public records yet.</td></tr>
                  ) : (
                    filteredPublic.map((r, idx) => {
                      const medal = MEDALS[idx]
                      return (
                        <tr key={r.id} style={{ borderBottom: '1px solid var(--border)', background: medal ? `${medal.color}08` : 'transparent' }}>
                          <td style={{ padding: '0.875rem 1rem' }}>
                            {medal
                              ? <span style={{ fontSize: '1.1rem' }}>{medal.emoji}</span>
                              : <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>#{idx + 1}</span>}
                          </td>
                          <td style={{ padding: '0.875rem 1rem', fontWeight: 600, fontSize: '0.875rem' }}>{r.profiles?.name ?? '—'}</td>
                          <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem' }}>{r.exercise_name ?? r.exercise}</td>
                          <td style={{ padding: '0.875rem 1rem', fontFamily: 'var(--font-bebas)', fontSize: '1.1rem', color: 'var(--teal-secondary)' }}>{r.value}</td>
                          <td style={{ padding: '0.875rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{r.unit}</td>
                          <td style={{ padding: '0.875rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {new Date(r.date ?? r.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── MY PRs TAB ── */}
        {activeTab === 'mine' && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '1rem', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Exercise', 'Value', 'Unit', 'Date', 'Public', ''].map(h => (
                    <th key={h} style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {myRecords.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No PRs yet. Submit your first one above.</td></tr>
                ) : (
                  myRecords.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', fontWeight: 600 }}>{r.exercise_name ?? r.exercise}</td>
                      <td style={{ padding: '0.875rem 1rem', fontFamily: 'var(--font-bebas)', fontSize: '1.1rem', color: 'var(--teal-secondary)' }}>{r.value}</td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{r.unit}</td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {new Date(r.date ?? r.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: updating === r.id ? 0.5 : 1 }}>
                          <Toggle on={r.is_public ?? false} onToggle={() => updating === null && handleTogglePublic(r)} />
                          <span style={{ fontSize: '0.7rem', color: r.is_public ? 'var(--teal-secondary)' : 'var(--text-secondary)' }}>
                            {r.is_public ? 'Public' : 'Private'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <button
                          onClick={() => deleting === null && handleDelete(r.id)}
                          disabled={deleting === r.id}
                          style={{ background: 'none', border: 'none', cursor: deleting === r.id ? 'not-allowed' : 'pointer', color: '#f87171', display: 'flex', opacity: deleting === r.id ? 0.5 : 1 }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
