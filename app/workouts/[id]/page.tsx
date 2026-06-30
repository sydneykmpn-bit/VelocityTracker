'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Trash2, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const TYPE_STYLE: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  basketball: { color: '#34bac2', bg: 'rgba(8,119,160,0.2)', border: 'rgba(8,119,160,0.35)', icon: '🏀' },
  conditioning: { color: '#4ade80', bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.25)', icon: '🏋️' },
  both: { color: '#c084fc', bg: 'rgba(168,85,247,0.15)', border: 'rgba(168,85,247,0.25)', icon: '💪' },
}

export default function WorkoutDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [workout, setWorkout] = useState<any>(null)
  const [exercises, setExercises] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: w } = await supabase
        .from('workouts')
        .select('*')
        .eq('id', id)
        .single()

      if (!w) { router.push('/workouts'); return }
      setWorkout(w)

      const { data: exs } = await supabase
        .from('exercises')
        .select('*')
        .eq('workout_id', id)
        .order('id')
      setExercises(exs ?? [])
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleDelete = async () => {
    if (!confirming) { setConfirming(true); return }
    setDeleting(true)
    await supabase.from('workouts').delete().eq('id', id)
    router.push('/workouts')
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>
      </div>
    )
  }

  const ts = TYPE_STYLE[workout.type] ?? TYPE_STYLE.both

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      <main style={{ maxWidth: '700px', margin: '0 auto', padding: '2rem 1rem' }}>

        <Link href="/workouts" style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem',
          marginBottom: '1.5rem', minHeight: 0,
        }}>
          <ArrowLeft size={16} /> Back to Workouts
        </Link>

        {/* Header card */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '1rem', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem' }}>
            <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: '2rem', letterSpacing: '0.03em' }}>
              {workout.title}
            </h1>
            <span style={{
              fontSize: '0.75rem', fontWeight: 700, padding: '0.375rem 0.875rem',
              borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.07em',
              color: ts.color, background: ts.bg, border: `1px solid ${ts.border}`,
              whiteSpace: 'nowrap',
            }}>
              {ts.icon} {workout.type}
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: workout.notes ? '1rem' : 0 }}>
            <span>{new Date(workout.date ?? workout.created_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            {workout.duration && <span>· {workout.duration} min</span>}
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
        <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', letterSpacing: '0.03em', marginBottom: '1rem' }}>
          EXERCISES ({exercises.length})
        </h2>

        {exercises.length === 0 ? (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '2.5rem', textAlign: 'center', marginBottom: '1.5rem' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No exercises logged for this workout.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {exercises.map((ex) => (
              <div key={ex.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.25rem' }}>
                <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.625rem' }}>{ex.name}</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem' }}>
                  {ex.sets && ex.reps && (
                    <span style={{ fontSize: '0.8rem', color: '#F2F2F2', background: 'rgba(8,119,160,0.15)', border: '1px solid rgba(8,119,160,0.25)', borderRadius: '0.375rem', padding: '0.2rem 0.5rem' }}>
                      {ex.sets} × {ex.reps}
                    </span>
                  )}
                  {ex.sets && !ex.reps && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{ex.sets} sets</span>}
                  {!ex.sets && ex.reps && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{ex.reps} reps</span>}
                  {ex.weight && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}><strong style={{ color: '#F2F2F2' }}>{ex.weight}</strong> kg</span>}
                  {ex.duration && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}><strong style={{ color: '#F2F2F2' }}>{ex.duration}</strong> min</span>}
                  {ex.distance && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}><strong style={{ color: '#F2F2F2' }}>{ex.distance}</strong> km</span>}
                  {(ex as any).speed && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}><strong style={{ color: '#F2F2F2' }}>{(ex as any).speed}</strong> km/h</span>}
                </div>
                {ex.notes && (
                  <p style={{ marginTop: '0.5rem', fontSize: '0.775rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{ex.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href={`/workouts/${id}/edit`} style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            background: 'transparent', color: 'var(--text-secondary)',
            border: '1px solid var(--border)', borderRadius: '0.5rem',
            padding: '0.75rem 1.25rem', textDecoration: 'none',
            fontSize: '0.875rem', fontWeight: 500, flex: '1 1 auto', minHeight: 44,
          }}>
            <Pencil size={15} /> Edit Workout
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              background: confirming ? 'rgba(239,68,68,0.15)' : 'transparent',
              color: confirming ? '#f87171' : 'var(--text-secondary)',
              border: `1px solid ${confirming ? 'rgba(239,68,68,0.4)' : 'var(--border)'}`,
              borderRadius: '0.5rem', padding: '0.75rem 1.25rem',
              cursor: deleting ? 'not-allowed' : 'pointer', fontSize: '0.875rem',
              fontWeight: 500, transition: 'all 0.2s', flex: '1 1 auto',
            }}
          >
            <Trash2 size={16} />
            {deleting ? 'Deleting…' : confirming ? 'Confirm Delete' : 'Delete Workout'}
          </button>
        </div>

      </main>
    </div>
  )
}
