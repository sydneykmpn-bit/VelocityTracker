'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Trash2, Pencil, Check, X, Scale, Droplet } from 'lucide-react'
import {
  normalizeToKg, sortRecords, LOWER_IS_BETTER, convertWeightForDisplay, getLocalDateString,
} from '@/lib/utils'

type Tab = 'prtrends' | 'body'
const UNITS = ['kg', 'lbs', 'reps', 'seconds', 'minutes', 'km/h', 'mph'] as const

const inputBase: React.CSSProperties = {
  background: '#0d1a1e', border: '1px solid #1a2e34', borderRadius: '0.5rem',
  padding: '0.6rem 0.875rem', color: '#F2F2F2', fontSize: '0.875rem', outline: 'none',
}
const labelBase: React.CSSProperties = {
  display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)',
  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.375rem',
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle} role="switch" aria-checked={on}
      style={{
        width: '42px', height: '22px', borderRadius: '999px', flexShrink: 0,
        background: on ? 'var(--teal-primary)' : '#2a3a40',
        position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
        border: `1px solid ${on ? 'var(--teal-primary)' : '#3a4a50'}`,
      }}
    >
      <div style={{
        position: 'absolute', top: '2px', left: on ? '21px' : '2px',
        width: '16px', height: '16px', borderRadius: '50%',
        background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
      }} />
    </div>
  )
}

// Simple SVG polyline chart shared by PR Trends + Body tabs
function LineChart({ points, color = 'var(--teal-secondary)' }: { points: { x: string; y: number }[]; color?: string }) {
  const width = 600, height = 200, padding = 28
  if (points.length === 0) {
    return <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', padding: '2rem 0', textAlign: 'center' }}>No data yet.</p>
  }
  const values = points.map(p => p.y)
  const minV = Math.min(...values)
  const maxV = Math.max(...values)
  const range = maxV - minV || 1
  const coords = points.map((p, i) => {
    const x = points.length > 1 ? padding + (i / (points.length - 1)) * (width - padding * 2) : width / 2
    const y = height - padding - ((p.y - minV) / range) * (height - padding * 2)
    return { x, y }
  })
  const polyPoints = coords.map(c => `${c.x},${c.y}`).join(' ')
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '200px', overflow: 'visible' }}>
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--border)" strokeWidth="1" />
      <polyline points={polyPoints} fill="none" stroke={color} strokeWidth="2.5" />
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r="4" fill={color} />
      ))}
    </svg>
  )
}

export default function AnalyticsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [preferredWeightUnit, setPreferredWeightUnit] = useState<'kg' | 'lbs'>('kg')
  const [activeTab, setActiveTab] = useState<Tab>('prtrends')

  // PR Trends
  const [allPRs, setAllPRs] = useState<any[]>([])
  const [selectedExercise, setSelectedExercise] = useState('')
  const [editingPRId, setEditingPRId] = useState<string | null>(null)
  const [editPRForm, setEditPRForm] = useState({ value: '', unit: 'kg' })
  const [prSaving, setPrSaving] = useState(false)
  const [prDeleting, setPrDeleting] = useState<string | null>(null)
  const [prForm, setPrForm] = useState({ exercise: '', value: '', unit: 'kg', date: getLocalDateString() })
  const [prFormSaving, setPrFormSaving] = useState(false)
  const [prFormError, setPrFormError] = useState('')

  // Body
  const [bodyMeasurements, setBodyMeasurements] = useState<any[]>([])
  const [bodyForm, setBodyForm] = useState({
    weight_kg: '', body_fat_pct: '', chest_cm: '', waist_cm: '', hips_cm: '', arm_cm: '', thigh_cm: '',
  })
  const [bodySaving, setBodySaving] = useState(false)
  const [bodyDeleting, setBodyDeleting] = useState<string | null>(null)
  const [bodyError, setBodyError] = useState('')

  const loadAll = async (uid: string) => {
    const [{ data: prs }, { data: measurements }] = await Promise.all([
      supabase.from('personal_records').select('*').eq('user_id', uid).order('recorded_at', { ascending: true }),
      supabase.from('body_measurements').select('*').eq('user_id', uid).order('recorded_at', { ascending: true }),
    ])

    setAllPRs(prs ?? [])
    setBodyMeasurements(measurements ?? [])

    if (!selectedExercise && prs && prs.length > 0) {
      setSelectedExercise(prs[0].exercise_name)
    }
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      const { data: profile } = await supabase.from('profiles').select('preferred_weight_unit').eq('id', user.id).single()
      const preferredUnit = (profile?.preferred_weight_unit as 'kg' | 'lbs') || 'kg'
      setPreferredWeightUnit(preferredUnit)
      setPrForm(f => ({ ...f, unit: preferredUnit }))
      await loadAll(user.id)
      setLoading(false)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadData = () => { if (userId) loadAll(userId) }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
          <div className="skeleton" style={{ height: 120, marginBottom: '1rem' }} />
          <div className="skeleton" style={{ height: 200 }} />
        </div>
      </div>
    )
  }

  const tabs: { value: Tab; label: string }[] = [
    { value: 'prtrends', label: 'PR Trends' },
    { value: 'body', label: 'Body' },
  ]

  // ── PR Trends derived data ──
  const exerciseNames = Array.from(new Set(allPRs.map(p => p.exercise_name))).sort()
  const exerciseRecords = allPRs.filter(p => p.exercise_name === selectedExercise)
  const lowerIsBetter = LOWER_IS_BETTER.includes(selectedExercise)
  const chartPoints = exerciseRecords.map(r => ({ x: r.date ?? r.recorded_at, y: normalizeToKg(r.value, r.unit) }))
  const normValues = chartPoints.map(p => p.y)
  const bestNorm = normValues.length ? (lowerIsBetter ? Math.min(...normValues) : Math.max(...normValues)) : null
  const bestRecord = bestNorm !== null ? exerciseRecords.find(r => normalizeToKg(r.value, r.unit) === bestNorm) : null
  const latestRecord = exerciseRecords[exerciseRecords.length - 1] || null
  const firstRecord = exerciseRecords[0] || null
  const pctChange = firstRecord && latestRecord && firstRecord !== latestRecord
    ? ((normalizeToKg(latestRecord.value, latestRecord.unit) - normalizeToKg(firstRecord.value, firstRecord.unit)) / normalizeToKg(firstRecord.value, firstRecord.unit)) * 100
    : null

  const startEditPR = (r: any) => {
    setEditingPRId(r.id)
    if (r.unit === 'kg' || r.unit === 'lbs') {
      const converted = convertWeightForDisplay(r.value, r.unit, preferredWeightUnit)
      setEditPRForm({ value: converted.value.toString(), unit: converted.unit })
    } else {
      setEditPRForm({ value: r.value.toString(), unit: r.unit })
    }
  }
  // Analytics never touches is_public — public PRs can only be submitted/managed from the
  // Leaderboard page, so editing here leaves whatever visibility a record already has untouched.
  const saveEditPR = async (id: string) => {
    if (!editPRForm.value) return
    setPrSaving(true)
    await supabase.from('personal_records').update({
      value: Number(editPRForm.value), unit: editPRForm.unit,
    }).eq('id', id)
    setEditingPRId(null)
    setPrSaving(false)
    loadData()
  }
  const deletePR = async (id: string) => {
    setPrDeleting(id)
    await supabase.from('personal_records').delete().eq('id', id)
    setPrDeleting(null)
    loadData()
  }
  const handleAddPR = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    if (!prForm.exercise.trim()) { setPrFormError('Please enter an exercise name.'); return }
    if (!prForm.value) { setPrFormError('Please enter a value.'); return }
    setPrFormSaving(true); setPrFormError('')
    const { error: err } = await supabase.from('personal_records').insert({
      user_id: userId,
      exercise_name: prForm.exercise.trim(),
      value: Number(prForm.value),
      unit: prForm.unit,
      date: prForm.date,
      recorded_at: new Date(prForm.date).toISOString(),
      is_public: false,
      month_year: getLocalDateString().slice(0, 7),
    })
    if (err) { setPrFormError(err.message); setPrFormSaving(false); return }
    setSelectedExercise(prForm.exercise.trim())
    setPrForm({ exercise: '', value: '', unit: preferredWeightUnit, date: getLocalDateString() })
    setPrFormSaving(false)
    loadData()
  }

  // ── Body derived data ──
  const bodyChartPoints = bodyMeasurements.filter(m => m.weight_kg != null).map(m => ({ x: m.recorded_at, y: m.weight_kg }))
  const handleBodySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    const hasAny = Object.values(bodyForm).some(v => v.trim() !== '')
    if (!hasAny) { setBodyError('Enter at least one measurement.'); return }
    setBodySaving(true); setBodyError('')
    const { error: err } = await supabase.from('body_measurements').insert({
      user_id: userId,
      weight_kg: bodyForm.weight_kg ? Number(bodyForm.weight_kg) : null,
      body_fat_pct: bodyForm.body_fat_pct ? Number(bodyForm.body_fat_pct) : null,
      chest_cm: bodyForm.chest_cm ? Number(bodyForm.chest_cm) : null,
      waist_cm: bodyForm.waist_cm ? Number(bodyForm.waist_cm) : null,
      hips_cm: bodyForm.hips_cm ? Number(bodyForm.hips_cm) : null,
      arm_cm: bodyForm.arm_cm ? Number(bodyForm.arm_cm) : null,
      thigh_cm: bodyForm.thigh_cm ? Number(bodyForm.thigh_cm) : null,
    })
    if (err) { setBodyError(err.message); setBodySaving(false); return }
    setBodyForm({ weight_kg: '', body_fat_pct: '', chest_cm: '', waist_cm: '', hips_cm: '', arm_cm: '', thigh_cm: '' })
    setBodySaving(false)
    loadData()
  }
  const deleteBodyMeasurement = async (id: string) => {
    setBodyDeleting(id)
    await supabase.from('body_measurements').delete().eq('id', id)
    setBodyDeleting(null)
    loadData()
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
        <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: 'clamp(2rem, 6vw, 3rem)', letterSpacing: '0.03em', marginBottom: '1.5rem' }}>ANALYTICS</h1>

        {/* Tab bar */}
        <div style={{ display: 'flex', overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }}>
          {tabs.map(t => (
            <button key={t.value} onClick={() => setActiveTab(t.value)} style={{
              background: 'none', border: 'none', padding: '0.875rem 1.25rem',
              color: activeTab === t.value ? 'var(--teal-secondary)' : 'var(--text-secondary)',
              borderBottom: `2px solid ${activeTab === t.value ? 'var(--teal-primary)' : 'transparent'}`,
              fontWeight: activeTab === t.value ? 700 : 400, cursor: 'pointer',
              whiteSpace: 'nowrap', fontSize: '0.875rem', minHeight: 0,
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── PR TRENDS ── */}
        {activeTab === 'prtrends' && (
          <div key="tab-prtrends">
            <form onSubmit={handleAddPR} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.25rem', letterSpacing: '0.03em', marginBottom: '1rem' }}>LOG PR</h2>
              <div style={{ background: 'rgba(8,119,160,0.1)', border: '1px solid rgba(8,119,160,0.2)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--teal-secondary)' }}>
                PRs logged here are always private. To submit a PR to the public leaderboard, use the <Link href="/leaderboard" style={{ color: 'var(--teal-secondary)', textDecoration: 'underline' }}>Leaderboard</Link> page.
              </div>
              {prFormError && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', color: '#f87171', fontSize: '0.875rem' }}>{prFormError}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.875rem' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={labelBase}>Exercise *</label>
                  <input
                    type="text" value={prForm.exercise} list="pr-exercise-suggestions"
                    onChange={e => setPrForm({ ...prForm, exercise: e.target.value })}
                    style={{ ...inputBase, width: '100%' }} placeholder="e.g. Back Squat"
                  />
                  <datalist id="pr-exercise-suggestions">
                    {exerciseNames.map(n => <option key={n} value={n} />)}
                  </datalist>
                </div>
                <div>
                  <label style={labelBase}>Value *</label>
                  <input type="number" value={prForm.value} onChange={e => setPrForm({ ...prForm, value: e.target.value })} style={{ ...inputBase, width: '100%' }} placeholder="100" min="0" step="0.01" />
                </div>
                <div>
                  <label style={labelBase}>Unit</label>
                  <select value={prForm.unit} onChange={e => setPrForm({ ...prForm, unit: e.target.value })} style={{ ...inputBase, width: '100%', cursor: 'pointer' }}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelBase}>Date</label>
                  <input type="date" value={prForm.date} onChange={e => setPrForm({ ...prForm, date: e.target.value })} style={{ ...inputBase, width: '100%' }} />
                </div>
              </div>
              <button type="submit" disabled={prFormSaving} style={{
                marginTop: '1rem', background: prFormSaving ? '#0d1a1e' : 'var(--teal-primary)', color: 'white',
                border: 'none', borderRadius: '0.5rem', padding: '0.75rem', fontWeight: 700, fontSize: '0.875rem',
                cursor: prFormSaving ? 'not-allowed' : 'pointer', width: '100%',
              }}>
                {prFormSaving ? 'Saving…' : 'Log PR'}
              </button>
            </form>

            {exerciseNames.length === 0 ? (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                No PRs logged yet — log your first one above, or on the <Link href="/leaderboard" style={{ color: 'var(--teal-secondary)' }}>Leaderboard</Link> page.
              </div>
            ) : (
              <>
                <select value={selectedExercise} onChange={e => setSelectedExercise(e.target.value)} style={{ ...inputBase, width: '100%', marginBottom: '1rem', cursor: 'pointer' }}>
                  {exerciseNames.map(n => <option key={n} value={n}>{n}</option>)}
                </select>

                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Best</p>
                      <p style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', color: 'var(--teal-secondary)' }}>{bestRecord ? `${bestRecord.value} ${bestRecord.unit}` : '—'}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Latest</p>
                      <p style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem' }}>{latestRecord ? `${latestRecord.value} ${latestRecord.unit}` : '—'}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>% Change</p>
                      <p style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', color: pctChange === null ? 'var(--text-secondary)' : pctChange >= 0 ? '#4ade80' : '#f87171' }}>
                        {pctChange === null ? '—' : `${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(1)}%`}
                      </p>
                    </div>
                  </div>
                  <LineChart points={chartPoints} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {exerciseRecords.slice().reverse().map(r => (
                    <div key={r.id} className="card-vel" style={{ padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      {editingPRId === r.id ? (
                        <>
                          <input type="number" value={editPRForm.value} onChange={e => setEditPRForm({ ...editPRForm, value: e.target.value })} style={{ ...inputBase, width: '90px' }} step="0.01" />
                          {editPRForm.unit === 'kg' || editPRForm.unit === 'lbs' ? (
                            <span style={{ ...inputBase, width: '110px', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center' }}>{editPRForm.unit}</span>
                          ) : (
                            <select value={editPRForm.unit} onChange={e => setEditPRForm({ ...editPRForm, unit: e.target.value })} style={{ ...inputBase, width: '110px', cursor: 'pointer' }}>
                              {UNITS.filter(u => u !== 'kg' && u !== 'lbs').map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                          )}
                          <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
                            <button onClick={() => saveEditPR(r.id)} disabled={prSaving} style={{ background: 'var(--teal-primary)', border: 'none', borderRadius: '0.375rem', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', minHeight: 0 }}><Check size={14} /></button>
                            <button onClick={() => setEditingPRId(null)} style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '0.375rem', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', minHeight: 0 }}><X size={14} /></button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                              {new Date(r.date ?? r.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                          <span style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.2rem', color: 'var(--teal-secondary)' }}>{r.value} <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{r.unit}</span></span>
                          <span style={{ fontSize: '0.7rem', color: r.is_public ? 'var(--teal-secondary)' : 'var(--text-secondary)' }}>{r.is_public ? 'Public' : 'Private'}</span>
                          <button onClick={() => startEditPR(r)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', minHeight: 0 }}><Pencil size={14} /></button>
                          <button onClick={() => prDeleting === null && deletePR(r.id)} disabled={prDeleting === r.id} style={{ background: 'none', border: 'none', cursor: prDeleting === r.id ? 'not-allowed' : 'pointer', color: '#f87171', display: 'flex', opacity: prDeleting === r.id ? 0.5 : 1, minHeight: 0 }}><Trash2 size={14} /></button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── BODY ── */}
        {activeTab === 'body' && (
          <div key="tab-body">
            <form onSubmit={handleBodySubmit} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.25rem', letterSpacing: '0.03em', marginBottom: '1rem' }}>LOG MEASUREMENTS</h2>
              {bodyError && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', color: '#f87171', fontSize: '0.875rem' }}>{bodyError}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.875rem' }}>
                {([
                  ['weight_kg', 'Weight (kg)'], ['body_fat_pct', 'Body Fat %'], ['chest_cm', 'Chest (cm)'],
                  ['waist_cm', 'Waist (cm)'], ['hips_cm', 'Hips (cm)'], ['arm_cm', 'Arm (cm)'], ['thigh_cm', 'Thigh (cm)'],
                ] as const).map(([field, label]) => (
                  <div key={field}>
                    <label style={labelBase}>{label}</label>
                    <input type="number" value={(bodyForm as any)[field]} onChange={e => setBodyForm({ ...bodyForm, [field]: e.target.value })} style={{ ...inputBase, width: '100%' }} placeholder="—" min="0" step="0.1" />
                  </div>
                ))}
              </div>
              <button type="submit" disabled={bodySaving} style={{
                marginTop: '1rem', background: bodySaving ? '#0d1a1e' : 'var(--teal-primary)', color: 'white',
                border: 'none', borderRadius: '0.5rem', padding: '0.75rem', fontWeight: 700, fontSize: '0.875rem',
                cursor: bodySaving ? 'not-allowed' : 'pointer', width: '100%',
              }}>
                {bodySaving ? 'Saving…' : 'Log Measurement'}
              </button>
            </form>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>Weight Over Time</p>
              <LineChart points={bodyChartPoints} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {bodyMeasurements.length === 0 ? (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No measurements logged yet.</div>
              ) : (
                bodyMeasurements.slice().reverse().map(m => (
                  <div key={m.id} className="card-vel" style={{ padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{new Date(m.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      <p style={{ fontSize: '0.8rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                        {m.weight_kg != null && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Scale size={12} /> {m.weight_kg}kg</span>}
                        {m.body_fat_pct != null && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Droplet size={12} /> {m.body_fat_pct}%</span>}
                        {m.chest_cm != null && <span>Chest {m.chest_cm}cm</span>}
                        {m.waist_cm != null && <span>Waist {m.waist_cm}cm</span>}
                        {m.hips_cm != null && <span>Hips {m.hips_cm}cm</span>}
                        {m.arm_cm != null && <span>Arm {m.arm_cm}cm</span>}
                        {m.thigh_cm != null && <span>Thigh {m.thigh_cm}cm</span>}
                      </p>
                    </div>
                    <button onClick={() => bodyDeleting === null && deleteBodyMeasurement(m.id)} disabled={bodyDeleting === m.id} style={{ background: 'none', border: 'none', cursor: bodyDeleting === m.id ? 'not-allowed' : 'pointer', color: '#f87171', display: 'flex', opacity: bodyDeleting === m.id ? 0.5 : 1, minHeight: 0 }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
