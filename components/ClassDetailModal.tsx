'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function classTypeColor(type: string): { bg: string; color: string } {
  if (type === 'basketball') return { bg: 'rgba(30,58,95,0.8)', color: '#60a5fa' }
  if (type === 'both') return { bg: 'rgba(60,20,80,0.8)', color: '#c084fc' }
  return { bg: 'rgba(26,46,26,0.8)', color: '#4ade80' }
}

export default function ClassDetailModal({
  cls, userId, userRole, onClose, onUpdate,
}: {
  cls: any
  userId: string
  userRole: string
  onClose: () => void
  onUpdate: () => void
}) {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]
  const isPastClass = !cls.isPlan && cls.scheduled_date < today
  const [attendees, setAttendees] = useState<any[]>([])
  const [myAttendance, setMyAttendance] = useState<any>(null)
  const [loadingAttendees, setLoadingAttendees] = useState(false)
  const [rsvpLoading, setRsvpLoading] = useState(false)
  const [planActionLoading, setPlanActionLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    title: cls.title || '',
    description: cls.description || '',
    start_time: cls.start_time || '',
    end_time: cls.end_time || '',
    location: cls.location || '',
    type: cls.type || 'conditioning',
  })

  const classId = cls.is_dynamic ? cls.parent_class_id : cls.id

  useEffect(() => {
    async function load() {
      if (!classId) return
      setLoadingAttendees(true)
      const { data } = await supabase.from('class_attendees').select('*, profiles(name, email, gender)').eq('class_id', classId)
      setAttendees(data || [])
      const mine = (data || []).find((a: any) => a.member_id === userId)
      setMyAttendance(mine || null)
      setLoadingAttendees(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId])

  const handleRSVP = async () => {
    setRsvpLoading(true)
    if (myAttendance) {
      await supabase.from('class_attendees').delete().eq('id', myAttendance.id)
      setMyAttendance(null)
      setAttendees(prev => prev.filter((a: any) => a.id !== myAttendance.id))
    } else {
      const { data } = await supabase.from('class_attendees').insert({
        class_id: classId, member_id: userId, rsvp_status: 'attending', status: 'scheduled',
      }).select('*, profiles(name, email, gender)').single()
      if (data) { setMyAttendance(data); setAttendees(prev => [...prev, data]) }
    }
    setRsvpLoading(false)
    onUpdate()
  }

  const handleMarkAttendance = async (attendeeId: string, status: string) => {
    await supabase.from('class_attendees').update({ status }).eq('id', attendeeId)
    setAttendees(prev => prev.map((a: any) => a.id === attendeeId ? { ...a, status } : a))
  }

  const handleDeleteClass = async () => {
    if (!confirm('Delete this class? This will remove this specific class only.')) return
    await supabase.from('scheduled_classes').delete().eq('id', cls.id)
    onClose(); onUpdate()
  }

  const handleDeleteSeries = async () => {
    if (!confirm('Delete ALL classes in this recurring series? This cannot be undone.')) return
    await supabase.from('scheduled_classes').delete().eq('parent_class_id', classId)
    await supabase.from('scheduled_classes').delete().eq('id', classId)
    onClose(); onUpdate()
  }

  const tc = classTypeColor(cls.type || 'conditioning')

  const handleSaveEdit = async () => {
    const { error } = await supabase
      .from('scheduled_classes')
      .update({
        title: editForm.title,
        description: editForm.description || null,
        start_time: editForm.start_time,
        end_time: editForm.end_time || null,
        location: editForm.location || null,
        type: editForm.type,
      })
      .eq('id', cls.is_dynamic ? cls.parent_class_id : cls.id)
    if (!error) {
      setIsEditing(false)
      onUpdate()
    }
  }

  const handleEditSeries = async () => {
    const seriesId = cls.recurrence_series_id
    if (seriesId) {
      await supabase.from('scheduled_classes').update({
        title: editForm.title,
        description: editForm.description || null,
        start_time: editForm.start_time,
        end_time: editForm.end_time || null,
        location: editForm.location || null,
        type: editForm.type,
      }).eq('recurrence_series_id', seriesId)
    } else {
      await handleSaveEdit()
      return
    }
    setIsEditing(false)
    onUpdate()
  }

  const inputBase: React.CSSProperties = {
    background: '#0d1a1e', border: '1px solid #1a2e34', borderRadius: '0.5rem',
    padding: '0.6rem 0.875rem', color: '#F2F2F2', fontSize: '0.875rem', outline: 'none', width: '100%',
  }
  const labelBase: React.CSSProperties = {
    display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)',
    textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '0.375rem',
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div style={{ width: '100%', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '1rem' }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '999px', textTransform: 'uppercase', background: tc.bg, color: tc.color }}>{cls.type?.toUpperCase()}</span>
                {cls.is_recurring && <span style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: '999px', background: 'var(--surface-raised)', color: 'var(--text-secondary)' }}>🔁 Recurring {cls.recurrence_rule}</span>}
                {cls.isPlan && <span style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: '999px', background: 'rgba(8,119,160,0.2)', color: 'var(--teal-secondary)' }}>📋 Workout Plan</span>}
              </div>
              <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.75rem', letterSpacing: '0.03em' }}>{cls.title}</h2>
              {cls.description && <p style={{ fontSize: '0.875rem', marginTop: '0.25rem', color: 'var(--text-secondary)' }}>{cls.description}</p>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
              {(userRole === 'admin' || userRole === 'coach') && !cls.isPlan && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  style={{ padding: '0.4rem 0.875rem', borderRadius: '0.375rem', background: 'var(--surface-raised)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, minHeight: 0 }}
                >
                  ✏️ Edit
                </button>
              )}
              <button onClick={onClose} style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--surface-raised)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.875rem', minHeight: 0 }}>✕</button>
            </div>
          </div>
        </div>

        {isEditing && (
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={labelBase}>Title</label>
              <input style={inputBase} value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={labelBase}>Start Time</label>
                <input type="time" style={inputBase} value={editForm.start_time} onChange={e => setEditForm(p => ({ ...p, start_time: e.target.value }))} />
              </div>
              <div>
                <label style={labelBase}>End Time</label>
                <input type="time" style={inputBase} value={editForm.end_time} onChange={e => setEditForm(p => ({ ...p, end_time: e.target.value }))} />
              </div>
            </div>
            <div>
              <label style={labelBase}>Location</label>
              <input style={inputBase} value={editForm.location} onChange={e => setEditForm(p => ({ ...p, location: e.target.value }))} placeholder="Optional" />
            </div>
            <div>
              <label style={labelBase}>Description</label>
              <textarea style={{ ...inputBase, minHeight: '60px', resize: 'vertical' }} value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional" />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {cls.is_recurring ? (
                <>
                  <button onClick={handleSaveEdit} style={{ flex: 1, background: 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.65rem', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', minHeight: 0 }}>
                    Save This Class
                  </button>
                  <button onClick={handleEditSeries} style={{ flex: 1, background: 'var(--surface-raised)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.65rem', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', minHeight: 0 }}>
                    Save All in Series
                  </button>
                </>
              ) : (
                <button onClick={handleSaveEdit} style={{ flex: 1, background: 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.65rem', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', minHeight: 0 }}>
                  Save Changes
                </button>
              )}
              <button onClick={() => setIsEditing(false)} style={{ background: 'none', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.65rem 1rem', fontSize: '0.875rem', cursor: 'pointer', minHeight: 0 }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Details grid */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div style={{ background: 'var(--surface-raised)', borderRadius: '0.5rem', padding: '0.75rem' }}>
            <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Date</p>
            <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{new Date(cls.scheduled_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
          <div style={{ background: 'var(--surface-raised)', borderRadius: '0.5rem', padding: '0.75rem' }}>
            <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Time</p>
            <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{cls.start_time?.slice(0, 5)}{cls.end_time ? ` – ${cls.end_time?.slice(0, 5)}` : ''}</p>
          </div>
          {cls.groups?.name && (
            <div style={{ background: 'var(--surface-raised)', borderRadius: '0.5rem', padding: '0.75rem' }}>
              <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Group</p>
              <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--teal-secondary)' }}>{cls.groups?.name}</p>
            </div>
          )}
          {cls.profiles?.name && (
            <div style={{ background: 'var(--surface-raised)', borderRadius: '0.5rem', padding: '0.75rem' }}>
              <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Coach</p>
              <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{cls.profiles?.name}</p>
            </div>
          )}
          {cls.location && (
            <div style={{ background: 'var(--surface-raised)', borderRadius: '0.5rem', padding: '0.75rem', gridColumn: '1 / -1' }}>
              <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Location</p>
              <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>📍 {cls.location}</p>
            </div>
          )}
          {cls.is_recurring && cls.recurrence_end_date && (
            <div style={{ background: 'var(--surface-raised)', borderRadius: '0.5rem', padding: '0.75rem', gridColumn: '1 / -1' }}>
              <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Recurs Until</p>
              <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                {new Date(cls.recurrence_end_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                {cls.recurrence_days?.length > 0 && (
                  <span style={{ color: 'var(--text-secondary)' }}> · {cls.recurrence_days.map((d: string) => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ')}</span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* RSVP for members and admins */}
        {!cls.isPlan && (userRole === 'member' || userRole === 'admin') && (
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
            {isPastClass ? (
              <div style={{ textAlign: 'center', padding: '0.75rem', background: 'var(--surface-raised)', borderRadius: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                🏁 Class has ended
              </div>
            ) : (
              <>
                <button
                  onClick={handleRSVP}
                  disabled={rsvpLoading}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', fontWeight: 700, fontSize: '0.9rem', cursor: rsvpLoading ? 'not-allowed' : 'pointer', background: myAttendance ? 'transparent' : 'var(--teal-primary)', color: myAttendance ? '#ef4444' : 'white', border: myAttendance ? '1px solid rgba(239,68,68,0.4)' : 'none' }}
                >
                  {rsvpLoading ? '…' : myAttendance ? '✕ Remove Attendance' : '✓ I\'m Attending'}
                </button>
                {myAttendance && <p style={{ fontSize: '0.75rem', textAlign: 'center', marginTop: '0.5rem', color: '#4ade80' }}>✅ You&apos;re marked as attending this class</p>}
              </>
            )}
          </div>
        )}

        {/* Plan actions for members */}
        {cls.isPlan && userRole === 'member' && (
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={async () => {
                setPlanActionLoading(true)
                await supabase.from('workout_plans').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', cls.id)
                setPlanActionLoading(false)
                onClose(); onUpdate()
              }}
              disabled={planActionLoading}
              style={{ flex: 1, background: 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.75rem', fontWeight: 700, fontSize: '0.875rem', cursor: planActionLoading ? 'not-allowed' : 'pointer', opacity: planActionLoading ? 0.7 : 1 }}
            >
              ✅ Mark Done
            </button>
            <button
              onClick={async () => {
                setPlanActionLoading(true)
                await supabase.from('workout_plans').update({ status: 'skipped' }).eq('id', cls.id)
                setPlanActionLoading(false)
                onClose(); onUpdate()
              }}
              disabled={planActionLoading}
              style={{ background: 'none', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.75rem 1rem', fontSize: '0.875rem', cursor: 'pointer' }}
            >
              ⏭️ Skip
            </button>
          </div>
        )}

        {/* Attendees */}
        {!cls.isPlan && (
          <div style={{ padding: '1.25rem 1.5rem' }}>
            <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Attendees ({attendees.length})</p>
            {loadingAttendees ? (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Loading…</p>
            ) : attendees.length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No attendees yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {attendees.map((a: any) => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', background: 'var(--surface-raised)', borderRadius: '0.5rem', padding: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--teal-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700, flexShrink: 0 }}>
                        {a.profiles?.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>{a.profiles?.name}</p>
                        {(userRole === 'coach' || userRole === 'admin') && <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{a.profiles?.email}</p>}
                      </div>
                    </div>
                    {(userRole === 'coach' || userRole === 'admin') && (
                      <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                        {(['attended', 'absent', 'excused'] as const).map(s => (
                          <button key={s} onClick={() => handleMarkAttendance(a.id, s)} style={{ width: '28px', height: '28px', borderRadius: '0.25rem', border: 'none', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700, minHeight: 0, background: a.status === s ? (s === 'attended' ? '#22c55e' : s === 'absent' ? '#ef4444' : '#f59e0b') : 'var(--surface)', color: a.status === s ? '#fff' : 'var(--text-secondary)' }}>
                            {s === 'attended' ? '✓' : s === 'absent' ? '✗' : 'E'}
                          </button>
                        ))}
                      </div>
                    )}
                    {userRole === 'member' && a.member_id === userId && (
                      <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '999px', background: a.status === 'attended' ? 'rgba(34,197,94,0.2)' : 'rgba(8,119,160,0.2)', color: a.status === 'attended' ? '#4ade80' : 'var(--teal-secondary)' }}>
                        {a.status === 'attended' ? 'Attended' : 'Attending'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Delete options (admin/coach only) */}
        {(userRole === 'admin' || userRole === 'coach') && !cls.isPlan && (
          <div style={{ padding: '0 1.5rem 1.25rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button onClick={handleDeleteClass} style={{ flex: 1, background: 'transparent', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '0.375rem', padding: '0.5rem', color: '#f87171', fontSize: '0.8rem', cursor: 'pointer', minHeight: 0 }}>🗑️ Delete This Class</button>
            {cls.is_recurring && (
              <button onClick={handleDeleteSeries} style={{ flex: 1, background: 'transparent', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '0.375rem', padding: '0.5rem', color: '#f87171', fontSize: '0.8rem', cursor: 'pointer', minHeight: 0 }}>🗑️ Delete Entire Series</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
