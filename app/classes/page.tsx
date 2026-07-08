'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, ChevronRight, X, Users } from 'lucide-react'

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
const DAY_LABELS: Record<string, string> = {
  sunday: 'Sunday', monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
  thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday',
}

function formatLocalDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getWeekStart(weekOffset: number): Date {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  start.setDate(start.getDate() - start.getDay() + weekOffset * 7)
  return start
}

function formatTime(t: string): string {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

const genderBadgeStyle: Record<string, { bg: string; color: string; border: string; label: string }> = {
  men: { bg: 'rgba(96,165,250,0.15)', color: '#60a5fa', border: 'rgba(96,165,250,0.3)', label: 'Men Only' },
  women: { bg: 'rgba(244,114,182,0.15)', color: '#f472b6', border: 'rgba(244,114,182,0.3)', label: 'Women Only' },
}

interface BballClass {
  id: string
  title: string
  description: string | null
  day_of_week: string
  start_time: string
  end_time: string
  gender_restriction: string
  max_slots: number
}

interface Occurrence {
  cls: BballClass
  date: string
  count: number
  joined: boolean
}

function ClassDetailModal({
  occ, myUserId, myGender, onClose, onJoinLeave,
}: {
  occ: Occurrence
  myUserId: string
  myGender: string | null
  onClose: () => void
  onJoinLeave: () => void
}) {
  const supabase = createClient()
  const [attendees, setAttendees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const loadAttendees = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('bball_class_signups')
      .select('id, user_id, profiles(name)')
      .eq('class_id', occ.cls.id)
      .eq('occurrence_date', occ.date)
    if (err) setError(err.message)
    setAttendees(data || [])
    setLoading(false)
  }, [supabase, occ.cls.id, occ.date])

  useEffect(() => { loadAttendees() }, [loadAttendees])

  const badge = genderBadgeStyle[occ.cls.gender_restriction]
  const full = occ.count >= occ.cls.max_slots
  const alreadyJoined = attendees.some(a => a.user_id === myUserId)

  const handleJoin = async () => {
    setError('')
    const restriction = occ.cls.gender_restriction
    if (restriction === 'men' && myGender !== 'male') { setError('This class is for men only.'); return }
    if (restriction === 'women' && myGender !== 'female') { setError('This class is for women only.'); return }
    setBusy(true)
    const { error: err } = await supabase.from('bball_class_signups').insert({
      class_id: occ.cls.id, user_id: myUserId, occurrence_date: occ.date,
    })
    if (err) {
      setError(err.message.toLowerCase().includes('full') ? 'This class just filled up.' : err.message)
      setBusy(false)
      return
    }
    await loadAttendees()
    onJoinLeave()
    setBusy(false)
  }

  const handleLeave = async () => {
    setBusy(true); setError('')
    const { error: err } = await supabase.from('bball_class_signups')
      .delete().eq('class_id', occ.cls.id).eq('user_id', myUserId).eq('occurrence_date', occ.date)
    if (err) { setError(err.message); setBusy(false); return }
    await loadAttendees()
    onJoinLeave()
    setBusy(false)
  }

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '1rem', background: 'var(--surface)', border: '1px solid var(--border)', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', letterSpacing: '0.03em' }}>{occ.cls.title}</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              {DAY_LABELS[occ.cls.day_of_week]} · {formatTime(occ.cls.start_time)} – {formatTime(occ.cls.end_time)}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', flexShrink: 0, minHeight: 0 }}><X size={16} /></button>
        </div>

        {badge && (
          <span style={{ display: 'inline-block', fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem', background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
            {badge.label}
          </span>
        )}

        {occ.cls.description && (
          <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '1rem', lineHeight: 1.5 }}>{occ.cls.description}</p>
        )}

        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', padding: '0.625rem 0.75rem', marginBottom: '0.75rem', color: '#f87171', fontSize: '0.8rem' }}>{error}</div>}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Users size={12} /> {attendees.length} / {occ.cls.max_slots} spots filled
          </p>
          {alreadyJoined ? (
            <button onClick={handleLeave} disabled={busy} style={{ background: 'none', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#ef4444', cursor: busy ? 'not-allowed' : 'pointer' }}>
              {busy ? 'Leaving…' : 'Leave'}
            </button>
          ) : full ? (
            <button disabled style={{ background: 'var(--border)', border: 'none', borderRadius: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', cursor: 'not-allowed' }}>
              Class Full
            </button>
          ) : (
            <button onClick={handleJoin} disabled={busy} style={{ background: 'var(--teal-primary)', border: 'none', borderRadius: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: 'white', cursor: busy ? 'not-allowed' : 'pointer' }}>
              {busy ? 'Joining…' : 'Join'}
            </button>
          )}
        </div>

        <div>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Attendees</p>
          {loading ? (
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Loading…</p>
          ) : attendees.length === 0 ? (
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No one has joined yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {attendees.map(a => (
                <div key={a.id} style={{ background: 'var(--surface-raised)', borderRadius: '0.5rem', padding: '0.6rem 0.875rem', fontSize: '0.875rem' }}>
                  {(a.profiles as any)?.name || 'Unknown'}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ClassesPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')
  const [gender, setGender] = useState<string | null>(null)
  const [weekOffset, setWeekOffset] = useState(0)
  const [classes, setClasses] = useState<BballClass[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [myJoins, setMyJoins] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')
  const [joinBlockedMsg, setJoinBlockedMsg] = useState('')
  const [selectedOcc, setSelectedOcc] = useState<Occurrence | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const weekStart = getWeekStart(weekOffset)

  const occurrenceDateFor = useCallback((dayOfWeek: string) => {
    const idx = DAY_NAMES.indexOf(dayOfWeek as any)
    const d = new Date(weekStart)
    d.setDate(d.getDate() + idx)
    return formatLocalDate(d)
  }, [weekStart])

  const loadWeekData = useCallback(async (clsList: BballClass[], uid: string) => {
    if (clsList.length === 0) { setCounts({}); setMyJoins(new Set()); return }
    const dates = clsList.map(c => occurrenceDateFor(c.day_of_week))
    const classIds = clsList.map(c => c.id)
    const { data, error: err } = await supabase
      .from('bball_class_signups')
      .select('class_id, user_id, occurrence_date')
      .in('class_id', classIds)
      .in('occurrence_date', Array.from(new Set(dates)))
    if (err) { setError(err.message); return }
    const countMap: Record<string, number> = {}
    const joined = new Set<string>()
    for (const row of data || []) {
      const key = `${row.class_id}_${row.occurrence_date}`
      countMap[key] = (countMap[key] || 0) + 1
      if (row.user_id === uid) joined.add(key)
    }
    setCounts(countMap)
    setMyJoins(joined)
  }, [supabase, occurrenceDateFor])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      const { data: profile } = await supabase.from('profiles').select('gender').eq('id', user.id).single()
      setGender(profile?.gender || null)

      const { data: cls, error: err } = await supabase.from('bball_classes').select('*').order('day_of_week').order('start_time')
      if (err) { setError(err.message); setLoading(false); return }
      setClasses(cls || [])
      await loadWeekData(cls || [], user.id)
      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!loading) loadWeekData(classes, userId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset])

  const refreshCounts = () => loadWeekData(classes, userId)

  const genderMatches = (restriction: string) => {
    if (restriction === 'mixed') return true
    if (restriction === 'men') return gender === 'male'
    if (restriction === 'women') return gender === 'female'
    return true
  }

  const handleJoin = async (occ: Occurrence) => {
    const key = `${occ.cls.id}_${occ.date}`
    setError(''); setJoinBlockedMsg('')
    if (!genderMatches(occ.cls.gender_restriction)) {
      const label = occ.cls.gender_restriction === 'men' ? 'men' : 'women'
      setJoinBlockedMsg(`This class is for ${label} only.`)
      return
    }
    setBusyKey(key)
    const { error: err } = await supabase.from('bball_class_signups').insert({
      class_id: occ.cls.id, user_id: userId, occurrence_date: occ.date,
    })
    if (err) {
      setError(err.message.toLowerCase().includes('full') ? 'This class just filled up.' : err.message)
      setBusyKey(null)
      await refreshCounts()
      return
    }
    await refreshCounts()
    setBusyKey(null)
  }

  const handleLeave = async (occ: Occurrence) => {
    const key = `${occ.cls.id}_${occ.date}`
    setError('')
    setBusyKey(key)
    const { error: err } = await supabase.from('bball_class_signups')
      .delete().eq('class_id', occ.cls.id).eq('user_id', userId).eq('occurrence_date', occ.date)
    if (err) { setError(err.message); setBusyKey(null); return }
    await refreshCounts()
    setBusyKey(null)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>
      </div>
    )
  }

  const occurrences: Occurrence[] = classes.map(c => {
    const date = occurrenceDateFor(c.day_of_week)
    const key = `${c.id}_${date}`
    return { cls: c, date, count: counts[key] || 0, joined: myJoins.has(key) }
  })

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      <main style={{ maxWidth: '760px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <h1 className="font-display" style={{ fontFamily: 'var(--font-bebas)', fontSize: '2.5rem', letterSpacing: '0.03em', marginBottom: '1.25rem' }}>
          CLASSES
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '0.75rem 1rem' }}>
          <button onClick={() => setWeekOffset(w => w - 1)} aria-label="Previous week"
            style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '0.5rem', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)', minHeight: 0 }}>
            <ChevronLeft size={18} />
          </button>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>
              {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
            {weekOffset !== 0 && (
              <button onClick={() => setWeekOffset(0)} style={{ background: 'none', border: 'none', color: 'var(--teal-secondary)', fontSize: '0.7rem', cursor: 'pointer', padding: 0, marginTop: '0.15rem' }}>
                Back to this week
              </button>
            )}
          </div>
          <button onClick={() => setWeekOffset(w => w + 1)} aria-label="Next week"
            style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '0.5rem', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)', minHeight: 0 }}>
            <ChevronRight size={18} />
          </button>
        </div>

        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', color: '#f87171', fontSize: '0.875rem' }}>{error}</div>}
        {joinBlockedMsg && (
          <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', color: '#f59e0b', fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
            <span>{joinBlockedMsg}</span>
            <button onClick={() => setJoinBlockedMsg('')} style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', minHeight: 0, padding: 0 }}><X size={14} /></button>
          </div>
        )}

        {occurrences.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No classes have been scheduled yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {occurrences.map(occ => {
              const badge = genderBadgeStyle[occ.cls.gender_restriction]
              const full = occ.count >= occ.cls.max_slots
              const key = `${occ.cls.id}_${occ.date}`
              const busy = busyKey === key
              return (
                <div
                  key={key}
                  onClick={() => setSelectedOcc(occ)}
                  className="card-interactive"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1rem', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                        <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>{occ.cls.title}</p>
                        {badge && (
                          <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.05em', background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                            {badge.label}
                          </span>
                        )}
                      </div>
                      {occ.cls.description && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                          {occ.cls.description}
                        </p>
                      )}
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {DAY_LABELS[occ.cls.day_of_week]} · {formatTime(occ.cls.start_time)} – {formatTime(occ.cls.end_time)}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: full ? '#f87171' : 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        {occ.count} / {occ.cls.max_slots} spots filled
                      </p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); occ.joined ? handleLeave(occ) : handleJoin(occ) }}
                      disabled={busy || (!occ.joined && full)}
                      style={{
                        flexShrink: 0, borderRadius: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 700,
                        cursor: busy || (!occ.joined && full) ? 'not-allowed' : 'pointer', minHeight: '44px',
                        background: occ.joined ? 'none' : full ? 'var(--border)' : 'var(--teal-primary)',
                        color: occ.joined ? '#ef4444' : full ? 'var(--text-secondary)' : 'white',
                        border: occ.joined ? '1px solid rgba(239,68,68,0.4)' : 'none',
                      }}
                    >
                      {busy ? '…' : occ.joined ? 'Leave' : full ? 'Class Full' : 'Join'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {selectedOcc && (
        <ClassDetailModal
          occ={{ ...selectedOcc, count: counts[`${selectedOcc.cls.id}_${selectedOcc.date}`] || 0 }}
          myUserId={userId}
          myGender={gender}
          onClose={() => setSelectedOcc(null)}
          onJoinLeave={refreshCounts}
        />
      )}
    </div>
  )
}
