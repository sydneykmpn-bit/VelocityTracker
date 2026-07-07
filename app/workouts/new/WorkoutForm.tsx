'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getLocalDateString } from '@/lib/utils'

type WorkoutType = 'conditioning' | 'basketball' | 'both'

interface Exercise {
  name: string
  sets: string
  reps: string
  weight: string
  duration: string
  distance: string
  speed: string
  isRunning: boolean
  notes: string
  section: 'conditioning' | 'basketball'
  drillCategory: string
}

const blank = (): Exercise => ({
  name: '', sets: '', reps: '', weight: '', duration: '',
  distance: '', speed: '', isRunning: false, notes: '',
  section: 'conditioning',
  drillCategory: 'Shooting',
})

const FEATURED_EXERCISES_BY_TYPE: Record<string, { name: string; icon: string }[]> = {
  conditioning: [
    { name: 'Back Squat', icon: '🏋️' },
    { name: 'Bench Press', icon: '🛋️' },
    { name: 'Deadlift', icon: '💀' },
    { name: 'Overhead Press', icon: '☝️' },
    { name: 'Barbell Row', icon: '🔄' },
    { name: 'Pull Up', icon: '⬆️' },
  ],
  basketball: [
    { name: 'Free Throw %', icon: '🎯' },
    { name: 'Sprint 20m', icon: '💨' },
    { name: 'Sprint', icon: '💨' },
    { name: 'Vertical Jump', icon: '⬆️' },
    { name: '3-Point %', icon: '🏀' },
    { name: 'Agility T-Test', icon: '⚡' },
  ],
  both: [
    { name: 'Back Squat', icon: '🏋️' },
    { name: 'Sprint', icon: '💨' },
    { name: 'Deadlift', icon: '💀' },
    { name: 'Vertical Jump', icon: '⬆️' },
  ],
}

const RUNNING_EXERCISES: { name: string; icon: string }[] = [
  { name: 'Run / Jog', icon: '🏃' },
  { name: 'Treadmill', icon: '🏃' },
]

function isRunningExercise(name: string): boolean {
  const keywords = ['run', 'sprint', 'treadmill', 'rowing', 'bike', 'assault', 'jump rope']
  return keywords.some(k => name.toLowerCase().includes(k))
}

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
  'Run / Jog', 'Treadmill Sprint', 'Treadmill Endurance',
  'Rowing', 'Assault Bike', 'Jump Rope', 'Box Jump',
  'Burpees', 'Wall Balls', 'Kettlebell Swing',
]
const BASKETBALL_EXERCISES = [
  'Free Throw %', '3-Point %', 'Vertical Jump',
  'Sprint 20m', 'Sprint', 'Agility T-Test',
]
const ALL_EXERCISES = [...STRENGTH_EXERCISES, ...CONDITIONING_EXERCISES, ...BASKETBALL_EXERCISES]

function getSuggestions(query: string, type: WorkoutType, section?: 'conditioning' | 'basketball'): string[] {
  if (!query.trim()) return []
  const q = query.toLowerCase()

  // When type is 'both', use the individual exercise's section to determine suggestions
  const effectiveType = type === 'both' && section ? section : type

  const ordered = effectiveType === 'basketball'
    ? [...BASKETBALL_EXERCISES, ...CONDITIONING_EXERCISES, ...STRENGTH_EXERCISES]
    : effectiveType === 'conditioning'
    ? [...CONDITIONING_EXERCISES, ...STRENGTH_EXERCISES, ...BASKETBALL_EXERCISES]
    : ALL_EXERCISES

  return ordered.filter(e => e.toLowerCase().includes(q)).slice(0, 6)
}

interface Drill {
  name: string
  category: string
  attempts: string
  made: string
}

const DRILL_CATEGORIES = ['Shooting', 'Ball Handling', 'Finishing', 'Defense', 'Conditioning', 'Footwork', 'Passing', 'Rebounding']
const INTENSITY_OPTIONS = ['Low', 'Medium', 'High', 'Max']

const DRILLS_BY_CATEGORY: Record<string, string[]> = {
  'Shooting': [
    'Free Throw %', '3-Point %', 'Mid-Range Shooting', 'Catch & Shoot',
    'Off-Dribble Shooting', 'Fadeaway', 'Pull-Up Jumper', 'Corner 3',
    'Bank Shot', 'Floater',
  ],
  'Ball Handling': [
    'Figure 8 Dribble', 'Crossover', 'Behind-the-Back', 'Between-the-Legs',
    'Hesitation Move', 'Spin Move', 'In & Out Dribble', 'Two-Ball Dribbling',
  ],
  'Finishing': [
    'Layup Drills', 'Euro Step', 'And-One Layup', 'Reverse Layup',
    'Drop Step', 'Post Moves', 'Up-and-Under', 'Power Layup',
  ],
  'Defense': [
    'Defensive Slides', 'Close-Out Drills', 'Help Defense',
    'Pick & Roll Defense', 'Deny Defense', 'Box Out Drill',
  ],
  'Conditioning': [
    'Suicide Drills', 'Full Court Sprint', 'Sprint', 'Sprint 20m',
    'Agility T-Test', 'Lateral Shuffle', 'Vertical Jump', 'Jump Rope',
  ],
  'Footwork': [
    'Pivot Drills', 'Jab Step', 'Ladder Drills', 'Cone Drills',
    'Defensive Shuffle', 'Drop Step Footwork', 'Triple Threat Position',
  ],
  'Passing': [
    'Chest Pass', 'Bounce Pass', 'Overhead Pass', 'Outlet Pass',
    'Pick & Roll Drill', 'Two-Man Passing', 'Skip Pass',
  ],
  'Rebounding': [
    'Box Out Drill', 'Tip Drill', 'Rebounding Circles',
    'Outlet Pass After Rebound', 'Weak Side Rebounding',
  ],
}

function getDrillSuggestions(query: string, category: string): string[] {
  const pool = DRILLS_BY_CATEGORY[category] || []
  if (!query.trim()) return pool.slice(0, 6)
  const q = query.toLowerCase()
  return pool.filter(d => d.toLowerCase().includes(q)).slice(0, 7)
}

export default function WorkoutForm({ defaultType, templateId }: { defaultType?: string; templateId?: string }) {
  const router = useRouter()
  const [workoutType, setWorkoutType] = useState<WorkoutType>((defaultType as WorkoutType) ?? 'conditioning')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(getLocalDateString())
  const [duration, setDuration] = useState('')
  const [notes, setNotes] = useState('')
  const [exercises, setExercises] = useState<Exercise[]>([blank()])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeSuggestion, setActiveSuggestion] = useState<number | null>(null)
  const [sharedTemplates, setSharedTemplates] = useState<any[]>([])
  const [myTemplates, setMyTemplates] = useState<any[]>([])
  const [templateSource, setTemplateSource] = useState<'shared' | 'mine'>('shared')
  const [templateDropdownOpen, setTemplateDropdownOpen] = useState(false)
  const [templateSearch, setTemplateSearch] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [shareTemplate, setShareTemplate] = useState(false)
  const [templateSaved, setTemplateSaved] = useState(false)
  const [currentUserId, setCurrentUserId] = useState('')
  const [userRole, setUserRole] = useState('')

  const [drills, setDrills] = useState<Drill[]>([{ name: '', category: 'Shooting', attempts: '', made: '' }])
  const [intensity, setIntensity] = useState('Medium')
  const [location, setLocation] = useState('')
  const [activeDrillSuggestion, setActiveDrillSuggestion] = useState<number | null>(null)

  const addDrill = () => setDrills(prev => [...prev, { name: '', category: 'Shooting', attempts: '', made: '' }])
  const removeDrill = (i: number) => setDrills(prev => prev.filter((_, idx) => idx !== i))
  const updateDrill = (i: number, field: keyof Drill, value: string) =>
    setDrills(prev => prev.map((d, idx) => idx === i ? { ...d, [field]: value } : d))

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setCurrentUserId(user.id)
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      setUserRole(profile?.role || 'member')

      const { data: shared } = await supabase
        .from('workout_templates')
        .select('*, workout_template_exercises(*)')
        .eq('is_shared', true)
        .eq('is_default', false)
        .order('title')
      setSharedTemplates(shared ?? [])

      const { data: mine } = await supabase
        .from('workout_templates')
        .select('*, workout_template_exercises(*)')
        .eq('created_by', user.id)
        .eq('is_default', false)
        .order('title')
      setMyTemplates(mine ?? [])
    })
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
          ...blank(),
          name: ex.name,
          sets: ex.sets?.toString() || '',
          reps: ex.reps?.toString() || '',
          weight: ex.weight?.toString() || '',
          duration: ex.duration?.toString() || '',
          distance: ex.distance?.toString() || '',
          isRunning: isRunningExercise(ex.name),
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

    const workoutNotes = workoutType === 'basketball'
      ? [notes, `Intensity: ${intensity}`, location ? `Location: ${location}` : ''].filter(Boolean).join('\n')
      : notes

    const { data: workout, error: wErr } = await supabase
      .from('workouts')
      .insert({
        user_id: user.id,
        title: title.trim(),
        type: workoutType,
        notes: workoutNotes.trim() || null,
        duration: duration ? parseInt(duration) : null,
        date: new Date(date).toISOString(),
      })
      .select()
      .single()

    if (wErr || !workout) { setError(wErr?.message ?? 'Failed to save'); setLoading(false); return }

    if (workoutType === 'basketball') {
      const validDrills = drills.filter(d => d.name.trim())
      if (validDrills.length > 0) {
        const { error: dErr } = await supabase.from('exercises').insert(
          validDrills.map(d => ({
            workout_id: workout.id,
            name: d.name.trim(),
            sets: d.attempts ? Number(d.attempts) : null,
            reps: d.made ? Number(d.made) : null,
            notes: d.category,
          }))
        )
        if (dErr) { setError(dErr.message); setLoading(false); return }
      }
    } else {
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
            distance: ex.distance ? parseFloat(ex.distance) : null,
            ...(isRunningExercise(ex.name) && ex.speed ? { speed: parseFloat(ex.speed) } : {}),
            notes: workoutType === 'both' && ex.section === 'basketball'
              ? `Basketball${ex.notes ? ' · ' + ex.notes : ''}`
              : ex.notes.trim() || null,
          }))
        )
        if (eErr) { setError(eErr.message); setLoading(false); return }
      }
    }

    router.push('/workouts')
    router.refresh()
  }

  const typeOptions: { value: WorkoutType; emoji: string; label: string; sub: string }[] = [
    { value: 'conditioning', emoji: '🏋️', label: 'Conditioning', sub: 'Strength & cardio' },
    { value: 'basketball', emoji: '🏀', label: 'Basketball', sub: 'Drills & skill work' },
    { value: 'both', emoji: '💪', label: 'Both', sub: 'Combined session' },
  ]

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', padding: '0.75rem', color: '#f87171', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* Load from Template — dropdown */}
      {(sharedTemplates.length > 0 || myTemplates.length > 0) && (
        <div>
          <label style={labelBase}>Load from Template</label>
          <div style={{ position: 'relative' }}>
            {/* Source toggle */}
            <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.5rem' }}>
              {(['shared', 'mine'] as const).map(src => (
                <button key={src} type="button"
                  onClick={() => { setTemplateSource(src); setTemplateSearch('') }}
                  style={{
                    padding: '0.3rem 0.75rem', borderRadius: '999px',
                    fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer',
                    border: 'none',
                    background: templateSource === src ? 'var(--teal-primary)' : '#1a2e34',
                    color: templateSource === src ? '#fff' : 'var(--text-secondary)',
                  }}>
                  {src === 'shared' ? '👨‍💼 Shared by Coach' : '📋 My Templates'}
                </button>
              ))}
            </div>

            {/* Dropdown trigger */}
            <button type="button"
              onClick={() => setTemplateDropdownOpen(prev => !prev)}
              style={{
                width: '100%', background: '#0d1a1e', border: '1px solid #1a2e34',
                borderRadius: '0.5rem', padding: '0.7rem 1rem',
                color: selectedTemplate ? '#F2F2F2' : 'var(--text-secondary)',
                fontSize: '0.875rem', cursor: 'pointer', textAlign: 'left',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
              <span>{selectedTemplate ? selectedTemplate.title : `Select a template...`}</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                {templateDropdownOpen ? '▲' : '▼'}
              </span>
            </button>

            {/* Dropdown list */}
            {templateDropdownOpen && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                background: '#0d1a1e', border: '1px solid #1a2e34',
                borderRadius: '0.5rem', overflow: 'hidden', marginTop: '2px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.6)', maxHeight: '240px', overflowY: 'auto',
              }}>
                {/* Search inside dropdown */}
                <div style={{ padding: '0.5rem', borderBottom: '1px solid #1a2e34' }}>
                  <input
                    type="text"
                    value={templateSearch}
                    onChange={e => setTemplateSearch(e.target.value)}
                    placeholder="Search templates..."
                    style={{ width: '100%', background: '#111b20', border: '1px solid #1a2e34', borderRadius: '0.375rem', padding: '0.4rem 0.625rem', color: '#F2F2F2', fontSize: '0.8rem', outline: 'none' }}
                    onClick={e => e.stopPropagation()}
                  />
                </div>

                {/* Template list filtered by source + search */}
                {(templateSource === 'shared' ? sharedTemplates : myTemplates)
                  .filter(t => !templateSearch || t.title.toLowerCase().includes(templateSearch.toLowerCase()))
                  .map(t => (
                    <button key={t.id} type="button"
                      onClick={() => {
                        setSelectedTemplate(t)
                        setTitle(t.title)
                        setWorkoutType(t.type as WorkoutType)
                        if (t.description) setNotes(t.description)
                        const exs = (t.workout_template_exercises || []).sort((a: any, b: any) => a.order_index - b.order_index)
                        setExercises(exs.length > 0 ? exs.map((ex: any) => ({
                          ...blank(),
                          name: ex.name, sets: ex.sets?.toString() || '', reps: ex.reps?.toString() || '',
                          weight: ex.weight?.toString() || '', duration: ex.duration?.toString() || '',
                          distance: ex.distance?.toString() || '', speed: '', isRunning: isRunningExercise(ex.name),
                          notes: ex.notes || '', section: 'conditioning',
                        })) : [blank()])
                        setTemplateDropdownOpen(false)
                        setTemplateSearch('')
                      }}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left', background: 'none',
                        border: 'none', padding: '0.7rem 1rem', color: '#F2F2F2',
                        fontSize: '0.8rem', cursor: 'pointer', borderBottom: '1px solid #1a2e34',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(8,119,160,0.15)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
                    >
                      <p style={{ fontWeight: 600 }}>{t.title}</p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                        {t.type} · {t.workout_template_exercises?.length || 0} exercises
                      </p>
                    </button>
                  ))
                }

                {/* Empty state */}
                {(templateSource === 'shared' ? sharedTemplates : myTemplates)
                  .filter(t => !templateSearch || t.title.toLowerCase().includes(templateSearch.toLowerCase()))
                  .length === 0 && (
                  <p style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem', textAlign: 'center' }}>
                    {templateSearch ? 'No templates match your search.' : templateSource === 'shared' ? 'No shared templates yet.' : 'No personal templates yet.'}
                  </p>
                )}
              </div>
            )}
          </div>

          {selectedTemplate && (
            <p style={{ fontSize: '0.75rem', color: 'var(--teal-secondary)', marginTop: '0.375rem' }}>
              ✓ Loaded: {selectedTemplate.title} — you can still customize
            </p>
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
          <label style={{ ...labelBase, whiteSpace: 'nowrap' }}>Duration (minutes)</label>
          <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} style={inputBase} placeholder="60" min="1" />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label style={labelBase}>Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...inputBase, minHeight: '80px', resize: 'vertical' }} placeholder="How did the session go?" />
      </div>

      {/* Exercises OR Basketball Drills depending on type */}
      {workoutType === 'basketball' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Intensity only — no location */}
          <div style={{ marginBottom: '0.5rem' }}>
            <label style={labelBase}>Intensity</label>
            <select value={intensity} onChange={e => setIntensity(e.target.value)}
              style={{ ...inputBase, cursor: 'pointer', maxWidth: '200px' }}>
              {INTENSITY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>

          {/* Drills */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <label style={labelBase}>Drills</label>
              <button type="button" onClick={addDrill}
                style={{ background: 'none', border: 'none', color: 'var(--teal-secondary)', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                + Add drill
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {drills.map((drill, i) => (
                <div key={i} style={{ background: '#0a1518', border: '1px solid #1a2e34', borderRadius: '0.625rem', padding: '0.875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700 }}>#{i + 1}</span>
                    {drills.length > 1 && (
                      <button type="button" onClick={() => removeDrill(i)}
                        style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#f87171', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}>
                        Remove
                      </button>
                    )}
                  </div>

                  {/* Category + drill name row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <select value={drill.category} onChange={e => updateDrill(i, 'category', e.target.value)}
                      style={{ ...inputBase, fontSize: '0.875rem', padding: '0.6rem 0.75rem', cursor: 'pointer' }}>
                      {DRILL_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>

                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        value={drill.name}
                        onChange={e => { updateDrill(i, 'name', e.target.value); setActiveDrillSuggestion(i) }}
                        onFocus={() => setActiveDrillSuggestion(i)}
                        onBlur={() => setTimeout(() => setActiveDrillSuggestion(null), 150)}
                        placeholder="Drill name"
                        autoComplete="off"
                        style={{ ...inputBase, fontSize: '0.875rem', padding: '0.6rem 0.875rem' }}
                      />
                      {activeDrillSuggestion === i && getDrillSuggestions(drill.name, drill.category).length > 0 && (
                        <div style={{
                          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                          background: '#0d1a1e', border: '1px solid #1a2e34',
                          borderRadius: '0.5rem', overflow: 'hidden', marginTop: '2px',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                        }}>
                          {getDrillSuggestions(drill.name, drill.category).map(s => (
                            <button key={s} type="button"
                              onMouseDown={() => { updateDrill(i, 'name', s); setActiveDrillSuggestion(null) }}
                              style={{
                                display: 'block', width: '100%', textAlign: 'left',
                                background: 'none', border: 'none', padding: '0.6rem 0.875rem',
                                color: '#F2F2F2', fontSize: '0.8rem', cursor: 'pointer',
                                borderBottom: '1px solid #1a2e34',
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
                  </div>

                  {/* Attempts + Made row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label style={{ ...labelBase, fontSize: '0.6rem', marginBottom: '0.25rem' }}>Attempts / Reps</label>
                      <input type="number" value={drill.attempts}
                        onChange={e => updateDrill(i, 'attempts', e.target.value)}
                        min="0" placeholder="0"
                        style={{ ...inputBase, fontSize: '0.875rem', padding: '0.5rem 0.75rem' }} />
                    </div>
                    <div>
                      <label style={{ ...labelBase, fontSize: '0.6rem', marginBottom: '0.25rem' }}>Made / Completed</label>
                      <input type="number" value={drill.made}
                        onChange={e => updateDrill(i, 'made', e.target.value)}
                        min="0" placeholder="0"
                        style={{ ...inputBase, fontSize: '0.875rem', padding: '0.5rem 0.75rem' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div>
          <label style={{ ...labelBase, marginBottom: '0.75rem' }}>Exercises</label>

          {/* Quick Add — only for conditioning */}
          {workoutType === 'conditioning' && (
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Quick Add</p>
              <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', paddingBottom: '4px' }}>
                {[...(FEATURED_EXERCISES_BY_TYPE[workoutType] || []), ...RUNNING_EXERCISES].map(ex => {
                  const running = isRunningExercise(ex.name)
                  return (
                    <button
                      key={ex.name}
                      type="button"
                      onClick={() => setExercises(prev => [...prev, {
                        ...blank(),
                        name: ex.name,
                        sets: running ? '' : '3',
                        reps: running ? '' : '10',
                        duration: running ? '30' : '',
                        distance: running ? '1' : '',
                        isRunning: running,
                      }])}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.375rem',
                        padding: '0.4rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.75rem',
                        fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer',
                        background: '#0d1a1e', color: 'var(--text-secondary)',
                        border: '1px solid #1a2e34', transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--teal-primary)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--teal-secondary)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#1a2e34'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)' }}
                    >
                      {ex.icon} {ex.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {exercises.map((ex, idx) => {
              const suggestions = getSuggestions(ex.name, workoutType, ex.section)
              const running = isRunningExercise(ex.name) || ex.isRunning
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

                  {workoutType === 'both' && (
                    <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.625rem' }}>
                      {(['conditioning', 'basketball'] as const).map(sec => (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => {
                            setExercises(prev =>
                              prev.map((e, i) => i === idx ? { ...e, section: sec } : e)
                            )
                          }}
                          style={{
                            padding: '0.25rem 0.625rem',
                            borderRadius: '999px',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            border: 'none',
                            background: ex.section === sec
                              ? sec === 'basketball' ? 'rgba(8,119,160,0.3)' : 'rgba(34,197,94,0.2)'
                              : '#1a2e34',
                            color: ex.section === sec
                              ? sec === 'basketball' ? '#34bac2' : '#4ade80'
                              : 'var(--text-secondary)',
                          }}
                        >
                          {sec === 'basketball' ? '🏀 Basketball' : '🏋️ Conditioning'}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Exercise name with suggestions — hide when basketball section in both type */}
                  {!(workoutType === 'both' && ex.section === 'basketball') && (
                    <div style={{ marginBottom: '0.75rem', position: 'relative' }}>
                      <label style={labelBase}>Name *</label>
                      <input
                        type="text"
                        value={ex.name}
                        onChange={(e) => { update(idx, 'name', e.target.value); setActiveSuggestion(idx) }}
                        onFocus={() => { if (ex.name.length > 0) setActiveSuggestion(idx) }}
                        onBlur={() => setTimeout(() => setActiveSuggestion(null), 150)}
                        style={inputBase}
                        placeholder="Exercise name"
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
                  )}

                  {running ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <div>
                        <label style={labelBase}>Duration (min)</label>
                        <input type="number" value={ex.duration} onChange={(e) => update(idx, 'duration', e.target.value)} style={inputBase} placeholder="30" min="0" />
                      </div>
                      <div>
                        <label style={labelBase}>Distance (km)</label>
                        <input type="number" value={ex.distance} onChange={(e) => update(idx, 'distance', e.target.value)} style={inputBase} placeholder="5" min="0" step="0.1" />
                      </div>
                      <div>
                        <label style={labelBase}>Speed (km/h)</label>
                        <input type="number" value={ex.speed} onChange={(e) => update(idx, 'speed', e.target.value)} style={inputBase} placeholder="10" min="0" step="0.1" />
                      </div>
                    </div>
                  ) : workoutType === 'both' && ex.section === 'basketball' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      {/* Category + drill name */}
                      <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '0.5rem' }}>
                        <select
                          value={ex.drillCategory || 'Shooting'}
                          onChange={e => update(idx, 'drillCategory', e.target.value)}
                          style={{ ...inputBase, cursor: 'pointer', fontSize: '0.875rem' }}
                        >
                          {DRILL_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="text"
                            value={ex.name}
                            onChange={e => { update(idx, 'name', e.target.value); setActiveSuggestion(idx) }}
                            onFocus={() => setActiveSuggestion(idx)}
                            onBlur={() => setTimeout(() => setActiveSuggestion(null), 150)}
                            placeholder="Drill name"
                            style={{ ...inputBase, fontSize: '0.875rem' }}
                            autoComplete="off"
                          />
                          {activeSuggestion === idx && getDrillSuggestions(ex.name, ex.drillCategory || 'Shooting').length > 0 && (
                            <div style={{
                              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
                              background: 'var(--surface)', border: '1px solid var(--border)',
                              borderRadius: '0 0 0.5rem 0.5rem', maxHeight: '180px', overflowY: 'auto',
                            }}>
                              {getDrillSuggestions(ex.name, ex.drillCategory || 'Shooting').map(s => (
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
                      </div>
                      {/* Attempts + Made */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <div>
                          <label style={{ ...labelBase, fontSize: '0.6rem', marginBottom: '0.2rem' }}>Attempts / Reps</label>
                          <input type="number" value={ex.reps} onChange={e => update(idx, 'reps', e.target.value)}
                            style={inputBase} placeholder="0" min="0" />
                        </div>
                        <div>
                          <label style={{ ...labelBase, fontSize: '0.6rem', marginBottom: '0.2rem' }}>Made / Completed</label>
                          <input type="number" value={ex.sets} onChange={e => update(idx, 'sets', e.target.value)}
                            style={inputBase} placeholder="0" min="0" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      {(['sets', 'reps', 'weight'] as const).map((f) => (
                        <div key={f}>
                          <label style={{ ...labelBase, whiteSpace: 'nowrap' }}>{f === 'weight' ? 'Weight (kg)' : f.charAt(0).toUpperCase() + f.slice(1)}</label>
                          <input type="number" value={ex[f]} onChange={(e) => update(idx, f, e.target.value)} style={inputBase} placeholder={f === 'weight' ? '50' : f === 'sets' ? '3' : '10'} step={f === 'weight' ? '0.5' : '1'} min="0" />
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ marginTop: '0.5rem' }}>
                    <label style={labelBase}>Notes</label>
                    <input type="text" value={ex.notes} onChange={(e) => update(idx, 'notes', e.target.value)} style={inputBase} placeholder="Optional notes" />
                  </div>
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
      )}

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
