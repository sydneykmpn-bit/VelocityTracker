'use client'

import { useState } from 'react'
import { Trash2, Plus } from 'lucide-react'

export const EXERCISE_TYPE_OPTIONS = ['Conditioning', 'Strength', 'Basketball', 'Cardio', 'Mobility']
export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export interface AthleteProgramExercise {
  id?: string
  day_of_week?: number | string | null
  name: string
  exercise_type?: string | null
  sets?: string | number | null
  reps?: string | number | null
  weight?: string | number | null
  notes?: string | number | null
}

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

interface Props {
  exercises: AthleteProgramExercise[]
  editable?: boolean
  /** Fires on every keystroke/select change — update local state here. */
  onChange?: (idx: number, field: keyof AthleteProgramExercise, value: string) => void
  /** Fires when a field's edit is "final" (blur for text/number, immediately for selects) — persist here. */
  onCommit?: (idx: number, field: keyof AthleteProgramExercise, value: string) => void
  onRemove?: (idx: number) => void
  onAdd?: () => void
}

export default function AthleteProgramTable({ exercises, editable = false, onChange, onCommit, onRemove, onAdd }: Props) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [dayFilter, setDayFilter] = useState('')

  const rows = exercises
    .map((ex, idx) => ({ ex, idx }))
    .filter(({ ex }) =>
      (!search.trim() || ex.name.toLowerCase().includes(search.trim().toLowerCase())) &&
      (!typeFilter || ex.exercise_type === typeFilter) &&
      (dayFilter === '' || Number(ex.day_of_week ?? 0) === Number(dayFilter))
    )

  const numericCols = (['sets', 'reps', 'weight'] as const)
  const colCount = editable ? 8 : 7

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search exercises…"
          style={{ ...filterInput, flex: '1 1 200px' }}
        />
        <select
          value={dayFilter} onChange={e => setDayFilter(e.target.value)}
          style={{ ...filterInput, width: 'auto', minWidth: '120px', cursor: 'pointer' }}
        >
          <option value="">All Days</option>
          {DAY_LABELS.map((d, i) => <option key={d} value={i}>{d}</option>)}
        </select>
        <select
          value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          style={{ ...filterInput, width: 'auto', minWidth: '140px', cursor: 'pointer' }}
        >
          <option value="">All Types</option>
          {EXERCISE_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '0.375rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '680px' }}>
          <thead>
            <tr style={{ background: 'var(--surface)' }}>
              {['Day', 'Name', 'Type', 'Sets', 'Reps', 'Weight', 'Notes'].map(h => (
                <th key={h} style={{
                  fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                  textAlign: 'left', padding: '0.6rem 0.625rem', color: 'var(--teal-secondary)',
                  border: '1px solid var(--border)', whiteSpace: 'nowrap',
                }}>
                  {h}
                </th>
              ))}
              {editable && <th style={{ border: '1px solid var(--border)', background: 'var(--surface)', padding: '0.6rem 0.625rem' }} />}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={colCount} style={{ ...cellStyle, textAlign: 'center', color: 'var(--text-secondary)', padding: '1.5rem' }}>
                  No exercises match.
                </td>
              </tr>
            ) : rows.map(({ ex, idx }, i) => (
              <tr key={ex.id ?? idx} style={{ background: i % 2 === 0 ? 'var(--surface)' : '#161616' }}>
                <td style={{ ...cellStyle, minWidth: '90px' }}>
                  {editable ? (
                    <select
                      value={Number(ex.day_of_week ?? 0)}
                      onChange={e => { onChange?.(idx, 'day_of_week', e.target.value); onCommit?.(idx, 'day_of_week', e.target.value) }}
                      style={{ ...inputCell, cursor: 'pointer' }}
                    >
                      {DAY_LABELS.map((d, di) => <option key={d} value={di}>{d}</option>)}
                    </select>
                  ) : (DAY_LABELS[Number(ex.day_of_week ?? 0)] ?? '—')}
                </td>
                <td style={{ ...cellStyle, minWidth: '160px' }}>
                  {editable ? (
                    <input type="text" value={ex.name} placeholder="Exercise name" autoComplete="off"
                      onChange={e => onChange?.(idx, 'name', e.target.value)}
                      onBlur={e => onCommit?.(idx, 'name', e.target.value)}
                      style={inputCell} />
                  ) : (ex.name || '—')}
                </td>
                <td style={{ ...cellStyle, minWidth: '130px' }}>
                  {editable ? (
                    <select
                      value={ex.exercise_type || ''}
                      onChange={e => { onChange?.(idx, 'exercise_type', e.target.value); onCommit?.(idx, 'exercise_type', e.target.value) }}
                      style={{ ...inputCell, cursor: 'pointer' }}
                    >
                      <option value="">—</option>
                      {EXERCISE_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  ) : (ex.exercise_type || '—')}
                </td>
                {numericCols.map(f => (
                  <td key={f} style={{ ...cellStyle, minWidth: '70px' }}>
                    {editable ? (
                      <input
                        type="number" value={ex[f] ?? ''}
                        onChange={e => onChange?.(idx, f, e.target.value)}
                        onBlur={e => onCommit?.(idx, f, e.target.value)}
                        style={inputCell} placeholder="—" min="0" step={f === 'weight' ? '0.1' : '1'}
                      />
                    ) : (ex[f] ?? '—')}
                  </td>
                ))}
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
                    <button type="button" onClick={() => onRemove?.(idx)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'inline-flex', minHeight: 0 }}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editable && (
        <button type="button" onClick={onAdd} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', width: '100%', marginTop: '0.75rem',
          background: 'transparent', border: '1px dashed #1a2e34', borderRadius: '0.5rem', padding: '0.6rem', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem',
        }}>
          <Plus size={14} /> Add Row
        </button>
      )}
    </div>
  )
}
