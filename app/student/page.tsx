'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'
import { getLocalDateString } from '@/lib/utils'

type Tab = 'plans' | 'progress' | 'attendance' | 'goals'

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
        .select('*, scheduled_classes(title, scheduled_date, type, start_time)')
        .eq('member_id', user.id)
        .order('id', { ascending: false })
      setAttendanceHistory(attendance || [])

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
        <Navbar />
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
    { value: 'progress', label: 'Progress' },
    { value: 'attendance', label: 'Attendance' },
    { value: 'goals', label: 'Goals' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      <Navbar />
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
            <p style={{ color: 'var(--teal-secondary)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Next Action</p>
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
              <Link href="/dashboard" style={{ background: 'var(--teal-primary)', color: 'white', borderRadius: '0.5rem', padding: '0.625rem 0.875rem', fontSize: '0.875rem', fontWeight: 700, textDecoration: 'none' }}>Open Dashboard</Link>
              <Link href="/workouts/new" style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.625rem 0.875rem', fontSize: '0.875rem', fontWeight: 700, textDecoration: 'none' }}>Log Workout</Link>
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
                {pendingPlans.map(plan => (
                  <div key={plan.id} style={{ ...cardStyle, padding: '1.25rem', borderLeft: '3px solid var(--teal-primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>{plan.title}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                          {formatDate(plan.scheduled_date)} - Coach {plan.profiles?.name ?? 'Coach'}
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
                  </div>
                ))}
                {completedPlans.length > 0 && <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Completed</p>}
                {completedPlans.slice(0, 5).map(plan => (
                  <div key={plan.id} style={{ ...cardStyle, padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', opacity: 0.78 }}>
                    <span style={{ color: '#4ade80', fontWeight: 800 }}>Done</span>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{plan.title}</p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{formatDate(plan.scheduled_date)}</p>
                    </div>
                  </div>
                ))}
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
                          {a.scheduled_classes?.start_time && ` - ${a.scheduled_classes.start_time?.slice(0, 5)}`}
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

        {activeTab === 'goals' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {[
              { label: 'Weekly rhythm', value: `${workoutHistory.slice(-7).length} sessions`, note: 'Keep a consistent training cadence.' },
              { label: 'Plan discipline', value: `${planCompletionRate}%`, note: `${completedPlans.length} completed, ${pendingPlans.length} still pending.` },
              { label: 'Class reliability', value: `${attendanceRate}%`, note: `${attendedCount} attended out of ${attendanceHistory.length || 0} records.` },
              { label: 'Next check-in', value: coach?.name ?? 'Coach', note: skippedPlans.length > 0 ? 'Ask about skipped plans and schedule recovery.' : 'Review progress after your next logged session.' },
            ].map(item => (
              <div key={item.label} style={{ ...cardStyle, padding: '1.25rem' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>{item.label}</p>
                <p style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.75rem', letterSpacing: '0.03em', color: 'var(--teal-secondary)', lineHeight: 1 }}>{item.value}</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.5, marginTop: '0.75rem' }}>{item.note}</p>
              </div>
            ))}
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
