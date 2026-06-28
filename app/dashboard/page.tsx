'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Dumbbell, Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'

function typeBadge(type: string) {
  const map: Record<string, { bg: string; color: string; border: string; icon: string }> = {
    basketball: { bg: 'rgba(8,119,160,0.2)', color: '#34bac2', border: 'rgba(8,119,160,0.35)', icon: '🏀' },
    conditioning: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80', border: 'rgba(34,197,94,0.25)', icon: '🏋️' },
    both: { bg: 'rgba(168,85,247,0.15)', color: '#c084fc', border: 'rgba(168,85,247,0.25)', icon: '💪' },
  }
  return map[type] ?? map.both
}

const inputBase: React.CSSProperties = {
  background: '#0d1a1e', border: '1px solid #1a2e34', borderRadius: '0.5rem',
  padding: '0.6rem 0.875rem', color: '#F2F2F2', fontSize: '1rem', outline: 'none',
}

function TodayPlanCard({ plan, onUpdate }: { plan: any; onUpdate: () => void }) {
  const supabase = createClient()
  const [expanded, setExpanded] = useState(false)
  const [showReschedule, setShowReschedule] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [loading, setLoading] = useState(false)

  const handleComplete = async () => {
    setLoading(true)
    await supabase.from('workout_plans').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', plan.id)
    onUpdate(); setLoading(false)
  }
  const handleSkip = async () => {
    setLoading(true)
    await supabase.from('workout_plans').update({ status: 'skipped' }).eq('id', plan.id)
    onUpdate(); setLoading(false)
  }
  const handleReschedule = async () => {
    if (!newDate) return
    setLoading(true)
    await supabase.from('workout_plans').update({ status: 'pending', scheduled_date: newDate, rescheduled_date: newDate }).eq('id', plan.id)
    setShowReschedule(false); onUpdate(); setLoading(false)
  }

  const tb = typeBadge(plan.type)
  const exercises: any[] = plan.workout_plan_exercises ?? []

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem',
      padding: '1.25rem', marginBottom: '0.75rem', borderLeft: '3px solid var(--teal-primary)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--teal-secondary)', marginBottom: '0.25rem' }}>
            📋 From Coach {plan.profiles?.name ?? 'Coach'}
          </p>
          <h3 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.25rem', letterSpacing: '0.03em' }}>{plan.title}</h3>
          {plan.description && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{plan.description}</p>}
        </div>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.25rem 0.5rem', borderRadius: '999px', textTransform: 'uppercase', background: tb.bg, color: tb.color, border: `1px solid ${tb.border}`, whiteSpace: 'nowrap' }}>
          {plan.type}
        </span>
      </div>

      {exercises.length > 0 && (
        <button onClick={() => setExpanded(!expanded)} style={{ background: 'none', border: 'none', color: 'var(--teal-secondary)', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.75rem', padding: 0, minHeight: 0 }}>
          {expanded ? '▲' : '▼'} {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}
        </button>
      )}

      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '0.875rem' }}>
          {exercises.sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)).map((ex: any) => (
            <div key={ex.id} style={{ background: '#0a1518', borderRadius: '0.375rem', padding: '0.625rem 0.75rem' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>{ex.name}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.2rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {ex.sets && ex.reps && <span>{ex.sets}×{ex.reps} reps</span>}
                {ex.weight && <span>{ex.weight}kg</span>}
                {ex.duration && <span>{ex.duration}min</span>}
                {ex.distance && <span>{ex.distance}km</span>}
                {ex.notes && <span style={{ fontStyle: 'italic' }}>{ex.notes}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showReschedule && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} min={new Date().toISOString().split('T')[0]} style={{ ...inputBase, flex: 1 }} />
          <button onClick={handleReschedule} disabled={loading || !newDate} style={{ background: 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', minHeight: 0 }}>Confirm</button>
          <button onClick={() => setShowReschedule(false)} style={{ background: 'none', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.875rem', cursor: 'pointer', minHeight: 0 }}>Cancel</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button onClick={handleComplete} disabled={loading} style={{ flex: 1, background: 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.65rem', fontSize: '0.875rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          ✅ Mark Done
        </button>
        <button onClick={() => setShowReschedule(!showReschedule)} disabled={loading} style={{ background: 'none', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.65rem 0.875rem', fontSize: '0.875rem', cursor: 'pointer' }}>
          📅 Move Day
        </button>
        <button onClick={handleSkip} disabled={loading} style={{ background: 'none', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.65rem 0.875rem', fontSize: '0.875rem', cursor: 'pointer' }}>
          ⏭️ Skip
        </button>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [recentWorkouts, setRecentWorkouts] = useState<any[]>([])
  const [totalWorkouts, setTotalWorkouts] = useState(0)
  const [prs, setPrs] = useState<any[]>([])
  const [todayPlans, setTodayPlans] = useState<any[]>([])
  const [completedToday, setCompletedToday] = useState<any[]>([])
  const [upcomingPlans, setUpcomingPlans] = useState<any[]>([])
  const [skippedPlans, setSkippedPlans] = useState<any[]>([])
  const [todayClasses, setTodayClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]

  const loadAll = async (uid: string) => {
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
    const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 7)

    const [
      { data: prof },
      { data: recent },
      { count: total },
      { data: prData },
      { data: todayP },
      { data: completedP },
      { data: upcomingP },
      { data: skippedP },
      { data: classes },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).single(),
      supabase.from('workouts').select('id, title, type, date, created_at, duration, exercises(count)').eq('user_id', uid).order('created_at', { ascending: false }).limit(5),
      supabase.from('workouts').select('*', { count: 'exact', head: true }).eq('user_id', uid),
      supabase.from('personal_records').select('*').eq('user_id', uid).order('recorded_at', { ascending: false }).limit(5),
      supabase.from('workout_plans').select('*, workout_plan_exercises(*), profiles!workout_plans_coach_id_fkey(name)').eq('member_id', uid).or(`scheduled_date.eq.${today},rescheduled_date.eq.${today}`).eq('status', 'pending').order('scheduled_date'),
      supabase.from('workout_plans').select('*, workout_plan_exercises(*)').eq('member_id', uid).or(`scheduled_date.eq.${today},rescheduled_date.eq.${today}`).eq('status', 'completed'),
      supabase.from('workout_plans').select('*, workout_plan_exercises(count), profiles!workout_plans_coach_id_fkey(name)').eq('member_id', uid).eq('status', 'pending').gte('scheduled_date', tomorrow.toISOString().split('T')[0]).lte('scheduled_date', nextWeek.toISOString().split('T')[0]).order('scheduled_date'),
      supabase.from('workout_plans').select('*, profiles!workout_plans_coach_id_fkey(name)').eq('member_id', uid).eq('status', 'skipped').order('scheduled_date', { ascending: false }).limit(5),
      supabase.from('scheduled_classes').select('*, groups(name), profiles!scheduled_classes_coach_id_fkey(name)').eq('scheduled_date', today).order('start_time').limit(5),
    ])

    setProfile(prof)
    setRecentWorkouts(recent ?? [])
    setTotalWorkouts(total ?? 0)
    setPrs(prData ?? [])
    setTodayPlans(todayP ?? [])
    setCompletedToday(completedP ?? [])
    setUpcomingPlans(upcomingP ?? [])
    setSkippedPlans(skippedP ?? [])
    setTodayClasses(classes ?? [])
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

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>
      </div>
    )
  }

  const firstName = profile?.name?.split(' ')[0] ?? 'Athlete'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      <Navbar />

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: 'clamp(2rem, 5vw, 3rem)', letterSpacing: '0.03em' }}>
              HEY, {firstName.toUpperCase()} 👋
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <Link href="/workouts/new" style={{
            display: 'none', alignItems: 'center', gap: '0.5rem',
            background: 'var(--teal-primary)', color: 'white',
            padding: '0.75rem 1.25rem', borderRadius: '0.5rem',
            textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem', whiteSpace: 'nowrap', minHeight: 44,
          }} className="md-show-flex">
            <Plus size={16} /> Log Workout
          </Link>
        </div>

        {/* ── TODAY'S PLAN ── */}
        {(todayPlans.length > 0 || completedToday.length > 0) && (
          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', letterSpacing: '0.03em', marginBottom: '1rem', color: 'var(--teal-secondary)' }}>
              TODAY&apos;S PLAN
            </h2>
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

        {/* ── TODAY'S CLASSES ── */}
        {todayClasses.length > 0 && (
          <section style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', letterSpacing: '0.03em' }}>TODAY&apos;S CLASSES</h2>
              <Link href="/calendar" style={{ color: 'var(--teal-secondary)', textDecoration: 'none', fontSize: '0.8rem', minHeight: 0 }}>View calendar →</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {todayClasses.map(cls => (
                <div key={cls.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '0.875rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{cls.title}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      🕐 {cls.start_time?.slice(0, 5)}{cls.end_time ? ` – ${cls.end_time?.slice(0, 5)}` : ''}
                      {cls.location ? ` · 📍 ${cls.location}` : ''}
                      {cls.groups ? ` · 👥 ${cls.groups.name}` : ''}
                    </p>
                  </div>
                  {cls.profiles && <p style={{ fontSize: '0.75rem', color: 'var(--teal-secondary)' }}>Coach: {cls.profiles.name}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.25rem' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🏋️</div>
            <div style={{ fontFamily: 'var(--font-bebas)', fontSize: '2.5rem', color: 'var(--teal-secondary)', lineHeight: 1 }}>{totalWorkouts}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Total Workouts</div>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.25rem' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🏆</div>
            <div style={{ fontFamily: 'var(--font-bebas)', fontSize: '2.5rem', color: 'var(--teal-secondary)', lineHeight: 1 }}>{prs.length}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Personal Records</div>
          </div>
          {upcomingPlans.length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.25rem' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📋</div>
              <div style={{ fontFamily: 'var(--font-bebas)', fontSize: '2.5rem', color: 'var(--teal-secondary)', lineHeight: 1 }}>{upcomingPlans.length}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Upcoming Plans</div>
            </div>
          )}
        </div>

        {/* ── UPCOMING PLANS ── */}
        {upcomingPlans.length > 0 && (
          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', letterSpacing: '0.03em', marginBottom: '0.75rem' }}>UPCOMING THIS WEEK</h2>
            <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', paddingBottom: '4px' }}>
              {upcomingPlans.map(p => {
                const tb = typeBadge(p.type)
                return (
                  <div key={p.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1rem', minWidth: '160px', flexShrink: 0 }}>
                    <p style={{ fontSize: '0.7rem', color: 'var(--teal-secondary)', fontWeight: 700, marginBottom: '0.25rem' }}>
                      {new Date(p.scheduled_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                    <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>{p.title}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                      {(p.workout_plan_exercises as any[])?.[0]?.count ?? 0} exercises
                    </p>
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '999px', textTransform: 'uppercase', background: tb.bg, color: tb.color, border: `1px solid ${tb.border}`, display: 'inline-block', marginTop: '0.375rem' }}>
                      {p.type}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: '2rem', alignItems: 'start' }}>
          {/* MY WORKOUTS */}
          <div>
            <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', letterSpacing: '0.03em', marginBottom: '1rem' }}>
              MY RECENT WORKOUTS
            </h2>
            {recentWorkouts.length === 0 ? (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '3rem', textAlign: 'center' }}>
                <Dumbbell size={32} style={{ color: 'var(--text-secondary)', margin: '0 auto 1rem' }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>No workouts yet. Let&apos;s get started!</p>
                <Link href="/workouts/new" style={{ color: 'var(--teal-secondary)', textDecoration: 'none', fontWeight: 600, minHeight: 0, display: 'inline' }}>
                  Log your first workout →
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {recentWorkouts.map((w) => {
                  const badge = typeBadge(w.type)
                  return (
                    <Link key={w.id} href={`/workouts/${w.id}`} style={{ textDecoration: 'none' }}>
                      <div style={{
                        background: 'var(--surface)', border: '1px solid var(--border)',
                        borderRadius: '0.75rem', padding: '1.25rem', cursor: 'pointer',
                        transition: 'border-color 0.2s, transform 0.2s',
                      }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--teal-primary)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)' }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)' }}
                      >
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
                          <span style={{
                            fontSize: '0.65rem', fontWeight: 700, padding: '0.25rem 0.625rem',
                            borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.07em',
                            background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`,
                          }}>
                            {w.type}
                          </span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
                <Link href="/workouts" style={{ color: 'var(--teal-secondary)', textDecoration: 'none', fontSize: '0.875rem', textAlign: 'center', padding: '0.5rem', display: 'block', minHeight: 0 }}>
                  View all workouts →
                </Link>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* My PRs */}
            <div>
              <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.25rem', letterSpacing: '0.03em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Trophy size={18} style={{ color: 'var(--teal-secondary)' }} /> MY RECENT PRs
              </h2>
              {prs.length === 0 ? (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.5rem', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>No PRs yet.</p>
                  <Link href="/leaderboard" style={{ color: 'var(--teal-secondary)', textDecoration: 'none', fontSize: '0.8rem', minHeight: 0, display: 'inline' }}>Submit your first PR →</Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {prs.map((pr) => (
                    <div key={pr.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '0.875rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <span style={{ fontSize: '0.75rem' }}>{pr.is_public ? '🌐' : '🔒'}</span>
                          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{pr.exercise_name ?? pr.exercise}</span>
                        </div>
                        <span style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.1rem', color: 'var(--teal-secondary)' }}>
                          {pr.value} <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{pr.unit}</span>
                        </span>
                      </div>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        {new Date(pr.date ?? pr.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  ))}
                  <Link href="/leaderboard" style={{ color: 'var(--teal-secondary)', textDecoration: 'none', fontSize: '0.8rem', textAlign: 'center', padding: '0.25rem', display: 'block', minHeight: 0 }}>
                    View leaderboard →
                  </Link>
                </div>
              )}
            </div>

            {/* Skipped / Missed */}
            {skippedPlans.length > 0 && (
              <div>
                <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.1rem', letterSpacing: '0.03em', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                  ⏭️ SKIPPED / MISSED
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  {skippedPlans.map(p => (
                    <div key={p.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.625rem 0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                      <div>
                        <p style={{ fontSize: '0.8rem', fontWeight: 600 }}>{p.title}</p>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{p.scheduled_date}</p>
                      </div>
                      <button
                        onClick={async () => {
                          const newD = prompt('Reschedule to (YYYY-MM-DD):')
                          if (!newD || !userId) return
                          await supabase.from('workout_plans').update({ status: 'pending', scheduled_date: newD, rescheduled_date: newD }).eq('id', p.id)
                          await loadAll(userId)
                        }}
                        style={{ background: 'rgba(8,119,160,0.15)', border: '1px solid rgba(8,119,160,0.35)', borderRadius: '0.375rem', padding: '0.3rem 0.5rem', color: 'var(--teal-secondary)', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', minHeight: 0 }}
                      >
                        Reschedule
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Log */}
            <div>
              <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.25rem', letterSpacing: '0.03em', marginBottom: '0.75rem' }}>QUICK LOG</h2>
              {[
                { href: '/workouts/new?type=conditioning', icon: '🏋️', label: 'Conditioning', sub: 'Strength & cardio' },
                { href: '/workouts/new?type=basketball', icon: '🏀', label: 'Basketball', sub: 'Ball training' },
              ].map((item) => (
                <Link key={item.href} href={item.href} style={{ textDecoration: 'none', display: 'block', marginBottom: '0.5rem' }}>
                  <div style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: '0.75rem', padding: '1rem', cursor: 'pointer', transition: 'all 0.2s',
                  }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--teal-primary)'; (e.currentTarget as HTMLDivElement).style.background = '#0d1f24' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.background = 'var(--surface)' }}
                  >
                    <div style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{item.icon}</div>
                    <h3 style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.15rem' }}>{item.label}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{item.sub}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile FAB */}
      <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 50 }}>
        <Link href="/workouts/new" style={{
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
        @media (max-width: 767px) {
          .mobile-fab { display: flex !important; }
          .md-show-flex { display: inline-flex !important; }
        }
      `}</style>
    </div>
  )
}
