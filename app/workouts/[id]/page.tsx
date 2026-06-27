import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import DeleteWorkoutButton from './DeleteWorkoutButton'

function typeStyle(type: string) {
  const map: Record<string, { color: string; icon: string }> = {
    basketball: { color: '#34bac2', icon: '🏀' },
    conditioning: { color: '#4ade80', icon: '🏋️' },
    both: { color: '#c084fc', icon: '💪' },
  }
  return map[type] ?? map.both
}

export default async function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { data: workout } = await supabase
    .from('workouts')
    .select('*, exercises(*)')
    .eq('id', id)
    .single()

  if (!workout) redirect('/workouts')

  const ts = typeStyle(workout.type)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      <Navbar />
      <main style={{ maxWidth: '700px', margin: '0 auto', padding: '2rem 1.5rem' }}>

        <Link href="/workouts" style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem', marginBottom: '1.5rem',
        }}>
          <ArrowLeft size={16} /> Back to Workouts
        </Link>

        {/* Header card */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '1rem', padding: '2rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem' }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: '2rem', letterSpacing: '0.03em', marginBottom: '0.4rem' }}>
                {workout.title}
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                {new Date(workout.date ?? workout.created_at).toLocaleDateString('en-US', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                })}
                {workout.duration ? ` · ${workout.duration} minutes` : ''}
              </p>
            </div>
            <span style={{
              fontSize: '0.75rem', fontWeight: 700, padding: '0.375rem 0.875rem',
              borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.07em',
              color: ts.color, background: `${ts.color}22`, border: `1px solid ${ts.color}44`,
            }}>
              {ts.icon} {workout.type}
            </span>
          </div>
          {workout.notes && (
            <p style={{
              color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.65,
              background: '#0d1a1e', borderRadius: '0.5rem', padding: '0.875rem',
            }}>
              {workout.notes}
            </p>
          )}
        </div>

        {/* Exercises */}
        {workout.exercises && workout.exercises.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', letterSpacing: '0.03em', marginBottom: '1rem' }}>
              EXERCISES ({workout.exercises.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {(workout.exercises as any[]).map((ex, idx) => (
                <div key={ex.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <span style={{
                      background: 'rgba(8,119,160,0.15)', color: 'var(--teal-secondary)',
                      width: '28px', height: '28px', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
                    }}>
                      {idx + 1}
                    </span>
                    <h3 style={{ fontWeight: 600 }}>{ex.name}</h3>
                  </div>
                  <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                    {ex.sets && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}><strong style={{ color: '#F2F2F2' }}>{ex.sets}</strong> sets</span>}
                    {ex.reps && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}><strong style={{ color: '#F2F2F2' }}>{ex.reps}</strong> reps</span>}
                    {ex.weight && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}><strong style={{ color: '#F2F2F2' }}>{ex.weight}</strong> kg</span>}
                    {ex.duration && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}><strong style={{ color: '#F2F2F2' }}>{ex.duration}</strong> min</span>}
                  </div>
                  {ex.notes && <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{ex.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        <DeleteWorkoutButton workoutId={workout.id} />
      </main>
    </div>
  )
}
