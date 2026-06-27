'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Dumbbell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'

type Filter = 'all' | 'conditioning' | 'basketball' | 'both'

function typeBadge(type: string) {
  const map: Record<string, { bg: string; color: string; border: string; icon: string }> = {
    basketball: { bg: 'rgba(8,119,160,0.2)', color: '#34bac2', border: 'rgba(8,119,160,0.35)', icon: '🏀' },
    conditioning: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80', border: 'rgba(34,197,94,0.25)', icon: '🏋️' },
    both: { bg: 'rgba(168,85,247,0.15)', color: '#c084fc', border: 'rgba(168,85,247,0.25)', icon: '💪' },
  }
  return map[type] ?? map.both
}

const tabs: { label: string; value: Filter }[] = [
  { label: 'All', value: 'all' },
  { label: '🏋️ Conditioning', value: 'conditioning' },
  { label: '🏀 Basketball', value: 'basketball' },
  { label: '💪 Both', value: 'both' },
]

export default function WorkoutsPage() {
  const router = useRouter()
  const [filter, setFilter] = useState<Filter>('all')
  const [workouts, setWorkouts] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      if (!profile) {
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(prof)
      }

      let q = supabase
        .from('workouts')
        .select('id, title, type, date, created_at, duration, exercises(count)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (filter !== 'all') q = q.eq('type', filter)
      const { data } = await q
      setWorkouts(data ?? [])
      setLoading(false)
    }
    fetch()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      <Navbar />
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1.5rem' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: '2.5rem', letterSpacing: '0.03em' }}>WORKOUTS</h1>
          <Link href="/workouts/new" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            background: 'var(--teal-primary)', color: 'white',
            padding: '0.75rem 1.25rem', borderRadius: '0.5rem',
            textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem',
          }}>
            <Plus size={16} /> Log Workout
          </Link>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {tabs.map((t) => (
            <button key={t.value} onClick={() => setFilter(t.value)} style={{
              background: filter === t.value ? 'var(--teal-primary)' : 'var(--surface)',
              color: filter === t.value ? 'white' : 'var(--text-secondary)',
              border: `1px solid ${filter === t.value ? 'var(--teal-primary)' : 'var(--border)'}`,
              borderRadius: '0.5rem', padding: '0.5rem 1rem',
              cursor: 'pointer', fontSize: '0.875rem',
              fontWeight: filter === t.value ? 700 : 400, transition: 'all 0.2s',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading…</p>
        ) : workouts.length === 0 ? (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '4rem', textAlign: 'center' }}>
            <Dumbbell size={40} style={{ color: 'var(--text-secondary)', margin: '0 auto 1rem' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>No workouts found.</p>
            <Link href="/workouts/new" style={{ color: 'var(--teal-secondary)', textDecoration: 'none', fontWeight: 600 }}>
              + Log workout
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {workouts.map((w) => {
              const badge = typeBadge(w.type)
              return (
                <Link key={w.id} href={`/workouts/${w.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: '0.75rem', padding: '1.25rem', cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--teal-primary)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontSize: '1.5rem' }}>{badge.icon}</span>
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
      </main>
    </div>
  )
}
