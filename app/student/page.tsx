'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronDown, ChevronUp, CheckCircle2, Check, Lock, Pencil, Trash2 } from 'lucide-react'
import { getLocalDateString, normalizeToKg, getCurrentWeekOccurrenceDate } from '@/lib/utils'
import { TodayPlanCard, SkippedPlansSection, typeBadge } from '@/components/PlanCards'
import AthleteProgramTable, { AthleteProgramDay } from '@/components/AthleteProgramTable'
import ConfirmModal from '@/components/ConfirmModal'

type Tab = 'plans' | 'prs' | 'metrics' | 'programs'

const cardStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '0.75rem',
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function CompletedPlansCollapse({ plans, onUndo, undoingId }: { plans: any[]; onUndo: (plan: any) => void; undoingId: string | null }) {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? plans : plans.slice(0, 3)

  return (
    <div style={{ marginTop: '0.75rem' }}>
      <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
        <CheckCircle2 size={12} /> Completed ({plans.length})
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        {visible.map(plan => (
          <div key={plan.id} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: '0.5rem', padding: '0.625rem 0.875rem',
            display: 'flex', alignItems: 'center', gap: '0.75rem', opacity: 0.7,
          }}>
            <Check size={14} style={{ color: '#4ade80', flexShrink: 0 }} strokeWidth={3} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontWeight: 600, fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{plan.title}</p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                {new Date(plan.scheduled_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <button
              onClick={() => onUndo(plan)}
              disabled={undoingId === plan.id}
              style={{ background: 'none', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '0.375rem', padding: '0.3rem 0.6rem', fontSize: '0.7rem', fontWeight: 700, cursor: undoingId === plan.id ? 'not-allowed' : 'pointer', opacity: undoingId === plan.id ? 0.6 : 1, whiteSpace: 'nowrap', flexShrink: 0, minHeight: 0 }}
            >
              {undoingId === plan.id ? 'Undoing…' : '↩ Undo'}
            </button>
          </div>
        ))}
      </div>
      {plans.length > 3 && (
        <button
          onClick={() => setShowAll(prev => !prev)}
          style={{
            background: 'none', border: 'none', color: 'var(--teal-secondary)',
            fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
            padding: '0.5rem 0', marginTop: '0.25rem', display: 'block',
          }}
        >
          {showAll ? '▲ Show less' : `▼ Show ${plans.length - 3} more completed`}
        </button>
      )}
    </div>
  )
}

export default function StudentPage() {
  return (
    <Suspense fallback={null}>
      <StudentPageInner />
    </Suspense>
  )
}

function StudentPageInner() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [profile, setProfile] = useState<any>(null)
  const [assignedPlans, setAssignedPlans] = useState<any[]>([])
  const [coach, setCoach] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<Tab>((searchParams.get('tab') as Tab) || 'programs')
  const [loading, setLoading] = useState(true)
  const [prs, setPRs] = useState<any[]>([])
  const [editingPRId, setEditingPRId] = useState<string | null>(null)
  const [editPRValue, setEditPRValue] = useState('')
  const [editPRUnit, setEditPRUnit] = useState('')
  const [prLoading, setPRLoading] = useState(false)
  const [bodyMetrics, setBodyMetrics] = useState<any[]>([])
  const [metricWeight, setMetricWeight] = useState('')
  const [metricUnit, setMetricUnit] = useState<'kg' | 'lbs'>('kg')
  const [metricSaving, setMetricSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [reschedulingId, setReschedulingId] = useState<string | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [loggingPlanId, setLoggingPlanId] = useState<string | null>(null)
  const [undoingId, setUndoingId] = useState<string | null>(null)
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null)
  const [planSortAsc, setPlanSortAsc] = useState(true)
  const [assignedPrograms, setAssignedPrograms] = useState<any[]>([])
  const [programCompletions, setProgramCompletions] = useState<any[]>([])
  const [completingDayId, setCompletingDayId] = useState<string | null>(null)
  const [programError, setProgramError] = useState('')
  const [deletePRConfirmId, setDeletePRConfirmId] = useState<string | null>(null)

  const reloadPlans = async (uid: string) => {
    const { data: plans } = await supabase
      .from('workout_plans')
      .select('*, workout_plan_exercises(*), profiles!workout_plans_coach_id_fkey(name)')
      .eq('member_id', uid)
      .order('scheduled_date', { ascending: false })
    setAssignedPlans(plans || [])
  }

  const handlePlanAction = async (planId: string, action: 'completed' | 'skipped') => {
    if (!userId) return
    setActionLoading(planId)
    if (action === 'completed') {
      await supabase.from('workout_plans').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', planId)
    } else {
      await supabase.from('workout_plans').update({ status: 'skipped' }).eq('id', planId)
    }
    await reloadPlans(userId)
    setActionLoading(null)
  }

  const handleReschedule = async (planId: string) => {
    if (!userId || !rescheduleDate) return
    setActionLoading(planId)
    await supabase.from('workout_plans').update({ status: 'pending', scheduled_date: rescheduleDate, rescheduled_date: rescheduleDate }).eq('id', planId)
    setReschedulingId(null)
    setRescheduleDate('')
    await reloadPlans(userId)
    setActionLoading(null)
  }

  const handleLogWorkoutFromPlan = async (plan: any) => {
    if (!userId) return

    const durationInput = window.prompt('Duration in minutes (optional):')
    const durationMinutes = durationInput && !isNaN(Number(durationInput)) && Number(durationInput) > 0
      ? Number(durationInput) : null

    setLoggingPlanId(plan.id)

    const { data: newWorkout } = await supabase.from('workouts').insert({
      user_id: userId,
      title: plan.title,
      type: plan.type,
      notes: `Auto-logged from assigned plan. ${plan.description || ''}`.trim(),
      duration: durationMinutes,
      date: new Date().toISOString(),
    }).select().single()

    const exercises: any[] = plan.workout_plan_exercises ?? []
    if (newWorkout && exercises.length > 0) {
      await supabase.from('exercises').insert(
        exercises
          .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
          .map((ex: any) => ({
            workout_id: newWorkout.id,
            name: ex.name, sets: ex.sets, reps: ex.reps,
            weight: ex.weight, duration: ex.duration,
            distance: ex.distance, notes: ex.notes,
          }))
      )
    }

    await supabase.from('workout_plans').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      auto_logged_workout_id: newWorkout?.id ?? null,
    }).eq('id', plan.id)

    setLoggingPlanId(null)
    if (newWorkout) router.push(`/workouts/${newWorkout.id}`)
  }

  const handleUndoCompletion = async (plan: any) => {
    if (!userId) return
    setUndoingId(plan.id)

    if (plan.auto_logged_workout_id) {
      await supabase.from('exercises').delete().eq('workout_id', plan.auto_logged_workout_id)
      await supabase.from('workouts').delete().eq('id', plan.auto_logged_workout_id)
    }

    await supabase.from('workout_plans').update({
      status: 'pending',
      completed_at: null,
      auto_logged_workout_id: null,
    }).eq('id', plan.id)

    await reloadPlans(userId)
    setUndoingId(null)
  }

  const loadProgramCompletions = async (programs: any[]) => {
    const dayIds = programs.flatMap((p: any) => (p.athlete_program_days ?? []).map((d: any) => d.id))
    if (dayIds.length === 0) { setProgramCompletions([]); return }
    const { data, error: err } = await supabase.from('athlete_program_completions').select('*').in('program_day_id', dayIds)
    if (err) { console.error('loadProgramCompletions failed:', err); setProgramError(err.message); return }
    setProgramCompletions(data ?? [])
  }

  const isDayDoneThisWeek = (day: AthleteProgramDay) =>
    programCompletions.some(c => c.program_day_id === day.id && c.occurrence_date === getCurrentWeekOccurrenceDate(day.day_of_week))

  const deriveWorkoutType = (day: AthleteProgramDay): string => {
    const types = (day.athlete_program_exercises ?? []).map(ex => ex.exercise_type).filter(Boolean)
    const hasBball = types.includes('Basketball')
    const hasOther = types.some(t => t && t !== 'Basketball')
    if (hasBball && hasOther) return 'both'
    if (hasBball) return 'basketball'
    return 'conditioning'
  }

  const handleMarkDayDone = async (day: AthleteProgramDay) => {
    if (!userId) return
    setProgramError('')
    setCompletingDayId(day.id)
    const occurrenceDate = getCurrentWeekOccurrenceDate(day.day_of_week)

    const { data: newWorkout, error: workoutErr } = await supabase.from('workouts').insert({
      user_id: userId,
      title: day.title,
      type: deriveWorkoutType(day),
      notes: `Auto-logged from assigned program.`,
      date: getLocalDateString(),
    }).select().single()
    if (workoutErr || !newWorkout) {
      console.error('handleMarkDayDone: workout insert failed:', workoutErr)
      setProgramError(workoutErr?.message ?? 'Failed to log workout for this day.')
      setCompletingDayId(null)
      return
    }

    const exercises = day.athlete_program_exercises ?? []
    if (exercises.length > 0) {
      const { error: exErr } = await supabase.from('exercises').insert(
        exercises.map(ex => ({
          workout_id: newWorkout.id,
          name: ex.name, sets: ex.sets, reps: ex.reps, weight: ex.weight, notes: ex.notes,
        }))
      )
      if (exErr) {
        console.error('handleMarkDayDone: exercises insert failed:', exErr)
        await supabase.from('workouts').delete().eq('id', newWorkout.id)
        setProgramError(exErr.message)
        setCompletingDayId(null)
        return
      }
    }

    const { data: completion, error: compErr } = await supabase.from('athlete_program_completions').insert({
      program_day_id: day.id,
      occurrence_date: occurrenceDate,
      auto_logged_workout_id: newWorkout.id,
    }).select().single()
    if (compErr || !completion) {
      console.error('handleMarkDayDone: completion insert failed:', compErr)
      await supabase.from('exercises').delete().eq('workout_id', newWorkout.id)
      await supabase.from('workouts').delete().eq('id', newWorkout.id)
      setProgramError(compErr?.message ?? 'Failed to record completion for this day.')
      setCompletingDayId(null)
      return
    }

    setProgramCompletions(prev => [...prev, completion])
    setCompletingDayId(null)
  }

  const handleUndoDayDone = async (day: AthleteProgramDay) => {
    const occurrenceDate = getCurrentWeekOccurrenceDate(day.day_of_week)
    const completion = programCompletions.find(c => c.program_day_id === day.id && c.occurrence_date === occurrenceDate)
    if (!completion) return
    setProgramError('')
    setCompletingDayId(day.id)

    if (completion.auto_logged_workout_id) {
      const { error: exErr } = await supabase.from('exercises').delete().eq('workout_id', completion.auto_logged_workout_id)
      if (exErr) { console.error('handleUndoDayDone: exercises delete failed:', exErr); setProgramError(exErr.message); setCompletingDayId(null); return }
      const { error: woErr } = await supabase.from('workouts').delete().eq('id', completion.auto_logged_workout_id)
      if (woErr) { console.error('handleUndoDayDone: workout delete failed:', woErr); setProgramError(woErr.message); setCompletingDayId(null); return }
    }

    const { error: compErr } = await supabase.from('athlete_program_completions').delete().eq('id', completion.id)
    if (compErr) { console.error('handleUndoDayDone: completion delete failed:', compErr); setProgramError(compErr.message); setCompletingDayId(null); return }

    setProgramCompletions(prev => prev.filter(c => c.id !== completion.id))
    setCompletingDayId(null)
  }

  const handleDeletePR = async (prId: string) => {
    setPRLoading(true)
    await supabase.from('personal_records').delete().eq('id', prId)
    const { data } = await supabase.from('personal_records').select('*').eq('user_id', profile?.id).order('value', { ascending: false })
    setPRs(data || [])
    setPRLoading(false)
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)

      const { data: membership } = await supabase
        .from('group_members')
        .select('*, groups(*, profiles!groups_coach_id_fkey(name))')
        .eq('member_id', user.id)
        .limit(1)
        .maybeSingle()
      if (membership?.groups?.profiles) {
        setCoach(membership.groups.profiles)
      } else {
        // Not in a group — fall back to coach_students, the authoritative "who's my coach" link
        // for students a coach added directly (e.g. via My Students > + Add Student) without a group.
        const { data: coachLink } = await supabase
          .from('coach_students')
          .select('coach_id')
          .eq('member_id', user.id)
          .limit(1)
          .maybeSingle()
        if (coachLink?.coach_id) {
          const { data: coachProfile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', coachLink.coach_id)
            .maybeSingle()
          if (coachProfile) setCoach(coachProfile)
        }
      }

      const { data: plans } = await supabase
        .from('workout_plans')
        .select('*, workout_plan_exercises(*), profiles!workout_plans_coach_id_fkey(name)')
        .eq('member_id', user.id)
        .order('scheduled_date', { ascending: false })

      // Client-side catch-up only — a plan won't flip to 'skipped' until the member or their coach next opens /student or /dashboard, not on a schedule.
      const today = getLocalDateString()
      const overdueIds = (plans ?? []).filter((p: any) => (p.status === 'pending' || p.status === 'rescheduled') && p.scheduled_date < today).map((p: any) => p.id)
      let finalPlans = plans ?? []
      if (overdueIds.length > 0) {
        await supabase.from('workout_plans').update({ status: 'skipped' }).in('id', overdueIds)
        finalPlans = finalPlans.map((p: any) => overdueIds.includes(p.id) ? { ...p, status: 'skipped' } : p)
      }
      setAssignedPlans(finalPlans)

      setUserId(user.id)

      // PRs
      const { data: prData } = await supabase
        .from('personal_records')
        .select('*')
        .eq('user_id', user.id)
        .order('value', { ascending: false })
      setPRs(prData || [])

      // Body metrics
      const { data: metrics } = await supabase.from('body_measurements').select('*').eq('user_id', user.id).order('recorded_at', { ascending: false }).limit(30)
      setBodyMetrics(metrics || [])

      // Assigned program (RLS scopes athlete_programs/athlete_program_days/athlete_program_exercises to this member)
      const { data: programs } = await supabase
        .from('athlete_programs')
        .select('*, coach:profiles!coach_id(name), athlete_program_days(*, athlete_program_exercises(*))')
        .eq('member_id', user.id)
      setAssignedPrograms(programs ?? [])
      await loadProgramCompletions(programs ?? [])

      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pendingPlans = assignedPlans.filter(p => p.status === 'pending' || p.status === 'rescheduled')
  const completedPlans = assignedPlans.filter(p => p.status === 'completed')
  const skippedPlans = assignedPlans.filter(p => p.status === 'skipped')
  const todayPlans = pendingPlans.filter(p => p.scheduled_date === getLocalDateString())
  const nextPlan = [...pendingPlans].sort((a, b) => String(a.scheduled_date).localeCompare(String(b.scheduled_date)))[0]
  const sortedPendingPlans = [...pendingPlans].sort((a, b) =>
    planSortAsc
      ? String(a.scheduled_date).localeCompare(String(b.scheduled_date))
      : String(b.scheduled_date).localeCompare(String(a.scheduled_date))
  )
  const pendingProgramDays = assignedPrograms
    .flatMap(p => p.athlete_program_days ?? [])
    .filter(d => !isDayDoneThisWeek(d))
  const firstName = profile?.name?.split(' ')[0] ?? 'Athlete'

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
        <div style={{ maxWidth: '980px', margin: '0 auto', padding: '2rem 1rem' }}>
          <div className="skeleton" style={{ height: 140, marginBottom: '1rem' }} />
          <div className="skeleton" style={{ height: 90, marginBottom: '1rem' }} />
          <div className="skeleton" style={{ height: 220 }} />
        </div>
      </div>
    )
  }

  const tabs: { value: Tab; label: string }[] = [
    { value: 'programs', label: 'Programs' },
    { value: 'plans', label: 'Assigned Plans' },
    { value: 'prs', label: 'My PRs' },
    { value: 'metrics', label: 'Body Metrics' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      <main style={{ maxWidth: '980px', margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <p style={{ color: 'var(--teal-secondary)', fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Athlete Panel</p>
            <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: 'clamp(2rem, 6vw, 3rem)', letterSpacing: '0.03em' }}>{firstName.toUpperCase()}&apos;S TRAINING</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Your assignments, attendance, progress, and coach context in one place.
            </p>
          </div>
          <Link href="/dashboard" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '0.625rem 1rem', borderRadius: '0.5rem', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
            Dashboard
          </Link>
        </div>

        <div className="athlete-overview" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ ...cardStyle, padding: '1.25rem' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>Coach Context</p>
            <p style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{coach?.name ?? 'No coach assigned'}</p>
            {!coach && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.5 }}>Join a group or ask an admin to assign your coach.</p>
            )}
            {nextPlan && todayPlans.length === 0 && (
              <p style={{ color: 'var(--teal-secondary)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                Next: {nextPlan.title} on {formatDate(nextPlan.scheduled_date)}
              </p>
            )}
            <div style={{ height: 1, background: 'var(--border)', margin: '1rem 0' }} />
            <p style={{ color: skippedPlans.length > 0 ? '#ef4444' : 'var(--text-secondary)', fontSize: '0.8rem' }}>
              {skippedPlans.length > 0 ? `${skippedPlans.length} missed plan${skippedPlans.length === 1 ? '' : 's'} to revisit.` : 'No missed plans waiting.'}
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Pending', value: pendingPlans.length + pendingProgramDays.length, color: '#f59e0b' },
            { label: 'Completed', value: completedPlans.length + programCompletions.length, color: '#4ade80' },
          ].map(s => (
            <div key={s.label} style={{ ...cardStyle, padding: '1.1rem', textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-bebas)', fontSize: '2.25rem', color: s.color, lineHeight: 1 }}>{s.value}</p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {todayPlans.length > 0 && (
          <div style={{ background: 'rgba(8,119,160,0.08)', border: '2px solid var(--teal-primary)', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--teal-secondary)', marginBottom: '0.5rem' }}>Today&apos;s Assignment</p>
            {todayPlans.map(plan => {
              const isLogging = loggingPlanId === plan.id
              return (
                <div key={plan.id}>
                  <h3 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', letterSpacing: '0.03em', marginBottom: '0.25rem' }}>{plan.title}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    From Coach {plan.profiles?.name ?? 'Coach'} - {plan.workout_plan_exercises?.length || 0} exercises
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Link href="/dashboard" style={{ background: 'var(--teal-primary)', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.5rem', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 700 }}>
                      View on Dashboard
                    </Link>
                    <button
                      onClick={() => handleLogWorkoutFromPlan(plan)}
                      disabled={isLogging}
                      style={{ background: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--teal-primary)', borderRadius: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 700, cursor: isLogging ? 'not-allowed' : 'pointer', opacity: isLogging ? 0.7 : 1 }}
                    >
                      {isLogging ? 'Logging…' : 'Log Workout'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1.5rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', paddingBottom: '2px' }}>
          {tabs.map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              style={{
                padding: '0.625rem 1rem',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                border: 'none',
                minHeight: 0,
                background: activeTab === tab.value ? 'var(--teal-primary)' : 'var(--surface)',
                color: activeTab === tab.value ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'plans' && (
          <div>
            {skippedPlans.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <SkippedPlansSection
                  plans={skippedPlans}
                  userId={userId}
                  supabase={supabase}
                  onUpdate={async () => {
                    if (!userId) return
                    await reloadPlans(userId)
                  }}
                />
              </div>
            )}
            {pendingPlans.length === 0 && completedPlans.length === 0 ? (
              <div style={{ ...cardStyle, padding: '3rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No workout plans assigned yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {pendingPlans.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>Upcoming / Pending</p>
                    <button
                      onClick={() => setPlanSortAsc(prev => !prev)}
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.375rem', padding: '0.3rem 0.625rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap', minHeight: 0 }}
                    >
                      Sort: Date {planSortAsc ? '↑' : '↓'}
                    </button>
                  </div>
                )}
                {sortedPendingPlans.map(plan => {
                  const isExpandedOnMobile = expandedPlanId === plan.id
                  const tb = typeBadge(plan.type)
                  return (
                    <div key={plan.id}>
                      <div
                        className="plan-collapsed-row"
                        onClick={() => setExpandedPlanId(prev => prev === plan.id ? null : plan.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedPlanId(prev => prev === plan.id ? null : plan.id) } }}
                        style={{
                          ...(isExpandedOnMobile ? { display: 'none' } : {}),
                          alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
                          background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '3px solid var(--teal-primary)',
                          borderRadius: '0.75rem', padding: '0.875rem 1rem', cursor: 'pointer', marginBottom: '0.75rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', minWidth: 0, flex: 1 }}>
                          <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '999px', textTransform: 'uppercase' as const, background: tb.bg, color: tb.color, border: `1px solid ${tb.border}`, flexShrink: 0 }}>
                            {plan.type}
                          </span>
                          <p style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{plan.title}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{formatDate(plan.scheduled_date)}</span>
                          <ChevronDown size={16} style={{ color: 'var(--text-secondary)' }} />
                        </div>
                      </div>

                      <div className="plan-full-card" style={isExpandedOnMobile ? { display: 'block' } : {}}>
                        {isExpandedOnMobile && (
                          <button
                            onClick={() => setExpandedPlanId(null)}
                            className="plan-collapse-btn"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.75rem', cursor: 'pointer', padding: '0 0 0.5rem', minHeight: 0 }}
                          >
                            <ChevronUp size={14} /> Collapse
                          </button>
                        )}
                        <TodayPlanCard
                          plan={plan}
                          onUpdate={async () => {
                            if (!userId) return
                            await reloadPlans(userId)
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
                {completedPlans.length > 0 && (
                  <CompletedPlansCollapse plans={completedPlans} onUndo={handleUndoCompletion} undoingId={undoingId} />
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'prs' && (
          <div key="tab-prs">
            {prs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                <p style={{ fontSize: '0.875rem' }}>No personal records yet.</p>
              </div>
            ) : (
              Object.entries(
                prs.reduce((acc: any, pr: any) => {
                  if (!acc[pr.exercise_name]) acc[pr.exercise_name] = []
                  acc[pr.exercise_name].push(pr)
                  return acc
                }, {})
              ).map(([exercise, records]: [string, any]) => {
                const sorted = [...records].sort((a, b) => b.value - a.value)
                const best = sorted[0]
                return (
                  <div key={exercise} style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: '0.75rem', overflow: 'hidden', marginBottom: '0.75rem',
                  }}>
                    {/* Best PR header */}
                    <div style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>{exercise}</p>
                        <p style={{ fontSize: '0.7rem', color: 'var(--teal-secondary)', marginTop: '0.15rem' }}>
                          Personal Best · {new Date(best.recorded_at || best.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.75rem', letterSpacing: '0.03em', color: 'var(--teal-secondary)', lineHeight: 1 }}>{best.value}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{best.unit}</p>
                      </div>
                    </div>

                    {/* All attempts */}
                    <div style={{ borderTop: '1px solid var(--border)' }}>
                      {sorted.map(pr => (
                        <div key={pr.id} style={{ padding: '0.625rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                          {editingPRId === pr.id ? (
                            // Edit mode
                            <div style={{ display: 'flex', gap: '0.5rem', flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                              <input
                                type="number"
                                value={editPRValue}
                                onChange={e => setEditPRValue(e.target.value)}
                                style={{ width: '80px', background: '#0d1a1e', border: '1px solid #1a2e34', borderRadius: '0.375rem', padding: '0.375rem 0.5rem', color: '#F2F2F2', fontSize: '0.875rem', outline: 'none' }}
                                min="0"
                                step="0.01"
                              />
                              <select
                                value={editPRUnit}
                                onChange={e => setEditPRUnit(e.target.value)}
                                style={{ background: '#0d1a1e', border: '1px solid #1a2e34', borderRadius: '0.375rem', padding: '0.375rem 0.5rem', color: '#F2F2F2', fontSize: '0.875rem', outline: 'none', cursor: 'pointer' }}
                              >
                                {['kg', 'lbs', 'reps', 'seconds', 'minutes', 'km/h', 'mph'].map(u => (
                                  <option key={u} value={u}>{u}</option>
                                ))}
                              </select>
                              <button
                                onClick={async () => {
                                  setPRLoading(true)
                                  await supabase.from('personal_records').update({
                                    value: Number(editPRValue),
                                    unit: editPRUnit,
                                  }).eq('id', pr.id)
                                  const { data } = await supabase.from('personal_records').select('*').eq('user_id', profile?.id).order('value', { ascending: false })
                                  setPRs(data || [])
                                  setEditingPRId(null)
                                  setPRLoading(false)
                                }}
                                disabled={prLoading}
                                style={{ background: 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.375rem', padding: '0.375rem 0.75rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', minHeight: 0 }}
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingPRId(null)}
                                style={{ background: 'none', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '0.375rem', padding: '0.375rem 0.5rem', fontSize: '0.8rem', cursor: 'pointer', minHeight: 0 }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            // View mode
                            <>
                              <div>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                  {new Date(pr.recorded_at || pr.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  {!pr.is_public && <Lock size={11} style={{ marginLeft: '0.5rem', display: 'inline', verticalAlign: '-1px' }} />}
                                </p>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                                <p style={{ fontWeight: 700, color: pr === best ? 'var(--teal-secondary)' : 'var(--text-primary)', fontSize: '0.9rem' }}>
                                  {pr.value} {pr.unit}
                                </p>
                                {/* Edit button */}
                                <button
                                  onClick={() => { setEditingPRId(pr.id); setEditPRValue(String(pr.value)); setEditPRUnit(pr.unit) }}
                                  style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '0.375rem', padding: '0.25rem 0.5rem', color: 'var(--text-secondary)', fontSize: '0.7rem', cursor: 'pointer', minHeight: 0 }}
                                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--teal-primary)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--teal-secondary)' }}
                                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)' }}
                                >
                                  <Pencil size={12} />
                                </button>
                                {/* Delete button */}
                                <button
                                  onClick={() => setDeletePRConfirmId(pr.id)}
                                  style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '0.375rem', padding: '0.25rem 0.5rem', color: 'var(--text-secondary)', fontSize: '0.7rem', cursor: 'pointer', minHeight: 0 }}
                                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#ef4444'; (e.currentTarget as HTMLButtonElement).style.color = '#ef4444' }}
                                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)' }}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {activeTab === 'metrics' && (
          <div key="tab-metrics">
            {/* Log weight form */}
            <div style={{ ...cardStyle, padding: '1.25rem', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.25rem', letterSpacing: '0.03em', marginBottom: '1rem' }}>LOG BODY WEIGHT</h2>
              <form
                onSubmit={async e => {
                  e.preventDefault()
                  if (!metricWeight || !userId) return
                  setMetricSaving(true)
                  await supabase.from('body_measurements').insert({
                    user_id: userId,
                    weight_kg: normalizeToKg(parseFloat(metricWeight), metricUnit),
                  })
                  const { data } = await supabase.from('body_measurements').select('*').eq('user_id', userId).order('recorded_at', { ascending: false }).limit(30)
                  setBodyMetrics(data || [])
                  setMetricWeight('')
                  setMetricSaving(false)
                }}
                style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}
              >
                <div style={{ flex: 1, minWidth: '120px' }}>
                  <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '0.375rem' }}>
                    Weight
                  </label>
                  <input
                    type="number" value={metricWeight} onChange={e => setMetricWeight(e.target.value)}
                    required min="20" max="300" step="0.1" placeholder="e.g. 75"
                    style={{ background: '#0d1a1e', border: '1px solid #1a2e34', borderRadius: '0.5rem', padding: '0.6rem 0.875rem', color: 'var(--text-primary)', fontSize: '1rem', outline: 'none', width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '0.375rem' }}>
                    Unit
                  </label>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {(['kg', 'lbs'] as const).map(u => (
                      <button key={u} type="button" onClick={() => setMetricUnit(u)} style={{
                        background: metricUnit === u ? 'rgba(8,119,160,0.2)' : '#0d1a1e',
                        border: `1px solid ${metricUnit === u ? 'var(--teal-primary)' : '#1a2e34'}`,
                        borderRadius: '0.375rem', padding: '0.6rem 0.875rem',
                        color: metricUnit === u ? 'var(--teal-secondary)' : 'var(--text-secondary)',
                        fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', minHeight: 0,
                      }}>{u}</button>
                    ))}
                  </div>
                </div>
                <button type="submit" disabled={metricSaving} style={{ background: metricSaving ? '#0d1a1e' : 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.6rem 1.25rem', fontWeight: 700, fontSize: '0.875rem', cursor: metricSaving ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
                  {metricSaving ? 'Saving…' : 'Log Weight'}
                </button>
              </form>
            </div>

            {/* Weight chart */}
            {bodyMetrics.length > 0 && (() => {
              const reversed = [...bodyMetrics].reverse()
              const weights = reversed.map(m => m.weight_kg)
              const minW = Math.min(...weights) - 2
              const maxW = Math.max(...weights) + 2
              const range = maxW - minW || 1
              const pts = weights.map((w, i) => ({
                x: (i / Math.max(weights.length - 1, 1)) * 100,
                y: 100 - ((w - minW) / range) * 100,
              }))

              return (
                <div style={{ ...cardStyle, padding: '1.25rem', marginBottom: '1.5rem' }}>
                  <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    Weight Over Time (kg)
                  </p>
                  <div style={{ position: 'relative', height: '120px', overflow: 'hidden' }}>
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                      {/* Grid lines */}
                      {[25, 50, 75].map(y => (
                        <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="var(--border)" strokeWidth="0.5" />
                      ))}
                      {/* Line */}
                      {pts.length > 1 && (
                        <polyline
                          points={pts.map(p => `${p.x},${p.y}`).join(' ')}
                          fill="none"
                          stroke="var(--teal-primary)"
                          strokeWidth="1.5"
                          strokeLinejoin="round"
                        />
                      )}
                      {/* Dots */}
                      {pts.map((p, i) => (
                        <circle key={i} cx={p.x} cy={p.y} r="2" fill="var(--teal-secondary)" />
                      ))}
                    </svg>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.375rem', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                    <span>{new Date(reversed[0]?.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    <span>{minW.toFixed(1)} – {maxW.toFixed(1)} kg</span>
                    <span>{new Date(reversed[reversed.length - 1]?.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
              )
            })()}

            {/* Metrics history */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {bodyMetrics.map(m => (
                <div key={m.id} style={{ ...cardStyle, padding: '0.75rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontSize: '0.875rem' }}>
                    {new Date(m.recorded_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.25rem', color: 'var(--teal-secondary)' }}>
                    {m.weight_kg} <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>kg</span>
                  </p>
                </div>
              ))}
            </div>

            {bodyMetrics.length === 0 && (
              <div style={{ ...cardStyle, padding: '3rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No body metrics logged yet. Log your weight above.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'programs' && (
          <div key="tab-programs">
            {programError && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', color: '#f87171', fontSize: '0.875rem' }}>{programError}</div>}

            {assignedPrograms.length === 0 ? (
              <div style={{ ...cardStyle, padding: '3rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No program assigned yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {assignedPrograms.map(program => (
                  <div key={program.id} style={{ ...cardStyle, padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', letterSpacing: '0.03em' }}>
                        {program.coach?.name ? `${program.coach.name}'s Program` : 'My Program'}
                      </h2>
                    </div>
                    <div style={{ marginTop: '1rem' }}>
                      <AthleteProgramTable
                        days={program.athlete_program_days ?? []}
                        showCompletion
                        isDayDone={isDayDoneThisWeek}
                        onMarkDone={handleMarkDayDone}
                        onUndoDone={handleUndoDayDone}
                        completingDayId={completingDayId}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      <style>{`
        @media (max-width: 760px) {
          .athlete-overview { grid-template-columns: 1fr !important; }
        }
        .plan-collapsed-row { display: flex; }
        .plan-full-card { display: none; }
        @media (min-width: 641px) {
          .plan-collapsed-row { display: none !important; }
          .plan-full-card { display: block !important; }
          .plan-collapse-btn { display: none !important; }
        }
      `}</style>
      {deletePRConfirmId && (
        <ConfirmModal
          title="Delete PR"
          message="Delete this PR entry?"
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={() => { const id = deletePRConfirmId; setDeletePRConfirmId(null); handleDeletePR(id) }}
          onCancel={() => setDeletePRConfirmId(null)}
        />
      )}
    </div>
  )
}
