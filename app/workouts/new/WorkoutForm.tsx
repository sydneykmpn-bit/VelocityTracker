'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type WorkoutType = 'conditioning' | 'basketball' | 'both'

interface Exercise {
  name: string
  sets: string
  reps: string
  weight: string
  duration: string
  notes: string
}

const blank = (): Exercise => ({ name: '', sets: '', reps: '', weight: '', duration: '', notes: '' })

const inputBase: React.CSSProperties = {
  width: '100%',
  background: '#0d1a1e',
  border: '1px solid #1a2e34',
  borderRadius: '0.5rem',
  padding: '0.6rem 0.875rem',
  color: '#F2F2F2',
  fontSize: '0.875rem',
  outline: 'none',
}

const labelBase: React.CSSProperties = {
  display: 'block',
  fontSize: '0.7rem',
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: '0.375rem',
}

export default function WorkoutForm({ defaultType }: { defaultType?: string }) {
  const router = useRouter()
  const [workoutType, setWorkoutType] = useState<WorkoutType>((defaultType as WorkoutType) ?? 'conditioning')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [duration, setDuration] = useState('')
  const [notes, setNotes] = useState('')
  const [exercises, setExercises] = useState<Exercise[]>([blank()])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const update = (idx: number, field: keyof Exercise, val: string) => {
    const next = [...exercises]
    next[idx] = { ...next[idx], [field]: val }
    setExercises(next)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setError('Please enter a workout title'); return }
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: workout, error: wErr } = await supabase
      .from('workouts')
      .insert({
        user_id: user.id,
        title: title.trim(),
        type: workoutType,
        notes: notes.trim() || null,
        duration: duration ? parseInt(duration) : null,
        date: new Date(date).toISOString(),
      })
      .select()
      .single()

    if (wErr || !workout) { setError(wErr?.message ?? 'Failed to save'); setLoading(false); return }

    const valid = exercises.filter((ex) => ex.name.trim())
    if (valid.length > 0) {
      const { error: eErr } = await supabase.from('exercises').insert(
        valid.map((ex) => ({
          workout_id: workout.id,
          name: ex.name.trim(),
          sets: ex.sets ? parseInt(ex.sets) : null,
          reps: ex.reps ? parseInt(ex.reps) : null,
          weight: ex.weight ? parseFloat(ex.weight) : null,
          duration: ex.duration ? parseInt(ex.duration) : null,
          notes: ex.notes.trim() || null,
        }))
      )
      if (eErr) { setError(eErr.message); setLoading(false); return }
    }

    router.push('/workouts')
    router.refresh()
  }

  const typeOptions: { value: WorkoutType; emoji: string; label: string; sub: string }[] = [
    { value: 'conditioning', emoji: '🏋️', label: 'Conditioning', sub: 'Strength & cardio' },
    { value: 'basketball', emoji: '🏀', label: 'Basketball', sub: 'Drills & skill work' },
    { value: 'both', emoji: '💪', label: 'Both', sub: 'Combined session' },
  ]

  const showStrength = workoutType !== 'basketball'
  const showBall = workoutType !== 'conditioning'

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', padding: '0.75rem', color: '#f87171', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* Type */}
      <div>
        <label style={labelBase}>Workout Type</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
          {typeOptions.map((opt) => (
            <button key={opt.value} type="button" onClick={() => setWorkoutType(opt.value)} style={{
              background: workoutType === opt.value ? 'rgba(8,119,160,0.15)' : '#0d1a1e',
              border: `1px solid ${workoutType === opt.value ? 'var(--teal-primary)' : '#1a2e34'}`,
              borderRadius: '0.5rem', padding: '1rem 0.75rem',
              color: '#F2F2F2', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{opt.emoji}</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{opt.label}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{opt.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <label style={labelBase}>Workout Title *</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required style={inputBase} placeholder="e.g. Morning Strength Session" />
      </div>

      {/* Date + Duration */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label style={labelBase}>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputBase} />
        </div>
        <div>
          <label style={labelBase}>Duration (minutes)</label>
          <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} style={inputBase} placeholder="60" min="1" />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label style={labelBase}>Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...inputBase, minHeight: '80px', resize: 'vertical' }} placeholder="How did the session go?" />
      </div>

      {/* Exercises */}
      <div>
        <label style={{ ...labelBase, marginBottom: '0.75rem' }}>Exercises</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {exercises.map((ex, idx) => (
            <div key={idx} style={{ background: '#0a1518', border: '1px solid #1a2e34', borderRadius: '0.5rem', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--teal-secondary)', fontWeight: 700, letterSpacing: '0.08em' }}>
                  EXERCISE {idx + 1}
                </span>
                {exercises.length > 1 && (
                  <button type="button" onClick={() => setExercises(exercises.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex' }}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={labelBase}>Name *</label>
                <input type="text" value={ex.name} onChange={(e) => update(idx, 'name', e.target.value)} style={inputBase} placeholder="e.g. Bench Press" />
              </div>
              {showStrength && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  {(['sets', 'reps', 'weight'] as const).map((f) => (
                    <div key={f}>
                      <label style={labelBase}>{f === 'weight' ? 'Weight (kg)' : f.charAt(0).toUpperCase() + f.slice(1)}</label>
                      <input type="number" value={ex[f]} onChange={(e) => update(idx, f, e.target.value)} style={inputBase} placeholder={f === 'weight' ? '50' : f === 'sets' ? '3' : '10'} step={f === 'weight' ? '0.5' : '1'} min="0" />
                    </div>
                  ))}
                </div>
              )}
              {showBall && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label style={labelBase}>Duration (min)</label>
                    <input type="number" value={ex.duration} onChange={(e) => update(idx, 'duration', e.target.value)} style={inputBase} placeholder="15" min="0" />
                  </div>
                  <div>
                    <label style={labelBase}>Notes</label>
                    <input type="text" value={ex.notes} onChange={(e) => update(idx, 'notes', e.target.value)} style={inputBase} placeholder="e.g. Focus on form" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setExercises([...exercises, blank()])} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          width: '100%', marginTop: '0.75rem',
          background: 'transparent', border: '1px dashed #1a2e34', borderRadius: '0.5rem',
          padding: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.875rem',
          transition: 'all 0.2s',
        }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--teal-primary)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--teal-secondary)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#1a2e34'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)' }}
        >
          <Plus size={16} /> Add Exercise
        </button>
      </div>

      <button type="submit" disabled={loading} style={{
        background: loading ? '#0d1a1e' : 'var(--teal-primary)', color: 'white',
        border: 'none', borderRadius: '0.5rem', padding: '0.875rem',
        fontWeight: 700, fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'background 0.2s',
      }}>
        {loading ? 'Saving…' : 'Save Workout'}
      </button>
    </form>
  )
}
