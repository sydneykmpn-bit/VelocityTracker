'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { X } from 'lucide-react'
import ClassDetailModal, { classTypeColor } from '@/components/ClassDetailModal'
import CalendarGrid, { CalendarEntry } from '@/components/CalendarGrid'
import { BballClassDetailModal, BballOccurrence, genderBadgeStyle } from '@/components/BballClassModal'
import { getLocalDateString, bballOccurrencesInRange, formatTimeLabel, formatDateYMD as formatLocalDate, generateRecurringDates, joinBballClass, BballClassRow } from '@/lib/utils'

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
  const [bballBusyKey, setBballBusyKey] = useState<string | null>(null)
  const [bballError, setBballError] = useState('')
  const [bballJoinBlockedMsg, setBballJoinBlockedMsg] = useState('')
  const [bballJoinInfoMsg, setBballJoinInfoMsg] = useState('')
  const isCoachOrAdmin = userRole === 'admin' || userRole === 'coach'

  const goToClass = (c: any) => {
    if (c.isBballClass) { router.push(`/classes/${c.cls.id}?date=${c.date}`); return }
    const classId = c.is_dynamic ? c.parent_class_id : c.id
    router.push(`/calendar/classes/${classId}?date=${c.scheduled_date}`)
  }

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

  const bballGenderMatches = (restriction: string) => {
    if (restriction === 'mixed') return true
    if (restriction === 'men') return gender === 'male'
    if (restriction === 'women') return gender === 'female'
    return true
  }

  const handleBballJoin = async (occ: BballOccurrence) => {
    const key = `${occ.cls.id}_${occ.date}`
    setBballError(''); setBballJoinBlockedMsg(''); setBballJoinInfoMsg('')
    if (!bballGenderMatches(occ.cls.gender_restriction)) {
      const label = occ.cls.gender_restriction === 'men' ? 'men' : 'women'
      setBballJoinBlockedMsg(`This class is for ${label} only.`)
      return
    }
    setBballBusyKey(key)
    const { status, error: err } = await joinBballClass(supabase, occ.cls.id, userId || '', occ.date)
    if (err) {
      setBballError(err)
      setBballBusyKey(null)
      await loadClasses()
      return
    }
    if (status === 'pending') setBballJoinInfoMsg('Your spot request is pending approval.')
    else if (status === 'waitlist') setBballJoinInfoMsg("You're on the waitlist — you'll have a spot if one opens up.")
    await loadClasses()
    setBballBusyKey(null)
  }

  const handleBballLeave = async (occ: BballOccurrence) => {
    const key = `${occ.cls.id}_${occ.date}`
    setBballError('')
    setBballBusyKey(key)
    const { error: err } = await supabase.from('bball_class_signups')
      .delete().eq('class_id', occ.cls.id).eq('user_id', userId).eq('occurrence_date', occ.date)
    if (err) { setBballError(err.message); setBballBusyKey(null); return }
    await loadClasses()
    setBballBusyKey(null)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>
      </div>
    )
  }

  const entries: CalendarEntry[] = classes.map(c => ({ ...c, date: c.scheduled_date || c.date }))

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: 'max(2rem, env(safe-area-inset-top)) 1rem 2rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <p style={{ color: 'var(--teal-secondary)', fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Schedule</p>
          <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: 'clamp(2rem, 8vw, 4rem)', letterSpacing: '0.03em' }}>
            TRAINING CALENDAR
          </h1>
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
                    <div key={c.id} onClick={e => { e.stopPropagation(); isCoachOrAdmin ? goToClass(c) : setSelectedBballOcc(c as unknown as BballOccurrence) }} style={{ background: 'rgba(52,186,194,0.2)', color: '#34bac2', borderRadius: '0.2rem', fontSize: '0.6rem', padding: '0.1rem 0.3rem', marginBottom: '0.15rem', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', cursor: 'pointer' }}>
                      🏀 {c.cls.start_time?.slice(0, 5)} {c.cls.title}
                    </div>
                  )
                }
                const tc = classTypeColor(c.type)
                return (
                  <div key={c.id} onClick={e => { e.stopPropagation(); isCoachOrAdmin ? goToClass(c) : setSelectedClass(c) }} style={{ ...tc, borderRadius: '0.2rem', fontSize: '0.6rem', padding: '0.1rem 0.3rem', marginBottom: '0.15rem', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', cursor: 'pointer' }}>
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
                        {bballError && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', padding: '0.625rem 0.75rem', marginBottom: '0.5rem', color: '#f87171', fontSize: '0.8rem' }}>{bballError}</div>}
                        {bballJoinBlockedMsg && (
                          <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '0.5rem', padding: '0.625rem 0.75rem', marginBottom: '0.5rem', color: '#f59e0b', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                            <span>{bballJoinBlockedMsg}</span>
                            <button onClick={() => setBballJoinBlockedMsg('')} style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', minHeight: 0, padding: 0 }}><X size={13} /></button>
                          </div>
                        )}
                        {bballJoinInfoMsg && (
                          <div style={{ background: 'rgba(8,119,160,0.1)', border: '1px solid rgba(8,119,160,0.3)', borderRadius: '0.5rem', padding: '0.625rem 0.75rem', marginBottom: '0.5rem', color: 'var(--teal-secondary)', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                            <span>{bballJoinInfoMsg}</span>
                            <button onClick={() => setBballJoinInfoMsg('')} style={{ background: 'none', border: 'none', color: 'var(--teal-secondary)', cursor: 'pointer', minHeight: 0, padding: 0 }}><X size={13} /></button>
                          </div>
                        )}
                        {selEntries.filter(c => c.isBballClass).map((occAny: any) => {
                          const occ = occAny as BballOccurrence & { id: string }
                          const badge = genderBadgeStyle[occ.cls.gender_restriction]
                          const key = `${occ.cls.id}_${occ.date}`
                          const busy = bballBusyKey === key
                          const onRowClick = () => isCoachOrAdmin ? goToClass(occAny) : setSelectedBballOcc(occ)
                          return (
                            <div key={occAny.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '0.875rem', marginBottom: '0.5rem' }}>
                              <div onClick={onRowClick} style={{ cursor: 'pointer' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                                  <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{occ.cls.title}</p>
                                  {badge && (
                                    <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '999px', textTransform: 'uppercase', background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>{badge.label}</span>
                                  )}
                                </div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
                                  {formatTimeLabel(occ.cls.start_time)} – {formatTimeLabel(occ.cls.end_time)} · {isCoachOrAdmin ? `${occ.count} / ${occ.cls.max_slots} spots filled` : `${Math.max(0, occ.cls.max_slots - occ.count)} spots left`}
                                </p>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <p onClick={onRowClick} style={{ fontSize: '0.7rem', color: 'var(--teal-secondary)', fontWeight: 600, cursor: 'pointer' }}>View Details →</p>
                                {occ.joined ? (
                                  <button onClick={() => handleBballLeave(occ)} disabled={busy} style={{ background: 'none', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '0.5rem', padding: '0.4rem 0.875rem', fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', cursor: busy ? 'not-allowed' : 'pointer' }}>
                                    {busy ? 'Leaving…' : 'Leave'}
                                  </button>
                                ) : (
                                  <button onClick={() => handleBballJoin(occ)} disabled={busy} style={{ background: 'var(--teal-primary)', border: 'none', borderRadius: '0.5rem', padding: '0.4rem 0.875rem', fontSize: '0.75rem', fontWeight: 700, color: 'white', cursor: busy ? 'not-allowed' : 'pointer' }}>
                                    {busy ? 'Joining…' : 'Join'}
                                  </button>
                                )}
                              </div>
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
                          <div key={cls.id} onClick={() => isCoachOrAdmin ? goToClass(cls) : setSelectedClass(cls)} style={{ cursor: 'pointer' }}>
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
          isAdmin={false}
          viewerRole={userRole}
          onClose={() => setSelectedBballOcc(null)}
          onJoinLeave={loadClasses}
        />
      )}
    </div>
  )
}
