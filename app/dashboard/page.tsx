'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { WorkoutCardSkeleton, StatCardSkeleton, Skeleton } from '@/components/Skeleton'
import ClassDetailModal from '@/components/ClassDetailModal'
import { getLocalDateString, formatLocalDate, formatDuration, isProgramDoneThisWeek, bballOccurrencesInRange, generateRecurringDates } from '@/lib/utils'
import { TodayPlanCard, SkippedPlansSection, typeBadge } from '@/components/PlanCards'
import { AlertTriangle, Users, Settings, ClipboardList, CheckCircle2, SkipForward, Clock, MapPin, Calendar, UserCheck } from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [userRole, setUserRole] = useState('')
  const [allWorkoutsList, setAllWorkoutsList] = useState<any[]>([])
  const [coachNote, setCoachNote] = useState<any>(null)
  const [todayPlans, setTodayPlans] = useState<any[]>([])
  const [completedToday, setCompletedToday] = useState<any[]>([])
  const [upcomingPlans, setUpcomingPlans] = useState<any[]>([])
  const [skippedPlans, setSkippedPlans] = useState<any[]>([])
  const [todayClasses, setTodayClasses] = useState<any[]>([])
  const [athletesScheduledToday, setAthletesScheduledToday] = useState<{ count: number; total: number } | null>(null)
  const [athletesPendingPrograms, setAthletesPendingPrograms] = useState(0)
  const [upcomingCoachClasses, setUpcomingCoachClasses] = useState<any[]>([])
  const [pendingApprovals, setPendingApprovals] = useState(0)
  const [activeMembersCount, setActiveMembersCount] = useState(0)
  const [classesTodayCount, setClassesTodayCount] = useState(0)
  const [hasPendingProgram, setHasPendingProgram] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [selectedClass, setSelectedClass] = useState<any>(null)
  const [quickActionLoading, setQuickActionLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  const today = getLocalDateString()

  const loadAll = async (uid: string) => {
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
    const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 7)

    // Client-side catch-up only — a plan won't flip to 'skipped' until the member or their coach next opens /dashboard or /student (athlete panel), not on a schedule.
    const { data: overdueP } = await supabase
      .from('workout_plans')
      .select('id')
      .eq('member_id', uid)
      .in('status', ['pending', 'rescheduled'])
      .lt('scheduled_date', today)
    if (overdueP && overdueP.length > 0) {
      await supabase.from('workout_plans').update({ status: 'skipped' }).in('id', overdueP.map((p: any) => p.id))
    }

    const [
      { data: prof },
      { data: workoutsData },
      { data: todayP },
      { data: completedP },
      { data: upcomingP },
      { data: skippedP },
      { data: classes },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).single(),
      supabase.from('workouts').select('id, title, type, date, created_at, duration, exercises(count)').eq('user_id', uid).order('date', { ascending: false }),
      supabase.from('workout_plans').select('*, workout_plan_exercises(*), profiles!workout_plans_coach_id_fkey(name)').eq('member_id', uid).or(`scheduled_date.eq.${today},rescheduled_date.eq.${today}`).in('status', ['pending', 'rescheduled']).order('scheduled_date'),
      supabase.from('workout_plans').select('*, workout_plan_exercises(*)').eq('member_id', uid).or(`scheduled_date.eq.${today},rescheduled_date.eq.${today}`).eq('status', 'completed'),
      supabase.from('workout_plans').select('*, workout_plan_exercises(count), profiles!workout_plans_coach_id_fkey(name)').eq('member_id', uid).in('status', ['pending', 'rescheduled']).gte('scheduled_date', tomorrow.toISOString().split('T')[0]).lte('scheduled_date', nextWeek.toISOString().split('T')[0]).order('scheduled_date'),
      supabase.from('workout_plans').select('*, profiles!workout_plans_coach_id_fkey(name)').eq('member_id', uid).eq('status', 'skipped').order('scheduled_date', { ascending: false }).limit(5),
      supabase.from('scheduled_classes').select('*, groups(name), profiles!scheduled_classes_coach_id_fkey(name)').eq('scheduled_date', today).order('start_time').limit(5),
    ])

    setProfile(prof)
    setUserRole(prof?.role || 'member')
    setAllWorkoutsList(workoutsData ?? [])
    setTodayPlans(todayP ?? [])
    setCompletedToday(completedP ?? [])
    setUpcomingPlans(upcomingP ?? [])
    setSkippedPlans(skippedP ?? [])
    setTodayClasses(classes ?? [])

    // Coach note
    const { data: noteData } = await supabase
      .from('coach_notes')
      .select('*, profiles!coach_notes_coach_id_fkey(name)')
      .eq('member_id', uid).eq('visible_to_member', true)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    setCoachNote(noteData)

    // Pending (not-yet-done) assigned program, for the "You have programs for the week" banner.
    // "Done" is derived from this week's per-day athlete_program_completions — same check the
    // Programs tab's Pending/Done split uses — not a separately-set status field, so this can't drift.
    if (prof?.role === 'member') {
      const { data: programs } = await supabase
        .from('athlete_programs')
        .select('athlete_program_days(id, day_of_week)')
        .eq('member_id', uid)
      const dayIds = (programs ?? []).flatMap((p: any) => (p.athlete_program_days ?? []).map((d: any) => d.id))
      let completions: any[] = []
      if (dayIds.length > 0) {
        const { data: completionsData } = await supabase.from('athlete_program_completions').select('program_day_id, occurrence_date').in('program_day_id', dayIds)
        completions = completionsData ?? []
      }
      const anyPending = (programs ?? []).some((p: any) => !isProgramDoneThisWeek(p.athlete_program_days ?? [], completions))
      setHasPendingProgram(anyPending)
    }

    // Coach-specific data
    if (prof?.role === 'coach') {
      const { data: coachGroups } = await supabase.from('groups').select('id').eq('coach_id', uid)
      const groupIds = coachGroups?.map((g: any) => g.id) || []
      if (groupIds.length > 0) {
        const { data: memberIds } = await supabase.from('group_members').select('member_id').in('group_id', groupIds)
        const ids = memberIds?.map((m: any) => m.member_id) || []
        if (ids.length > 0) {
          const { data: scheduledTodayPlans } = await supabase
            .from('workout_plans')
            .select('member_id')
            .eq('coach_id', uid)
            .eq('scheduled_date', today)
            .in('status', ['pending', 'rescheduled'])
          const scheduledCount = new Set((scheduledTodayPlans ?? []).map((p: any) => p.member_id)).size
          setAthletesScheduledToday({ count: scheduledCount, total: ids.length })
        }
      }

      // Athletes with at least one pending (not-done) Program day this week — same
      // isProgramDoneThisWeek check used by the Programs tab's Pending/Done split above.
      const { data: coachPrograms } = await supabase
        .from('athlete_programs')
        .select('member_id, athlete_program_days(id, day_of_week)')
        .eq('coach_id', uid)
      const coachDayIds = (coachPrograms ?? []).flatMap((p: any) => (p.athlete_program_days ?? []).map((d: any) => d.id))
      let coachCompletions: any[] = []
      if (coachDayIds.length > 0) {
        const { data: coachCompletionsData } = await supabase
          .from('athlete_program_completions')
          .select('program_day_id, occurrence_date')
          .in('program_day_id', coachDayIds)
        coachCompletions = coachCompletionsData ?? []
      }
      const pendingProgramMemberIds = new Set(
        (coachPrograms ?? [])
          .filter((p: any) => !isProgramDoneThisWeek(p.athlete_program_days ?? [], coachCompletions))
          .map((p: any) => p.member_id)
      )
      setAthletesPendingPrograms(pendingProgramMemberIds.size)

      const { data: coachClasses } = await supabase
        .from('scheduled_classes').select('*, groups(name)').eq('coach_id', uid)
        .gte('scheduled_date', today).order('scheduled_date').order('start_time').limit(3)
      setUpcomingCoachClasses(coachClasses || [])
    }

    // Admin-specific data
    if (prof?.role === 'admin') {
      const [{ count: pending }, { count: activeMembers }, { data: bballClasses }, { data: bballExceptions }, { data: scheduledClasses }] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('approved', false),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('approved', true).eq('role', 'member'),
        supabase.from('bball_classes').select('*'),
        supabase.from('bball_class_exceptions').select('class_id, excluded_date'),
        supabase.from('scheduled_classes').select('id, scheduled_date, is_recurring, recurrence_rule, recurrence_days'),
      ])
      setPendingApprovals(pending || 0)
      setActiveMembersCount(activeMembers || 0)

      // "Classes Today" must count actual occurrences (recurring bball_classes + scheduled_classes),
      // not just rows whose own scheduled_date literally equals today — same fix as the Navbar/BottomNav
      // badge and Admin Panel's "Classes This Month" stat.
      const exceptionsByClass: Record<string, string[]> = {}
      for (const exc of bballExceptions || []) {
        (exceptionsByClass[exc.class_id] ??= []).push(exc.excluded_date)
      }
      const bballTodayCount = (bballClasses || []).filter((c: any) =>
        bballOccurrencesInRange(c, today, today, exceptionsByClass[c.id]).length > 0
      ).length
      const scheduledTodayCount = (scheduledClasses || []).filter((c: any) => {
        if (c.scheduled_date === today) return true
        if (c.is_recurring) {
          return generateRecurringDates(c.scheduled_date, today, c.recurrence_rule, c.recurrence_days || []).includes(today)
        }
        return false
      }).length
      setClassesTodayCount(bballTodayCount + scheduledTodayCount)
    }
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      await loadAll(user.id)
      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handlePlanUpdate = async () => {
    if (userId) await loadAll(userId)
  }
  const loadData = () => { if (userId) loadAll(userId) }

  const handleQuickPlanAction = async (plan: any, action: 'completed' | 'skipped') => {
    setQuickActionLoading(plan.id)
    setError('')

    if (action === 'skipped') {
      const { error: updateErr } = await supabase.from('workout_plans').update({ status: 'skipped' }).eq('id', plan.id)
      if (updateErr) {
        console.error('handleQuickPlanAction: workout_plans update failed', updateErr)
        setError(updateErr.message)
      }
      setQuickActionLoading(null)
      handlePlanUpdate()
      return
    }

    const { data: planExercises, error: planExError } = await supabase
      .from('workout_plan_exercises')
      .select('*')
      .eq('plan_id', plan.id)
      .order('order_index')

    if (planExError) {
      console.error('handleQuickPlanAction: workout_plan_exercises fetch failed', planExError)
      setError(planExError.message)
      setQuickActionLoading(null)
      return
    }

    const { data: newWorkout, error: workoutErr } = await supabase.from('workouts').insert({
      user_id: userId,
      title: plan.title,
      type: plan.type,
      notes: `Auto-logged from assigned plan. ${plan.description || ''}`.trim(),
      duration: null,
      date: new Date().toISOString(),
    }).select().single()

    if (workoutErr) {
      console.error('handleQuickPlanAction: workouts insert failed', workoutErr)
      setError(workoutErr.message)
      setQuickActionLoading(null)
      return
    }

    if (newWorkout && planExercises && planExercises.length > 0) {
      const { error: exError } = await supabase.from('exercises').insert(
        planExercises.map((ex: any) => ({
          workout_id: newWorkout.id,
          name: ex.name, sets: ex.sets, reps: ex.reps,
          weight: ex.weight, weight_unit: ex.weight_unit,
          duration: ex.duration, distance: ex.distance, notes: ex.notes,
        }))
      )

      if (exError) {
        console.error('handleQuickPlanAction: exercises insert failed', exError)
        setError(exError.message)
        setQuickActionLoading(null)
        return
      }
    }

    const { error: updateErr } = await supabase.from('workout_plans').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      auto_logged_workout_id: newWorkout?.id ?? null,
    }).eq('id', plan.id)

    if (updateErr) {
      console.error('handleQuickPlanAction: workout_plans update failed', updateErr)
      setError(updateErr.message)
      setQuickActionLoading(null)
      return
    }

    setQuickActionLoading(null)
    handlePlanUpdate()
  }

  const handleUndoQuickPlanAction = async (plan: any) => {
    setQuickActionLoading(plan.id)
    if (plan.auto_logged_workout_id) {
      await supabase.from('exercises').delete().eq('workout_id', plan.auto_logged_workout_id)
      await supabase.from('workouts').delete().eq('id', plan.auto_logged_workout_id)
    }
    await supabase.from('workout_plans').update({
      status: 'pending',
      completed_at: null,
      auto_logged_workout_id: null,
    }).eq('id', plan.id)
    setQuickActionLoading(null)
    handlePlanUpdate()
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--background)' }}>
        <main style={{ maxWidth: '900px', margin: '0 auto', padding: '1.5rem 1rem 2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.75rem' }}>
            <Skeleton height={12} width="30%" />
            <Skeleton height={40} width="60%" />
            <Skeleton height={14} width="40%" />
          </div>
          <div style={{ marginBottom: '1.75rem' }}>
            <WorkoutCardSkeleton />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1.75rem' }}>
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <WorkoutCardSkeleton /><WorkoutCardSkeleton /><WorkoutCardSkeleton />
          </div>
        </main>
      </div>
    )
  }

  const firstName = profile?.name?.split(' ')[0] ?? 'Athlete'
  const shortDate = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'Asia/Manila' }).format(new Date())

  const weekStart = (() => {
    const now = new Date()
    const s = new Date(now)
    s.setDate(now.getDate() - now.getDay())
    return formatLocalDate(s)
  })()
  const thisWeekWorkouts = allWorkoutsList.filter(w => (w.date ?? w.created_at ?? '').slice(0, 10) >= weekStart)
  const thisWeekDuration = thisWeekWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0)

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--background)' }}>
      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '1.5rem 1rem 2rem' }}>

        {/* ── ADMIN: Pending approvals banner ── */}
        {userRole === 'admin' && pendingApprovals > 0 && (
          <Link href="/admin" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
            background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.4)',
            borderRadius: '0.75rem', padding: '1rem 1.25rem', marginBottom: '1.5rem',
            textDecoration: 'none', minHeight: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <AlertTriangle size={20} style={{ color: '#f59e0b' }} />
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.875rem', color: '#f59e0b' }}>
                  {pendingApprovals} account{pendingApprovals !== 1 ? 's' : ''} waiting for approval
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Tap to review in Admin Panel</p>
              </div>
            </div>
            <span style={{ color: '#f59e0b', fontSize: '1.25rem' }}>→</span>
          </Link>
        )}

        {/* ── ADMIN: Quick stats + Admin Panel link ── */}
        {userRole === 'admin' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <UserCheck size={24} style={{ color: 'var(--teal-secondary)' }} />
              <div>
                <p className="font-display" style={{ fontSize: '1.5rem', color: 'var(--teal-secondary)', lineHeight: 1 }}>{activeMembersCount}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Active Members</p>
              </div>
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <Calendar size={24} style={{ color: 'var(--teal-secondary)' }} />
              <div>
                <p className="font-display" style={{ fontSize: '1.5rem', color: 'var(--teal-secondary)', lineHeight: 1 }}>{classesTodayCount}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Classes Today</p>
              </div>
            </div>
            <Link href="/admin" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '3px solid var(--teal-primary)', borderRadius: '0.75rem', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', textDecoration: 'none', minHeight: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Settings size={20} style={{ color: 'var(--teal-secondary)' }} />
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>Go to Admin Panel</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Members, classes, groups & more</p>
                </div>
              </div>
              <span style={{ color: 'var(--teal-secondary)', fontSize: '1.25rem' }}>→</span>
            </Link>
          </div>
        )}

        {/* ── COACH: Athletes scheduled today / pending programs ── */}
        {userRole === 'coach' && (athletesScheduledToday || athletesPendingPrograms > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {athletesScheduledToday && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                <Users size={24} style={{ color: 'var(--teal-secondary)' }} />
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--teal-secondary)' }}>{athletesScheduledToday.count}</span>
                    <span style={{ color: 'var(--text-secondary)' }}> athlete{athletesScheduledToday.count === 1 ? '' : 's'} {athletesScheduledToday.count === 1 ? 'has' : 'have'} a workout scheduled today</span>
                  </p>
                </div>
              </div>
            )}
            {athletesPendingPrograms > 0 && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                <ClipboardList size={24} style={{ color: 'var(--teal-secondary)' }} />
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--teal-secondary)' }}>{athletesPendingPrograms}</span>
                    <span style={{ color: 'var(--text-secondary)' }}> athletes have pending programs</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── HEADER ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
          <div>
            <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Welcome back</p>
            <h1 className="font-display" style={{ fontSize: 'clamp(2.25rem, 6vw, 3.5rem)', letterSpacing: '0.03em', lineHeight: 1 }}>
              HEY, {firstName.toUpperCase()}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.35rem' }}>{shortDate}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }} className="header-actions">
            {userRole === 'coach' && (
              <Link href="/coach" className="btn-ghost md-show-flex" style={{ display: 'none', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                Coach Panel
              </Link>
            )}
            <Link href="/workouts/new" className="btn-primary md-show-flex" style={{ display: 'none', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
              Log Workout
            </Link>
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1.5rem', color: '#f87171', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {/* ── COACH NOTE ── */}
        {coachNote && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '3px solid var(--teal-primary)', borderRadius: '0.75rem', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--teal-secondary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <ClipboardList size={11} /> Note from Coach {coachNote.profiles?.name}
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>{coachNote.note}</p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              {new Date(coachNote.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        )}

        {/* ── MEMBER: Pending program banner ── */}
        {userRole === 'member' && hasPendingProgram && (
          <Link href="/student?tab=programs" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
            background: 'rgba(8,119,160,0.12)', border: '1px solid rgba(8,119,160,0.4)',
            borderRadius: '0.75rem', padding: '1rem 1.25rem', marginBottom: '1.5rem',
            textDecoration: 'none', minHeight: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <ClipboardList size={20} style={{ color: 'var(--teal-secondary)' }} />
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--teal-secondary)' }}>
                  You have programs for the week
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Tap to view your assigned programs</p>
              </div>
            </div>
            <span style={{ color: 'var(--teal-secondary)', fontSize: '1.25rem' }}>→</span>
          </Link>
        )}

        {/* ── SKIPPED PLANS ── */}
        {skippedPlans.length > 0 && (
          <section style={{ marginBottom: '1.75rem' }}>
            <SkippedPlansSection plans={skippedPlans} userId={userId} supabase={supabase} onUpdate={loadData} />
          </section>
        )}

        {/* ── UPCOMING PLANS ── */}
        {upcomingPlans.length > 0 && (
          <section style={{ marginBottom: '1.75rem' }}>
            <h2 className="font-display" style={{ fontSize: '1.5rem', letterSpacing: '0.03em', marginBottom: '0.875rem' }}>UPCOMING THIS WEEK</h2>
            <div className="snap-carousel">
              {upcomingPlans.map(p => {
                const tb = typeBadge(p.type)
                const isActing = quickActionLoading === p.id
                return (
                  <div key={p.id} className="card-vel" style={{ padding: '1rem', width: '200px' }}>
                    <p style={{ fontSize: '0.7rem', color: 'var(--teal-secondary)', fontWeight: 700, marginBottom: '0.25rem' }}>
                      {new Date(p.scheduled_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                    <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>{p.title}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
                      {(p.workout_plan_exercises as any[])?.[0]?.count ?? 0} exercises
                    </p>
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '999px', textTransform: 'uppercase' as const, background: tb.bg, color: tb.color, border: `1px solid ${tb.border}`, display: 'inline-block', marginBottom: '0.625rem' }}>
                      {p.type}
                    </span>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <button
                        onClick={() => handleQuickPlanAction(p, 'completed')}
                        disabled={isActing}
                        style={{ flex: 1, minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '0.5rem', padding: '0.3rem 0.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#4ade80', cursor: isActing ? 'not-allowed' : 'pointer' }}
                      >
                        <CheckCircle2 size={13} /> Done
                      </button>
                      <button
                        onClick={() => handleQuickPlanAction(p, 'skipped')}
                        disabled={isActing}
                        style={{ flex: 1, minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.3rem 0.25rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', cursor: isActing ? 'not-allowed' : 'pointer' }}
                      >
                        <SkipForward size={13} /> Skip
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── TODAY'S PLAN ── */}
        <section style={{ marginBottom: '1.75rem' }}>
          <h2 className="font-display" style={{ fontSize: '1.5rem', letterSpacing: '0.03em', marginBottom: '0.875rem', color: 'var(--teal-secondary)' }}>TODAY&apos;S PLAN</h2>
          {todayPlans.length === 0 && completedToday.length === 0 ? (
            <div className="card-vel" style={{ padding: '1.5rem', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Rest day — no plan assigned for today.</p>
              <Link href="/workouts/new" style={{ color: 'var(--teal-secondary)', textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem', display: 'inline', minHeight: 0 }}>
                Log your own session →
              </Link>
            </div>
          ) : (
            <>
              {todayPlans.map(plan => (
                <TodayPlanCard key={plan.id} plan={plan} onUpdate={handlePlanUpdate} />
              ))}
              {completedToday.map(plan => {
                const isActing = quickActionLoading === plan.id
                return (
                  <div key={plan.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1rem 1.25rem', marginBottom: '0.5rem', opacity: 0.6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}><CheckCircle2 size={14} /> {plan.title}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.7rem', color: '#22c55e' }}>Completed</span>
                        <button
                          onClick={() => handleUndoQuickPlanAction(plan)}
                          disabled={isActing}
                          style={{ background: 'none', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '0.375rem', padding: '0.3rem 0.6rem', fontSize: '0.7rem', fontWeight: 700, cursor: isActing ? 'not-allowed' : 'pointer', opacity: isActing ? 0.6 : 1, whiteSpace: 'nowrap', minHeight: 0 }}
                        >
                          {isActing ? 'Undoing…' : '↩ Undo'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </section>

        {/* ── TODAY'S CLASSES ── */}
        {todayClasses.length > 0 && (
          <section style={{ marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
              <h2 className="font-display" style={{ fontSize: '1.5rem', letterSpacing: '0.03em' }}>TODAY&apos;S CLASSES</h2>
              <Link href="/calendar" style={{ color: 'var(--teal-secondary)', textDecoration: 'none', fontSize: '0.8rem', minHeight: 0, display: 'inline' }}>View calendar →</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {todayClasses.map(cls => (
                <div
                  key={cls.id}
                  onClick={() => setSelectedClass(cls)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedClass(cls) } }}
                  className="card-interactive"
                  style={{ padding: '0.875rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', minHeight: '56px' }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cls.title}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Clock size={11} style={{ flexShrink: 0 }} /> {cls.start_time?.slice(0, 5)}{cls.end_time ? ` – ${cls.end_time?.slice(0, 5)}` : ''}
                      {cls.location ? <> · <MapPin size={11} style={{ flexShrink: 0 }} /> {cls.location}</> : ''}
                      {cls.profiles?.name ? ` · ${cls.profiles.name}` : ''}
                    </p>
                  </div>
                  <span style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', flexShrink: 0 }}>›</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── THIS WEEK ── */}
        <section style={{ marginBottom: '1.75rem' }}>
          <h2 className="font-display" style={{ fontSize: '1.5rem', letterSpacing: '0.03em', marginBottom: '0.875rem' }}>THIS WEEK</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
            <div className="card-vel" style={{ padding: '1rem', textAlign: 'center' }}>
              <p className="stat-number" style={{ color: 'var(--teal-secondary)' }}>{thisWeekWorkouts.length}</p>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Workouts</p>
            </div>
            <div className="card-vel" style={{ padding: '1rem', textAlign: 'center' }}>
              <p className="stat-number" style={{ color: 'var(--text-primary)' }}>{thisWeekDuration > 0 ? formatDuration(thisWeekDuration) : '—'}</p>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Time Trained</p>
            </div>
          </div>
        </section>

        {/* ── COACH: Classes I'm coaching ── */}
        {userRole === 'coach' && upcomingCoachClasses.length > 0 && (
          <section style={{ marginBottom: '1.75rem' }}>
            <h2 className="font-display" style={{ fontSize: '1.5rem', letterSpacing: '0.03em', marginBottom: '0.875rem' }}>CLASSES I&apos;M COACHING</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {upcomingCoachClasses.map(cls => (
                <div key={cls.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', minHeight: '56px' }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cls.title}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
                      <Calendar size={11} style={{ flexShrink: 0 }} /> {new Date(cls.scheduled_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      {' · '}<Clock size={11} style={{ flexShrink: 0 }} /> {cls.start_time?.slice(0, 5)}
                      {cls.groups?.name ? <> · <Users size={11} style={{ flexShrink: 0 }} /> {cls.groups.name}</> : ''}
                    </p>
                  </div>
                  <Link href="/coach" className="btn-ghost" style={{ fontSize: '0.75rem', padding: '0.4rem 0.875rem', minHeight: '36px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    Manage
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>

      {/* Class detail modal */}
      {selectedClass && (
        <ClassDetailModal
          cls={selectedClass}
          userId={userId || ''}
          userRole={profile?.role || 'member'}
          onClose={() => setSelectedClass(null)}
          onUpdate={() => { setSelectedClass(null); if (userId) loadAll(userId) }}
        />
      )}

      <style>{`
        @media (min-width: 768px) {
          .md-show-flex { display: inline-flex !important; }
        }
      `}</style>
    </div>
  )
}
