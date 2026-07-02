'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { WorkoutCardSkeleton } from '@/components/Skeleton'
import ClassDetailModal from '@/components/ClassDetailModal'
import { getLocalDateString, getLocalDisplayDate } from '@/lib/utils'
import { TodayPlanCard, SkippedPlansSection, typeBadge } from '@/components/PlanCards'

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [userRole, setUserRole] = useState('')
  const [allWorkoutsList, setAllWorkoutsList] = useState<any[]>([])
  const [prs, setPrs] = useState<any[]>([])
  const [coachNote, setCoachNote] = useState<any>(null)
  const [todayPlans, setTodayPlans] = useState<any[]>([])
  const [completedToday, setCompletedToday] = useState<any[]>([])
  const [upcomingPlans, setUpcomingPlans] = useState<any[]>([])
  const [skippedPlans, setSkippedPlans] = useState<any[]>([])
  const [todayClasses, setTodayClasses] = useState<any[]>([])
  const [studentActivityToday, setStudentActivityToday] = useState<{ count: number; total: number } | null>(null)
  const [pendingCompletions, setPendingCompletions] = useState<any[]>([])
  const [upcomingCoachClasses, setUpcomingCoachClasses] = useState<any[]>([])
  const [pendingApprovals, setPendingApprovals] = useState(0)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [selectedClass, setSelectedClass] = useState<any>(null)
  const [quickActionLoading, setQuickActionLoading] = useState<string | null>(null)
  const [kudosReceived, setKudosReceived] = useState<any[]>([])

  const today = getLocalDateString()

  const loadAll = async (uid: string) => {
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
    const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 7)

    const [
      { data: prof },
      { data: workoutsData },
      { data: prData },
      { data: todayP },
      { data: completedP },
      { data: upcomingP },
      { data: skippedP },
      { data: classes },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).single(),
      supabase.from('workouts').select('id, title, type, date, created_at, duration, exercises(count)').eq('user_id', uid).order('date', { ascending: false }),
      supabase.from('personal_records').select('*').eq('user_id', uid).order('recorded_at', { ascending: false }).limit(5),
      supabase.from('workout_plans').select('*, workout_plan_exercises(*), profiles!workout_plans_coach_id_fkey(name)').eq('member_id', uid).or(`scheduled_date.eq.${today},rescheduled_date.eq.${today}`).eq('status', 'pending').order('scheduled_date'),
      supabase.from('workout_plans').select('*, workout_plan_exercises(*)').eq('member_id', uid).or(`scheduled_date.eq.${today},rescheduled_date.eq.${today}`).eq('status', 'completed'),
      supabase.from('workout_plans').select('*, workout_plan_exercises(count), profiles!workout_plans_coach_id_fkey(name)').eq('member_id', uid).eq('status', 'pending').gte('scheduled_date', tomorrow.toISOString().split('T')[0]).lte('scheduled_date', nextWeek.toISOString().split('T')[0]).order('scheduled_date'),
      supabase.from('workout_plans').select('*, profiles!workout_plans_coach_id_fkey(name)').eq('member_id', uid).eq('status', 'skipped').order('scheduled_date', { ascending: false }).limit(5),
      supabase.from('scheduled_classes').select('*, groups(name), profiles!scheduled_classes_coach_id_fkey(name)').eq('scheduled_date', today).order('start_time').limit(5),
    ])

    setProfile(prof)
    setUserRole(prof?.role || 'member')
    setAllWorkoutsList(workoutsData ?? [])
    setPrs(prData ?? [])
    setTodayPlans(todayP ?? [])
    setCompletedToday(completedP ?? [])
    setUpcomingPlans(upcomingP ?? [])
    setSkippedPlans(skippedP ?? [])
    setTodayClasses(classes ?? [])

    const { data: kudosData } = await supabase
      .from('kudos')
      .select('*, profiles!kudos_from_user_fkey(name)')
      .eq('to_user', uid)
      .order('created_at', { ascending: false })
      .limit(3)
    setKudosReceived(kudosData ?? [])

    // Coach note
    const { data: noteData } = await supabase
      .from('coach_notes')
      .select('*, profiles!coach_notes_coach_id_fkey(name)')
      .eq('member_id', uid).eq('visible_to_member', true)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    setCoachNote(noteData)

    // Coach-specific data
    if (prof?.role === 'coach') {
      const { data: coachGroups } = await supabase.from('groups').select('id').eq('coach_id', uid)
      const groupIds = coachGroups?.map((g: any) => g.id) || []
      if (groupIds.length > 0) {
        const { data: memberIds } = await supabase.from('group_members').select('member_id').in('group_id', groupIds)
        const ids = memberIds?.map((m: any) => m.member_id) || []
        if (ids.length > 0) {
          const { count } = await supabase.from('workouts').select('id', { count: 'exact', head: true }).in('user_id', ids).gte('date', today)
          setStudentActivityToday({ count: count || 0, total: ids.length })
        }
      }
      const { data: completedRecently } = await supabase
        .from('workout_plans')
        .select('*, profiles!workout_plans_member_id_fkey(name)')
        .eq('coach_id', uid).eq('status', 'completed')
        .gte('completed_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
        .order('completed_at', { ascending: false }).limit(5)
      setPendingCompletions(completedRecently || [])

      const { data: coachClasses } = await supabase
        .from('scheduled_classes').select('*, groups(name)').eq('coach_id', uid)
        .gte('scheduled_date', today).order('scheduled_date').order('start_time').limit(3)
      setUpcomingCoachClasses(coachClasses || [])
    }

    // Admin-specific data
    if (prof?.role === 'admin') {
      const { count: pending } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('approved', false)
      setPendingApprovals(pending || 0)
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

  const handleQuickPlanAction = async (planId: string, action: 'completed' | 'skipped') => {
    setQuickActionLoading(planId)
    if (action === 'completed') {
      await supabase.from('workout_plans').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', planId)
    } else {
      await supabase.from('workout_plans').update({ status: 'skipped' }).eq('id', planId)
    }
    setQuickActionLoading(null)
    handlePlanUpdate()
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <WorkoutCardSkeleton /><WorkoutCardSkeleton /><WorkoutCardSkeleton />
          </div>
        </div>
      </div>
    )
  }

  const firstName = profile?.name?.split(' ')[0] ?? 'Athlete'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem 7rem' }}>

        {/* ── ADMIN: Pending approvals banner ── */}
        {userRole === 'admin' && pendingApprovals > 0 && (
          <Link href="/admin" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
            background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.4)',
            borderRadius: '0.75rem', padding: '1rem 1.25rem', marginBottom: '1.5rem',
            textDecoration: 'none', minHeight: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.25rem' }}>⚠️</span>
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

        {/* ── COACH: Student activity + completions ── */}
        {userRole === 'coach' && (studentActivityToday || pendingCompletions.length > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {studentActivityToday && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                <span style={{ fontSize: '1.5rem' }}>👥</span>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--teal-secondary)' }}>{studentActivityToday.count}</span>
                    <span style={{ color: 'var(--text-secondary)' }}> / {studentActivityToday.total} students trained today</span>
                  </p>
                  <Link href="/coach" style={{ fontSize: '0.75rem', color: 'var(--teal-secondary)', textDecoration: 'none', display: 'inline', minHeight: 0 }}>
                    View Coach Panel →
                  </Link>
                </div>
              </div>
            )}
            {pendingCompletions.length > 0 && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1rem' }}>
                <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#4ade80', marginBottom: '0.5rem' }}>🎉 Recent Completions</p>
                {pendingCompletions.slice(0, 2).map((p: any) => (
                  <p key={p.id} style={{ fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{p['profiles!workout_plans_member_id_fkey']?.name}</span>
                    {' completed '}
                    <span style={{ color: 'var(--teal-secondary)' }}>{p.title}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── HEADER ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
          <div>
            <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Welcome back</p>
            <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: 'clamp(2.25rem, 6vw, 3.5rem)', letterSpacing: '0.03em', lineHeight: 1 }}>
              HEY, {firstName.toUpperCase()} 👋
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.35rem' }}>{getLocalDisplayDate()}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }} className="header-actions">
            {userRole === 'admin' && (
              <Link href="/admin" style={{ display: 'none', alignItems: 'center', gap: '0.5rem', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '0.625rem 1rem', borderRadius: '0.5rem', textDecoration: 'none', fontWeight: 600, fontSize: '0.8rem', whiteSpace: 'nowrap', minHeight: 0 }} className="md-show-flex">
                ⚙️ Admin Panel
              </Link>
            )}
            {userRole === 'coach' && (
              <Link href="/coach" style={{ display: 'none', alignItems: 'center', gap: '0.5rem', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '0.625rem 1rem', borderRadius: '0.5rem', textDecoration: 'none', fontWeight: 600, fontSize: '0.8rem', whiteSpace: 'nowrap', minHeight: 0 }} className="md-show-flex">
                👨‍💼 Coach Panel
              </Link>
            )}
            <Link href="/workouts/new" style={{ display: 'none', alignItems: 'center', gap: '0.5rem', background: 'var(--teal-primary)', color: 'white', padding: '0.625rem 1rem', borderRadius: '0.5rem', textDecoration: 'none', fontWeight: 700, fontSize: '0.8rem', whiteSpace: 'nowrap', minHeight: 0 }} className="md-show-flex">
              + Log Workout
            </Link>
          </div>
        </div>

        {/* ── COACH NOTE ── */}
        {coachNote && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '3px solid var(--teal-primary)', borderRadius: '0.75rem', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--teal-secondary)', marginBottom: '0.5rem' }}>
              📝 Note from Coach {coachNote.profiles?.name}
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>{coachNote.note}</p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              {new Date(coachNote.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        )}

        {/* ── TODAY'S PLAN ── */}
        {(todayPlans.length > 0 || completedToday.length > 0) && (
          <section style={{ marginBottom: '1.75rem' }}>
            <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', letterSpacing: '0.03em', marginBottom: '0.875rem', color: 'var(--teal-secondary)' }}>TODAY&apos;S PLAN</h2>
            {todayPlans.map(plan => (
              <TodayPlanCard key={plan.id} plan={plan} onUpdate={handlePlanUpdate} />
            ))}
            {completedToday.map(plan => (
              <div key={plan.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1rem 1.25rem', marginBottom: '0.5rem', opacity: 0.6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>✅ {plan.title}</span>
                  <span style={{ fontSize: '0.7rem', color: '#22c55e' }}>Completed</span>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* ── UPCOMING PLANS ── */}
        {upcomingPlans.length > 0 && (
          <section style={{ marginBottom: '1.75rem' }}>
            <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', letterSpacing: '0.03em', marginBottom: '0.875rem' }}>UPCOMING THIS WEEK</h2>
            <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', paddingBottom: '4px' }}>
              {upcomingPlans.map(p => {
                const tb = typeBadge(p.type)
                const isActing = quickActionLoading === p.id
                return (
                  <div key={p.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1rem', minWidth: '180px', flexShrink: 0 }}>
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
                        onClick={() => handleQuickPlanAction(p.id, 'completed')}
                        disabled={isActing}
                        style={{ flex: 1, background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '0.375rem', padding: '0.3rem 0.25rem', fontSize: '0.65rem', fontWeight: 700, color: '#4ade80', cursor: isActing ? 'not-allowed' : 'pointer', minHeight: 0 }}
                      >
                        ✅ Done
                      </button>
                      <button
                        onClick={() => handleQuickPlanAction(p.id, 'skipped')}
                        disabled={isActing}
                        style={{ flex: 1, background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '0.375rem', padding: '0.3rem 0.25rem', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', cursor: isActing ? 'not-allowed' : 'pointer', minHeight: 0 }}
                      >
                        ⏭️ Skip
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── TODAY'S CLASSES ── */}
        {todayClasses.length > 0 && (
          <section style={{ marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
              <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', letterSpacing: '0.03em' }}>TODAY&apos;S CLASSES</h2>
              <Link href="/calendar" style={{ color: 'var(--teal-secondary)', textDecoration: 'none', fontSize: '0.8rem', minHeight: 0, display: 'inline' }}>View calendar →</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {todayClasses.map(cls => (
                <div
                  key={cls.id}
                  onClick={() => setSelectedClass(cls)}
                  role="button"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '0.875rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', cursor: 'pointer', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--teal-primary)'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'}
                >
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{cls.title}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      🕐 {cls.start_time?.slice(0, 5)}{cls.end_time ? ` – ${cls.end_time?.slice(0, 5)}` : ''}
                      {cls.location ? ` · 📍 ${cls.location}` : ''}
                      {cls.groups ? ` · 👥 ${cls.groups.name}` : ''}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {cls.profiles && <p style={{ fontSize: '0.75rem', color: 'var(--teal-secondary)' }}>Coach: {cls.profiles.name}</p>}
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Tap →</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── COACH: Upcoming classes I'm coaching ── */}
        {userRole === 'coach' && upcomingCoachClasses.length > 0 && (
          <section style={{ marginBottom: '1.75rem' }}>
            <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', letterSpacing: '0.03em', marginBottom: '0.875rem' }}>CLASSES I&apos;M COACHING</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {upcomingCoachClasses.map(cls => (
                <div key={cls.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cls.title}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      📅 {new Date(cls.scheduled_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      {' · '}🕐 {cls.start_time?.slice(0, 5)}
                      {cls.groups?.name ? ` · 👥 ${cls.groups.name}` : ''}
                    </p>
                  </div>
                  <Link href="/coach" style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '0.4rem 0.875rem', borderRadius: '0.5rem', textDecoration: 'none', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0, minHeight: 0 }}>
                    Manage
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── RECENT WORKOUTS + PRs GRID ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '2rem', alignItems: 'start' }} className="dashboard-grid">
          {/* Workouts */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
              <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', letterSpacing: '0.03em' }}>MY RECENT WORKOUTS</h2>
              <Link href="/workouts" style={{ color: 'var(--teal-secondary)', textDecoration: 'none', fontSize: '0.8rem', minHeight: 0, display: 'inline' }}>View all →</Link>
            </div>
            {allWorkoutsList.length === 0 ? (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '3rem', textAlign: 'center' }}>
                <p style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>💪</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>No workouts yet. Let&apos;s get started!</p>
                <Link href="/workouts/new" style={{ color: 'var(--teal-secondary)', textDecoration: 'none', fontWeight: 600, minHeight: 0, display: 'inline' }}>Log your first workout →</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {allWorkoutsList.slice(0, 3).map(w => {
                  const badge = typeBadge(w.type)
                  return (
                    <Link key={w.id} href={`/workouts/${w.id}`} style={{ textDecoration: 'none' }}>
                      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.25rem', cursor: 'pointer', transition: 'border-color 0.2s' }}
                        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--teal-primary)'}
                        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ fontSize: '1.25rem' }}>{badge.icon}</span>
                            <div>
                              <h3 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.2rem' }}>{w.title}</h3>
                              <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                                {new Date(w.date ?? w.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                {w.duration ? ` · ${w.duration} min` : ''}
                                {(w.exercises as any[])?.[0]?.count ? ` · ${(w.exercises as any[])[0].count} exercises` : ''}
                              </p>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.25rem 0.625rem', borderRadius: '999px', textTransform: 'uppercase' as const, letterSpacing: '0.07em', background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                            {w.type}
                          </span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Sidebar: PRs + Skipped + Quick Log */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* PRs */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.25rem', letterSpacing: '0.03em' }}>🏆 MY RECENT PRs</h2>
                <Link href="/leaderboard" style={{ color: 'var(--teal-secondary)', textDecoration: 'none', fontSize: '0.75rem', minHeight: 0, display: 'inline' }}>Board →</Link>
              </div>
              {prs.length === 0 ? (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.5rem', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>No PRs yet.</p>
                  <Link href="/leaderboard" style={{ color: 'var(--teal-secondary)', textDecoration: 'none', fontSize: '0.8rem', minHeight: 0, display: 'inline' }}>Submit your first PR →</Link>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {prs.map(pr => (
                      <div key={pr.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '0.875rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', minWidth: 0 }}>
                            <span style={{ fontSize: '0.75rem', flexShrink: 0 }}>{pr.is_public ? '🌐' : '🔒'}</span>
                            <span style={{ fontSize: '0.875rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pr.exercise_name ?? pr.exercise}</span>
                          </div>
                          <span style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.1rem', color: 'var(--teal-secondary)', flexShrink: 0 }}>
                            {pr.value} <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{pr.unit}</span>
                          </span>
                        </div>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                          {new Date(pr.date ?? pr.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.625rem' }}>
                    <Link href="/leaderboard" style={{ color: 'var(--teal-secondary)', textDecoration: 'none', fontSize: '0.8rem', minHeight: 0 }}>
                      Board →
                    </Link>
                    <Link href="/leaderboard" style={{ color: 'var(--teal-secondary)', textDecoration: 'none', fontSize: '0.8rem', minHeight: 0 }}>
                      + Submit PR
                    </Link>
                  </div>
                </>
              )}
            </div>

            {/* Kudos received */}
            {kudosReceived.length > 0 && (
              <div>
                <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.25rem', letterSpacing: '0.03em', marginBottom: '0.75rem' }}>👊 KUDOS RECEIVED</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {kudosReceived.map(k => (
                    <div key={k.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '0.75rem 0.875rem' }}>
                      <p style={{ fontSize: '0.8rem', fontWeight: 600 }}>{k.profiles?.name ?? 'A member'}</p>
                      {k.message && <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{k.message}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skipped */}
            {skippedPlans.length > 0 && (
              <SkippedPlansSection plans={skippedPlans} userId={userId} supabase={supabase} onUpdate={loadData} />
            )}

          </div>
        </div>

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

      {/* Mobile FAB */}
      <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 50 }}>
        <Link href="/workouts/new" aria-label="Log new workout" style={{
          background: 'var(--teal-primary)', color: 'white',
          width: '56px', height: '56px', borderRadius: '50%',
          display: 'none', alignItems: 'center', justifyContent: 'center',
          textDecoration: 'none', fontSize: '1.5rem', fontWeight: 700,
          boxShadow: '0 4px 20px rgba(8,119,160,0.5)',
        }} className="mobile-fab">
          +
        </Link>
      </div>
      <style>{`
        @media (min-width: 768px) {
          .dashboard-grid { grid-template-columns: minmax(0, 1fr) 280px !important; }
        }
        @media (max-width: 767px) {
          .mobile-fab { display: flex !important; }
          .md-show-flex { display: inline-flex !important; }
        }
      `}</style>
    </div>
  )
}
