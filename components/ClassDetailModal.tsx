'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Trash2, Repeat, ClipboardList, Pencil, X, MapPin, Flag, Check, CheckCircle2, SkipForward } from 'lucide-react'
import { genderBadgeStyle } from '@/components/BballClassModal'
import ConfirmModal from '@/components/ConfirmModal'

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
  const [coaches, setCoaches] = useState<any[]>([])
  const [editCoachId, setEditCoachId] = useState<string>(cls.coach_id || '')
  const [showAddAttendee, setShowAddAttendee] = useState(false)
  const [memberCandidates, setMemberCandidates] = useState<any[]>([])
  const [addAttendeeSearch, setAddAttendeeSearch] = useState('')
  const [addAttendeeLoading, setAddAttendeeLoading] = useState(false)
  const [addAttendeeError, setAddAttendeeError] = useState('')
  const [rsvpError, setRsvpError] = useState('')
  const [attendeeActionError, setAttendeeActionError] = useState('')
  const [planExercises, setPlanExercises] = useState<any[]>([])
  const [loadingPlanExercises, setLoadingPlanExercises] = useState(false)
  const [completeDurationMinutes, setCompleteDurationMinutes] = useState('')
  const [planActionError, setPlanActionError] = useState('')
  const [myGender, setMyGender] = useState<string | null>(null)
  const [showJoinConfirm, setShowJoinConfirm] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{ type: 'removeAttendee' | 'deleteClass' | 'deleteSeries'; attendee?: any } | null>(null)

  const classId = cls.is_dynamic ? cls.parent_class_id : cls.id

  // Fetch exercise breakdown for plan entries
  useEffect(() => {
    if (!cls.isPlan) return
    setLoadingPlanExercises(true)
    supabase
      .from('workout_plan_exercises')
      .select('*')
      .eq('plan_id', cls.id)
      .order('order_index')
      .then(({ data }) => {
        setPlanExercises(data || [])
        setLoadingPlanExercises(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cls.id, cls.isPlan])

  // Fetch coaches on mount
  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, name')
      .eq('role', 'coach')
      .order('name')
      .then(({ data }) => setCoaches(data || []))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch the current user's gender, needed to enforce cls.gender_restriction on RSVP
  useEffect(() => {
    if (!userId) return
    supabase
      .from('profiles')
      .select('gender')
      .eq('id', userId)
      .single()
      .then(({ data }) => setMyGender(data?.gender ?? null))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // Fetch member candidates for "Add Attendee" (admin/coach only). Intentionally unscoped to
  // all members for now — could be narrowed later (e.g. to members in groups where groups.coach_id = userId).
  useEffect(() => {
    if (userRole !== 'admin' && userRole !== 'coach') return
    supabase
      .from('profiles')
      .select('id, name, email')
      .eq('role', 'member')
      .order('name')
      .then(({ data }) => setMemberCandidates(data || []))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole])

  const loadAttendees = async () => {
    const attendanceClassId = cls.is_dynamic ? cls.parent_class_id : cls.id
    if (!attendanceClassId) return
    setLoadingAttendees(true)
    const { data } = await supabase
      .from('class_attendees')
      .select('*, profiles(name, email, gender)')
      .eq('class_id', attendanceClassId)
      .eq('occurrence_date', cls.scheduled_date)
    setAttendees(data || [])
    const mine = (data || []).find((a: any) => a.member_id === userId)
    setMyAttendance(mine || null)
    setLoadingAttendees(false)
  }

  useEffect(() => {
    loadAttendees()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cls.id, cls.parent_class_id, cls.is_dynamic, cls.scheduled_date, userId])

  const handleRSVP = async () => {
    setRsvpLoading(true)
    setRsvpError('')

    // For dynamic recurring instances, use parent_class_id
    // For stored classes, use the actual id
    const attendanceClassId = cls.is_dynamic ? cls.parent_class_id : cls.id

    if (!attendanceClassId) {
      setRsvpLoading(false)
      return
    }

    if (myAttendance) {
      // Remove attendance
      const { error } = await supabase
        .from('class_attendees')
        .delete()
        .eq('id', myAttendance.id)

      if (error) {
        console.error('handleRSVP failed:', error)
        setRsvpError(error.message)
        setRsvpLoading(false)
        return
      }

      await loadAttendees()
    } else {
      // Add attendance — check if already exists first to avoid duplicate
      const { data: existing } = await supabase
        .from('class_attendees')
        .select('id')
        .eq('class_id', attendanceClassId)
        .eq('occurrence_date', cls.scheduled_date)
        .eq('member_id', userId)
        .maybeSingle()

      if (existing) {
        await loadAttendees()
      } else {
        const restriction = cls.gender_restriction
        if (myGender === 'other') {
          // other-gender users can join any class regardless of restriction
        } else if (restriction === 'men' && myGender !== 'male') {
          setRsvpError('This class is for men only.')
          setRsvpLoading(false)
          return
        } else if (restriction === 'women' && myGender !== 'female') {
          setRsvpError('This class is for women only.')
          setRsvpLoading(false)
          return
        }

        const { data, error } = await supabase
          .from('class_attendees')
          .insert({
            class_id: attendanceClassId,
            occurrence_date: cls.scheduled_date,
            member_id: userId,
          })
          .select('*, profiles(name, email, gender)')
          .single()

        if (error) {
          console.error('handleRSVP failed:', error)
          setRsvpError(error.message)
          setRsvpLoading(false)
          return
        }

        if (data) {
          await loadAttendees()
        }
      }
    }

    setRsvpLoading(false)
    onUpdate()
  }

  const handleAddAttendee = async (memberId: string) => {
    const attendanceClassId = cls.is_dynamic ? cls.parent_class_id : cls.id
    if (!attendanceClassId) return

    setAddAttendeeLoading(true)
    setAddAttendeeError('')

    // Check if already exists first to avoid duplicate
    const { data: existing } = await supabase
      .from('class_attendees')
      .select('id')
      .eq('class_id', attendanceClassId)
      .eq('occurrence_date', cls.scheduled_date)
      .eq('member_id', memberId)
      .maybeSingle()

    if (!existing) {
      const { data, error } = await supabase
        .from('class_attendees')
        .insert({
          class_id: attendanceClassId,
          occurrence_date: cls.scheduled_date,
          member_id: memberId,
          status: 'scheduled',
        })
        .select('*, profiles(name, email, gender)')
        .single()

      if (error) {
        console.error('handleAddAttendee failed:', error)
        setAddAttendeeError(error.message)
        setAddAttendeeLoading(false)
        return
      }

      if (data) {
        await loadAttendees()
      }
    }

    setAddAttendeeSearch('')
    setAddAttendeeLoading(false)
    onUpdate()
  }

  const handleRemoveAttendee = async (attendee: any) => {
    setAttendeeActionError('')
    const { error } = await supabase.from('class_attendees').delete().eq('id', attendee.id)

    if (error) {
      console.error('handleRemoveAttendee failed:', error)
      setAttendeeActionError(error.message)
      return
    }

    await loadAttendees()
    onUpdate()
  }

  const handleDeleteClass = async () => {
    await supabase.from('scheduled_classes').delete().eq('id', cls.id)
    onClose(); onUpdate()
  }

  const handleDeleteSeries = async () => {
    await supabase.from('scheduled_classes').delete().eq('parent_class_id', classId)
    await supabase.from('scheduled_classes').delete().eq('id', classId)
    onClose(); onUpdate()
  }

  const tc = classTypeColor(cls.type || 'conditioning')

  const handleSaveEdit = async () => {
    const updateData = {
      title: editForm.title,
      description: editForm.description || null,
      start_time: editForm.start_time,
      end_time: editForm.end_time || null,
      location: editForm.location || null,
      type: editForm.type,
      coach_id: editCoachId || null,
    }
    const { error } = await supabase
      .from('scheduled_classes')
      .update(updateData)
      .eq('id', cls.is_dynamic ? cls.parent_class_id : cls.id)
    if (!error) {
      setIsEditing(false)
      onUpdate()
    }
  }

  const handleEditSeries = async () => {
    const seriesId = cls.recurrence_series_id
    if (seriesId) {
      const updateData = {
        title: editForm.title,
        description: editForm.description || null,
        start_time: editForm.start_time,
        end_time: editForm.end_time || null,
        location: editForm.location || null,
        type: editForm.type,
        coach_id: editCoachId || null,
      }
      await supabase.from('scheduled_classes').update(updateData).eq('recurrence_series_id', seriesId)
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
                {genderBadgeStyle[cls.gender_restriction] && (() => {
                  const badge = genderBadgeStyle[cls.gender_restriction]
                  return (
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.06em', background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                      {badge.label}
                    </span>
                  )
                })()}
                {cls.is_recurring && <span style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: '999px', background: 'var(--surface-raised)', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Repeat size={10} /> Recurring {cls.recurrence_rule}</span>}
                {cls.isPlan && <span style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: '999px', background: 'rgba(8,119,160,0.2)', color: 'var(--teal-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><ClipboardList size={10} /> Workout Plan</span>}
              </div>
              <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.75rem', letterSpacing: '0.03em' }}>{cls.title}</h2>
              {cls.description && <p style={{ fontSize: '0.875rem', marginTop: '0.25rem', color: 'var(--text-secondary)' }}>{cls.description}</p>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
              {(userRole === 'admin' || userRole === 'coach') && !cls.isPlan && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  style={{ padding: '0.4rem 0.875rem', borderRadius: '0.375rem', background: 'var(--surface-raised)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, minHeight: 0, display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <Pencil size={13} /> Edit
                </button>
              )}
              <button onClick={onClose} style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--surface-raised)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.875rem', minHeight: 0 }}><X size={16} /></button>
            </div>
          </div>
        </div>

        {isEditing && (
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={labelBase}>Title</label>
              <input style={inputBase} value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            {/* Coach selector */}
            <div>
              <label style={labelBase}>Coach</label>
              <select
                value={editCoachId}
                onChange={e => setEditCoachId(e.target.value)}
                style={{ ...inputBase, cursor: 'pointer' }}
              >
                <option value="">— No coach assigned —</option>
                {coaches.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            {/* Type */}
            <div>
              <label style={labelBase}>Type</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {(['conditioning', 'basketball', 'both'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setEditForm(p => ({ ...p, type: t }))}
                    style={{
                      flex: 1, padding: '0.5rem', borderRadius: '0.375rem', fontSize: '0.75rem',
                      fontWeight: 700, cursor: 'pointer', border: 'none', textTransform: 'capitalize',
                      background: editForm.type === t ? 'var(--teal-primary)' : 'var(--surface-raised)',
                      color: editForm.type === t ? '#fff' : 'var(--text-secondary)',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
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
              <p style={{ fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><MapPin size={13} /> {cls.location}</p>
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
              <div style={{ textAlign: 'center', padding: '0.75rem', background: 'var(--surface-raised)', borderRadius: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                <Flag size={14} /> Class has ended
              </div>
            ) : (
              <>
                {rsvpError && (
                  <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.375rem', padding: '0.5rem 0.625rem', color: '#f87171', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                    {rsvpError}
                  </div>
                )}
                <button
                  onClick={() => myAttendance ? handleRSVP() : setShowJoinConfirm(true)}
                  disabled={rsvpLoading}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', fontWeight: 700, fontSize: '0.9rem', cursor: rsvpLoading ? 'not-allowed' : 'pointer', background: myAttendance ? 'transparent' : 'var(--teal-primary)', color: myAttendance ? '#ef4444' : 'white', border: myAttendance ? '1px solid rgba(239,68,68,0.4)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                >
                  {rsvpLoading ? '…' : myAttendance ? <><X size={15} /> {myAttendance.status === 'pending' ? 'Cancel Request' : 'Remove Attendance'}</> : <><Check size={15} /> I&apos;m Attending</>}
                </button>
                {myAttendance && (
                  <p style={{ fontSize: '0.75rem', textAlign: 'center', marginTop: '0.5rem', color: myAttendance.status === 'pending' || myAttendance.status === 'waitlist' ? '#f59e0b' : '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                    {myAttendance.status === 'pending' ? <>Your request is pending approval</> : myAttendance.status === 'waitlist' ? <>You&apos;re on the waitlist</> : <><CheckCircle2 size={13} /> You&apos;re marked as attending this class</>}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* Exercise breakdown for plan entries */}
        {cls.isPlan && (
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Exercises</p>
            {loadingPlanExercises ? (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Loading…</p>
            ) : planExercises.length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No exercises listed for this plan.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {planExercises.map(ex => (
                  <div key={ex.id} style={{ background: 'var(--surface-raised)', borderRadius: '0.5rem', padding: '0.625rem 0.75rem' }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>{ex.name}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.2rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {ex.sets != null && ex.reps != null && <span>{ex.sets}×{ex.reps} reps</span>}
                      {ex.weight != null && <span>{ex.weight}{ex.weight_unit || 'kg'}</span>}
                      {ex.duration != null && <span>{ex.duration}min</span>}
                      {ex.distance != null && <span>{ex.distance}km</span>}
                      {ex.notes && <span style={{ fontStyle: 'italic' }}>{ex.notes}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Plan actions for members */}
        {cls.isPlan && userRole === 'member' && (
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
            {planActionError && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.375rem', padding: '0.5rem 0.625rem', color: '#f87171', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                {planActionError}
              </div>
            )}

            {cls.status === 'completed' ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#4ade80', display: 'flex', alignItems: 'center', gap: '0.35rem' }}><CheckCircle2 size={15} /> Completed</span>
                <button
                  onClick={async () => {
                    setPlanActionLoading(true)
                    setPlanActionError('')

                    if (cls.auto_logged_workout_id) {
                      const { error: exDelErr } = await supabase.from('exercises').delete().eq('workout_id', cls.auto_logged_workout_id)
                      if (exDelErr) {
                        console.error('Undo Mark Done: exercises delete failed', exDelErr)
                        setPlanActionError(exDelErr.message)
                        setPlanActionLoading(false)
                        return
                      }
                      const { error: workoutDelErr } = await supabase.from('workouts').delete().eq('id', cls.auto_logged_workout_id)
                      if (workoutDelErr) {
                        console.error('Undo Mark Done: workouts delete failed', workoutDelErr)
                        setPlanActionError(workoutDelErr.message)
                        setPlanActionLoading(false)
                        return
                      }
                    }

                    const { error: updateErr } = await supabase.from('workout_plans').update({
                      status: 'pending',
                      completed_at: null,
                      auto_logged_workout_id: null,
                    }).eq('id', cls.id)

                    if (updateErr) {
                      console.error('Undo Mark Done: workout_plans update failed', updateErr)
                      setPlanActionError(updateErr.message)
                      setPlanActionLoading(false)
                      return
                    }

                    setPlanActionLoading(false)
                    onClose(); onUpdate()
                  }}
                  disabled={planActionLoading}
                  style={{ background: 'none', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '0.375rem', padding: '0.4rem 0.875rem', fontSize: '0.8rem', fontWeight: 700, cursor: planActionLoading ? 'not-allowed' : 'pointer', opacity: planActionLoading ? 0.7 : 1 }}
                >
                  {planActionLoading ? 'Undoing…' : '↩ Undo'}
                </button>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={labelBase}>Duration (minutes) — optional</label>
                  <input
                    type="number" min="0" style={inputBase}
                    value={completeDurationMinutes}
                    onChange={e => setCompleteDurationMinutes(e.target.value)}
                    placeholder="e.g. 45"
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={async () => {
                      setPlanActionLoading(true)
                      setPlanActionError('')

                      const { data: newWorkout, error: workoutErr } = await supabase.from('workouts').insert({
                        user_id: cls.member_id,
                        title: cls.title,
                        type: cls.type,
                        notes: `Auto-logged from assigned plan. ${cls.description || ''}`.trim(),
                        duration: completeDurationMinutes ? Number(completeDurationMinutes) : null,
                        date: new Date().toISOString(),
                      }).select().single()

                      if (workoutErr) {
                        console.error('Mark Done: workouts insert failed', workoutErr)
                        setPlanActionError(workoutErr.message)
                        setPlanActionLoading(false)
                        return
                      }

                      if (newWorkout && planExercises.length > 0) {
                        const { error: exError } = await supabase.from('exercises').insert(
                          planExercises.map((ex: any) => ({
                            workout_id: newWorkout.id,
                            name: ex.name, sets: ex.sets, reps: ex.reps,
                            weight: ex.weight, weight_unit: ex.weight_unit,
                            duration: ex.duration, distance: ex.distance, notes: ex.notes,
                          }))
                        )
                        if (exError) {
                          console.error('Mark Done: exercises insert failed', exError)
                          setPlanActionError(exError.message)
                          setPlanActionLoading(false)
                          return
                        }
                      }

                      const { error: updateErr } = await supabase.from('workout_plans').update({
                        status: 'completed',
                        completed_at: new Date().toISOString(),
                        auto_logged_workout_id: newWorkout?.id ?? null,
                      }).eq('id', cls.id)

                      if (updateErr) {
                        console.error('Mark Done: workout_plans update failed', updateErr)
                        setPlanActionError(updateErr.message)
                        setPlanActionLoading(false)
                        return
                      }

                      setPlanActionLoading(false)
                      onClose(); onUpdate()
                    }}
                    disabled={planActionLoading}
                    style={{ flex: 1, background: 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.75rem', fontWeight: 700, fontSize: '0.875rem', cursor: planActionLoading ? 'not-allowed' : 'pointer', opacity: planActionLoading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  >
                    <CheckCircle2 size={15} /> Mark Done
                  </button>
                  <button
                    onClick={async () => {
                      setPlanActionLoading(true)
                      await supabase.from('workout_plans').update({ status: 'skipped' }).eq('id', cls.id)
                      setPlanActionLoading(false)
                      onClose(); onUpdate()
                    }}
                    disabled={planActionLoading}
                    style={{ background: 'none', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.75rem 1rem', fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <SkipForward size={15} /> Skip
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Attendees */}
        {!cls.isPlan && (
          <div style={{ padding: '1.25rem 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', gap: '0.75rem' }}>
              <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>Attendees ({attendees.length})</p>
              {(userRole === 'admin' || userRole === 'coach') && (
                <button
                  onClick={() => { setShowAddAttendee(o => !o); setAddAttendeeError('') }}
                  style={{ padding: '0.3rem 0.7rem', borderRadius: '0.375rem', background: 'var(--surface-raised)', border: '1px solid var(--border)', color: 'var(--teal-secondary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, minHeight: 0, flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  {showAddAttendee ? <><X size={12} /> Cancel</> : '+ Add Attendee'}
                </button>
              )}
            </div>

            {(userRole === 'admin' || userRole === 'coach') && showAddAttendee && (
              <div style={{ background: 'var(--surface-raised)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '0.75rem' }}>
                <label style={labelBase}>Search Members</label>
                {addAttendeeError && (
                  <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.375rem', padding: '0.5rem 0.625rem', color: '#f87171', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                    {addAttendeeError}
                  </div>
                )}
                <input
                  style={inputBase}
                  value={addAttendeeSearch}
                  onChange={e => setAddAttendeeSearch(e.target.value)}
                  placeholder="Type a name…"
                  autoFocus
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginTop: '0.625rem', maxHeight: '200px', overflowY: 'auto' }}>
                  {memberCandidates
                    .filter(m => !attendees.some((a: any) => a.member_id === m.id))
                    .filter(m => m.name?.toLowerCase().includes(addAttendeeSearch.toLowerCase()))
                    .map(m => (
                      <button
                        key={m.id}
                        onClick={() => handleAddAttendee(m.id)}
                        disabled={addAttendeeLoading}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', textAlign: 'left', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', cursor: addAttendeeLoading ? 'not-allowed' : 'pointer', fontSize: '0.8rem', color: 'var(--text-primary)', minHeight: 0 }}
                      >
                        <span>{m.name}</span>
                        <span style={{ color: 'var(--teal-primary)', fontWeight: 700 }}>+ Add</span>
                      </button>
                    ))}
                  {memberCandidates
                    .filter(m => !attendees.some((a: any) => a.member_id === m.id))
                    .filter(m => m.name?.toLowerCase().includes(addAttendeeSearch.toLowerCase())).length === 0 && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '0.25rem' }}>No matching members found.</p>
                  )}
                </div>
              </div>
            )}

            {attendeeActionError && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.375rem', padding: '0.5rem 0.625rem', color: '#f87171', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                {attendeeActionError}
              </div>
            )}

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
                        {(a.profiles?.name || a.guest_name)?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>{a.profiles?.name || a.guest_name}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                      {userRole === 'member' && a.member_id === userId && (
                        <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '999px', background: a.status === 'attended' ? 'rgba(34,197,94,0.2)' : 'rgba(8,119,160,0.2)', color: a.status === 'attended' ? '#4ade80' : 'var(--teal-secondary)' }}>
                          {a.status === 'attended' ? 'Attended' : a.status === 'pending' ? 'Pending' : a.status === 'waitlist' ? 'Waitlist' : 'Attending'}
                        </span>
                      )}
                      {(userRole === 'coach' || userRole === 'admin') && (
                        <button
                          onClick={() => setConfirmAction({ type: 'removeAttendee', attendee: a })}
                          aria-label="Remove attendee"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', display: 'flex', minHeight: 0 }}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Delete options (admin/coach only) */}
        {(userRole === 'admin' || userRole === 'coach') && !cls.isPlan && (
          <div style={{ padding: '0 1.5rem 1.25rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button onClick={() => setConfirmAction({ type: 'deleteClass' })} style={{ flex: 1, background: 'transparent', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '0.375rem', padding: '0.5rem', color: '#f87171', fontSize: '0.8rem', cursor: 'pointer', minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}><Trash2 size={13} /> Delete This Class</button>
            {cls.is_recurring && (
              <button onClick={() => setConfirmAction({ type: 'deleteSeries' })} style={{ flex: 1, background: 'transparent', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '0.375rem', padding: '0.5rem', color: '#f87171', fontSize: '0.8rem', cursor: 'pointer', minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}><Trash2 size={13} /> Delete Entire Series</button>
            )}
          </div>
        )}
      </div>

      {showJoinConfirm && (
        <ConfirmModal
          title="Limited Slots"
          message={`Slots are limited, so we give priority to participants who are sure they can join.

Your slot is not guaranteed until approved by a coach or admin.

Pay online in advance for ₱550, or pay the walk-in/day rate of ₱600.

Continue booking?`}
          confirmLabel="Join Anyway"
          onConfirm={() => { setShowJoinConfirm(false); handleRSVP() }}
          onCancel={() => setShowJoinConfirm(false)}
        />
      )}

      {confirmAction && (() => {
        const config = {
          removeAttendee: {
            title: 'Remove Attendee',
            message: `Remove ${confirmAction.attendee?.profiles?.name || confirmAction.attendee?.guest_name} from this class?`,
            confirmLabel: 'Remove',
            variant: 'destructive' as const,
            onConfirm: () => handleRemoveAttendee(confirmAction.attendee),
          },
          deleteClass: {
            title: 'Delete Class',
            message: 'Delete this class? This will remove this specific class only.',
            confirmLabel: 'Delete',
            variant: 'destructive' as const,
            onConfirm: handleDeleteClass,
          },
          deleteSeries: {
            title: 'Delete Recurring Series',
            message: 'Delete ALL classes in this recurring series? This cannot be undone.',
            confirmLabel: 'Delete Series',
            variant: 'destructive' as const,
            onConfirm: handleDeleteSeries,
          },
        }[confirmAction.type]
        return (
          <ConfirmModal
            title={config.title}
            message={config.message}
            confirmLabel={config.confirmLabel}
            variant={config.variant}
            onConfirm={() => { const run = config.onConfirm; setConfirmAction(null); run() }}
            onCancel={() => setConfirmAction(null)}
          />
        )
      })()}
    </div>
  )
}
