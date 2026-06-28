'use client'

import { useState, useEffect } from 'react'
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

const STRENGTH_EXERCISES = [
  'Back Squat', 'Front Squat', 'Deadlift', 'Romanian Deadlift',
  'Bench Press', 'Overhead Press', 'Barbell Row', 'Pull Up',
  'Chin Up', 'Dip', 'Push Up', 'Incline Bench Press',
  'Sumo Deadlift', 'Hip Thrust', 'Leg Press', 'Lunges',
  'Clean & Jerk', 'Snatch', 'Power Clean', 'Push Press',
]
const CONDITIONING_EXERCISES = [
  '400m Run', '800m Run', '1km Run', '5km Run', '10km Run',
  'Treadmill Sprint', 'Treadmill Endurance', 'Rowing 500m',
  'Rowing 2000m', 'Assault Bike', 'Jump Rope', 'Box Jump',
  'Burpees', 'Wall Balls', 'Kettlebell Swing',
]
const BASKETBALL_EXERCISES = [
  'Free Throw %', '3-Point %', 'Vertical Jump',
  'Sprint 20m', 'Sprint 40m', 'Agility T-Test',
]
const ALL_EXERCISES = [...STRENGTH_EXERCISES, ...CONDITIONING_EXERCISES, ...BASKETBALL_EXERCISES]

function getSuggestions(query: string, type: WorkoutType): string[] {
  if (!query.trim()) return []
  const q = query.toLowerCase()
  const ordered = type === 'basketball'
    ? [...BASKETBALL_EXERCISES, ...CONDITIONING_EXERCISES, ...STRENGTH_EXERCISES]
    : type === 'conditioning'
    ? [...CONDITIONING_EXERCISES, ...STRENGTH_EXERCISES, ...BASKETBALL_EXERCISES]
    : ALL_EXERCISES
  return ordered.filter(e => e.toLowerCase().includes(q)).slice(0, 6)
}

export default function WorkoutForm({ defaultType, templateId }: { defaultType?: string; templateId?: string }) {
  const router = useRouter()
  const [workoutType, setWorkoutType] = useState<WorkoutType>((defaultType as WorkoutType) ?? 'conditioning')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [duration, setDuration] = useState('')
  const [notes, setNotes] = useState('')
  const [exercises, setExercises] = useState<Exercise[]>([blank()])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeSuggestion, setActiveSuggestion] = useState<number | null>(null)
  const [sharedTemplates, setSharedTemplates] = useState<any[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [shareTemplate, setShareTemplate] = useState(false)
  const [templateSaved, setTemplateSaved] = useState(false)
  const [currentUserId, setCurrentUserId] = useState('')
  const [userRole, setUserRole] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setCurrentUserId(user.id)
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      setUserRole(profile?.role || 'member')
    })
    supabase.from('workout_templates').select('*, workout_template_exercises(*)').eq('is_shared', true).order('title')
      .then(({ data }) => setSharedTemplates(data ?? []))
  }, [])

  useEffect(() => {
    if (!templateId) return
    const supabase = createClient()
    supabase.from('workout_templates')
      .select('*, workout_template_exercises(*)')
      .eq('id', templateId)
      .single()
      .then(({ data: t }) => {
        if (!t) return
        setTitle(t.title)
        setWorkoutType(t.type as WorkoutType)
        if (t.description) setNotes(t.description)
        const exs = (t.workout_template_exercises || []).sort((a: any, b: any) => a.order_index - b.order_index)
        setExercises(exs.length > 0 ? exs.map((ex: any) => ({
          name: ex.name,
          sets: ex.sets?.toString() || '',
          reps: ex.reps?.toString() || '',
          weight: ex.weight?.toString() || '',
          duration: ex.duration?.toString() || '',
          notes: ex.notes || '',
        })) : [blank()])
        setSelectedTemplate(t)
      })
  }, [templateId])

  const handleSaveTemplate = async () => {
    if (!templateName.trim() || !currentUserId) return
    const supabase = createClient()
    const { data: tmpl } = await supabase
      .from('workout_templates')
      .insert({
        created_by: currentUserId,
        title: templateName.trim(),
        description: notes || null,
        type: workoutType,
        is_shared: shareTemplate && (userRole === 'coach' || userRole === 'admin'),
        is_default: false,
        is_visible_to_members: shareTemplate && userRole === 'admin',
      })
      .select()
      .single()
    if (tmpl && exercises.filter(e => e.name.trim()).length > 0) {
      await supabase.from('workout_template_exercises').insert(
        exercises
          .filter(e => e.name.trim())
          .map((ex, i) => ({
            template_id: tmpl.id,
            name: ex.name,
            sets: ex.sets ? Number(ex.sets) : null,
            reps: ex.reps ? Number(ex.reps) : null,
            weight: ex.weight ? Number(ex.weight) : null,
            duration: ex.duration ? Number(ex.duration) : null,
            notes: ex.notes || null,
            order_index: i,
          }))
      )
    }
    setTemplateSaved(true)
    setShowSaveTemplate(false)
    setTemplateName('')
    setShareTemplate(false)
    setTimeout(() => setTemplateSaved(false), 3000)
  }

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

      {/* Load from Shared Template */}
      {sharedTemplates.length > 0 && (
        <div>
          <label style={labelBase}>Load from Template</label>
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', paddingBottom: '4px' }}>
            {sharedTemplates.map(t => (
              <button key={t.id} type="button" onClick={() => {
                setSelectedTemplate(t)
                setTitle(t.title)
                setWorkoutType(t.type as WorkoutType)
                if (t.description) setNotes(t.description)
                const exs = t.workout_template_exercises.sort((a: any, b: any) => a.order_index - b.order_index)
                setExercises(exs.length > 0 ? exs.map((ex: any) => ({
                  name: ex.name, sets: ex.sets?.toString() || '', reps: ex.reps?.toString() || '',
                  weight: ex.weight?.toString() || '', duration: ex.duration?.toString() || '', notes: ex.notes || '',
                })) : [blank()])
              }} style={{
                flexShrink: 0, padding: '0.5rem 0.875rem', borderRadius: '0.5rem', textAlign: 'left', cursor: 'pointer',
                background: selectedTemplate?.id === t.id ? 'rgba(8,119,160,0.2)' : '#0d1a1e',
                border: `1px solid ${selectedTemplate?.id === t.id ? 'var(--teal-primary)' : '#1a2e34'}`,
                color: '#F2F2F2', minWidth: '130px', minHeight: 0,
              }}>
                <p style={{ fontWeight: 600, fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</p>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>{t.type} · {t.workout_template_exercises?.length || 0} exercises</p>
              </button>
            ))}
          </div>
          {selectedTemplate && (
            <p style={{ fontSize: '0.75rem', color: 'var(--teal-secondary)', marginTop: '0.375rem' }}>✓ Template loaded — you can still customize</p>
          )}
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
          {exercises.map((ex, idx) => {
            const suggestions = getSuggestions(ex.name, workoutType)
            return (
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

                {/* Exercise name with suggestions */}
                <div style={{ marginBottom: '0.75rem', position: 'relative' }}>
                  <label style={labelBase}>Name *</label>
                  <input
                    type="text"
                    value={ex.name}
                    onChange={(e) => { update(idx, 'name', e.target.value); setActiveSuggestion(idx) }}
                    onFocus={() => { if (ex.name.length > 0) setActiveSuggestion(idx) }}
                    onBlur={() => setTimeout(() => setActiveSuggestion(null), 150)}
                    style={inputBase}
                    placeholder="e.g. Bench Press"
                    autoComplete="off"
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
                          style={{
                            display: 'block', width: '100%', textAlign: 'left',
                            padding: '0.5rem 0.875rem', background: 'none', border: 'none',
                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                            color: '#F2F2F2', fontSize: '0.875rem', cursor: 'pointer',
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(8,119,160,0.15)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
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
            )
          })}
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

      {/* Save as Template */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
        {templateSaved && (
          <div style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '0.75rem', color: '#4ade80', fontSize: '0.875rem' }}>
            ✅ Template saved! Find it in the Templates library.
          </div>
        )}
        {!showSaveTemplate ? (
          <button
            type="button"
            onClick={() => setShowSaveTemplate(true)}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.6rem 1rem', color: 'var(--text-secondary)', fontSize: '0.875rem', cursor: 'pointer', width: '100%' }}
          >
            💾 Save Current Workout as Template
          </button>
        ) : (
          <div style={{ background: '#0a1518', border: '1px solid #1a2e34', borderRadius: '0.75rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>Save as Template</p>
            <input
              type="text"
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              placeholder="Template name (e.g. Monday Push Day)"
              style={inputBase}
            />
            {(userRole === 'coach' || userRole === 'admin') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                  <div
                    onClick={() => setShareTemplate(!shareTemplate)}
                    style={{
                      width: '40px', height: '24px', borderRadius: '999px', position: 'relative', flexShrink: 0,
                      background: shareTemplate ? 'var(--teal-primary)' : 'var(--border)', cursor: 'pointer', transition: 'background 0.2s',
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: '4px', width: '16px', height: '16px', borderRadius: '50%',
                      background: '#fff', transition: 'left 0.2s', left: shareTemplate ? '20px' : '4px',
                    }} />
                  </div>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Share with other coaches</span>
                </label>
                {shareTemplate && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--teal-secondary)' }}>✓ This template will appear in the "Shared by Coaches" tab for all coaches</p>
                )}
              </div>
            )}
            {userRole === 'member' && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>This template will be saved to your personal templates library.</p>
            )}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={handleSaveTemplate}
                disabled={!templateName.trim()}
                style={{ flex: 1, background: templateName.trim() ? 'var(--teal-primary)' : '#0d1a1e', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.625rem', fontWeight: 700, fontSize: '0.875rem', cursor: templateName.trim() ? 'pointer' : 'not-allowed' }}
              >
                Save Template
              </button>
              <button
                type="button"
                onClick={() => { setShowSaveTemplate(false); setTemplateName(''); setShareTemplate(false) }}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.625rem 0.875rem', color: 'var(--text-secondary)', fontSize: '0.875rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
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
