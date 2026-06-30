'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getLocalDateString } from '@/lib/utils'

type Tab = 'plans' | 'prs' | 'schedule' | 'progress' | 'attendance' | 'metrics'

const cardStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '0.75rem',
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function StudentPage() {
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [assignedPlans, setAssignedPlans] = useState<any[]>([])
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([])
  const [workoutHistory, setWorkoutHistory] = useState<any[]>([])
  const [coach, setCoach] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<Tab>('plans')
  const [loading, setLoading] = useState(true)
  const [allMyPRs, setAllMyPRs] = useState<any[]>([])
  const [upcomingClasses, setUpcomingClasses] = useState<any[]>([])
  const [bodyMetrics, setBodyMetrics] = useState<any[]>([])
  const [metricWeight, setMetricWeight] = useState('')
  const [metricUnit, setMetricUnit] = useState<'kg' | 'lbs'>('kg')
  const [metricSaving, setMetricSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [groupIds, setGroupIds] = useState<string[]>([])
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [reschedulingId, setReschedulingId] = useState<string | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [loggingPlanId, setLoggingPlanId] = useState<string | null>(null)
  const [undoingId, setUndoingId] = useState<string | null>(null)

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
    setLoggingPlanId(plan.id)

    const { data: newWorkout } = await supabase.from('workouts').insert({
      user_id: userId,
      title: plan.title,
      type: plan.type,
      notes: `Auto-logged from assigned plan. ${plan.description || ''}`.trim(),
      duration: null,
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

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)

      const { data: membership } = await supabase
        .from('group_members')
        .select('*, groups(*, profiles!groups_coach_id_fkey(name, email))')
        .eq('member_id', user.id)
        .limit(1)
        .maybeSingle()
      if (membership?.groups?.profiles) setCoach(membership.groups.profiles)

      const { data: plans } = await supabase
        .from('workout_plans')
        .select('*, workout_plan_exercises(*), profiles!workout_plans_coach_id_fkey(name)')
        .eq('member_id', user.id)
        .order('scheduled_date', { ascending: false })
      setAssignedPlans(plans || [])

      const { data: workouts } = await supabase
        .from('workouts')
        .select('id, title, type, date, duration')
        .eq('user_id', user.id)
        .order('date', { ascending: true })
        .limit(30)
      setWorkoutHistory(workouts || [])

      const { data: attendance } = await supabase
        .from('class_attendees')
        .select('*, scheduled_classes(title, scheduled_date, type, start_time, profiles!scheduled_classes_coach_id_fkey(name))')
        .eq('member_id', user.id)
        .order('id', { ascending: false })
      setAttendanceHistory(attendance || [])

      setUserId(user.id)

      // PRs
      const { data: prs } = await supabase.from('personal_records').select('*').eq('user_id', user.id).order('recorded_at', { ascending: false })
      setAllMyPRs(prs || [])

      // Group IDs for class schedule
      const { data: memberships } = await supabase.from('group_members').select('group_id').eq('member_id', user.id)
      const gIds = (memberships || []).map((m: any) => m.group_id)
      setGroupIds(gIds)

      // Upcoming classes (next 14 days) for member's groups
      if (gIds.length > 0) {
        const today = getLocalDateString()
        const in14 = new Date(); in14.setDate(in14.getDate() + 14)
        const in14Str = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(in14)
        const { data: classes } = await supabase
          .from('scheduled_classes')
          .select('*, groups(name), profiles!scheduled_classes_coach_id_fkey(name), class_attendees(id, member_id, status)')
          .in('group_id', gIds)
          .gte('scheduled_date', today)
          .lte('scheduled_date', in14Str)
          .order('scheduled_date').order('start_time')
        setUpcomingClasses(classes || [])
      }

      // Body metrics
      const { data: metrics } = await supabase.from('body_metrics').select('*').eq('user_id', user.id).order('recorded_at', { ascending: false }).limit(30)
      setBodyMetrics(metrics || [])

      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pendingPlans = assignedPlans.filter(p => p.status === 'pending')
  const completedPlans = assignedPlans.filter(p => p.status === 'completed')
  const skippedPlans = assignedPlans.filter(p => p.status === 'skipped')
  const todayPlans = pendingPlans.filter(p => p.scheduled_date === getLocalDateString())
  const nextPlan = [...pendingPlans].sort((a, b) => String(a.scheduled_date).localeCompare(String(b.scheduled_date)))[0]
  const attendedCount = attendanceHistory.filter(a => a.status === 'attended').length
  const attendanceRate = attendanceHistory.length > 0 ? Math.round((attendedCount / attendanceHistory.length) * 100) : 0
  const planCompletionRate = assignedPlans.length > 0 ? Math.round((completedPlans.length / assignedPlans.length) * 100) : 0
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
    { value: 'plans', label: 'Assigned Plans' },
    { value: 'prs', label: 'My PRs' },
    { value: 'schedule', label: 'Class Schedule' },
    { value: 'progress', label: 'Progress' },
    { value: 'attendance', label: 'Attendance' },
    { value: 'metrics', label: 'Body Metrics' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      <main style={{ maxWidth: '980px', margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <p style={{ color: 'var(--teal-secondary)', fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Student Panel</p>
            <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: 'clamp(2rem, 6vw, 3rem)', letterSpacing: '0.03em' }}>{firstName.toUpperCase()} TRAINING</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Your assignments, attendance, progress, and coach context in one place.
            </p>
          </div>
          <Link href="/dashboard" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '0.625rem 1rem', borderRadius: '0.5rem', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
            Dashboard
          </Link>
        </div>

        <div className="student-overview" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(240px, 0.8fr)', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ ...cardStyle, padding: '1.25rem' }}>
            <p style={{ color: 'var(--teal-secondary)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Upcoming Workouts</p>
            <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.75rem', letterSpacing: '0.03em', marginBottom: '0.25rem' }}>
              {todayPlans.length > 0 ? todayPlans[0].title : nextPlan ? nextPlan.title : 'No assigned plan'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.5, marginBottom: '1rem' }}>
              {todayPlans.length > 0
                ? `${todayPlans.length} plan${todayPlans.length === 1 ? '' : 's'} scheduled for today.`
                : nextPlan
                ? `Next scheduled for ${formatDate(nextPlan.scheduled_date)}.`
                : 'You are clear right now. Log an independent workout or check back after your coach assigns a plan.'}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {(() => {
                const actionPlan = todayPlans.length > 0 ? todayPlans[0] : nextPlan
                const isLogging = actionPlan && loggingPlanId === actionPlan.id
                return actionPlan ? (
                  <button
                    onClick={() => handleLogWorkoutFromPlan(actionPlan)}
                    disabled={isLogging}
                    style={{ background: 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.625rem 0.875rem', fontSize: '0.875rem', fontWeight: 700, cursor: isLogging ? 'not-allowed' : 'pointer', opacity: isLogging ? 0.7 : 1 }}
                  >
                    {isLogging ? 'Logging…' : 'Log Workout'}
                  </button>
                ) : (
                  <Link href="/workouts/new" style={{ background: 'var(--teal-primary)', color: 'white', borderRadius: '0.5rem', padding: '0.625rem 0.875rem', fontSize: '0.875rem', fontWeight: 700, textDecoration: 'none' }}>Log Workout</Link>
                )
              })()}
            </div>
          </div>

          <div style={{ ...cardStyle, padding: '1.25rem' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>Coach Context</p>
            <p style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{coach?.name ?? 'No coach assigned'}</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.5 }}>{coach?.email ?? 'Join a group or ask an admin to assign your coach.'}</p>
            <div style={{ height: 1, background: 'var(--border)', margin: '1rem 0' }} />
            <p style={{ color: skippedPlans.length > 0 ? '#f59e0b' : 'var(--text-secondary)', fontSize: '0.8rem' }}>
              {skippedPlans.length > 0 ? `${skippedPlans.length} skipped plan${skippedPlans.length === 1 ? '' : 's'} to revisit.` : 'No skipped plans waiting.'}
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Pending Plans', value: pendingPlans.length, color: '#f59e0b' },
            { label: 'Completed', value: completedPlans.length, color: '#4ade80' },
            { label: 'Completion Rate', value: `${planCompletionRate}%`, color: 'var(--teal-secondary)' },
            { label: 'Attendance Rate', value: `${attendanceRate}%`, color: '#60a5fa' },
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
            {todayPlans.map(plan => (
              <div key={plan.id}>
                <h3 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', letterSpacing: '0.03em', marginBottom: '0.25rem' }}>{plan.title}</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  From Coach {plan.profiles?.name ?? 'Coach'} - {plan.workout_plan_exercises?.length || 0} exercises
                </p>
                <Link href="/dashboard" style={{ background: 'var(--teal-primary)', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.5rem', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 700 }}>
                  View on Dashboard
                </Link>
              </div>
            ))}
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
            {pendingPlans.length === 0 && completedPlans.length === 0 ? (
              <div style={{ ...cardStyle, padding: '3rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No workout plans assigned yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {pendingPlans.length > 0 && <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>Upcoming / Pending</p>}
                {pendingPlans.map(plan => {
                  const isActing = actionLoading === plan.id
                  return (
                    <div key={plan.id} style={{ ...cardStyle, padding: '1.25rem', borderLeft: '3px solid var(--teal-primary)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>{plan.title}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                            {formatDate(plan.scheduled_date)} · Coach {plan.profiles?.name ?? 'Coach'}
                          </p>
                        </div>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '999px', textTransform: 'uppercase', background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' }}>{plan.type}</span>
                      </div>
                      {plan.workout_plan_exercises?.length > 0 && (
                        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          {plan.workout_plan_exercises.sort((a: any, b: any) => a.order_index - b.order_index).map((ex: any) => (
                            <div key={ex.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '0.375rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.8rem' }}>
                              <span style={{ fontWeight: 600 }}>{ex.name}</span>
                              <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textAlign: 'right' }}>
                                {ex.sets && ex.reps ? `${ex.sets}x${ex.reps}` : ''}{ex.weight ? ` - ${ex.weight}kg` : ''}{ex.duration ? ` - ${ex.duration}min` : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {reschedulingId === plan.id && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                          <input
                            type="date"
                            value={rescheduleDate}
                            onChange={e => setRescheduleDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            style={{ flex: 1, minWidth: '130px', background: '#0d1a1e', border: '1px solid #1a2e34', borderRadius: '0.375rem', padding: '0.4rem 0.625rem', color: '#F2F2F2', fontSize: '0.875rem', outline: 'none' }}
                          />
                          <button onClick={() => handleReschedule(plan.id)} disabled={!rescheduleDate || isActing} style={{ background: 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.375rem', padding: '0.4rem 0.75rem', fontSize: '0.8rem', fontWeight: 700, cursor: rescheduleDate ? 'pointer' : 'not-allowed', minHeight: 0 }}>Confirm</button>
                          <button onClick={() => { setReschedulingId(null); setRescheduleDate('') }} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '0.375rem', padding: '0.4rem 0.625rem', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer', minHeight: 0 }}>Cancel</button>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.875rem', flexWrap: 'wrap' }}>
                        <button onClick={() => handlePlanAction(plan.id, 'completed')} disabled={isActing} style={{ flex: 1, background: 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.6rem', fontSize: '0.8rem', fontWeight: 700, cursor: isActing ? 'not-allowed' : 'pointer', opacity: isActing ? 0.7 : 1 }}>✅ Mark Done</button>
                        <button onClick={() => { setReschedulingId(plan.id); setRescheduleDate('') }} disabled={isActing} style={{ background: 'none', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.6rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer' }}>📅 Move</button>
                        <button onClick={() => handlePlanAction(plan.id, 'skipped')} disabled={isActing} style={{ background: 'none', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.6rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer' }}>⏭️ Skip</button>
                      </div>
                    </div>
                  )
                })}
                {completedPlans.length > 0 && <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Completed</p>}
                {completedPlans.slice(0, 5).map(plan => (
                  <div key={plan.id} style={{ ...cardStyle, padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', opacity: 0.78 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ color: '#4ade80', fontWeight: 800 }}>Done</span>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{plan.title}</p>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{formatDate(plan.scheduled_date)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUndoCompletion(plan)}
                      disabled={undoingId === plan.id}
                      style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '0.375rem', padding: '0.35rem 0.625rem', color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: 700, cursor: undoingId === plan.id ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                    >
                      {undoingId === plan.id ? '…' : '↺ Undo'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'prs' && (
          <div key="tab-prs">
            {allMyPRs.length === 0 ? (
              <div style={{ ...cardStyle, padding: '3rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>No personal records yet.</p>
                <Link href="/leaderboard" style={{ background: 'var(--teal-primary)', color: 'white', padding: '0.5rem 1.25rem', borderRadius: '0.5rem', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 700 }}>Submit a PR</Link>
              </div>
            ) : (() => {
              // Group by exercise, pick best per exercise
              type PRGroup = { exercise: string; unit: string; best: number; bestDate: string; all: any[] }
              const grouped = Object.values(
                allMyPRs.reduce((acc: Record<string, PRGroup>, pr: any) => {
                  const key = pr.exercise_name
                  if (!acc[key]) acc[key] = { exercise: key, unit: pr.unit, best: pr.value, bestDate: pr.recorded_at || pr.date, all: [] }
                  if (pr.value > acc[key].best) { acc[key].best = pr.value; acc[key].bestDate = pr.recorded_at || pr.date }
                  acc[key].all.push(pr)
                  return acc
                }, {})
              ) as PRGroup[]
              grouped.sort((a, b) => b.best - a.best)

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {grouped.map(group => (
                    <div key={group.exercise} style={{ ...cardStyle, overflow: 'hidden' }}>
                      <div style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: group.all.length > 1 ? '1px solid var(--border)' : 'none' }}>
                        <div>
                          <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>{group.exercise}</p>
                          <p style={{ fontSize: '0.65rem', color: 'var(--teal-secondary)', marginTop: '0.15rem' }}>
                            Personal Best · {new Date(group.bestDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.75rem', color: 'var(--teal-secondary)', lineHeight: 1 }}>{group.best}</p>
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{group.unit}</p>
                        </div>
                      </div>
                      {group.all.length > 1 && (
                        <div style={{ padding: '0.625rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          {group.all.map((pr: any) => (
                            <div key={pr.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '0.1rem 0' }}>
                              <span>{new Date(pr.recorded_at || pr.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              <span style={{ color: pr.value === group.best ? 'var(--teal-secondary)' : 'var(--text-secondary)', fontWeight: pr.value === group.best ? 700 : 400 }}>{pr.value} {pr.unit}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        )}

        {activeTab === 'schedule' && (
          <div key="tab-schedule">
            {upcomingClasses.length === 0 ? (
              <div style={{ ...cardStyle, padding: '3rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No upcoming classes in the next 14 days.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {upcomingClasses.map(cls => {
                  const myAttendance = (cls.class_attendees || []).find((a: any) => a.member_id === userId)
                  return (
                    <div key={cls.id} style={{ ...cardStyle, padding: '1.25rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cls.title}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                          📅 {new Date(cls.scheduled_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          {cls.start_time ? ` · 🕐 ${cls.start_time.slice(0, 5)}` : ''}
                          {cls.location ? ` · 📍 ${cls.location}` : ''}
                        </p>
                        {cls.profiles?.name && (
                          <p style={{ fontSize: '0.7rem', color: 'var(--teal-secondary)', marginTop: '0.15rem' }}>Coach {cls.profiles.name}</p>
                        )}
                        {cls.groups?.name && (
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>👥 {cls.groups.name}</p>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', flexShrink: 0 }}>
                        {myAttendance ? (
                          <span style={{
                            fontSize: '0.7rem', fontWeight: 700, padding: '0.25rem 0.625rem', borderRadius: '999px',
                            background: myAttendance.status === 'attended' ? 'rgba(34,197,94,0.15)' : myAttendance.status === 'rsvp' ? 'rgba(8,119,160,0.15)' : 'rgba(239,68,68,0.1)',
                            color: myAttendance.status === 'attended' ? '#4ade80' : myAttendance.status === 'rsvp' ? 'var(--teal-secondary)' : '#f87171',
                            border: `1px solid ${myAttendance.status === 'attended' ? 'rgba(34,197,94,0.3)' : myAttendance.status === 'rsvp' ? 'rgba(8,119,160,0.3)' : 'rgba(239,68,68,0.3)'}`,
                            textTransform: 'capitalize' as const,
                          }}>
                            {myAttendance.status === 'rsvp' ? '✓ RSVPed' : myAttendance.status}
                          </span>
                        ) : (
                          <button
                            onClick={async () => {
                              if (!userId) return
                              await supabase.from('class_attendees').insert({ class_id: cls.id, member_id: userId, status: 'rsvp' })
                              // Refresh upcoming classes
                              if (groupIds.length > 0) {
                                const today = getLocalDateString()
                                const in14 = new Date(); in14.setDate(in14.getDate() + 14)
                                const in14Str = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(in14)
                                const { data: classes } = await supabase
                                  .from('scheduled_classes')
                                  .select('*, groups(name), profiles!scheduled_classes_coach_id_fkey(name), class_attendees(id, member_id, status)')
                                  .in('group_id', groupIds).gte('scheduled_date', today).lte('scheduled_date', in14Str)
                                  .order('scheduled_date').order('start_time')
                                setUpcomingClasses(classes || [])
                              }
                            }}
                            style={{ background: 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.4rem 0.875rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', minHeight: 0 }}
                          >
                            RSVP
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'progress' && (
          <div>
            <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Workout Frequency (Last 30)</p>
            {workoutHistory.length === 0 ? (
              <div style={{ ...cardStyle, padding: '3rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No workouts logged yet.</p>
              </div>
            ) : (
              <div style={{ ...cardStyle, padding: '1.25rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '100px' }}>
                  {workoutHistory.map(w => {
                    const height = w.duration ? Math.min((w.duration / 120) * 100, 100) : 25
                    const bg = w.type === 'basketball' ? 'rgba(96,165,250,0.7)' : w.type === 'both' ? 'rgba(192,132,252,0.7)' : 'rgba(8,119,160,0.7)'
                    return <div key={w.id} style={{ flex: 1, borderRadius: '2px 2px 0 0', background: bg, height: `${height}%`, minHeight: '6px' }} />
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  <span>{workoutHistory[0] && new Date(workoutHistory[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  <span>Last 30 sessions</span>
                  <span>{workoutHistory[workoutHistory.length - 1] && new Date(workoutHistory[workoutHistory.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'attendance' && (
          <div>
            {attendanceHistory.length === 0 ? (
              <div style={{ ...cardStyle, padding: '3rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No attendance records yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {attendanceHistory.map(a => {
                  const statusColor = a.status === 'attended' ? '#4ade80' : a.status === 'absent' ? '#ef4444' : a.status === 'excused' ? '#f59e0b' : 'var(--text-secondary)'
                  return (
                    <div key={a.id} style={{ ...cardStyle, padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.scheduled_classes?.title || 'Class'}</p>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                          {a.scheduled_classes?.scheduled_date && formatDate(a.scheduled_classes.scheduled_date)}
                          {a.scheduled_classes?.start_time && ` · ${a.scheduled_classes.start_time?.slice(0, 5)}`}
                          {(a.scheduled_classes as any)?.['profiles!scheduled_classes_coach_id_fkey']?.name &&
                            ` · Coach ${(a.scheduled_classes as any)['profiles!scheduled_classes_coach_id_fkey'].name}`}
                        </p>
                      </div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'capitalize', padding: '0.2rem 0.5rem', borderRadius: '999px', background: `${statusColor}20`, color: statusColor, flexShrink: 0 }}>{a.status}</span>
                    </div>
                  )
                })}
              </div>
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
                  await supabase.from('body_metrics').insert({
                    user_id: userId,
                    weight: parseFloat(metricWeight),
                    unit: metricUnit,
                    recorded_at: new Date().toISOString(),
                  })
                  const { data } = await supabase.from('body_metrics').select('*').eq('user_id', userId).order('recorded_at', { ascending: false }).limit(30)
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
              const weights = reversed.map(m => m.unit === 'lbs' ? m.weight * 0.453592 : m.weight)
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
                    {m.weight} <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{m.unit}</span>
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

      </main>

      <style>{`
        @media (max-width: 760px) {
          .student-overview { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
