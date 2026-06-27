'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Dumbbell } from 'lucide-react'
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

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [recentWorkouts, setRecentWorkouts] = useState<any[]>([])
  const [totalWorkouts, setTotalWorkouts] = useState(0)
  const [monthWorkouts, setMonthWorkouts] = useState(0)
  const [totalExercises, setTotalExercises] = useState(0)
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [
        { data: prof },
        { data: recent },
        { count: total },
        { count: month },
        { count: exercises },
        { data: planData },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase
          .from('workouts')
          .select('id, title, type, date, created_at, duration, exercises(count)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('workouts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('workouts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', (() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d.toISOString() })()),
        supabase
          .from('exercises')
          .select('*, workouts!inner(user_id)', { count: 'exact', head: true })
          .eq('workouts.user_id', user.id),
        supabase
          .from('workout_plans')
          .select('id, title, description, type')
          .eq('member_id', user.id),
      ])

      setProfile(prof)
      setRecentWorkouts(recent ?? [])
      setTotalWorkouts(total ?? 0)
      setMonthWorkouts(month ?? 0)
      setTotalExercises(exercises ?? 0)
      setPlans(planData ?? [])
      setLoading(false)
    }
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>
      </div>
    )
  }

  const firstName = profile?.name?.split(' ')[0] ?? 'Athlete'
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const stats = [
    { label: 'Total Workouts', value: totalWorkouts, icon: '🏋️' },
    { label: 'This Month', value: monthWorkouts, icon: '📅' },
    { label: 'Total Exercises', value: totalExercises, icon: '💪' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      <Navbar userName={profile?.name ?? 'User'} userRole={profile?.role ?? 'member'} />

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: 'clamp(2rem, 5vw, 3rem)', letterSpacing: '0.03em' }}>
              HEY, {firstName.toUpperCase()} 👋
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>{today}</p>
          </div>
          <Link href="/workouts/new" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            background: 'var(--teal-primary)', color: 'white',
            padding: '0.75rem 1.25rem', borderRadius: '0.5rem',
            textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem', whiteSpace: 'nowrap',
          }}>
            <Plus size={16} /> Log Workout
          </Link>
        </div>

        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {stats.map((s) => (
            <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.5rem' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{s.icon}</div>
              <div style={{ fontFamily: 'var(--font-bebas)', fontSize: '3rem', color: 'var(--teal-secondary)', lineHeight: 1 }}>{s.value}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.5rem', alignItems: 'start' }}>

          {/* Recent Workouts */}
          <div>
            <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', letterSpacing: '0.03em', marginBottom: '1rem' }}>
              RECENT WORKOUTS
            </h2>
            {recentWorkouts.length === 0 ? (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '3rem', textAlign: 'center' }}>
                <Dumbbell size={32} style={{ color: 'var(--text-secondary)', margin: '0 auto 1rem' }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>No workouts yet. Let&apos;s get started!</p>
                <Link href="/workouts/new" style={{ color: 'var(--teal-secondary)', textDecoration: 'none', fontWeight: 600 }}>
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
                        borderRadius: '0.75rem', padding: '1.25rem',
                        transition: 'border-color 0.2s, transform 0.2s', cursor: 'pointer',
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
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.25rem', letterSpacing: '0.03em' }}>QUICK LOG</h2>
            {[
              { href: '/workouts/new?type=conditioning', icon: '🏋️', label: 'Conditioning', sub: 'Strength & cardio' },
              { href: '/workouts/new?type=basketball', icon: '🏀', label: 'Basketball', sub: 'Ball training' },
            ].map((item) => (
              <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: '0.75rem', padding: '1.25rem', cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--teal-primary)'; (e.currentTarget as HTMLDivElement).style.background = '#0d1f24' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.background = 'var(--surface)' }}
                >
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>{item.icon}</div>
                  <h3 style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.2rem' }}>{item.label}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{item.sub}</p>
                </div>
              </Link>
            ))}

            {plans.length > 0 && (
              <>
                <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.25rem', letterSpacing: '0.03em', marginTop: '0.5rem' }}>
                  TRAINING PLANS
                </h2>
                {plans.map((plan) => (
                  <div key={plan.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1rem' }}>
                    <h4 style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>{plan.title}</h4>
                    {plan.description && <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{plan.description}</p>}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
