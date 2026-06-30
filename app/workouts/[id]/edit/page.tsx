'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getLocalDateString } from '@/lib/utils'

type WorkoutType = 'conditioning' | 'basketball' | 'both'

interface ExerciseRow {
  name: string; sets: string; reps: string; weight: string; duration: string; distance: string; speed: string; isRunning: boolean; notes: string
}

const blank = (): ExerciseRow => ({ name: '', sets: '', reps: '', weight: '', duration: '', distance: '', speed: '', isRunning: false, notes: '' })

const inputBase: React.CSSProperties = {
  width: '100%', background: '#0d1a1e', border: '1px solid #1a2e34',
  borderRadius: '0.5rem', padding: '0.6rem 0.875rem', color: '#F2F2F2',
  fontSize: '1rem', outline: 'none',
}
const labelBase: React.CSSProperties = {
  display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)',
  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.375rem',
}

const EXERCISES_BY_TYPE: Record<WorkoutType, string[]> = {
  conditioning: [
    'Back Squat','Front Squat','Deadlift','Romanian Deadlift','Bench Press','Overhead Press',
    'Barbell Row','Pull Up','Chin Up','Dip','Push Up','Incline Bench Press','Sumo Deadlift',
    'Hip Thrust','Leg Press','Lunges','Clean & Jerk','Snatch','Power Clean','Push Press',
    '400m Run','800m Run','1km Run','5km Run','10km Run','Treadmill Sprint','Treadmill Endurance',
    'Rowing 500m','Rowing 2000m','Assault Bike','Jump Rope','Box Jump','Burpees','Wall Balls','Kettlebell Swing',
  ],
  basketball: [
    'Free Throw %','3-Point %','Vertical Jump','Sprint 20m','Sprint 40m','Agility T-Test',
    '400m Run','800m Run','1km Run','Treadmill Sprint','Jump Rope','Box Jump','Burpees',
    'Back Squat','Deadlift','Overhead Press','Push Up','Pull Up',
  ],
  both: [
    'Back Squat','Front Squat','Deadlift','Romanian Deadlift','Bench Press','Overhead Press',
    'Barbell Row','Pull Up','Chin Up','Dip','Push Up',
    'Free Throw %','3-Point %','Vertical Jump','Sprint 20m','Sprint 40m','Agility T-Test',
    '400m Run','800m Run','1km Run','5km Run','Treadmill Sprint','Treadmill Endurance',
    'Rowing 500m','Assault Bike','Jump Rope','Box Jump','Burpees','Kettlebell Swing',
  ],
}

function getExerciseList(type: WorkoutType): string[] {
  return EXERCISES_BY_TYPE[type]
}

function getSuggestions(query: string, type: WorkoutType): string[] {
  if (!query.trim()) return []
  const q = query.toLowerCase()
  return getExerciseList(type).filter(e => e.toLowerCase().includes(q)).slice(0, 6)
}

function isRunningExercise(name: string): boolean {
  const keywords = ['run', 'sprint', 'treadmill', 'rowing', 'bike', 'assault', 'jump rope']
  return keywords.some(k => name.toLowerCase().includes(k))
}

export default function EditWorkoutPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [workoutType, setWorkoutType] = useState<WorkoutType>('conditioning')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(getLocalDateString())
  const [duration, setDuration] = useState('')
  const [notes, setNotes] = useState('')
  const [exercises, setExercises] = useState<ExerciseRow[]>([blank()])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [activeSuggestion, setActiveSuggestion] = useState<number | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: w } = await supabase.from('workouts').select('*').eq('id', id).single()
      if (!w) { router.push('/workouts'); return }

      setTitle(w.title ?? '')
      setWorkoutType(w.type ?? 'conditioning')
      setDate(w.date ? w.date.split('T')[0] : getLocalDateString())
      setDuration(w.duration ? String(w.duration) : '')
      setNotes(w.notes ?? '')

      const { data: exs } = await supabase.from('exercises').select('*').eq('workout_id', id).order('id')
      if (exs && exs.length > 0) {
        setExercises(exs.map(ex => ({
          name: ex.name ?? '',
          sets: ex.sets ? String(ex.sets) : '',
          reps: ex.reps ? String(ex.reps) : '',
          weight: ex.weight ? String(ex.weight) : '',
          duration: ex.duration ? String(ex.duration) : '',
          distance: ex.distance ? String(ex.distance) : '',
          speed: ex.speed ? String(ex.speed) : '',
          isRunning: false,
          notes: ex.notes ?? '',
        })))
      }
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const update = (idx: number, field: keyof ExerciseRow, val: string | boolean) => {
    setExercises(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: val }
      return next
    })
  }

  const removeExercise = (indexToRemove: number) => {
    setExercises(prev => prev.filter((_, i) => i !== indexToRemove))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setError('Please enter a workout title'); return }
    setSaving(true); setError('')

    try {
      const { error: workoutErr } = await supabase.from('workouts').update({
        title: title.trim(),
        type: workoutType,
        date: new Date(date).toISOString(),
        duration: duration ? Number(duration) : null,
        notes: notes.trim() || null,
      }).eq('id', id)
      if (workoutErr) throw workoutErr

      const { error: deleteErr } = await supabase.from('exercises').delete().eq('workout_id', id)
      if (deleteErr) throw deleteErr

      const valid = exercises.filter(ex => ex.name.trim())
      if (valid.length > 0) {
        const { error: insertErr } = await supabase.from('exercises').insert(
          valid.map(ex => ({
            workout_id: id,
            name: ex.name.trim(),
            sets: ex.sets ? parseInt(ex.sets) : null,
            reps: ex.reps ? parseInt(ex.reps) : null,
            weight: ex.weight ? parseFloat(ex.weight) : null,
            duration: ex.duration ? parseInt(ex.duration) : null,
            distance: ex.distance ? parseFloat(ex.distance) : null,
            speed: ex.speed ? parseFloat(ex.speed) : null,
            notes: ex.notes.trim() || null,
          }))
        )
        if (insertErr) throw insertErr
      }

      router.push(`/workouts/${id}`)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save workout. Please try again.')
      setSaving(false)
    }
  }

  const typeOptions: { value: WorkoutType; emoji: string; label: string }[] = [
    { value: 'conditioning', emoji: '🏋️', label: 'Conditioning' },
    { value: 'basketball', emoji: '🏀', label: 'Basketball' },
    { value: 'both', emoji: '💪', label: 'Both' },
  ]

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      <main style={{ maxWidth: '700px', margin: '0 auto', padding: '2rem 1rem 0' }}>
        <Link href={`/workouts/${id}`} style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem',
          marginBottom: '1.5rem', minHeight: 0,
        }}>
          <ArrowLeft size={16} /> Back
        </Link>

        <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: '2.5rem', letterSpacing: '0.03em', marginBottom: '1.5rem' }}>
          EDIT WORKOUT
        </h1>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '1rem', padding: '1.5rem', marginBottom: '1rem' }}>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', padding: '0.75rem', color: '#f87171', fontSize: '0.875rem', marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Type */}
            <div>
              <label style={labelBase}>Workout Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                {typeOptions.map(opt => (
                  <button key={opt.value} type="button" onClick={() => setWorkoutType(opt.value)} style={{
                    background: workoutType === opt.value ? 'rgba(8,119,160,0.15)' : '#0d1a1e',
                    border: `1px solid ${workoutType === opt.value ? 'var(--teal-primary)' : '#1a2e34'}`,
                    borderRadius: '0.5rem', padding: '0.875rem 0.5rem',
                    color: '#F2F2F2', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
                  }}>
                    <div style={{ fontSize: '1.25rem', marginBottom: '0.2rem' }}>{opt.emoji}</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{opt.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label style={labelBase}>Workout Title *</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} required style={inputBase} placeholder="e.g. Morning Strength Session" />
            </div>

            {/* Date + Duration */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelBase}>Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputBase} />
              </div>
              <div>
                <label style={labelBase}>Duration (min)</label>
                <input type="number" value={duration} onChange={e => setDuration(e.target.value)} style={inputBase} placeholder="60" min="1" />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label style={labelBase}>Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} style={{ ...inputBase, minHeight: '80px', resize: 'vertical' }} placeholder="How did the session go?" />
            </div>

            {/* Exercises */}
            <div>
              <label style={{ ...labelBase, marginBottom: '0.75rem' }}>Exercises</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {exercises.map((ex, idx) => {
                  const suggestions = getSuggestions(ex.name, workoutType)
                  const running = isRunningExercise(ex.name) || ex.isRunning
                  return (
                    <div key={idx} style={{ background: '#0a1518', border: '1px solid #1a2e34', borderRadius: '0.5rem', padding: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--teal-secondary)', fontWeight: 700, letterSpacing: '0.08em' }}>EXERCISE {idx + 1}</span>
                        {exercises.length > 1 && (
                          <button type="button" onClick={() => removeExercise(idx)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', minHeight: 0 }}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                        <label style={labelBase}>Name *</label>
                        <input
                          type="text" value={ex.name} autoComplete="off"
                          onChange={e => { update(idx, 'name', e.target.value); setActiveSuggestion(idx) }}
                          onFocus={() => ex.name.length > 0 && setActiveSuggestion(idx)}
                          onBlur={() => setTimeout(() => setActiveSuggestion(null), 150)}
                          style={inputBase} placeholder="e.g. Bench Press"
                        />
                        {activeSuggestion === idx && suggestions.length > 0 && (
                          <div style={{
                            position: 'absolute', top: 'calc(100% - 1px)', left: 0, right: 0, zIndex: 20,
                            background: 'var(--surface)', border: '1px solid var(--border)',
                            borderRadius: '0 0 0.5rem 0.5rem', maxHeight: '180px', overflowY: 'auto',
                          }}>
                            {suggestions.map(s => (
                              <button key={s} type="button"
                                onMouseDown={() => { update(idx, 'name', s); setActiveSuggestion(null) }}
                                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.5rem 0.875rem', background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#F2F2F2', fontSize: '0.875rem', cursor: 'pointer', minHeight: 36 }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(8,119,160,0.15)' }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
                              >{s}</button>
                            ))}
                          </div>
                        )}
                      </div>
                      {running ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <div>
                            <label style={labelBase}>Duration (min)</label>
                            <input type="number" value={ex.duration} onChange={e => update(idx, 'duration', e.target.value)} style={inputBase} placeholder="30" min="0" />
                          </div>
                          <div>
                            <label style={labelBase}>Distance (km)</label>
                            <input type="number" value={ex.distance} onChange={e => update(idx, 'distance', e.target.value)} style={inputBase} placeholder="5" step="0.01" min="0" />
                          </div>
                          <div>
                            <label style={labelBase}>Speed (km/h)</label>
                            <input type="number" value={ex.speed} onChange={e => update(idx, 'speed', e.target.value)} style={inputBase} placeholder="10" step="0.1" min="0" />
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          {(['sets', 'reps', 'weight'] as const).map(f => (
                            <div key={f}>
                              <label style={labelBase}>{f === 'weight' ? 'Weight (kg)' : f.charAt(0).toUpperCase() + f.slice(1)}</label>
                              <input type="number" value={ex[f]} onChange={e => update(idx, f, e.target.value)} style={inputBase} placeholder={f === 'weight' ? '50' : f === 'sets' ? '3' : '10'} step={f === 'weight' ? '0.5' : '1'} min="0" />
                            </div>
                          ))}
                        </div>
                      )}
                      <div>
                        <label style={labelBase}>Notes</label>
                        <input type="text" value={ex.notes} onChange={e => update(idx, 'notes', e.target.value)} style={inputBase} placeholder="Focus on form" />
                      </div>
                    </div>
                  )
                })}
              </div>
              <button type="button" onClick={() => setExercises(prev => [...prev, blank()])} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                width: '100%', marginTop: '0.75rem',
                background: 'transparent', border: '1px dashed #1a2e34', borderRadius: '0.5rem',
                padding: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.875rem',
              }}>
                <Plus size={16} /> Add Exercise
              </button>
            </div>

            {/* Submit — sticky on mobile */}
            <div className="sticky-submit-mobile">
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Link href={`/workouts/${id}`} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'transparent', color: 'var(--text-secondary)',
                  border: '1px solid var(--border)', borderRadius: '0.5rem',
                  padding: '0.875rem', fontWeight: 600, fontSize: '0.875rem',
                  flex: '1', textDecoration: 'none',
                }}>
                  Cancel
                </Link>
                <button type="submit" disabled={saving} style={{
                  background: saving ? '#0d1a1e' : 'var(--teal-primary)', color: 'white',
                  border: 'none', borderRadius: '0.5rem', padding: '0.875rem',
                  fontWeight: 700, fontSize: '1rem', cursor: saving ? 'not-allowed' : 'pointer',
                  flex: '2', transition: 'background 0.2s',
                }}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </div>
        <div style={{ height: '2rem' }} />
      </main>
    </div>
  )
}
