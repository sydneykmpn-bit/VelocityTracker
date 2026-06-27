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

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [recentWorkouts, setRecentWorkouts] = useState<any[]>([])
  const [totalWorkouts, setTotalWorkouts] = useState(0)
  const [prs, setPrs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [
        { data: prof },
        { data: recent },
        { count: total },
        { data: prData },
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
          .from('personal_records')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ])

      setProfile(prof)
      setRecentWorkouts(recent ?? [])
      setTotalWorkouts(total ?? 0)
      setPrs(prData ?? [])
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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      <Navbar />

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem' }}>
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
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            background: 'var(--teal-primary)', color: 'white',
            padding: '0.75rem 1.25rem', borderRadius: '0.5rem',
            textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem', whiteSpace: 'nowrap',
          }}>
            <Plus size={16} /> Log Workout
          </Link>
        </div>

        {/* Total workouts stat */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.5rem' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🏋️</div>
            <div style={{ fontFamily: 'var(--font-bebas)', fontSize: '3rem', color: 'var(--teal-secondary)', lineHeight: 1 }}>{totalWorkouts}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Total Workouts</div>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.5rem' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🏆</div>
            <div style={{ fontFamily: 'var(--font-bebas)', fontSize: '3rem', color: 'var(--teal-secondary)', lineHeight: 1 }}>{prs.length}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Personal Records</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem', alignItems: 'start' }}>
          {/* MY WORKOUTS */}
          <div>
            <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', letterSpacing: '0.03em', marginBottom: '1rem' }}>
              MY WORKOUTS
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
                <Link href="/workouts" style={{ color: 'var(--teal-secondary)', textDecoration: 'none', fontSize: '0.875rem', textAlign: 'center', padding: '0.5rem' }}>
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
                <Trophy size={18} style={{ color: 'var(--teal-secondary)' }} /> MY PRs
              </h2>
              {prs.length === 0 ? (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.5rem', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>No PRs yet.</p>
                  <Link href="/leaderboard" style={{ color: 'var(--teal-secondary)', textDecoration: 'none', fontSize: '0.8rem' }}>Submit your first PR →</Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {prs.slice(0, 5).map((pr) => (
                    <div key={pr.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '0.875rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{pr.exercise}</span>
                        <span style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.1rem', color: 'var(--teal-secondary)' }}>
                          {pr.value} <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{pr.unit}</span>
                        </span>
                      </div>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        {new Date(pr.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  ))}
                  <Link href="/leaderboard" style={{ color: 'var(--teal-secondary)', textDecoration: 'none', fontSize: '0.8rem', textAlign: 'center', padding: '0.25rem' }}>
                    View leaderboard →
                  </Link>
                </div>
              )}
            </div>

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
    </div>
  )
}
