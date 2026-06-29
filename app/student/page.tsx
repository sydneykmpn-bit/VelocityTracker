'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'
import { getLocalDateString } from '@/lib/utils'

export default function StudentPage() {
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [assignedPlans, setAssignedPlans] = useState<any[]>([])
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([])
  const [workoutHistory, setWorkoutHistory] = useState<any[]>([])
  const [coach, setCoach] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'plans' | 'progress' | 'attendance'>('plans')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: prof } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()
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

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
        <Navbar />
        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '2rem 1rem' }}>
          <div style={{ height: '80px', background: 'var(--surface)', borderRadius: '0.75rem', marginBottom: '1rem', opacity: 0.4 }} />
          <div style={{ height: '80px', background: 'var(--surface)', borderRadius: '0.75rem', marginBottom: '1rem', opacity: 0.4 }} />
          <div style={{ height: '80px', background: 'var(--surface)', borderRadius: '0.75rem', opacity: 0.4 }} />
        </div>
      </div>
    )
  }

  const tabs = [
    { value: 'plans' as const, label: '📋 Assigned Plans' },
    { value: 'progress' as const, label: '📈 Progress' },
    { value: 'attendance' as const, label: '✅ Attendance' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      <Navbar />
      <main style={{ maxWidth: '700px', margin: '0 auto', padding: '2rem 1rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <div>
            <p style={{ color: 'var(--teal-secondary)', fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Student Panel</p>
            <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: 'clamp(2rem, 6vw, 3rem)', letterSpacing: '0.03em' }}>MY TRAINING</h1>
            {coach && (
              <p style={{ fontSize: '0.875rem', marginTop: '0.25rem', color: 'var(--text-secondary)' }}>
                Coach: <span style={{ color: 'var(--teal-secondary)', fontWeight: 600 }}>{coach.name}</span>
              </p>
            )}
          </div>
          <Link href="/dashboard" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '0.625rem 1rem', borderRadius: '0.5rem', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap', minHeight: 44, display: 'flex', alignItems: 'center' }}>
            ← Dashboard
          </Link>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '2rem' }}>
          {[
            { label: 'Pending Plans', value: pendingPlans.length, color: '#f59e0b' },
            { label: 'Completed', value: completedPlans.length, color: '#4ade80' },
            { label: 'Classes Attended', value: attendanceHistory.filter(a => a.status === 'attended').length, color: 'var(--teal-secondary)' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.25rem', textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-bebas)', fontSize: '2.5rem', color: s.color, lineHeight: 1 }}>{s.value}</p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Today's assignment highlight */}
        {pendingPlans.filter(p => p.scheduled_date === getLocalDateString()).length > 0 && (
          <div style={{ background: 'rgba(8,119,160,0.08)', border: '2px solid var(--teal-primary)', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--teal-secondary)', marginBottom: '0.5rem' }}>Today&apos;s Assignment</p>
            {pendingPlans.filter(p => p.scheduled_date === getLocalDateString()).map(plan => (
              <div key={plan.id}>
                <h3 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', letterSpacing: '0.03em', marginBottom: '0.25rem' }}>{plan.title}</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  From Coach {plan.profiles?.name} · {plan.workout_plan_exercises?.length || 0} exercises
                </p>
                <Link href="/dashboard" style={{ background: 'var(--teal-primary)', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.5rem', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 700, display: 'inline-block' }}>
                  View on Dashboard →
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1.5rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', paddingBottom: '2px' }}>
          {tabs.map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              style={{
                padding: '0.625rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600,
                whiteSpace: 'nowrap', cursor: 'pointer', border: 'none', transition: 'all 0.15s', minHeight: 0,
                background: activeTab === tab.value ? 'var(--teal-primary)' : 'var(--surface)',
                color: activeTab === tab.value ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Assigned Plans Tab */}
        {activeTab === 'plans' && (
          <div key="plans-tab">
            {pendingPlans.length === 0 && completedPlans.length === 0 ? (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '3rem', textAlign: 'center' }}>
                <p style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📋</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No workout plans assigned yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {pendingPlans.length > 0 && (
                  <>
                    <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>Upcoming / Pending</p>
                    {pendingPlans.map(plan => (
                      <div key={plan.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.25rem', borderLeft: '3px solid var(--teal-primary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                          <div>
                            <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>{plan.title}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                              📅 {new Date(plan.scheduled_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · Coach {plan.profiles?.name}
                            </p>
                          </div>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '999px', textTransform: 'uppercase', background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' }}>{plan.type}</span>
                        </div>
                        {plan.workout_plan_exercises?.length > 0 && (
                          <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            {plan.workout_plan_exercises
                              .sort((a: any, b: any) => a.order_index - b.order_index)
                              .map((ex: any) => (
                                <div key={ex.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.375rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.8rem' }}>
                                  <span style={{ fontWeight: 600 }}>{ex.name}</span>
                                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                                    {ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : ''}{ex.weight ? ` · ${ex.weight}kg` : ''}{ex.duration ? ` · ${ex.duration}min` : ''}
                                  </span>
                                </div>
                              ))
                            }
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}
                {completedPlans.length > 0 && (
                  <>
                    <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Completed</p>
                    {completedPlans.slice(0, 5).map(plan => (
                      <div key={plan.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', opacity: 0.7 }}>
                        <span style={{ fontSize: '1.25rem' }}>✅</span>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{plan.title}</p>
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                            {new Date(plan.scheduled_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Progress Tab */}
        {activeTab === 'progress' && (
          <div key="progress-tab">
            <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Workout Frequency (Last 30)</p>
            {workoutHistory.length === 0 ? (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '3rem', textAlign: 'center' }}>
                <p style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📈</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No workouts logged yet.</p>
              </div>
            ) : (
              <>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '100px' }}>
                    {workoutHistory.map(w => {
                      const height = w.duration ? Math.min((w.duration / 120) * 100, 100) : 25
                      const bg = w.type === 'basketball' ? 'rgba(96,165,250,0.7)' : w.type === 'both' ? 'rgba(192,132,252,0.7)' : 'rgba(8,119,160,0.7)'
                      return (
                        <div key={w.id} style={{ flex: 1, borderRadius: '2px 2px 0 0', background: bg, height: `${height}%`, minHeight: '6px' }} />
                      )
                    })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    <span>{workoutHistory[0] && new Date(workoutHistory[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    <span>Last 30 sessions</span>
                    <span>{workoutHistory[workoutHistory.length - 1] && new Date(workoutHistory[workoutHistory.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
                {assignedPlans.length > 0 && (
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.25rem' }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Plan Completion Rate</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                      <div style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0 }}>
                        <svg viewBox="0 0 36 36" style={{ width: '80px', height: '80px', transform: 'rotate(-90deg)' }}>
                          <circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="3" stroke="var(--border)" />
                          <circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="3" stroke="var(--teal-primary)"
                            strokeDasharray={`${Math.round((completedPlans.length / assignedPlans.length) * 100)} 100`}
                            strokeLinecap="round" />
                        </svg>
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <p style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.1rem', color: 'var(--teal-secondary)' }}>
                            {Math.round((completedPlans.length / assignedPlans.length) * 100)}%
                          </p>
                        </div>
                      </div>
                      <div>
                        <p style={{ color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                          <strong>{completedPlans.length}</strong> of <strong>{assignedPlans.length}</strong> plans completed
                        </p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                          {skippedPlans.length} skipped · {pendingPlans.length} pending
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Attendance Tab */}
        {activeTab === 'attendance' && (
          <div key="attendance-tab">
            {attendanceHistory.length === 0 ? (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '3rem', textAlign: 'center' }}>
                <p style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>✅</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No attendance records yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {attendanceHistory.map(a => {
                  const statusColor = a.status === 'attended' ? '#4ade80' : a.status === 'absent' ? '#ef4444' : a.status === 'excused' ? '#f59e0b' : 'var(--text-secondary)'
                  const statusIcon = a.status === 'attended' ? '✅' : a.status === 'absent' ? '❌' : a.status === 'excused' ? '📝' : '⏰'
                  return (
                    <div key={a.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{statusIcon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {a.scheduled_classes?.title || 'Class'}
                        </p>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                          {a.scheduled_classes?.scheduled_date && new Date(a.scheduled_classes.scheduled_date + 'T00:00:00')
                            .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                          {a.scheduled_classes?.start_time && ` · ${a.scheduled_classes.start_time?.slice(0, 5)}`}
                        </p>
                      </div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'capitalize', padding: '0.2rem 0.5rem', borderRadius: '999px', background: `${statusColor}20`, color: statusColor, flexShrink: 0 }}>
                        {a.status}
                      </span>
                    </div>
                  )
                })}

                {/* Summary */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.25rem', marginTop: '0.5rem' }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Attendance Summary</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', textAlign: 'center', marginBottom: '0.75rem' }}>
                    {[
                      { label: 'Attended', count: attendanceHistory.filter(a => a.status === 'attended').length, color: '#4ade80' },
                      { label: 'Absent', count: attendanceHistory.filter(a => a.status === 'absent').length, color: '#ef4444' },
                      { label: 'Excused', count: attendanceHistory.filter(a => a.status === 'excused').length, color: '#f59e0b' },
                    ].map(s => (
                      <div key={s.label}>
                        <p style={{ fontFamily: 'var(--font-bebas)', fontSize: '2rem', color: s.color, lineHeight: 1 }}>{s.count}</p>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{s.label}</p>
                      </div>
                    ))}
                  </div>
                  {attendanceHistory.length > 0 && (
                    <div>
                      <div style={{ height: '6px', borderRadius: '999px', background: 'var(--border)', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: '999px', background: '#4ade80',
                          width: `${Math.round((attendanceHistory.filter(a => a.status === 'attended').length / attendanceHistory.length) * 100)}%`
                        }} />
                      </div>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.375rem' }}>
                        {Math.round((attendanceHistory.filter(a => a.status === 'attended').length / attendanceHistory.length) * 100)}% overall attendance rate
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  )
}
