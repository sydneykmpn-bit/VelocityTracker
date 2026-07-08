'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ClassDetailModal, { classTypeColor } from '@/components/ClassDetailModal'
import CalendarGrid, { CalendarEntry } from '@/components/CalendarGrid'
import { BballClassDetailModal, BballClassFormModal, BballOccurrence, genderBadgeStyle } from '@/components/BballClassModal'
import { getLocalDateString, bballOccurrencesInRange, formatTimeLabel, BballClassRow } from '@/lib/utils'

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

export default function CalendarPage() {
  const router = useRouter()
  const supabase = createClient()

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [classes, setClasses] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [userRole, setUserRole] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [gender, setGender] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedClass, setSelectedClass] = useState<any>(null)
  const [selectedBballOcc, setSelectedBballOcc] = useState<BballOccurrence | null>(null)
  const [bballFormOpen, setBballFormOpen] = useState(false)
  const [editingBballClass, setEditingBballClass] = useState<BballClassRow | null>(null)
  const [bballClasses, setBballClasses] = useState<BballClassRow[]>([])

  const loadClasses = async () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    // Padded by a week on each side so week-view rows that straddle a month boundary still have
    // their adjacent-month days' data loaded (CalendarGrid's week mode can show days outside `month`).
    const startOfMonth = formatLocalDate(new Date(year, month, 1 - 7))
    const endOfMonth = formatLocalDate(new Date(year, month + 1, 0 + 7))

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

    // Fetch bball_classes (basketball class slots) and expand into occurrences for this range
    const { data: bballClassData } = await supabase.from('bball_classes').select('*')
    const bballList: BballClassRow[] = bballClassData || []
    setBballClasses(bballList)
    const bballOccurrences = bballList.flatMap(c =>
      bballOccurrencesInRange(c, startOfMonth, endOfMonth).map(date => ({
        id: `bball-${c.id}-${date}`, classId: c.id, cls: c, date, isBballClass: true, count: 0, joined: false,
      }))
    )
    if (bballOccurrences.length > 0) {
      const classIds = Array.from(new Set(bballOccurrences.map(o => o.classId)))
      const dates = Array.from(new Set(bballOccurrences.map(o => o.date)))
      const { data: signups } = await supabase
        .from('bball_class_signups')
        .select('class_id, user_id, occurrence_date')
        .in('class_id', classIds)
        .in('occurrence_date', dates)
      const countMap: Record<string, number> = {}
      const joinedSet = new Set<string>()
      for (const row of signups || []) {
        const key = `${row.class_id}_${row.occurrence_date}`
        countMap[key] = (countMap[key] || 0) + 1
        if (row.user_id === userId) joinedSet.add(key)
      }
      for (const occ of bballOccurrences) {
        const key = `${occ.classId}_${occ.date}`
        occ.count = countMap[key] || 0
        occ.joined = joinedSet.has(key)
      }
    }

    const allData = [
      ...(classData || []),
      ...dynamicInstances,
      ...normalizedPlans,
      ...bballOccurrences,
    ]
    setClasses(allData)
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      const { data: prof } = await supabase.from('profiles').select('role, gender').eq('id', user.id).single()
      setUserRole(prof?.role ?? 'member')
      setGender(prof?.gender ?? null)

      // Client-side catch-up only — an RSVP won't flip to 'absent' until this user next opens their
      // calendar, not on a schedule. Only touches this user's own attendee rows (member_id = user.id),
      // since RLS only allows updating your own attendance. Uses each attendee row's own
      // occurrence_date (not scheduled_classes.scheduled_date) so recurring-instance attendance is
      // compared against its own specific date, not the parent's base date.
      const today = getLocalDateString()
      const { data: myAttendance } = await supabase
        .from('class_attendees')
        .select('id, occurrence_date')
        .eq('member_id', user.id)
        .eq('status', 'scheduled')
      const overdueAttendeeIds = (myAttendance || [])
        .filter((a: any) => a.occurrence_date && a.occurrence_date < today)
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

  const handleSelectDate = (dateStr: string) => {
    setSelectedDate(dateStr)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>
      </div>
    )
  }

  const entries: CalendarEntry[] = classes.map(c => ({ ...c, date: c.scheduled_date }))

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
          {userRole === 'admin' && (
            <button onClick={() => { setEditingBballClass(null); setBballFormOpen(true) }} style={{ background: 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.75rem 1.25rem', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', minHeight: 44 }}>
              + Add Class
            </button>
          )}
        </div>

        <CalendarGrid
          month={currentMonth}
          onMonthChange={setCurrentMonth}
          entries={entries}
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          renderDayCellContent={(dayEntries) => (
            <>
              {dayEntries.slice(0, 2).map(c => {
                if (c.isPlan) {
                  return (
                    <div key={c.id} onClick={e => { e.stopPropagation(); setSelectedClass(c) }} style={{ background: 'rgba(8,119,160,0.25)', color: '#34bac2', border: '1px dashed rgba(8,119,160,0.5)', borderRadius: '0.2rem', fontSize: '0.6rem', padding: '0.1rem 0.3rem', marginBottom: '0.15rem', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', cursor: 'pointer' }}>
                      {c.title}
                    </div>
                  )
                }
                if (c.isBballClass) {
                  return (
                    <div key={c.id} onClick={e => { e.stopPropagation(); setSelectedBballOcc(c as unknown as BballOccurrence) }} style={{ background: 'rgba(52,186,194,0.2)', color: '#34bac2', borderRadius: '0.2rem', fontSize: '0.6rem', padding: '0.1rem 0.3rem', marginBottom: '0.15rem', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', cursor: 'pointer' }}>
                      🏀 {c.cls.start_time?.slice(0, 5)} {c.cls.title}
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
              {dayEntries.length > 2 && <p style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>+{dayEntries.length - 2} more</p>}
            </>
          )}
          renderDetailPanel={(selDate, selEntries) => (
            selDate ? (
              <div>
                <h3 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', marginBottom: '1rem', letterSpacing: '0.03em' }}>
                  {new Date(selDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </h3>
                {selEntries.length === 0 ? (
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '2rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No classes or plans scheduled.</p>
                  </div>
                ) : (
                  <>
                    {/* Assigned Plans */}
                    {selEntries.filter(c => c.isPlan).length > 0 && (
                      <div style={{ marginBottom: '1rem' }}>
                        <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--teal-secondary)', marginBottom: '0.5rem' }}>Assigned Plans</p>
                        {selEntries.filter(c => c.isPlan).map(plan => {
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
                    {/* Basketball Classes */}
                    {selEntries.filter(c => c.isBballClass).length > 0 && (
                      <div style={{ marginBottom: '1rem' }}>
                        <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--teal-secondary)', marginBottom: '0.5rem' }}>Basketball Classes</p>
                        {selEntries.filter(c => c.isBballClass).map(occ => {
                          const badge = genderBadgeStyle[occ.cls.gender_restriction]
                          const full = occ.count >= occ.cls.max_slots
                          return (
                            <div key={occ.id} onClick={() => setSelectedBballOcc(occ as unknown as BballOccurrence)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '0.875rem', marginBottom: '0.5rem', cursor: 'pointer' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                                <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{occ.cls.title}</p>
                                {badge && (
                                  <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '999px', textTransform: 'uppercase', background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>{badge.label}</span>
                                )}
                              </div>
                              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
                                {formatTimeLabel(occ.cls.start_time)} – {formatTimeLabel(occ.cls.end_time)} · {occ.count} / {occ.cls.max_slots} spots filled{full ? ' · Full' : ''}
                              </p>
                              <p style={{ fontSize: '0.7rem', color: 'var(--teal-secondary)', fontWeight: 600 }}>View Details →</p>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    {/* Scheduled Classes */}
                    {selEntries.filter(c => !c.isPlan && !c.isBballClass).length > 0 && (
                      <div>
                        <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Scheduled Classes</p>
                        {selEntries.filter(c => !c.isPlan && !c.isBballClass).map(cls => (
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
            )
          )}
        />
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

      {selectedBballOcc && (
        <BballClassDetailModal
          occ={selectedBballOcc}
          myUserId={userId || ''}
          myGender={gender}
          isAdmin={userRole === 'admin'}
          onClose={() => setSelectedBballOcc(null)}
          onJoinLeave={loadClasses}
          onEdit={cls => { setSelectedBballOcc(null); setEditingBballClass(cls); setBballFormOpen(true) }}
        />
      )}
      {bballFormOpen && userRole === 'admin' && (
        <BballClassFormModal
          editing={editingBballClass}
          onClose={() => setBballFormOpen(false)}
          onSaved={loadClasses}
        />
      )}
    </div>
  )
}
