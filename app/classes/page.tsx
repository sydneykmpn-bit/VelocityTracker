'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, ChevronRight, ArrowRight, X, Plus, Pencil, Trash2 } from 'lucide-react'
import { formatTimeLabel, formatDateYMD, bballOccurrencesInRange, joinBballClass, PAYMENT_STATUS_LABELS, BballClassRow } from '@/lib/utils'
import { logAction } from '@/lib/auditLog'
import { BballClassDetailModal, BballClassFormModal, BballOccurrence, genderBadgeStyle } from '@/components/BballClassModal'
import ConfirmModal from '@/components/ConfirmModal'

function getWeekStart(weekOffset: number): Date {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7) + weekOffset * 7)
  return start
}

export default function ClassesPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')
  const [gender, setGender] = useState<string | null>(null)
  const [role, setRole] = useState('member')
  const isAdmin = role === 'admin'
  const isCoachOrAdmin = role === 'admin' || role === 'coach'
  const [weekOffset, setWeekOffset] = useState(0)
  const [classes, setClasses] = useState<BballClassRow[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [pendingCounts, setPendingCounts] = useState<Record<string, number>>({})
  const [myJoins, setMyJoins] = useState<Set<string>>(new Set())
  const [mySignups, setMySignups] = useState<Record<string, { status: string; payment_status: string }>>({})
  const [error, setError] = useState('')
  const [joinBlockedMsg, setJoinBlockedMsg] = useState('')
  const [joinInfoMsg, setJoinInfoMsg] = useState('')
  const [selectedOcc, setSelectedOcc] = useState<BballOccurrence | null>(null)
  const [pendingJoinOcc, setPendingJoinOcc] = useState<BballOccurrence | null>(null)
  const [deleteConfirmClass, setDeleteConfirmClass] = useState<BballClassRow | null>(null)
  const [occurrenceDeleteTarget, setOccurrenceDeleteTarget] = useState<{ cls: BballClassRow; date: string } | null>(null)
  const [exceptionsByClass, setExceptionsByClass] = useState<Record<string, string[]>>({})
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [editingClass, setEditingClass] = useState<BballClassRow | null>(null)

  const weekStart = getWeekStart(weekOffset)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const weekStartStr = formatDateYMD(weekStart)
  const weekEndStr = formatDateYMD(weekEnd)

  const loadWeekData = useCallback(async (clsList: BballClassRow[], uid: string, exceptionsMap: Record<string, string[]>) => {
    if (clsList.length === 0) { setCounts({}); setPendingCounts({}); setMyJoins(new Set()); return }
    const classIds = clsList.map(c => c.id)
    const dates = Array.from(new Set(clsList.flatMap(c => bballOccurrencesInRange(c, weekStartStr, weekEndStr, exceptionsMap[c.id]))))
    if (dates.length === 0) { setCounts({}); setPendingCounts({}); setMyJoins(new Set()); return }
    const { data, error: err } = await supabase
      .from('bball_class_signups')
      .select('class_id, user_id, occurrence_date, status, payment_status')
      .in('class_id', classIds)
      .in('occurrence_date', dates)
    if (err) { setError(err.message); return }
    const countMap: Record<string, number> = {}
    const pendingMap: Record<string, number> = {}
    const joined = new Set<string>()
    const mine: Record<string, { status: string; payment_status: string }> = {}
    for (const row of data || []) {
      const key = `${row.class_id}_${row.occurrence_date}`
      if (row.status === 'booked') countMap[key] = (countMap[key] || 0) + 1
      if (row.status === 'pending') pendingMap[key] = (pendingMap[key] || 0) + 1
      if (row.user_id === uid && row.status !== 'no_show') {
        joined.add(key)
        mine[key] = { status: row.status, payment_status: row.payment_status }
      }
    }
    setCounts(countMap)
    setPendingCounts(pendingMap)
    setMyJoins(joined)
    setMySignups(mine)
  }, [supabase, weekStartStr, weekEndStr])

  const loadClasses = useCallback(async (uid: string) => {
    const { data: cls, error: err } = await supabase.from('bball_classes').select('*').order('day_of_week').order('start_time')
    if (err) { setError(err.message); return }
    setClasses(cls || [])

    const classIds = (cls || []).map(c => c.id)
    const map: Record<string, string[]> = {}
    if (classIds.length > 0) {
      const { data: exceptions, error: excErr } = await supabase
        .from('bball_class_exceptions')
        .select('class_id, excluded_date')
        .in('class_id', classIds)
      if (excErr) { setError(excErr.message) } else {
        for (const row of exceptions || []) { (map[row.class_id] ??= []).push(row.excluded_date) }
      }
    }
    setExceptionsByClass(map)

    await loadWeekData(cls || [], uid, map)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadWeekData])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      const { data: profile } = await supabase.from('profiles').select('gender, role').eq('id', user.id).single()
      setGender(profile?.gender || null)
      setRole(profile?.role || 'member')

      await loadClasses(user.id)
      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!loading) loadWeekData(classes, userId, exceptionsByClass)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset])

  const refreshCounts = () => loadWeekData(classes, userId, exceptionsByClass)
  const refreshClasses = () => loadClasses(userId)

  const genderMatches = (restriction: string) => {
    if (restriction === 'mixed') return true
    if (gender === 'other') return true
    if (restriction === 'men') return gender === 'male'
    if (restriction === 'women') return gender === 'female'
    return true
  }

  const doJoin = async (occ: BballOccurrence) => {
    const key = `${occ.cls.id}_${occ.date}`
    setBusyKey(key)
    const { status, error: err } = await joinBballClass(supabase, occ.cls.id, userId, occ.date)
    if (err) {
      setError(err)
      setBusyKey(null)
      await refreshCounts()
      return
    }
    if (status === 'pending') setJoinInfoMsg('Your spot request is pending approval.')
    else if (status === 'waitlist') setJoinInfoMsg("You're on the waitlist — you'll have a spot if one opens up.")
    await refreshCounts()
    setBusyKey(null)
  }

  const handleJoin = (occ: BballOccurrence) => {
    setError(''); setJoinBlockedMsg(''); setJoinInfoMsg('')
    if (!genderMatches(occ.cls.gender_restriction)) {
      const label = occ.cls.gender_restriction === 'men' ? 'men' : 'women'
      setJoinBlockedMsg(`This class is for ${label} only.`)
      return
    }
    setPendingJoinOcc(occ)
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

  // Entry point for every delete trigger in this file. Recurring classes get the occurrence-level
  // choice first ("Cancel Only This Date" vs "Delete Entire Series"); one-time classes only have a
  // single occurrence anyway, so there's nothing an exception would add — go straight to the
  // existing row-delete confirmation.
  const openDeleteFlow = (cls: BballClassRow, date: string) => {
    if (cls.is_recurring) {
      setOccurrenceDeleteTarget({ cls, date })
    } else {
      setDeleteConfirmClass(cls)
    }
  }

  const handleDeleteClass = async (cls: BballClassRow) => {
    setError('')
    const { error: err } = await supabase.from('bball_classes').delete().eq('id', cls.id)
    if (err) { setError(err.message); return }
    await logAction(supabase, {
      category: 'classes', action_type: 'delete_class', target_type: 'bball_classes', target_id: cls.id,
      details: { target_name: cls.title },
    })
    await refreshClasses()
  }

  const handleDeleteSeries = async (cls: BballClassRow) => {
    setError('')
    if (!cls.series_id) { await handleDeleteClass(cls); return }
    const { error: err } = await supabase.from('bball_classes').delete().eq('series_id', cls.series_id)
    if (err) { setError(err.message); return }
    await logAction(supabase, {
      category: 'classes', action_type: 'delete_class', target_type: 'bball_classes', target_id: cls.id,
      details: { target_name: cls.title, series: true },
    })
    await refreshClasses()
  }

  // Cancels a single occurrence of a recurring class without touching the underlying bball_classes
  // row — bballOccurrencesInRange will stop emitting this date once the exception exists. Existing
  // signups for that exact occurrence are removed since the occurrence itself will no longer be
  // reachable anywhere (roster page is keyed off dates bballOccurrencesInRange produces).
  const handleCancelOccurrence = async (cls: BballClassRow, date: string) => {
    setError('')
    const { error: signupErr } = await supabase.from('bball_class_signups')
      .delete().eq('class_id', cls.id).eq('occurrence_date', date)
    if (signupErr) { setError(signupErr.message); return }
    const { error: excErr } = await supabase.from('bball_class_exceptions')
      .insert({ class_id: cls.id, excluded_date: date })
    if (excErr) { setError(excErr.message); return }
    await logAction(supabase, {
      category: 'classes', action_type: 'delete_class', target_type: 'bball_classes', target_id: cls.id,
      details: { target_name: cls.title, occurrence_date: date },
    })
    await refreshClasses()
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>
      </div>
    )
  }

  const occurrences: BballOccurrence[] = classes.flatMap(c =>
    bballOccurrencesInRange(c, weekStartStr, weekEndStr, exceptionsByClass[c.id]).map(date => {
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
            <p style={{ fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}>
              <span>{weekStart.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
              <ArrowRight size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
              <span>{weekEnd.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
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
        {joinInfoMsg && (
          <div style={{ background: 'rgba(8,119,160,0.1)', border: '1px solid rgba(8,119,160,0.3)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', color: 'var(--teal-secondary)', fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
            <span>{joinInfoMsg}</span>
            <button onClick={() => setJoinInfoMsg('')} style={{ background: 'none', border: 'none', color: 'var(--teal-secondary)', cursor: 'pointer', minHeight: 0, padding: 0 }}><X size={14} /></button>
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
              const mine = mySignups[key]
              const pendingForOcc = pendingCounts[key] || 0
              return (
                <div
                  key={key}
                  onClick={() => isCoachOrAdmin ? router.push(`/classes/${occ.cls.id}?date=${occ.date}`) : setSelectedOcc(occ)}
                  className="card-interactive"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1rem', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                        <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>{occ.cls.title}</p>
                        {isCoachOrAdmin && pendingForOcc > 0 && (
                          <span title={`${pendingForOcc} pending approval${pendingForOcc === 1 ? '' : 's'}`} style={{
                            minWidth: '16px', height: '16px', padding: '0 0.3rem', borderRadius: '999px',
                            background: '#f59e0b', color: '#000', fontSize: '10px', fontWeight: 700,
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {pendingForOcc}
                          </span>
                        )}
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
                        {new Date(occ.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })} · {formatTimeLabel(occ.cls.start_time)} – {formatTimeLabel(occ.cls.end_time)}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: full ? '#f87171' : 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        {isCoachOrAdmin
                          ? `${occ.count} / ${occ.cls.max_slots} spots filled`
                          : `${Math.max(0, occ.cls.max_slots - occ.count)} spots left`}
                      </p>
                      {mine && (
                        <p style={{ fontSize: '0.7rem', marginTop: '0.2rem', fontWeight: 600, color: mine.status === 'pending' || mine.status === 'waitlist' ? '#f59e0b' : mine.payment_status === 'unpaid' ? 'var(--text-secondary)' : '#4ade80' }}>
                          {mine.status === 'pending' ? 'Pending approval' : mine.status === 'waitlist' ? "You're on the waitlist" : PAYMENT_STATUS_LABELS[mine.payment_status]}
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem', flexShrink: 0 }}>
                      {isAdmin && (
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            onClick={e => { e.stopPropagation(); setEditingClass(occ.cls); setFormModalOpen(true) }}
                            title="Edit class"
                            style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', minHeight: 0 }}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); openDeleteFlow(occ.cls, occ.date) }}
                            title="Delete class"
                            style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444', minHeight: 0 }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); occ.joined ? handleLeave(occ) : handleJoin(occ) }}
                        disabled={busy}
                        style={{
                          borderRadius: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 700,
                          cursor: busy ? 'not-allowed' : 'pointer', minHeight: '44px',
                          background: occ.joined ? 'none' : 'var(--teal-primary)',
                          color: occ.joined ? '#ef4444' : 'white',
                          border: occ.joined ? '1px solid rgba(239,68,68,0.4)' : 'none',
                        }}
                      >
                        {busy ? '…' : occ.joined ? (mine?.status === 'pending' ? 'Cancel Request' : 'Leave') : 'Join'}
                      </button>
                    </div>
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
          viewerRole={role}
          onClose={() => setSelectedOcc(null)}
          onJoinLeave={refreshCounts}
          onEdit={cls => { setSelectedOcc(null); setEditingClass(cls); setFormModalOpen(true) }}
          onDelete={cls => { const date = selectedOcc!.date; setSelectedOcc(null); openDeleteFlow(cls, date) }}
        />
      )}
      {formModalOpen && isAdmin && (
        <BballClassFormModal
          editing={editingClass}
          onClose={() => setFormModalOpen(false)}
          onSaved={refreshClasses}
        />
      )}
      {pendingJoinOcc && (
        <ConfirmModal
          title="Limited Slots"
          message="Slots are limited. Joining doesn't guarantee a spot until approved by a coach or admin. Continue?"
          confirmLabel="Join Anyway"
          onConfirm={() => { const occ = pendingJoinOcc; setPendingJoinOcc(null); doJoin(occ) }}
          onCancel={() => setPendingJoinOcc(null)}
        />
      )}
      {deleteConfirmClass && (() => {
        const siblingCount = deleteConfirmClass.series_id
          ? classes.filter(c => c.series_id === deleteConfirmClass.series_id).length
          : 1
        const hasSeries = siblingCount > 1
        return (
          <ConfirmModal
            title="Delete Class"
            message={
              hasSeries
                ? `"${deleteConfirmClass.title}" was created together with ${siblingCount - 1} other day${siblingCount - 1 === 1 ? '' : 's'} in the same series. Delete just this day, or the entire series? This removes all signups and cannot be undone.`
                : `Delete "${deleteConfirmClass.title}"? This removes all signups for this class and cannot be undone.`
            }
            confirmLabel={hasSeries ? 'Delete This Day' : 'Delete'}
            variant="destructive"
            onConfirm={() => { const cls = deleteConfirmClass; setDeleteConfirmClass(null); handleDeleteClass(cls) }}
            onCancel={() => setDeleteConfirmClass(null)}
            secondaryLabel={hasSeries ? `Delete Entire Series (${siblingCount})` : undefined}
            onSecondary={hasSeries ? () => { const cls = deleteConfirmClass; setDeleteConfirmClass(null); handleDeleteSeries(cls) } : undefined}
          />
        )
      })()}
      {occurrenceDeleteTarget && (
        <ConfirmModal
          title="Cancel Class"
          message={`"${occurrenceDeleteTarget.cls.title}" on ${new Date(occurrenceDeleteTarget.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} — cancel just this date, or the whole series?`}
          confirmLabel="Cancel Only This Date"
          variant="destructive"
          onConfirm={() => { const { cls, date } = occurrenceDeleteTarget; setOccurrenceDeleteTarget(null); handleCancelOccurrence(cls, date) }}
          onCancel={() => setOccurrenceDeleteTarget(null)}
          secondaryLabel="Delete Entire Series"
          onSecondary={() => { const { cls } = occurrenceDeleteTarget; setOccurrenceDeleteTarget(null); setDeleteConfirmClass(cls) }}
        />
      )}
    </div>
  )
}
