'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Trash2 } from 'lucide-react'
import { debounce, getLocalDateString, normalizeToKg, sortRecords, LOWER_IS_BETTER } from '@/lib/utils'

type LeaderTab = 'public' | 'mine'
const UNITS = ['kg', 'lbs', 'reps', 'seconds', 'minutes', 'km/h', 'mph'] as const
type Unit = typeof UNITS[number]

const EXERCISE_LIST = [
  'Back Squat','Front Squat','Deadlift','Romanian Deadlift','Bench Press','Overhead Press',
  'Barbell Row','Pull Up','Chin Up','Dip','Push Up','Incline Bench Press','Sumo Deadlift',
  'Hip Thrust','Leg Press','Lunges','Clean & Jerk','Snatch','Power Clean','Push Press',
  '400m Run','800m Run','1km Run','5km Run','10km Run','Treadmill Sprint','Treadmill Endurance',
  'Rowing 500m','Rowing 2000m','Bike','Jump Rope','Box Jump','Burpees','Wall Balls','Kettlebell Swing',
  'Free Throw %','3-Point %','Vertical Jump','Sprint','Agility T-Test',
]

const FEATURED_EXERCISES = [
  { key: 'Back Squat', label: 'Squat', icon: '🏋️' },
  { key: 'Deadlift', label: 'Deadlift', icon: '💀' },
  { key: 'Overhead Press', label: 'OHP', icon: '☝️' },
  { key: 'Sprint', label: 'Sprint', icon: '💨' },
]

const PUBLIC_PR_EXERCISES = [
  { name: 'Back Squat', icon: '🏋️', unit: 'kg' },
  { name: 'Deadlift', icon: '💀', unit: 'kg' },
  { name: 'Overhead Press', icon: '☝️', unit: 'kg' },
  { name: 'Sprint', icon: '💨', unit: 'seconds' },
]

const GENDER_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'male', label: '♂ Men' },
  { key: 'female', label: '♀ Women' },
  { key: 'other', label: 'Other' },
]

const MEDALS: Record<number, { emoji: string; color: string }> = {
  0: { emoji: '🥇', color: '#FFD700' },
  1: { emoji: '🥈', color: '#C0C0C0' },
  2: { emoji: '🥉', color: '#CD7F32' },
}

const REACTIONS = [
  { type: 'fire', emoji: '🔥' },
  { type: 'flex', emoji: '💪' },
  { type: 'clap', emoji: '👏' },
]

const inputBase: React.CSSProperties = {
  background: '#0d1a1e', border: '1px solid #1a2e34', borderRadius: '0.5rem',
  padding: '0.6rem 0.875rem', color: '#F2F2F2', fontSize: '1rem', outline: 'none',
}
const labelBase: React.CSSProperties = {
  display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)',
  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.375rem',
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle} role="switch" aria-checked={on}
      style={{
        width: '42px', height: '22px', borderRadius: '999px', flexShrink: 0,
        background: on ? 'var(--teal-primary)' : '#2a3a40',
        position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
        border: `1px solid ${on ? 'var(--teal-primary)' : '#3a4a50'}`,
      }}
    >
      <div style={{
        position: 'absolute', top: '2px', left: on ? '21px' : '2px',
        width: '16px', height: '16px', borderRadius: '50%',
        background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
      }} />
    </div>
  )
}

function genderBadge(gender?: string) {
  if (gender === 'male') return <span style={{ color: '#60a5fa', fontSize: '0.7rem' }}> ♂</span>
  if (gender === 'female') return <span style={{ color: '#f472b6', fontSize: '0.7rem' }}> ♀</span>
  return null
}

export default function LeaderboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<LeaderTab>('public')
  const [publicRecords, setPublicRecords] = useState<any[]>([])
  const [myRecords, setMyRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [featuredFilter, setFeaturedFilter] = useState('Back Squat')
  const [genderFilter, setGenderFilter] = useState('all')
  const [memberSearchInput, setMemberSearchInput] = useState('')
  const [memberSearch, setMemberSearch] = useState('')

  const debouncedSetSearch = useCallback(debounce((v: string) => setMemberSearch(v), 400), [])

  // Form
  const [showForm, setShowForm] = useState(false)
  const [exercise, setExercise] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [value, setValue] = useState('')
  const [unit, setUnit] = useState<Unit>('kg')
  const [date, setDate] = useState(getLocalDateString())
  const [isPublic, setIsPublic] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Social
  const [reactionsByPR, setReactionsByPR] = useState<Record<string, any[]>>({})
  const [commentsByPR, setCommentsByPR] = useState<Record<string, any[]>>({})
  const [openComments, setOpenComments] = useState<Set<string>>(new Set())
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const [reactionError, setReactionError] = useState('')

  const filteredExerciseSuggestions = exercise.trim()
    ? EXERCISE_LIST.filter(e => e.toLowerCase().includes(exercise.toLowerCase())).slice(0, 6)
    : []

  const loadLeaderboard = async () => {
    const { data: rawData } = await supabase
      .from('personal_records')
      .select('*, profiles(id, name, gender)')
      .eq('is_public', true)

    let filtered = (rawData || []).filter((r: any) => r.exercise_name === featuredFilter)
    if (memberSearch.trim()) {
      filtered = filtered.filter((r: any) =>
        (r.profiles as any)?.name?.toLowerCase().includes(memberSearch.toLowerCase())
      )
    }
    if (genderFilter !== 'all') {
      filtered = filtered.filter((r: any) => {
        const profileGender = (r.profiles as any)?.gender
        return profileGender === genderFilter
      })
    }

    filtered = sortRecords(filtered)
    setPublicRecords(filtered)
    return filtered
  }

  const loadMyRecords = async (uid: string) => {
    const { data } = await supabase
      .from('personal_records')
      .select('*')
      .eq('user_id', uid)
      .order('recorded_at', { ascending: false })
    setMyRecords(data ?? [])
  }

  const loadSocial = async (prIds: string[], uid: string) => {
    if (prIds.length === 0) { setReactionsByPR({}); setCommentsByPR({}); return }
    const [{ data: reactions }, { data: comments }] = await Promise.all([
      supabase.from('leaderboard_reactions').select('*').in('pr_id', prIds),
      supabase.from('leaderboard_comments').select('*, profiles(name)').in('pr_id', prIds).order('created_at', { ascending: true }),
    ])
    const rMap: Record<string, any[]> = {}
    for (const r of reactions ?? []) { (rMap[r.pr_id] ??= []).push(r) }
    setReactionsByPR(rMap)
    const cMap: Record<string, any[]> = {}
    for (const c of comments ?? []) { (cMap[c.pr_id] ??= []).push(c) }
    setCommentsByPR(cMap)
  }

  const loadData = async (uid: string) => {
    const [recs] = await Promise.all([loadLeaderboard(), loadMyRecords(uid)])
    await loadSocial(recs.map(r => r.id), uid)
  }

  const toggleReaction = async (prId: string, type: string) => {
    if (!userId) return
    setReactionError('')
    const existing = (reactionsByPR[prId] ?? []).find(r => r.user_id === userId && r.reaction_type === type)
    if (existing) {
      const { error } = await supabase.from('leaderboard_reactions').delete().eq('id', existing.id)
      if (error) {
        console.error('toggleReaction failed:', error)
        setReactionError(error.message)
        return
      }
    } else {
      const { error } = await supabase.from('leaderboard_reactions').insert({ pr_id: prId, user_id: userId, reaction_type: type })
      if (error) {
        console.error('toggleReaction failed:', error)
        setReactionError(error.message)
        return
      }
    }
    await loadSocial(publicRecords.map(r => r.id), userId)
  }

  const toggleCommentsOpen = (prId: string) => {
    setOpenComments(prev => {
      const next = new Set(prev)
      if (next.has(prId)) next.delete(prId); else next.add(prId)
      return next
    })
  }

  const submitComment = async (prId: string) => {
    const text = (commentDrafts[prId] || '').trim()
    if (!text || !userId) return
    await supabase.from('leaderboard_comments').insert({ pr_id: prId, user_id: userId, comment: text })
    setCommentDrafts(prev => ({ ...prev, [prId]: '' }))
    await loadSocial(publicRecords.map(r => r.id), userId)
  }

  const deleteComment = async (id: string) => {
    if (!userId) return
    await supabase.from('leaderboard_comments').delete().eq('id', id)
    await loadSocial(publicRecords.map(r => r.id), userId)
  }

  useEffect(() => {
    const today = new Date()
    if (today.getDate() === 1) {
      supabase.rpc('reset_monthly_leaderboard').then(() => {
        loadLeaderboard()
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  useEffect(() => {
    if (userId) loadLeaderboard().then(recs => loadSocial(recs.map(r => r.id), userId))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featuredFilter, genderFilter, memberSearch])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!exercise.trim() || !value || !userId) return
    setSubmitting(true); setError(''); setSuccess('')
    const { error: err } = await supabase.from('personal_records').insert({
      user_id: userId,
      exercise_name: exercise.trim(),
      value: Number(value),
      unit, date,
      recorded_at: new Date(date).toISOString(),
      is_public: isPublic,
      month_year: getLocalDateString().slice(0, 7),
    })
    if (err) {
      setError(err.message)
    } else {
      setSuccess('PR submitted!')
      setExercise(''); setValue(''); setUnit('kg')
      setDate(getLocalDateString()); setIsPublic(true)
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
      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: '2.5rem', letterSpacing: '0.03em' }}>LEADERBOARD</h1>
          <button
            onClick={() => { setShowForm(!showForm); setError(''); setSuccess('') }}
            style={{
              background: showForm ? 'var(--surface)' : 'var(--teal-primary)',
              color: 'white', border: showForm ? '1px solid var(--border)' : 'none',
              borderRadius: '0.5rem', padding: '0.75rem 1.25rem',
              fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', minHeight: 44,
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
            {/* Info banner */}
            <div style={{ background: 'rgba(8,119,160,0.1)', border: '1px solid rgba(8,119,160,0.2)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--teal-secondary)' }}>
              {activeTab === 'public'
                ? '🏆 Public leaderboard tracks 3 main lifts + sprint. Selecting an exercise auto-sets the unit.'
                : '💪 Personal PRs are visible only to you and can be any exercise.'}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Exercise input — tab-aware */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelBase}>Exercise *</label>
                {activeTab === 'public' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    {PUBLIC_PR_EXERCISES.map(ex => (
                      <button
                        key={ex.name}
                        type="button"
                        onClick={() => { setExercise(ex.name); setUnit(ex.unit as any) }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.625rem',
                          padding: '0.75rem', borderRadius: '0.5rem', textAlign: 'left', cursor: 'pointer',
                          background: exercise === ex.name ? 'rgba(8,119,160,0.25)' : '#0d1a1e',
                          border: `1px solid ${exercise === ex.name ? 'var(--teal-primary)' : '#1a2e34'}`,
                          color: '#F2F2F2',
                        }}
                      >
                        <span style={{ fontSize: '1.25rem' }}>{ex.icon}</span>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: '0.8rem', color: exercise === ex.name ? 'var(--teal-secondary)' : '#F2F2F2' }}>{ex.name}</p>
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{ex.unit}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text" value={exercise} autoComplete="off"
                      onChange={e => { setExercise(e.target.value); setShowSuggestions(e.target.value.length > 0) }}
                      onFocus={() => exercise.length > 0 && setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                      required style={{ ...inputBase, width: '100%' }} placeholder="Any exercise…"
                    />
                    {showSuggestions && filteredExerciseSuggestions.length > 0 && (
                      <div style={{ position: 'absolute', top: 'calc(100% - 1px)', left: 0, right: 0, zIndex: 20, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0 0 0.5rem 0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                        {filteredExerciseSuggestions.map(s => (
                          <button key={s} type="button"
                            onMouseDown={() => { setExercise(s); setShowSuggestions(false) }}
                            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.5rem 0.875rem', background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#F2F2F2', fontSize: '0.875rem', cursor: 'pointer', minHeight: 36 }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(8,119,160,0.15)' }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
                          >{s}</button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
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
              {activeTab === 'mine' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Toggle on={isPublic} onToggle={() => setIsPublic(!isPublic)} />
                  <span style={{ fontSize: '0.8rem', color: isPublic ? '#F2F2F2' : 'var(--text-secondary)' }}>Show on public leaderboard</span>
                </div>
              )}
              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" disabled={submitting} style={{
                  background: submitting ? '#0d1a1e' : 'var(--teal-primary)', color: 'white',
                  border: 'none', borderRadius: '0.5rem', padding: '0.65rem 1.5rem',
                  fontWeight: 700, fontSize: '0.875rem', cursor: submitting ? 'not-allowed' : 'pointer', minHeight: 44,
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
            <button key={t.value} onClick={() => { setActiveTab(t.value); setExercise(''); setShowForm(false); if (t.value === 'public') setIsPublic(true) }} style={{
              background: 'none', border: 'none', width: '50%',
              borderBottom: activeTab === t.value ? '2px solid var(--teal-primary)' : '2px solid transparent',
              color: activeTab === t.value ? 'var(--teal-secondary)' : 'var(--text-secondary)',
              padding: '0.75rem 0.5rem', cursor: 'pointer',
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
            <p style={{ fontSize: '0.75rem', marginBottom: '1rem', color: 'var(--vel-text-dim, #4a5a60)' }}>
              🏆 Monthly leaderboard — resets on the 1st of each month. Past records are archived.
            </p>
            {/* Featured exercise pills */}
            <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', paddingBottom: '4px', marginBottom: '0.75rem' }}>
              {FEATURED_EXERCISES.map(ex => (
                <button key={ex.key}
                  onClick={() => setFeaturedFilter(ex.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.375rem',
                    padding: '0.5rem 0.875rem', borderRadius: '999px', fontSize: '0.8rem',
                    fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer',
                    background: featuredFilter === ex.key ? 'var(--teal-primary)' : 'var(--surface)',
                    color: featuredFilter === ex.key ? '#fff' : 'var(--text-secondary)',
                    border: `1px solid ${featuredFilter === ex.key ? 'var(--teal-primary)' : 'var(--border)'}`,
                    transition: 'all 0.15s', minHeight: 38,
                  }}>
                  {ex.icon} {ex.label}
                </button>
              ))}
            </div>

            {/* Member name search */}
            <input
              type="text"
              value={memberSearchInput}
              onChange={e => { setMemberSearchInput(e.target.value); debouncedSetSearch(e.target.value) }}
              placeholder="🔍 Search by member name…"
              style={{ ...inputBase, width: '100%', marginBottom: '0.5rem' }}
              aria-label="Search leaderboard by member name"
            />
            {memberSearch && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Results for &quot;<span style={{ color: 'var(--teal-secondary)' }}>{memberSearch}</span>&quot;
                </p>
                <button
                  onClick={() => { setMemberSearchInput(''); setMemberSearch('') }}
                  style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Clear ✕
                </button>
              </div>
            )}
            {/* Gender pills */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {GENDER_FILTERS.map(g => (
                <button key={g.key} onClick={() => setGenderFilter(g.key)} style={{
                  padding: '0.4rem 0.875rem', borderRadius: '999px', fontSize: '0.8rem',
                  fontWeight: 500, cursor: 'pointer',
                  background: genderFilter === g.key ? 'var(--surface)' : 'transparent',
                  color: genderFilter === g.key ? 'var(--text-primary)' : 'var(--text-secondary)',
                  border: `1px solid ${genderFilter === g.key ? 'var(--teal-primary)' : 'var(--border)'}`,
                  transition: 'all 0.15s', minHeight: 36,
                }}>{g.label}</button>
              ))}
            </div>

            {reactionError && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', color: '#f87171', fontSize: '0.875rem' }}>{reactionError}</div>}

            {/* Mobile card layout */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }} className="lb-mobile">
              {publicRecords.length === 0 ? (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  No public records yet.
                </div>
              ) : (
                publicRecords.map((r, i) => {
                  const medal = MEDALS[i]
                  const profile = r.profiles as { id: string; name: string; gender: string } | null
                  const reactions = reactionsByPR[r.id] ?? []
                  const comments = commentsByPR[r.id] ?? []
                  return (
                    <div key={r.id} className="card-vel" style={{ padding: '0.875rem 1rem', background: medal ? `${medal.color}08` : 'var(--surface)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '1.1rem', width: '2rem', textAlign: 'center', flexShrink: 0 }}>
                          {medal ? medal.emoji : `#${i + 1}`}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {profile?.name ?? '—'}
                            {profile?.gender === 'male' && <span style={{ marginLeft: '0.25rem', fontSize: '0.7rem', color: '#60a5fa' }}>♂</span>}
                            {profile?.gender === 'female' && <span style={{ marginLeft: '0.25rem', fontSize: '0.7rem', color: '#f472b6' }}>♀</span>}
                          </p>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.exercise_name ?? r.exercise}</p>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <p style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.2rem', color: 'var(--teal-secondary)' }}>{r.value} <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{r.unit}</span></p>
                          {r.unit === 'lbs' && (
                            <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>≈ {(r.value * 0.453592).toFixed(1)}kg</p>
                          )}
                          {LOWER_IS_BETTER.includes(r.exercise_name) && (
                            <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>lower = better</p>
                          )}
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                            {new Date(r.date ?? r.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      </div>

                      {/* Social footer */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', paddingTop: '0.625rem', borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
                        {REACTIONS.map(rx => {
                          const count = reactions.filter(x => x.reaction_type === rx.type).length
                          const mine = reactions.some(x => x.reaction_type === rx.type && x.user_id === userId)
                          return (
                            <button key={rx.type} onClick={() => toggleReaction(r.id, rx.type)} style={{
                              display: 'flex', alignItems: 'center', gap: '0.3rem', background: mine ? 'rgba(8,119,160,0.15)' : 'var(--surface-raised)',
                              border: `1px solid ${mine ? 'var(--teal-primary)' : 'var(--border)'}`, borderRadius: '999px',
                              padding: '0.3rem 0.625rem', fontSize: '0.75rem', cursor: 'pointer',
                              color: mine ? 'var(--teal-secondary)' : 'var(--text-secondary)', minHeight: 0,
                            }}>
                              {rx.emoji} {count > 0 && count}
                            </button>
                          )
                        })}
                        <button onClick={() => toggleCommentsOpen(r.id)} style={{
                          display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'var(--surface-raised)', border: '1px solid var(--border)',
                          borderRadius: '999px', padding: '0.3rem 0.625rem', fontSize: '0.75rem', cursor: 'pointer', color: 'var(--text-secondary)', minHeight: 0,
                        }}>
                          💬 {comments.length > 0 && comments.length}
                        </button>
                      </div>

                      {/* Comment thread */}
                      {openComments.has(r.id) && (
                        <div style={{ marginTop: '0.625rem', paddingTop: '0.625rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {comments.map(c => (
                            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8rem' }}>
                              <div>
                                <span style={{ fontWeight: 600 }}>{c.profiles?.name ?? '—'}</span>{' '}
                                <span style={{ color: 'var(--text-secondary)' }}>{c.comment}</span>
                              </div>
                              {c.user_id === userId && (
                                <button onClick={() => deleteComment(c.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', display: 'flex', flexShrink: 0, minHeight: 0 }}>
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          ))}
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                              type="text" value={commentDrafts[r.id] || ''} onChange={e => setCommentDrafts(prev => ({ ...prev, [r.id]: e.target.value }))}
                              onKeyDown={e => { if (e.key === 'Enter') submitComment(r.id) }}
                              placeholder="Add a comment…" style={{ ...inputBase, flex: 1, fontSize: '0.8rem' }}
                            />
                            <button onClick={() => submitComment(r.id)} style={{ background: 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.375rem', padding: '0 0.875rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', minHeight: 0 }}>Post</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </>
        )}

        {/* ── MY PRs TAB ── */}
        {activeTab === 'mine' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {myRecords.length === 0 ? (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                No PRs yet. Submit your first one above.
              </div>
            ) : (
              myRecords.map(r => (
                <div key={r.id} className="card-vel" style={{ padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{r.exercise_name ?? r.exercise}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                      {new Date(r.date ?? r.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <span style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.2rem', color: 'var(--teal-secondary)', flexShrink: 0 }}>
                    {r.value} <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{r.unit}</span>
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, opacity: updating === r.id ? 0.5 : 1 }}>
                    <Toggle on={r.is_public ?? false} onToggle={() => updating === null && handleTogglePublic(r)} />
                    <span style={{ fontSize: '0.7rem', color: r.is_public ? 'var(--teal-secondary)' : 'var(--text-secondary)', minWidth: '40px' }}>
                      {r.is_public ? 'Public' : 'Private'}
                    </span>
                  </div>
                  <button
                    onClick={() => deleting === null && handleDelete(r.id)}
                    disabled={deleting === r.id}
                    style={{ background: 'none', border: 'none', cursor: deleting === r.id ? 'not-allowed' : 'pointer', color: '#f87171', display: 'flex', opacity: deleting === r.id ? 0.5 : 1, flexShrink: 0, minHeight: 0 }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  )
}
