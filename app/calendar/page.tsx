'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, ChevronLeft, ChevronRight } from 'lucide-react'
import ClassDetailModal, { classTypeColor } from '@/components/ClassDetailModal'
import { getLocalDateString } from '@/lib/utils'

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

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatLocalDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function generateRecurringDates(
  startDate: string,
  endDate: string,
  rule: string,
  days: string[]
): string[] {
  if (!endDate || !startDate) return []
  const dates: string[] = []
  const start = parseLocalDate(startDate)
  const end = parseLocalDate(endDate)
  if (end <= start) return []
  const current = parseLocalDate(startDate)
  current.setDate(current.getDate() + 1)
  const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
  const normalizedDays = days.map(d => d.toLowerCase().trim())
  while (current <= end) {
    const dayName = dayNames[current.getDay()]
    const dateStr = formatLocalDate(current)
    const msDiff = current.getTime() - start.getTime()
    const daysDiff = Math.floor(msDiff / (24 * 60 * 60 * 1000))
    const weeksDiff = Math.floor(daysDiff / 7)
    let include = false
    switch (rule) {
      case 'daily':
        include = true
        break
      case 'weekly':
        include = normalizedDays.length === 0 || normalizedDays.includes(dayName)
        break
      case 'biweekly':
        include = weeksDiff % 2 === 0 && (normalizedDays.length === 0 || normalizedDays.includes(dayName))
        break
      case 'monthly':
        include = current.getDate() === start.getDate()
        break
    }
    if (include) dates.push(dateStr)
    current.setDate(current.getDate() + 1)
  }
  return dates
}

function ClassCard({ cls, userRole }: { cls: any; userRole: string }) {
  const tc = classTypeColor(cls.type)
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1rem', marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.5rem' }}>
        <div>
          <h4 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>{cls.title}</h4>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {cls.start_time?.slice(0, 5)}{cls.end_time ? ` – ${cls.end_time?.slice(0, 5)}` : ''}
            {cls.location ? ` · ${cls.location}` : ''}
          </p>
          {cls.groups && <p style={{ fontSize: '0.75rem', color: 'var(--teal-secondary)', marginTop: '0.15rem' }}>{cls.groups.name}</p>}
          {cls.profiles && <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>Coach: {cls.profiles.name}</p>}
          {cls.is_recurring && <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>Recurring {cls.recurrence_rule}</p>}
        </div>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.25rem 0.5rem', borderRadius: '999px', textTransform: 'uppercase', background: tc.bg, color: tc.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {cls.type}
        </span>
      </div>
      <p style={{ fontSize: '0.75rem', color: 'var(--teal-secondary)', fontWeight: 600, marginTop: '0.25rem' }}>View Details →</p>
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
  const [selectedClass, setSelectedClass] = useState<any>(null)

  const [createForm, setCreateForm] = useState({
    title: '', description: '', type: 'conditioning', group_id: '',
    scheduled_date: getLocalDateString(),
    start_time: '06:00', end_time: '07:00', location: '',
    is_recurring: false, recurrence_rule: 'weekly',
    recurrence_days: [] as string[], recurrence_end_date: '',
  })

  const loadClasses = async () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const startOfMonth = new Date(year, month, 1).toISOString().split('T')[0]
    const endOfMonth = new Date(year, month + 1, 0).toISOString().split('T')[0]

    // Fetch stored class instances for this month
    const { data: classData } = await supabase
      .from('scheduled_classes')
      .select('*, groups(name), profiles!scheduled_classes_coach_id_fkey(name)')
      .gte('scheduled_date', startOfMonth)
      .lte('scheduled_date', endOfMonth)
      .order('start_time')

    // Fetch recurring parents that may have instances in this month
    const { data: recurringParents } = await supabase
      .from('scheduled_classes')
      .select('*, groups(name), profiles!scheduled_classes_coach_id_fkey(name)')
      .eq('is_recurring', true)
      .is('parent_class_id', null)
      .lte('scheduled_date', endOfMonth)
      .or(`recurrence_end_date.gte.${startOfMonth},recurrence_end_date.is.null`)

    // Dynamically compute which days recurring classes fall on this month
    const dynamicInstances: any[] = []
    const existingDates = new Set((classData || []).map((c: any) => `${c.scheduled_date}-${c.title}`))

    for (const parent of (recurringParents || [])) {
      if (!parent.recurrence_end_date) continue
      const recurringDates = generateRecurringDates(
        parent.scheduled_date,
        parent.recurrence_end_date,
        parent.recurrence_rule || 'weekly',
        parent.recurrence_days || []
      )
      for (const date of recurringDates) {
        if (date < startOfMonth || date > endOfMonth) continue
        const key = `${date}-${parent.title}`
        if (existingDates.has(key)) continue
        dynamicInstances.push({
          ...parent,
          id: `${parent.id}-${date}`,
          scheduled_date: date,
          parent_class_id: parent.id,
          is_dynamic: true,
        })
      }
    }

    // Fetch assigned workout plans — this already includes program-derived workouts, since assigning
    // a program materializes one workout_plans row per program workout at assignment time.
    let planQuery = supabase
      .from('workout_plans')
      .select('*, coach:profiles!workout_plans_coach_id_fkey(name), member:profiles!workout_plans_member_id_fkey(name)')
      .gte('scheduled_date', startOfMonth)
      .lte('scheduled_date', endOfMonth)
      .neq('status', 'completed')
      .neq('status', 'skipped')

    if (userRole === 'member') planQuery = planQuery.eq('member_id', userId)
    else if (userRole === 'coach') planQuery = planQuery.eq('coach_id', userId)

    const { data: planData } = await planQuery.order('scheduled_date')

    const normalizedPlans = (planData || []).map((p: any) => ({
      ...p,
      isPlan: true,
      start_time: '00:00',
      is_recurring: false,
    }))

    const allData = [
      ...(classData || []),
      ...dynamicInstances,
      ...normalizedPlans,
    ]
    setClasses(allData)
    if (selectedDate) {
      setSelectedDateClasses(allData.filter((c: any) => c.scheduled_date === selectedDate))
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

      // Client-side catch-up only — an RSVP won't flip to 'absent' until this user next opens their
      // calendar, not on a schedule. Only touches this user's own attendee rows (member_id = user.id),
      // since RLS only allows updating your own attendance.
      const today = getLocalDateString()
      const { data: myAttendance } = await supabase
        .from('class_attendees')
        .select('id, scheduled_classes(scheduled_date)')
        .eq('member_id', user.id)
        .eq('status', 'scheduled')
      const overdueAttendeeIds = (myAttendance || [])
        .filter((a: any) => a.scheduled_classes?.scheduled_date && a.scheduled_classes.scheduled_date < today)
        .map((a: any) => a.id)
      if (overdueAttendeeIds.length > 0) {
        await supabase.from('class_attendees').update({ status: 'absent' }).in('id', overdueAttendeeIds)
      }

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
    setCreateError('')

    if (!createForm.title.trim()) { setCreateError('Title is required.'); return }
    if (!createForm.scheduled_date) { setCreateError('Date is required.'); return }
    if (!createForm.start_time) { setCreateError('Start time is required.'); return }

    if (createForm.is_recurring) {
      if (!createForm.recurrence_end_date) {
        setCreateError('End date is required for recurring classes.')
        return
      }
      if (createForm.recurrence_end_date <= createForm.scheduled_date) {
        setCreateError('End date must be after the start date.')
        return
      }
      if (
        (createForm.recurrence_rule === 'weekly' || createForm.recurrence_rule === 'biweekly')
        && createForm.recurrence_days.length === 0
      ) {
        setCreateError('Select at least one day of the week for weekly/bi-weekly recurrence.')
        return
      }
    }

    setSaving(true)

    const seriesId = createForm.is_recurring ? crypto.randomUUID() : null

    const baseData = {
      title: createForm.title.trim(),
      description: createForm.description || null,
      type: createForm.type,
      group_id: createForm.group_id || null,
      coach_id: userId,
      start_time: createForm.start_time,
      end_time: createForm.end_time || null,
      location: createForm.location || null,
      is_recurring: createForm.is_recurring,
      recurrence_rule: createForm.is_recurring ? createForm.recurrence_rule : null,
      recurrence_days: createForm.is_recurring && createForm.recurrence_days.length > 0
        ? createForm.recurrence_days : null,
      recurrence_end_date: createForm.is_recurring ? createForm.recurrence_end_date : null,
      recurrence_series_id: seriesId,
      created_by: userId,
    }

    const { data: parent, error: parentError } = await supabase
      .from('scheduled_classes')
      .insert({ ...baseData, scheduled_date: createForm.scheduled_date })
      .select()
      .single()

    if (parentError) {
      setCreateError(`Failed to create class: ${parentError.message}`)
      setSaving(false)
      return
    }

    if (createForm.is_recurring && parent && createForm.recurrence_end_date) {
      const recurringDates = generateRecurringDates(
        createForm.scheduled_date,
        createForm.recurrence_end_date,
        createForm.recurrence_rule,
        createForm.recurrence_days
      )
      if (recurringDates.length > 0) {
        const batchSize = 50
        for (let i = 0; i < recurringDates.length; i += batchSize) {
          const batch = recurringDates.slice(i, i + batchSize)
          const { error: batchError } = await supabase.from('scheduled_classes').insert(
            batch.map(date => ({
              ...baseData,
              scheduled_date: date,
              parent_class_id: parent.id,
            }))
          )
          if (batchError) {
            console.error('Batch insert error:', batchError)
          }
        }
      }
    }

    setShowCreateModal(false)
    setCreateForm({
      title: '', description: '', type: 'conditioning', group_id: '',
      scheduled_date: selectedDate || getLocalDateString(),
      start_time: '06:00', end_time: '07:00', location: '',
      is_recurring: false, recurrence_rule: 'weekly',
      recurrence_days: [], recurrence_end_date: '',
    })
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
  const today = getLocalDateString()

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
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

        <div className="cal-grid-layout">
          {/* Calendar grid */}
          <div style={{ minWidth: 0 }}>
            {/* Month nav */}
            <div className="cal-month-header">
              <button className="cal-nav-btn" onClick={() => setCurrentMonth(new Date(year, month - 1))} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '0.375rem', padding: '0.5rem 0.875rem', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', minHeight: 0 }}>
                <ChevronLeft size={18} />
              </button>
              <h2 className="cal-month-title">
                {MONTH_NAMES[month]} {year}
              </h2>
              <button className="cal-nav-btn" onClick={() => setCurrentMonth(new Date(year, month + 1))} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '0.375rem', padding: '0.5rem 0.875rem', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', minHeight: 0 }}>
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Day headers */}
            <div className="cal-day-headers">
              {DAY_NAMES.map(d => (
                <div key={d} className="cal-day-header-label" style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', padding: '0.375rem 0' }}>
                  <span className="cal-day-full">{d}</span>
                  <span className="cal-day-abbr">{d.charAt(0)}</span>
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="cal-day-grid">
              {cells.map((day, i) => {
                if (!day) return <div key={`e-${i}`} />
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const dayClasses = classes.filter(c => c.scheduled_date === dateStr)
                const isToday = dateStr === today
                const isSelected = dateStr === selectedDate
                return (
                  <div
                    key={dateStr}
                    className="cal-day-cell"
                    onClick={() => handleDateClick(dateStr)}
                    style={{
                      borderRadius: '0.5rem', padding: '0.375rem', minHeight: '60px', cursor: 'pointer', transition: 'all 0.15s',
                      background: isSelected ? 'rgba(8,119,160,0.2)' : isToday ? 'rgba(8,119,160,0.1)' : 'var(--surface)',
                      border: `1px solid ${isSelected ? 'var(--teal-primary)' : isToday ? 'rgba(8,119,160,0.4)' : 'var(--border)'}`,
                    }}
                  >
                    <p style={{ fontSize: '0.7rem', fontWeight: 600, textAlign: 'right', color: isToday ? 'var(--teal-secondary)' : 'var(--text-secondary)', marginBottom: '0.2rem' }}>{day}</p>
                    {dayClasses.slice(0, 2).map(c => {
                      if (c.isPlan) {
                        return (
                          <div key={c.id} onClick={e => { e.stopPropagation(); setSelectedClass(c) }} style={{ background: 'rgba(8,119,160,0.25)', color: '#34bac2', border: '1px dashed rgba(8,119,160,0.5)', borderRadius: '0.2rem', fontSize: '0.6rem', padding: '0.1rem 0.3rem', marginBottom: '0.15rem', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', cursor: 'pointer' }}>
                            {c.title}
                          </div>
                        )
                      }
                      const tc = classTypeColor(c.type)
                      return (
                        <div key={c.id} onClick={e => { e.stopPropagation(); setSelectedClass(c) }} style={{ ...tc, borderRadius: '0.2rem', fontSize: '0.6rem', padding: '0.1rem 0.3rem', marginBottom: '0.15rem', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', cursor: 'pointer' }}>
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
          <div style={{ minWidth: 0 }}>
            {selectedDate ? (
              <div>
                <h3 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', marginBottom: '1rem', letterSpacing: '0.03em' }}>
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </h3>
                {selectedDateClasses.length === 0 ? (
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '2rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No classes or plans scheduled.</p>
                    {(userRole === 'admin' || userRole === 'coach') && (
                      <button onClick={() => setShowCreateModal(true)} style={{ background: 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', marginTop: '0.75rem' }}>
                        + Add Class
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Assigned Plans */}
                    {selectedDateClasses.filter(c => c.isPlan).length > 0 && (
                      <div style={{ marginBottom: '1rem' }}>
                        <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--teal-secondary)', marginBottom: '0.5rem' }}>Assigned Plans</p>
                        {selectedDateClasses.filter(c => c.isPlan).map(plan => {
                          const memberName = plan.member?.name
                          const coachName = plan.coach?.name
                          const tb = plan.type === 'basketball' ? { bg: 'rgba(8,119,160,0.2)', color: '#34bac2' } : plan.type === 'both' ? { bg: 'rgba(168,85,247,0.15)', color: '#c084fc' } : { bg: 'rgba(34,197,94,0.15)', color: '#4ade80' }
                          return (
                            <div key={plan.id} onClick={() => setSelectedClass(plan)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '2px dashed var(--teal-primary)', borderRadius: '0.75rem', padding: '0.875rem', marginBottom: '0.5rem', cursor: 'pointer' }}>
                              <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>{plan.title}</p>
                              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
                                {userRole === 'coach' || userRole === 'admin' ? `Member: ${memberName ?? '—'}` : `Coach: ${coachName ?? '—'}`}
                              </p>
                              <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '999px', textTransform: 'uppercase', ...tb }}>{plan.type}</span>
                              <p style={{ fontSize: '0.7rem', color: 'var(--teal-secondary)', fontWeight: 600, marginTop: '0.375rem' }}>View Details →</p>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    {/* Scheduled Classes */}
                    {selectedDateClasses.filter(c => !c.isPlan).length > 0 && (
                      <div>
                        <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Scheduled Classes</p>
                        {selectedDateClasses.filter(c => !c.isPlan).map(cls => (
                          <div key={cls.id} onClick={() => setSelectedClass(cls)} style={{ cursor: 'pointer' }}>
                            <ClassCard cls={cls} userRole={userRole} />
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '2rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Click a date to see scheduled classes.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {selectedClass && (
        <ClassDetailModal
          cls={selectedClass}
          userId={userId || ''}
          userRole={userRole}
          onClose={() => setSelectedClass(null)}
          onUpdate={loadClasses}
        />
      )}

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
                {createError}
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
                    }}>{t === 'conditioning' ? 'Cond.' : t === 'basketball' ? 'Ball' : 'Both'}</button>
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
                {saving ? 'Scheduling…' : 'Schedule Class'}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .cal-grid-layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }
        .cal-month-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1.25rem;
        }
        .cal-nav-btn { flex-shrink: 0; }
        .cal-month-title {
          font-family: var(--font-bebas);
          font-size: 1.75rem;
          letter-spacing: 0.03em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-align: center;
          flex: 1;
          min-width: 0;
        }
        .cal-day-headers, .cal-day-grid {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          box-sizing: border-box;
        }
        .cal-day-headers { gap: 2px; margin-bottom: 0.375rem; }
        .cal-day-grid { gap: 3px; }
        .cal-day-cell {
          box-sizing: border-box;
          min-height: 44px;
          overflow: hidden;
        }
        .cal-day-abbr { display: none; }
        @media (max-width: 480px) {
          .cal-month-title { font-size: 1.15rem; }
          .cal-day-header-label { font-size: 0.65rem; letter-spacing: 0; padding: 0.25rem 0 !important; }
          .cal-day-full { display: none; }
          .cal-day-abbr { display: inline; }
        }
        @media (min-width: 1024px) {
          .cal-grid-layout {
            grid-template-columns: minmax(0, 2fr) 280px;
          }
        }
      `}</style>
    </div>
  )
}
