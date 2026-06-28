'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'
import { Plus, X, ChevronLeft, ChevronRight } from 'lucide-react'

const inputBase: React.CSSProperties = {
  background: '#0d1a1e', border: '1px solid #1a2e34', borderRadius: '0.5rem',
  padding: '0.6rem 0.875rem', color: '#F2F2F2', fontSize: '1rem', outline: 'none', width: '100%',
}
const labelBase: React.CSSProperties = {
  display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)',
  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.375rem',
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function classTypeColor(type: string): { bg: string; color: string } {
  if (type === 'basketball') return { bg: 'rgba(30,58,95,0.8)', color: '#60a5fa' }
  if (type === 'both') return { bg: 'rgba(60,20,80,0.8)', color: '#c084fc' }
  return { bg: 'rgba(26,46,26,0.8)', color: '#4ade80' }
}

function generateRecurringDates(startDate: string, endDate: string, rule: string, days: string[]): string[] {
  const dates: string[] = []
  const start = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate + 'T00:00:00')
  if (end <= start) return []
  const current = new Date(start)
  current.setDate(current.getDate() + 1)
  while (current <= end) {
    const dayName = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][current.getDay()]
    const dateStr = current.toISOString().split('T')[0]
    const weekNum = Math.floor((current.getTime() - start.getTime()) / (7*24*60*60*1000))
    if (rule === 'daily') {
      dates.push(dateStr)
    } else if (rule === 'weekly') {
      if (days.length === 0 || days.includes(dayName)) dates.push(dateStr)
    } else if (rule === 'biweekly') {
      if (weekNum % 2 === 0 && (days.length === 0 || days.includes(dayName))) dates.push(dateStr)
    } else if (rule === 'monthly') {
      if (current.getDate() === start.getDate()) dates.push(dateStr)
    }
    current.setDate(current.getDate() + 1)
  }
  return dates
}

function ClassCard({ cls, userRole, onUpdate }: { cls: any; userRole: string; onUpdate: () => void }) {
  const supabase = createClient()
  const [showAttendees, setShowAttendees] = useState(false)
  const [attendees, setAttendees] = useState<any[]>([])

  const loadAttendees = async () => {
    const { data } = await supabase.from('class_attendees').select('*, profiles(name, email)').eq('class_id', cls.id)
    setAttendees(data ?? [])
    setShowAttendees(true)
  }

  const markAttendance = async (attendeeId: string, status: string) => {
    await supabase.from('class_attendees').update({ status }).eq('id', attendeeId)
    await loadAttendees()
  }

  const deleteClass = async () => {
    if (!confirm('Delete this class?')) return
    await supabase.from('scheduled_classes').delete().eq('id', cls.id)
    onUpdate()
  }

  const tc = classTypeColor(cls.type)

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1rem', marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.5rem' }}>
        <div>
          <h4 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>{cls.title}</h4>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            🕐 {cls.start_time?.slice(0, 5)}{cls.end_time ? ` – ${cls.end_time?.slice(0, 5)}` : ''}
            {cls.location ? ` · 📍 ${cls.location}` : ''}
          </p>
          {cls.groups && <p style={{ fontSize: '0.75rem', color: 'var(--teal-secondary)', marginTop: '0.15rem' }}>👥 {cls.groups.name}</p>}
          {cls.profiles && <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>Coach: {cls.profiles.name}</p>}
          {cls.is_recurring && <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>🔁 Recurring {cls.recurrence_rule}</p>}
        </div>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.25rem 0.5rem', borderRadius: '999px', textTransform: 'uppercase', background: tc.bg, color: tc.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {cls.type}
        </span>
      </div>

      {(userRole === 'admin' || userRole === 'coach') && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
          <button onClick={loadAttendees} style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '0.375rem', padding: '0.3rem 0.625rem', color: 'var(--text-secondary)', fontSize: '0.75rem', cursor: 'pointer', minHeight: 0 }}>
            👥 Attendees
          </button>
          <button onClick={deleteClass} style={{ background: 'none', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '0.375rem', padding: '0.3rem 0.625rem', color: '#f87171', fontSize: '0.75rem', cursor: 'pointer', minHeight: 0 }}>
            Delete
          </button>
        </div>
      )}

      {showAttendees && (
        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
          {attendees.length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No attendees added yet.</p>
          ) : attendees.map(a => (
            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.375rem 0' }}>
              <p style={{ fontSize: '0.875rem' }}>{a.profiles?.name}</p>
              {(userRole === 'admin' || userRole === 'coach') && (
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {(['attended', 'absent', 'excused'] as const).map(s => (
                    <button key={s} onClick={() => markAttendance(a.id, s)} style={{
                      fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', border: 'none', cursor: 'pointer', minHeight: 0,
                      background: a.status === s ? (s === 'attended' ? '#22c55e' : s === 'absent' ? '#ef4444' : '#f59e0b') : 'var(--surface-raised)',
                      color: a.status === s ? '#fff' : 'var(--text-secondary)',
                    }}>
                      {s === 'attended' ? '✓' : s === 'absent' ? '✗' : 'E'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const DAYS_OF_WEEK = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']

export default function CalendarPage() {
  const router = useRouter()
  const supabase = createClient()

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [classes, setClasses] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedDateClasses, setSelectedDateClasses] = useState<any[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [userRole, setUserRole] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [createError, setCreateError] = useState('')

  const [createForm, setCreateForm] = useState({
    title: '', description: '', type: 'conditioning', group_id: '',
    scheduled_date: new Date().toISOString().split('T')[0],
    start_time: '06:00', end_time: '07:00', location: '',
    is_recurring: false, recurrence_rule: 'weekly',
    recurrence_days: [] as string[], recurrence_end_date: '',
  })

  const loadClasses = async () => {
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString().split('T')[0]
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).toISOString().split('T')[0]
    const { data } = await supabase
      .from('scheduled_classes')
      .select('*, groups(name), profiles!scheduled_classes_coach_id_fkey(name)')
      .gte('scheduled_date', startOfMonth)
      .lte('scheduled_date', endOfMonth)
      .order('scheduled_date')
    setClasses(data ?? [])
    if (selectedDate) {
      setSelectedDateClasses((data ?? []).filter(c => c.scheduled_date === selectedDate))
    }
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      setUserRole(prof?.role ?? 'member')
      const { data: grps } = await supabase.from('groups').select('id, name')
      setGroups(grps ?? [])
      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!loading) loadClasses()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth, loading])

  const handleDateClick = (dateStr: string) => {
    setSelectedDate(dateStr)
    setSelectedDateClasses(classes.filter(c => c.scheduled_date === dateStr))
    if (userRole === 'admin' || userRole === 'coach') {
      setCreateForm(p => ({ ...p, scheduled_date: dateStr }))
    }
  }

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    setCreateError('')
    if (createForm.is_recurring && !createForm.recurrence_end_date) {
      setCreateError('Please set an end date for recurring classes.')
      return
    }
    if (createForm.is_recurring && createForm.recurrence_days.length === 0 && createForm.recurrence_rule !== 'daily' && createForm.recurrence_rule !== 'monthly') {
      setCreateError('Please select at least one day of the week for recurring classes.')
      return
    }
    setSaving(true)

    const { data: newClass } = await supabase.from('scheduled_classes').insert({
      title: createForm.title, description: createForm.description || null,
      type: createForm.type, group_id: createForm.group_id || null, coach_id: userId,
      scheduled_date: createForm.scheduled_date, start_time: createForm.start_time,
      end_time: createForm.end_time, location: createForm.location || null,
      is_recurring: createForm.is_recurring,
      recurrence_rule: createForm.is_recurring ? createForm.recurrence_rule : null,
      recurrence_days: createForm.is_recurring && createForm.recurrence_days.length > 0 ? createForm.recurrence_days : null,
      recurrence_end_date: createForm.is_recurring && createForm.recurrence_end_date ? createForm.recurrence_end_date : null,
      created_by: userId,
    }).select().single()

    if (newClass && createForm.is_recurring && createForm.recurrence_end_date) {
      const instances = generateRecurringDates(
        createForm.scheduled_date, createForm.recurrence_end_date,
        createForm.recurrence_rule, createForm.recurrence_days
      )
      if (instances.length > 0) {
        const { id: _, created_at: __, ...rest } = newClass
        await supabase.from('scheduled_classes').insert(instances.map(date => ({ ...rest, scheduled_date: date })))
      }
    }

    setShowCreateModal(false)
    setCreateForm({ title: '', description: '', type: 'conditioning', group_id: '', scheduled_date: new Date().toISOString().split('T')[0], start_time: '06:00', end_time: '07:00', location: '', is_recurring: false, recurrence_rule: 'weekly', recurrence_days: [], recurrence_end_date: '' })
    await loadClasses()
    setSaving(false)
  }

  const toggleDay = (day: string) => {
    setCreateForm(p => ({
      ...p,
      recurrence_days: p.recurrence_days.includes(day)
        ? p.recurrence_days.filter(d => d !== day)
        : [...p.recurrence_days, day],
    }))
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>
      </div>
    )
  }

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date().toISOString().split('T')[0]

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      <Navbar />
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <p style={{ color: 'var(--teal-secondary)', fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Schedule</p>
            <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: 'clamp(2.5rem, 6vw, 4rem)', letterSpacing: '0.03em' }}>
              TRAINING CALENDAR
            </h1>
          </div>
          {(userRole === 'admin' || userRole === 'coach') && (
            <button onClick={() => setShowCreateModal(true)} style={{ background: 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.75rem 1.25rem', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', minHeight: 44 }}>
              <Plus size={16} /> Schedule Class
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) 280px', gap: '1.5rem' }}>
          {/* Calendar grid */}
          <div>
            {/* Month nav */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <button onClick={() => setCurrentMonth(new Date(year, month - 1))} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '0.375rem', padding: '0.5rem 0.875rem', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', minHeight: 0 }}>
                <ChevronLeft size={18} />
              </button>
              <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.75rem', letterSpacing: '0.03em' }}>
                {MONTH_NAMES[month]} {year}
              </h2>
              <button onClick={() => setCurrentMonth(new Date(year, month + 1))} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '0.375rem', padding: '0.5rem 0.875rem', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', minHeight: 0 }}>
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '0.375rem' }}>
              {DAY_NAMES.map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', padding: '0.375rem 0' }}>{d}</div>
              ))}
            </div>

            {/* Day cells */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
              {cells.map((day, i) => {
                if (!day) return <div key={`e-${i}`} />
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const dayClasses = classes.filter(c => c.scheduled_date === dateStr)
                const isToday = dateStr === today
                const isSelected = dateStr === selectedDate
                return (
                  <div
                    key={dateStr}
                    onClick={() => handleDateClick(dateStr)}
                    style={{
                      borderRadius: '0.5rem', padding: '0.375rem', minHeight: '60px', cursor: 'pointer', transition: 'all 0.15s',
                      background: isSelected ? 'rgba(8,119,160,0.2)' : isToday ? 'rgba(8,119,160,0.1)' : 'var(--surface)',
                      border: `1px solid ${isSelected ? 'var(--teal-primary)' : isToday ? 'rgba(8,119,160,0.4)' : 'var(--border)'}`,
                    }}
                  >
                    <p style={{ fontSize: '0.7rem', fontWeight: 600, textAlign: 'right', color: isToday ? 'var(--teal-secondary)' : 'var(--text-secondary)', marginBottom: '0.2rem' }}>{day}</p>
                    {dayClasses.slice(0, 2).map(c => {
                      const tc = classTypeColor(c.type)
                      return (
                        <div key={c.id} style={{ ...tc, borderRadius: '0.2rem', fontSize: '0.6rem', padding: '0.1rem 0.3rem', marginBottom: '0.15rem', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                          {c.start_time?.slice(0, 5)} {c.title}
                        </div>
                      )
                    })}
                    {dayClasses.length > 2 && <p style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>+{dayClasses.length - 2} more</p>}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Side panel */}
          <div>
            {selectedDate ? (
              <div>
                <h3 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', marginBottom: '1rem', letterSpacing: '0.03em' }}>
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </h3>
                {selectedDateClasses.length === 0 ? (
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '2rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📅</p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No classes scheduled.</p>
                    {(userRole === 'admin' || userRole === 'coach') && (
                      <button onClick={() => setShowCreateModal(true)} style={{ background: 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', marginTop: '0.75rem' }}>
                        + Add Class
                      </button>
                    )}
                  </div>
                ) : (
                  selectedDateClasses.map(cls => (
                    <ClassCard key={cls.id} cls={cls} userRole={userRole} onUpdate={loadClasses} />
                  ))
                )}
              </div>
            ) : (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '2rem', textAlign: 'center' }}>
                <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>👆</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Click a date to see scheduled classes.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create Class Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '1rem', padding: '1.5rem', width: '100%', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', letterSpacing: '0.03em' }}>SCHEDULE CLASS</h2>
              <button onClick={() => { setShowCreateModal(false); setCreateError('') }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', minHeight: 0 }}>
                <X size={20} />
              </button>
            </div>

            {createError && (
              <div style={{ background: 'rgba(127,29,29,0.4)', color: '#fca5a5', border: '1px solid #7f1d1d', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
                ⚠️ {createError}
              </div>
            )}

            <form onSubmit={handleCreateClass} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={labelBase}>Title *</label>
                <input type="text" value={createForm.title} onChange={e => setCreateForm(p => ({ ...p, title: e.target.value }))} required style={inputBase} placeholder="e.g. Morning Conditioning" />
              </div>

              {/* Type pills */}
              <div>
                <label style={labelBase}>Type</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {(['conditioning', 'basketball', 'both'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setCreateForm(p => ({ ...p, type: t }))} style={{
                      flex: 1, padding: '0.5rem', borderRadius: '0.375rem', border: `1px solid ${createForm.type === t ? 'var(--teal-primary)' : '#1a2e34'}`,
                      background: createForm.type === t ? 'rgba(8,119,160,0.2)' : '#0d1a1e',
                      color: createForm.type === t ? 'var(--teal-secondary)' : 'var(--text-secondary)',
                      fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize', minHeight: 0,
                    }}>{t === 'conditioning' ? '🏋️ Cond.' : t === 'basketball' ? '🏀 Ball' : '💪 Both'}</button>
                  ))}
                </div>
              </div>

              {/* Group + Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={labelBase}>Group</label>
                  <select value={createForm.group_id} onChange={e => setCreateForm(p => ({ ...p, group_id: e.target.value }))} style={inputBase}>
                    <option value="">All / Open</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelBase}>Date</label>
                  <input type="date" value={createForm.scheduled_date} onChange={e => setCreateForm(p => ({ ...p, scheduled_date: e.target.value }))} style={inputBase} />
                </div>
              </div>

              {/* Start + End time */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={labelBase}>Start Time</label>
                  <input type="time" value={createForm.start_time} onChange={e => setCreateForm(p => ({ ...p, start_time: e.target.value }))} style={inputBase} />
                </div>
                <div>
                  <label style={labelBase}>End Time</label>
                  <input type="time" value={createForm.end_time} onChange={e => setCreateForm(p => ({ ...p, end_time: e.target.value }))} style={inputBase} />
                </div>
              </div>

              <div>
                <label style={labelBase}>Location</label>
                <input type="text" value={createForm.location} onChange={e => setCreateForm(p => ({ ...p, location: e.target.value }))} style={inputBase} placeholder="e.g. Main Court, Gym Floor B" />
              </div>

              <div>
                <label style={labelBase}>Description</label>
                <textarea value={createForm.description} onChange={e => setCreateForm(p => ({ ...p, description: e.target.value }))} style={{ ...inputBase, minHeight: '60px', resize: 'vertical' }} placeholder="Optional class notes…" />
              </div>

              {/* Recurring toggle */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={createForm.is_recurring} onChange={e => setCreateForm(p => ({ ...p, is_recurring: e.target.checked }))} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Recurring class</span>
                </label>
              </div>

              {createForm.is_recurring && (
                <div style={{ background: '#0a1518', border: '1px solid #1a2e34', borderRadius: '0.5rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {/* Frequency */}
                  <div>
                    <label style={labelBase}>Frequency</label>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {(['daily', 'weekly', 'biweekly', 'monthly'] as const).map(r => (
                        <button key={r} type="button" onClick={() => setCreateForm(p => ({ ...p, recurrence_rule: r }))} style={{
                          padding: '0.35rem 0.75rem', borderRadius: '999px', border: `1px solid ${createForm.recurrence_rule === r ? 'var(--teal-primary)' : '#1a2e34'}`,
                          background: createForm.recurrence_rule === r ? 'rgba(8,119,160,0.2)' : 'transparent',
                          color: createForm.recurrence_rule === r ? 'var(--teal-secondary)' : 'var(--text-secondary)',
                          fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize', minHeight: 0,
                        }}>{r}</button>
                      ))}
                    </div>
                  </div>
                  {/* Days of week */}
                  {(createForm.recurrence_rule === 'weekly' || createForm.recurrence_rule === 'biweekly') && (
                    <div>
                      <label style={labelBase}>Days of Week</label>
                      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                        {DAYS_OF_WEEK.map(day => (
                          <button key={day} type="button" onClick={() => toggleDay(day)} style={{
                            padding: '0.3rem 0.625rem', borderRadius: '0.375rem',
                            border: `1px solid ${createForm.recurrence_days.includes(day) ? 'var(--teal-primary)' : '#1a2e34'}`,
                            background: createForm.recurrence_days.includes(day) ? 'rgba(8,119,160,0.2)' : 'transparent',
                            color: createForm.recurrence_days.includes(day) ? 'var(--teal-secondary)' : 'var(--text-secondary)',
                            fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize', minHeight: 0,
                          }}>{day.slice(0, 3)}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* End date */}
                  <div>
                    <label style={labelBase}>End Date <span style={{ color: '#f87171' }}>*</span></label>
                    <input type="date" value={createForm.recurrence_end_date} onChange={e => setCreateForm(p => ({ ...p, recurrence_end_date: e.target.value }))} style={inputBase}
                      min={createForm.scheduled_date ? new Date(new Date(createForm.scheduled_date + 'T00:00:00').getTime() + 86400000).toISOString().split('T')[0] : undefined}
                    />
                    {!createForm.recurrence_end_date && (
                      <p style={{ fontSize: '0.7rem', color: '#f87171', marginTop: '0.25rem' }}>End date is required for recurring classes</p>
                    )}
                  </div>
                </div>
              )}

              <button type="submit" disabled={saving} style={{ background: saving ? '#0d1a1e' : 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.875rem', fontWeight: 700, fontSize: '1rem', cursor: saving ? 'not-allowed' : 'pointer', marginTop: '0.5rem' }}>
                {saving ? 'Scheduling…' : '📅 Schedule Class'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
