'use client'

import { useState } from 'react'
import { Trash2, Plus, Pencil, ChevronDown, ChevronUp, Check, X, Undo2 } from 'lucide-react'

export const EXERCISE_TYPE_OPTIONS = ['Conditioning', 'Strength', 'Basketball', 'Cardio', 'Mobility']
export const DAY_LABELS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const DAY_TITLE_PRESETS = ['Upper', 'Legs', 'Shoulders', 'Sprint/Power']

export interface AthleteProgramSetDetail {
  reps: number | string | null
  weight: number | string | null
}

export interface AthleteProgramExercise {
  id?: string
  program_day_id?: string
  name: string
  exercise_type?: string | null
  sets?: string | number | null
  reps?: string | number | null
  weight?: string | number | null
  notes?: string | number | null
  set_details?: AthleteProgramSetDetail[] | null
}

export interface AthleteProgramDay {
  id: string
  day_of_week: number
  title: string
  athlete_program_exercises?: AthleteProgramExercise[]
}

type ExerciseMode = 'simple' | 'detailed'

const cellStyle: React.CSSProperties = {
  padding: '0.5rem 0.625rem', border: '1px solid var(--border)',
  fontSize: '0.8rem', color: 'var(--text-primary)',
}
const inputCell: React.CSSProperties = {
  background: 'transparent', border: 'none', borderRadius: 0,
  padding: '0.15rem 0', color: '#F2F2F2', fontSize: '0.8rem', outline: 'none', width: '100%',
}
const filterInput: React.CSSProperties = {
  background: '#0d1a1e', border: '1px solid #1a2e34', borderRadius: '0.375rem',
  padding: '0.55rem 0.75rem', color: '#F2F2F2', fontSize: '0.85rem', outline: 'none', width: '100%',
}

function modeFor(dayId: string, idx: number, ex: AthleteProgramExercise, modeOverride: Record<string, ExerciseMode>): ExerciseMode {
  const override = modeOverride[`${dayId}:${idx}`]
  if (override) return override
  return Array.isArray(ex.set_details) && ex.set_details.length > 0 ? 'detailed' : 'simple'
}

// Mirrors the "max-weight set" summary convention already used for the workouts/exercises table's
// set_details (Advanced Mode) — sets/reps/weight always stay populated as a computed summary so
// existing read-only views and PR/analytics-style consumers keep working unchanged.
function computeSummary(details: AthleteProgramSetDetail[]): { sets: number; reps: number | null; weight: number | null } {
  const sets = details.length
  if (sets === 0) return { sets: 0, reps: null, weight: null }
  let top = details[0]
  for (const d of details) {
    if ((Number(d.weight) || 0) > (Number(top.weight) || 0)) top = d
  }
  const reps = top.reps === '' || top.reps === null || top.reps === undefined ? null : Number(top.reps)
  const weight = top.weight === '' || top.weight === null || top.weight === undefined ? null : Number(top.weight)
  return { sets, reps, weight }
}

function DayTitlePicker({ initial, onSave, onCancel }: { initial: string; onSave: (title: string) => void; onCancel: () => void }) {
  const isPreset = DAY_TITLE_PRESETS.includes(initial)
  const [choice, setChoice] = useState(isPreset ? initial : 'Custom')
  const [custom, setCustom] = useState(isPreset ? '' : initial)

  const commit = () => {
    const title = choice === 'Custom' ? custom.trim() : choice
    if (!title) return
    onSave(title)
  }

  return (
    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
      <select value={choice} onChange={e => setChoice(e.target.value)} style={{ ...filterInput, width: 'auto', padding: '0.4rem 0.6rem', cursor: 'pointer' }}>
        {DAY_TITLE_PRESETS.map(p => <option key={p} value={p}>{p}</option>)}
        <option value="Custom">Custom…</option>
      </select>
      {choice === 'Custom' && (
        <input type="text" value={custom} onChange={e => setCustom(e.target.value)} placeholder="Custom title" autoFocus
          style={{ ...filterInput, width: 'auto', padding: '0.4rem 0.6rem' }} />
      )}
      <button type="button" onClick={commit} style={{ background: 'var(--teal-primary)', border: 'none', borderRadius: '0.375rem', padding: '0.4rem', color: 'white', cursor: 'pointer', display: 'flex', minHeight: 0 }}><Check size={14} /></button>
      <button type="button" onClick={onCancel} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '0.375rem', padding: '0.4rem', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', minHeight: 0 }}><X size={14} /></button>
    </div>
  )
}

interface ExerciseTableProps {
  exercises: { ex: AthleteProgramExercise; idx: number }[]
  editable: boolean
  dayId: string
  modeOverride: Record<string, ExerciseMode>
  onToggleMode?: (idx: number) => void
  onChange?: (idx: number, field: keyof AthleteProgramExercise, value: string) => void
  onCommit?: (idx: number, field: keyof AthleteProgramExercise, value: string) => void
  onRemove?: (idx: number) => void
  onAdd?: () => void
}

function ExerciseTable({ exercises, editable, dayId, modeOverride, onToggleMode, onChange, onCommit, onRemove, onAdd }: ExerciseTableProps) {
  const colCount = 5 + (editable ? 2 : 0)

  const setDetailsFor = (ex: AthleteProgramExercise): AthleteProgramSetDetail[] => Array.isArray(ex.set_details) ? ex.set_details : []

  const applyLocal = (idx: number, details: AthleteProgramSetDetail[]) => {
    onChange?.(idx, 'set_details', JSON.stringify(details))
  }

  const commitDetailsAndSummary = (idx: number, details: AthleteProgramSetDetail[]) => {
    const json = JSON.stringify(details)
    onCommit?.(idx, 'set_details', json)
    const { sets, reps, weight } = computeSummary(details)
    const setsStr = String(sets)
    const repsStr = reps === null ? '' : String(reps)
    const weightStr = weight === null ? '' : String(weight)
    onChange?.(idx, 'sets', setsStr)
    onCommit?.(idx, 'sets', setsStr)
    onChange?.(idx, 'reps', repsStr)
    onCommit?.(idx, 'reps', repsStr)
    onChange?.(idx, 'weight', weightStr)
    onCommit?.(idx, 'weight', weightStr)
  }

  const handleSetFieldChange = (idx: number, ex: AthleteProgramExercise, si: number, field: 'reps' | 'weight', value: string) => {
    const details = setDetailsFor(ex).map((d, i) => i === si ? { ...d, [field]: value } : d)
    applyLocal(idx, details)
  }
  const handleSetFieldBlur = (idx: number, ex: AthleteProgramExercise) => {
    commitDetailsAndSummary(idx, setDetailsFor(ex))
  }
  const handleAddSetRow = (idx: number, ex: AthleteProgramExercise) => {
    const details = [...setDetailsFor(ex), { reps: '', weight: '' }]
    applyLocal(idx, details)
    commitDetailsAndSummary(idx, details)
  }
  const handleRemoveSetRow = (idx: number, ex: AthleteProgramExercise, si: number) => {
    const details = setDetailsFor(ex).filter((_, i) => i !== si)
    applyLocal(idx, details)
    commitDetailsAndSummary(idx, details)
  }

  return (
    <div>
      <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '0.375rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
          <thead>
            <tr style={{ background: 'var(--surface)' }}>
              {['Name', 'Sets', 'Reps', 'Weight', 'Notes'].map(h => (
                <th key={h} style={{
                  fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                  textAlign: 'left', padding: '0.6rem 0.625rem', color: 'var(--teal-secondary)',
                  border: '1px solid var(--border)', whiteSpace: 'nowrap',
                }}>
                  {h}
                </th>
              ))}
              {editable && <th style={{ border: '1px solid var(--border)', background: 'var(--surface)', padding: '0.6rem 0.625rem' }} />}
              {editable && <th style={{ border: '1px solid var(--border)', background: 'var(--surface)', padding: '0.6rem 0.625rem' }} />}
            </tr>
          </thead>
          <tbody>
            {exercises.length === 0 ? (
              <tr>
                <td colSpan={colCount} style={{ ...cellStyle, textAlign: 'center', color: 'var(--text-secondary)', padding: '1.5rem' }}>
                  No exercises match.
                </td>
              </tr>
            ) : exercises.map(({ ex, idx }, i) => {
              const mode = modeFor(dayId, idx, ex, modeOverride)
              const details = setDetailsFor(ex)
              return (
                <tr key={ex.id ?? idx} style={{ background: i % 2 === 0 ? 'var(--surface)' : '#161616' }}>
                  <td style={{ ...cellStyle, minWidth: '160px' }}>
                    {editable ? (
                      <input type="text" value={ex.name} placeholder="Exercise name" autoComplete="off"
                        onChange={e => onChange?.(idx, 'name', e.target.value)}
                        onBlur={e => onCommit?.(idx, 'name', e.target.value)}
                        style={inputCell} />
                    ) : (ex.name || '—')}
                  </td>

                  {editable && mode === 'detailed' ? (
                    <td style={{ ...cellStyle, minWidth: '230px' }} colSpan={3}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        {details.length === 0 && (
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>No sets yet.</p>
                        )}
                        {details.map((s, si) => (
                          <div key={si} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', minWidth: '38px', flexShrink: 0 }}>Set {si + 1}</span>
                            <input type="number" value={s.reps ?? ''} placeholder="Reps" min="0" step="1"
                              onChange={e => handleSetFieldChange(idx, ex, si, 'reps', e.target.value)}
                              onBlur={() => handleSetFieldBlur(idx, ex)}
                              style={{ ...inputCell, width: '52px', flex: 'none' }} />
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', flexShrink: 0 }}>reps @</span>
                            <input type="number" value={s.weight ?? ''} placeholder="kg" min="0" step="0.1"
                              onChange={e => handleSetFieldChange(idx, ex, si, 'weight', e.target.value)}
                              onBlur={() => handleSetFieldBlur(idx, ex)}
                              style={{ ...inputCell, width: '52px', flex: 'none' }} />
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', flexShrink: 0 }}>kg</span>
                            <button type="button" onClick={() => handleRemoveSetRow(idx, ex, si)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', minHeight: 0, marginLeft: 'auto' }}>
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                        <button type="button" onClick={() => handleAddSetRow(idx, ex)} style={{
                          background: 'none', border: '1px dashed #1a2e34', borderRadius: '0.3rem', padding: '0.3rem 0.5rem',
                          color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.7rem', display: 'flex',
                          alignItems: 'center', gap: '0.25rem', justifyContent: 'center', minHeight: 0,
                        }}>
                          <Plus size={11} /> Add Set
                        </button>
                      </div>
                    </td>
                  ) : (
                    <>
                      <td style={{ ...cellStyle, minWidth: '70px' }}>
                        {editable ? (
                          <input type="number" value={ex.sets ?? ''}
                            onChange={e => onChange?.(idx, 'sets', e.target.value)}
                            onBlur={e => onCommit?.(idx, 'sets', e.target.value)}
                            style={inputCell} placeholder="—" min="0" step="1" />
                        ) : (ex.sets ?? '—')}
                      </td>
                      <td style={{ ...cellStyle, minWidth: '70px' }}>
                        {editable ? (
                          <input type="number" value={ex.reps ?? ''}
                            onChange={e => onChange?.(idx, 'reps', e.target.value)}
                            onBlur={e => onCommit?.(idx, 'reps', e.target.value)}
                            style={inputCell} placeholder="—" min="0" step="1" />
                        ) : (ex.reps ?? '—')}
                      </td>
                      <td style={{ ...cellStyle, minWidth: '70px' }}>
                        {editable ? (
                          <input type="number" value={ex.weight ?? ''}
                            onChange={e => onChange?.(idx, 'weight', e.target.value)}
                            onBlur={e => onCommit?.(idx, 'weight', e.target.value)}
                            style={inputCell} placeholder="—" min="0" step="0.1" />
                        ) : (ex.weight ?? '—')}
                      </td>
                    </>
                  )}

                  <td style={{ ...cellStyle, minWidth: '160px' }}>
                    {editable ? (
                      <input type="text" value={ex.notes || ''}
                        onChange={e => onChange?.(idx, 'notes', e.target.value)}
                        onBlur={e => onCommit?.(idx, 'notes', e.target.value)}
                        style={inputCell} placeholder="—" />
                    ) : (ex.notes || '—')}
                  </td>
                  {editable && (
                    <td style={{ ...cellStyle, textAlign: 'center' }}>
                      <button type="button" onClick={() => onToggleMode?.(idx)} title={mode === 'detailed' ? 'Switch to Simple' : 'Switch to Detailed'} style={{
                        background: mode === 'detailed' ? 'rgba(8,119,160,0.15)' : 'none',
                        border: `1px solid ${mode === 'detailed' ? 'var(--teal-primary)' : 'var(--border)'}`,
                        borderRadius: '999px', padding: '0.25rem 0.55rem',
                        color: mode === 'detailed' ? 'var(--teal-secondary)' : 'var(--text-secondary)',
                        fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', minHeight: 0, whiteSpace: 'nowrap',
                      }}>
                        {mode === 'detailed' ? 'Detailed' : 'Simple'}
                      </button>
                    </td>
                  )}
                  {editable && (
                    <td style={{ ...cellStyle, textAlign: 'center' }}>
                      <button type="button" onClick={() => onRemove?.(idx)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'inline-flex', minHeight: 0 }}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {editable && (
        <button type="button" onClick={onAdd} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', width: '100%', marginTop: '0.6rem',
          background: 'transparent', border: '1px dashed #1a2e34', borderRadius: '0.5rem', padding: '0.55rem', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem',
        }}>
          <Plus size={14} /> Add Exercise
        </button>
      )}
    </div>
  )
}

interface Props {
  days: AthleteProgramDay[]
  editable?: boolean

  // coach-only
  onAddDay?: (dayOfWeek: number, title: string) => void
  onUpdateDayTitle?: (dayId: string, title: string) => void
  onAddExercise?: (dayId: string) => void
  onChangeExercise?: (dayId: string, idx: number, field: keyof AthleteProgramExercise, value: string) => void
  onCommitExercise?: (dayId: string, idx: number, field: keyof AthleteProgramExercise, value: string) => void
  onRemoveExercise?: (dayId: string, idx: number) => void

  // student-only (completion tracking)
  showCompletion?: boolean
  isDayDone?: (day: AthleteProgramDay) => boolean
  onMarkDone?: (day: AthleteProgramDay) => void
  onUndoDone?: (day: AthleteProgramDay) => void
  completingDayId?: string | null
}

export default function AthleteProgramTable({
  days, editable = false,
  onAddDay, onUpdateDayTitle, onAddExercise, onChangeExercise, onCommitExercise, onRemoveExercise,
  showCompletion = false, isDayDone, onMarkDone, onUndoDone, completingDayId = null,
}: Props) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null)
  const [addDayOpen, setAddDayOpen] = useState(false)
  const [newDayOfWeek, setNewDayOfWeek] = useState<number | null>(null)
  const [newDayTitle, setNewDayTitle] = useState(DAY_TITLE_PRESETS[0])
  const [newDayTitleCustom, setNewDayTitleCustom] = useState('')
  const [modeOverride, setModeOverride] = useState<Record<string, ExerciseMode>>({})

  const toggleExpanded = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toggleExerciseMode = (day: AthleteProgramDay, idx: number) => {
    const ex = (day.athlete_program_exercises ?? [])[idx]
    if (!ex) return
    const key = `${day.id}:${idx}`
    const current = modeFor(day.id, idx, ex, modeOverride)
    const next: ExerciseMode = current === 'detailed' ? 'simple' : 'detailed'
    setModeOverride(prev => ({ ...prev, [key]: next }))

    if (next === 'detailed' && (!Array.isArray(ex.set_details) || ex.set_details.length === 0)) {
      // Seed set rows so "number of set rows = sets value" holds the moment Detailed mode is entered.
      const n = Math.max(1, Number(ex.sets) || 1)
      const seeded: AthleteProgramSetDetail[] = Array.from({ length: n }, () => ({ reps: ex.reps ?? '', weight: ex.weight ?? '' }))
      const json = JSON.stringify(seeded)
      onChangeExercise?.(day.id, idx, 'set_details', json)
      onCommitExercise?.(day.id, idx, 'set_details', json)
    } else if (next === 'simple') {
      onChangeExercise?.(day.id, idx, 'set_details', '')
      onCommitExercise?.(day.id, idx, 'set_details', '')
    }
  }

  const filtersActive = search.trim() !== '' || typeFilter !== ''

  const sortedDays = [...days].sort((a, b) => a.day_of_week - b.day_of_week)
  const takenDays = new Set(days.map(d => d.day_of_week))
  const availableDaysToAdd = DAY_LABELS_FULL.map((label, i) => ({ label, value: i })).filter(d => !takenDays.has(d.value))

  const submitAddDay = () => {
    if (newDayOfWeek === null) return
    const title = newDayTitle === 'Custom' ? newDayTitleCustom.trim() : newDayTitle
    if (!title) return
    onAddDay?.(newDayOfWeek, title)
    setAddDayOpen(false)
    setNewDayOfWeek(null)
    setNewDayTitle(DAY_TITLE_PRESETS[0])
    setNewDayTitleCustom('')
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search exercises…"
          style={{ ...filterInput, flex: '1 1 200px' }}
        />
        <select
          value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          style={{ ...filterInput, width: 'auto', minWidth: '140px', cursor: 'pointer' }}
        >
          <option value="">All Types</option>
          {EXERCISE_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {sortedDays.map(day => {
          const allExercises = day.athlete_program_exercises ?? []
          const filtered = allExercises
            .map((ex, idx) => ({ ex, idx }))
            .filter(({ ex }) =>
              (!search.trim() || ex.name.toLowerCase().includes(search.trim().toLowerCase())) &&
              (!typeFilter || ex.exercise_type === typeFilter)
            )
          if (filtersActive && allExercises.length > 0 && filtered.length === 0) return null

          const isExpanded = expanded.has(day.id)
          const isEditingTitle = editingTitleId === day.id
          const done = showCompletion && isDayDone?.(day)
          const completing = completingDayId === day.id

          return (
            <div key={day.id} style={{ border: '1px solid var(--border)', borderRadius: '0.5rem', overflow: 'hidden' }}>
              <div
                onClick={() => toggleExpanded(day.id)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
                  padding: '0.75rem 1rem', background: 'var(--surface)', cursor: 'pointer', flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  {isExpanded ? <ChevronUp size={16} style={{ color: 'var(--text-secondary)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-secondary)' }} />}
                  {isEditingTitle ? (
                    <DayTitlePicker
                      initial={day.title}
                      onSave={title => { onUpdateDayTitle?.(day.id, title); setEditingTitleId(null) }}
                      onCancel={() => setEditingTitleId(null)}
                    />
                  ) : (
                    <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                      {day.title}
                    </p>
                  )}
                  {editable && !isEditingTitle && (
                    <button type="button" onClick={e => { e.stopPropagation(); setEditingTitleId(day.id) }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', minHeight: 0 }}>
                      <Pencil size={13} />
                    </button>
                  )}
                  {done && (
                    <span style={{ fontSize: '0.65rem', background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)', padding: '0.15rem 0.5rem', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 700 }}>
                      <Check size={11} /> Done
                    </span>
                  )}
                </div>
                {showCompletion && (
                  <button
                    type="button"
                    disabled={completing}
                    onClick={e => { e.stopPropagation(); done ? onUndoDone?.(day) : onMarkDone?.(day) }}
                    style={{
                      background: done ? 'none' : 'var(--teal-primary)',
                      border: done ? '1px solid var(--border)' : 'none',
                      color: done ? 'var(--text-secondary)' : 'white',
                      borderRadius: '0.375rem', padding: '0.4rem 0.75rem', fontSize: '0.75rem', fontWeight: 700,
                      cursor: completing ? 'default' : 'pointer', opacity: completing ? 0.6 : 1,
                      display: 'inline-flex', alignItems: 'center', gap: '0.3rem', minHeight: 0,
                    }}
                  >
                    {done ? <><Undo2 size={12} /> Undo</> : (completing ? 'Saving…' : <><Check size={12} /> Mark Done</>)}
                  </button>
                )}
              </div>

              {isExpanded && (
                <div style={{ padding: '0.875rem', background: '#0a1518' }}>
                  <ExerciseTable
                    exercises={filtered}
                    editable={editable}
                    dayId={day.id}
                    modeOverride={modeOverride}
                    onToggleMode={editable ? idx => toggleExerciseMode(day, idx) : undefined}
                    onChange={editable ? (idx, field, val) => onChangeExercise?.(day.id, idx, field, val) : undefined}
                    onCommit={editable ? (idx, field, val) => onCommitExercise?.(day.id, idx, field, val) : undefined}
                    onRemove={editable ? idx => onRemoveExercise?.(day.id, idx) : undefined}
                    onAdd={editable ? () => onAddExercise?.(day.id) : undefined}
                  />
                </div>
              )}
            </div>
          )
        })}

        {sortedDays.length === 0 && (
          <div style={{ border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '2rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No days in this program yet.</p>
          </div>
        )}
      </div>

      {editable && (
        <div style={{ marginTop: '0.875rem' }}>
          {!addDayOpen ? (
            <button type="button" onClick={() => setAddDayOpen(true)} disabled={availableDaysToAdd.length === 0} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', width: '100%',
              background: 'transparent', border: '1px dashed #1a2e34', borderRadius: '0.5rem', padding: '0.6rem',
              color: availableDaysToAdd.length === 0 ? 'var(--border)' : 'var(--text-secondary)',
              cursor: availableDaysToAdd.length === 0 ? 'not-allowed' : 'pointer', fontSize: '0.8rem',
            }}>
              <Plus size={14} /> {availableDaysToAdd.length === 0 ? 'All days added' : 'Add Day'}
            </button>
          ) : (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--teal-primary)', borderRadius: '0.5rem', padding: '0.875rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <select value={newDayOfWeek ?? ''} onChange={e => setNewDayOfWeek(Number(e.target.value))} style={{ ...filterInput, width: 'auto', cursor: 'pointer' }}>
                <option value="" disabled>Day…</option>
                {availableDaysToAdd.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
              <select value={newDayTitle} onChange={e => setNewDayTitle(e.target.value)} style={{ ...filterInput, width: 'auto', cursor: 'pointer' }}>
                {DAY_TITLE_PRESETS.map(p => <option key={p} value={p}>{p}</option>)}
                <option value="Custom">Custom…</option>
              </select>
              {newDayTitle === 'Custom' && (
                <input type="text" value={newDayTitleCustom} onChange={e => setNewDayTitleCustom(e.target.value)} placeholder="Custom title" style={{ ...filterInput, width: 'auto' }} />
              )}
              <button type="button" onClick={submitAddDay} disabled={newDayOfWeek === null} style={{ background: 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.375rem', padding: '0.55rem 0.875rem', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', minHeight: 0 }}>
                Add
              </button>
              <button type="button" onClick={() => setAddDayOpen(false)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '0.375rem', padding: '0.55rem 0.75rem', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer', minHeight: 0 }}>
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
