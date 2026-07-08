'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, ChevronRight, X, Plus } from 'lucide-react'
import { DAY_LABELS, formatTimeLabel, formatDateYMD, bballOccurrencesInRange, BballClassRow } from '@/lib/utils'
import { BballClassDetailModal, BballClassFormModal, BballOccurrence, genderBadgeStyle } from '@/components/BballClassModal'

function getWeekStart(weekOffset: number): Date {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  start.setDate(start.getDate() - start.getDay() + weekOffset * 7)
  return start
}

export default function ClassesPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')
  const [gender, setGender] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)
  const [classes, setClasses] = useState<BballClassRow[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [myJoins, setMyJoins] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')
  const [joinBlockedMsg, setJoinBlockedMsg] = useState('')
  const [selectedOcc, setSelectedOcc] = useState<BballOccurrence | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [editingClass, setEditingClass] = useState<BballClassRow | null>(null)

  const weekStart = getWeekStart(weekOffset)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const weekStartStr = formatDateYMD(weekStart)
  const weekEndStr = formatDateYMD(weekEnd)

  const loadWeekData = useCallback(async (clsList: BballClassRow[], uid: string) => {
    if (clsList.length === 0) { setCounts({}); setMyJoins(new Set()); return }
    const classIds = clsList.map(c => c.id)
    const dates = Array.from(new Set(clsList.flatMap(c => bballOccurrencesInRange(c, weekStartStr, weekEndStr))))
    if (dates.length === 0) { setCounts({}); setMyJoins(new Set()); return }
    const { data, error: err } = await supabase
      .from('bball_class_signups')
      .select('class_id, user_id, occurrence_date')
      .in('class_id', classIds)
      .in('occurrence_date', dates)
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
  }, [supabase, weekStartStr, weekEndStr])

  const loadClasses = useCallback(async (uid: string) => {
    const { data: cls, error: err } = await supabase.from('bball_classes').select('*').order('day_of_week').order('start_time')
    if (err) { setError(err.message); return }
    setClasses(cls || [])
    await loadWeekData(cls || [], uid)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadWeekData])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      const { data: profile } = await supabase.from('profiles').select('gender, role').eq('id', user.id).single()
      setGender(profile?.gender || null)
      setIsAdmin(profile?.role === 'admin')

      await loadClasses(user.id)
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
  const refreshClasses = () => loadClasses(userId)

  const genderMatches = (restriction: string) => {
    if (restriction === 'mixed') return true
    if (restriction === 'men') return gender === 'male'
    if (restriction === 'women') return gender === 'female'
    return true
  }

  const handleJoin = async (occ: BballOccurrence) => {
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

  const handleLeave = async (occ: BballOccurrence) => {
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

  const occurrences: BballOccurrence[] = classes.flatMap(c =>
    bballOccurrencesInRange(c, weekStartStr, weekEndStr).map(date => {
      const key = `${c.id}_${date}`
      return { cls: c, date, count: counts[key] || 0, joined: myJoins.has(key) }
    })
  ).sort((a, b) => a.date === b.date ? a.cls.start_time.localeCompare(b.cls.start_time) : a.date.localeCompare(b.date))

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      <main style={{ maxWidth: '760px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <h1 className="font-display" style={{ fontFamily: 'var(--font-bebas)', fontSize: '2.5rem', letterSpacing: '0.03em' }}>
            CLASSES
          </h1>
          {isAdmin && (
            <button
              onClick={() => { setEditingClass(null); setFormModalOpen(true) }}
              style={{ background: 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.6rem 1rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Plus size={15} /> Add Class
            </button>
          )}
        </div>

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
                        {!occ.cls.is_recurring && (
                          <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'rgba(138,138,138,0.15)', color: '#8A8A8A', border: '1px solid rgba(138,138,138,0.3)' }}>
                            One-time
                          </span>
                        )}
                      </div>
                      {occ.cls.description && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                          {occ.cls.description}
                        </p>
                      )}
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {DAY_LABELS[occ.cls.day_of_week]} · {formatTimeLabel(occ.cls.start_time)} – {formatTimeLabel(occ.cls.end_time)}
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
        <BballClassDetailModal
          occ={{ ...selectedOcc, count: counts[`${selectedOcc.cls.id}_${selectedOcc.date}`] || 0 }}
          myUserId={userId}
          myGender={gender}
          isAdmin={isAdmin}
          onClose={() => setSelectedOcc(null)}
          onJoinLeave={refreshCounts}
          onEdit={cls => { setSelectedOcc(null); setEditingClass(cls); setFormModalOpen(true) }}
        />
      )}
      {formModalOpen && isAdmin && (
        <BballClassFormModal
          editing={editingClass}
          onClose={() => setFormModalOpen(false)}
          onSaved={refreshClasses}
        />
      )}
    </div>
  )
}
