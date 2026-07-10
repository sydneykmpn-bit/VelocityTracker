'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Trash2, ChevronDown, ChevronUp, Pencil, KeyRound, Timer, X, AlertTriangle, Target, CheckCircle2, Mars, Venus, Users, Building2, Settings, Check, History } from 'lucide-react'
import { getLocalDateString, bballOccurrencesInRange, generateRecurringDates, formatDate } from '@/lib/utils'
import { logAction } from '@/lib/auditLog'
import ConfirmModal from '@/components/ConfirmModal'

type AdminTab = 'members' | 'groups' | 'activity' | 'settings'
type Role = 'member' | 'coach' | 'admin'

const ACTIVITY_LOG_PAGE_SIZE = 10

// Friendly labels for activity_log.target_type — see every logAction(...) call site (app/admin/page.tsx,
// app/api/admin/delete-user & reset-password routes, app/classes/page.tsx, components/BballClassModal.tsx,
// components/ClassRosterView.tsx) for the actual set of values ever written. Falls back to a title-cased
// version of the raw value for anything not listed here (e.g. a future target_type).
const TARGET_TYPE_LABELS: Record<string, string> = {
  profiles: 'Member Profile',
  bball_classes: 'Basketball Class',
  bball_class_signups: 'Basketball Signup',
  class_attendees: 'Class Attendee',
  personal_records: 'Personal Record',
}
function targetTypeLabel(targetType?: string): string {
  if (!targetType) return ''
  return TARGET_TYPE_LABELS[targetType] || targetType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const DAY_NAMES_LOWER = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
// create_class logs details.days as either a list of recurring weekday names (e.g. ['tuesday']) or a
// single-element list holding one specific_date (e.g. ['2026-07-14']) for a one-time class.
function formatDaysOrDates(values: string[]): string {
  if (!values || values.length === 0) return ''
  if (DAY_NAMES_LOWER.includes(String(values[0]).toLowerCase())) {
    return values.map(d => `${d.charAt(0).toUpperCase()}${d.slice(1)}s`).join(', ')
  }
  return values.map(d => formatDate(d)).join(', ')
}

// Turns a raw activity_log row's action_type + details jsonb into one readable sentence instead of a
// "key: value" dump — the details shape varies per action_type (see logAction call sites above), so
// this is a switch rather than a generic formatter.
function formatActivityDetails(a: any): string {
  const d = a.details || {}
  const name = d.target_name
  switch (a.action_type) {
    case 'role_change':
      return `${name || 'Member'} role changed from ${d.old_value} to ${d.new_value}`
    case 'delete_user':
      return `Deleted ${name || 'member'}${d.role ? ` (${d.role})` : ''}`
    case 'reset_password':
      return `Reset password for ${name || 'member'}`
    case 'create_class':
      return `Created ${name || 'class'}${d.days ? ` · ${formatDaysOrDates(d.days)}` : ''}`
    case 'edit_class':
      return `Edited ${name || 'class'}`
    case 'delete_class':
      if (d.series) return `Deleted entire series — ${name || 'class'}`
      if (d.occurrence_date) return `Cancelled ${name || 'class'} on ${formatDate(d.occurrence_date)}`
      return `Deleted ${name || 'class'}`
    case 'add_attendee':
      return `Added ${d.guest ? 'guest ' : ''}${name || 'attendee'} to ${d.class_title || 'class'}${d.date ? ` on ${formatDate(d.date)}` : ''}`
    case 'approve_signup':
      return `Approved ${name || 'attendee'}'s signup for ${d.class_title || 'class'}${d.date ? ` on ${formatDate(d.date)}` : ''}`
    case 'remove_attendee':
      return `Removed ${name || 'attendee'} from ${d.class_title || 'class'}${d.date ? ` on ${formatDate(d.date)}` : ''}`
    case 'reject_signup':
      return `Rejected ${name || 'attendee'}'s request for ${d.class_title || 'class'}${d.date ? ` on ${formatDate(d.date)}` : ''}`
    case 'delete_pr':
      return `Removed ${name || 'a member'}'s ${d.exercise_name || 'PR'}${d.value != null ? ` (${d.value}${d.unit ? ` ${d.unit}` : ''})` : ''} from the leaderboard`
    default: {
      const entries = Object.entries(d).filter(([k]) => k !== 'target_name')
      return entries.length > 0 ? entries.map(([k, v]) => `${k}: ${v}`).join(', ') : ''
    }
  }
}

const inputBase: React.CSSProperties = {
  background: '#0d1a1e', border: '1px solid #1a2e34', borderRadius: '0.5rem',
  padding: '0.6rem 0.875rem', color: '#F2F2F2', fontSize: '0.875rem', outline: 'none',
}
const labelBase: React.CSSProperties = {
  display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)',
  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.375rem',
}
const roleBadgeStyle = (role: string): React.CSSProperties => ({
  fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '999px',
  textTransform: 'uppercase', letterSpacing: '0.07em',
  ...(role === 'admin'
    ? { background: 'rgba(168,85,247,0.15)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.3)' }
    : role === 'coach'
    ? { background: 'rgba(8,119,160,0.15)', color: '#34bac2', border: '1px solid rgba(8,119,160,0.3)' }
    : { background: 'rgba(138,138,138,0.15)', color: '#8A8A8A', border: '1px solid rgba(138,138,138,0.3)' }),
})

function WorkoutHistoryCard({ workout, supabase }: { workout: any; supabase: any }) {
  const [expanded, setExpanded] = useState(false)
  const [exercises, setExercises] = useState<any[]>([])
  const [loadingEx, setLoadingEx] = useState(false)

  const toggleExpand = async () => {
    if (!expanded && exercises.length === 0) {
      setLoadingEx(true)
      const { data } = await supabase.from('exercises').select('*').eq('workout_id', workout.id).order('id')
      setExercises(data || [])
      setLoadingEx(false)
    }
    setExpanded(!expanded)
  }

  const TYPE_BADGE_WH: Record<string, { bg: string; color: string; border: string }> = {
    basketball: { bg: 'rgba(8,119,160,0.2)', color: '#34bac2', border: 'rgba(8,119,160,0.35)' },
    conditioning: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80', border: 'rgba(34,197,94,0.25)' },
    both: { bg: 'rgba(168,85,247,0.15)', color: '#c084fc', border: 'rgba(168,85,247,0.25)' },
  }
  const tb = TYPE_BADGE_WH[workout.type] ?? TYPE_BADGE_WH.both

  return (
    <div style={{ borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
      <div style={{ padding: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', background: 'var(--surface-raised)' }} onClick={toggleExpand}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '999px', textTransform: 'uppercase' as const, ...tb }}>{workout.type}</span>
            {workout.duration && <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}><Timer size={11} /> {workout.duration}min</span>}
          </div>
          <p style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{workout.title}</p>
          <p style={{ fontSize: '0.7rem', marginTop: '0.15rem', color: 'var(--text-secondary)' }}>
            {new Date(workout.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{workout.exercises?.[0]?.count || 0} ex</span>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>
      {expanded && (
        <div style={{ padding: '1rem', background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {workout.notes && <p style={{ fontSize: '0.875rem', fontStyle: 'italic', marginBottom: '0.5rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>"{workout.notes}"</p>}
          {loadingEx ? (
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Loading exercises…</p>
          ) : exercises.length === 0 ? (
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No exercises logged for this workout.</p>
          ) : exercises.map(ex => (
            <div key={ex.id} style={{ background: 'var(--surface-raised)', borderRadius: '0.5rem', padding: '0.75rem' }}>
              <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>{ex.name}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.75rem' }}>
                {ex.sets && ex.reps && <span><span style={{ color: 'var(--text-secondary)' }}>Sets×Reps </span><span style={{ fontWeight: 600 }}>{ex.sets}×{ex.reps}</span></span>}
                {ex.weight && <span><span style={{ color: 'var(--text-secondary)' }}>Weight </span><span style={{ fontWeight: 600, color: 'var(--teal-secondary)' }}>{ex.weight}{ex.weight_unit || 'kg'}</span></span>}
                {ex.duration && <span><span style={{ color: 'var(--text-secondary)' }}>Duration </span><span style={{ fontWeight: 600 }}>{ex.duration}min</span></span>}
                {ex.distance && <span><span style={{ color: 'var(--text-secondary)' }}>Distance </span><span style={{ fontWeight: 600 }}>{ex.distance}km</span></span>}
              </div>
              {ex.notes && <p style={{ fontSize: '0.75rem', marginTop: '0.375rem', fontStyle: 'italic', color: 'var(--text-secondary)' }}>{ex.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MemberProfileModal({ memberId, memberName, onClose }: { memberId: string; memberName: string; onClose: () => void }) {
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [allWorkouts, setAllWorkouts] = useState<any[]>([])
  const [prs, setPRs] = useState<any[]>([])
  const [stats, setStats] = useState({ total: 0, thisMonth: 0, totalPRs: 0 })
  const [loadingModal, setLoadingModal] = useState(true)
  const [activeModalTab, setActiveModalTab] = useState<'overview'|'workouts'|'prs'>('overview')

  useEffect(() => {
    async function load() {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', memberId).single()
      setProfile(p)
      const { data: w } = await supabase.from('workouts').select('*, exercises(count)').eq('user_id', memberId).order('date', { ascending: false })
      setAllWorkouts(w || [])
      const { data: pr } = await supabase.from('personal_records').select('*').eq('user_id', memberId).order('value', { ascending: false })
      setPRs(pr || [])
      const thisMonth = getLocalDateString().slice(0, 7)
      setStats({
        total: w?.length || 0,
        thisMonth: w?.filter((wk: any) => wk.date?.startsWith(thisMonth)).length || 0,
        totalPRs: pr?.length || 0,
      })
      setLoadingModal(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId])

  const TYPE_BADGE_M: Record<string, { bg: string; color: string; border: string }> = {
    basketball: { bg: 'rgba(8,119,160,0.2)', color: '#34bac2', border: 'rgba(8,119,160,0.35)' },
    conditioning: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80', border: 'rgba(34,197,94,0.25)' },
    both: { bg: 'rgba(168,85,247,0.15)', color: '#c084fc', border: 'rgba(168,85,247,0.25)' },
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
    >
      <div style={{ width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '1rem', background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--teal-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700, flexShrink: 0 }}>
              {profile?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', letterSpacing: '0.03em' }}>{memberName}</h2>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem', fontSize: '0.7rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                {profile?.gender && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                    {profile.gender === 'male' ? <><Mars size={11} /> Male</> : profile.gender === 'female' ? <><Venus size={11} /> Female</> : profile.gender}
                  </span>
                )}
                {profile?.age && <span>Age {profile.age}</span>}
                {profile?.weight_kg && <span>{profile.weight_kg} {profile.weight_unit || 'kg'}</span>}
                {profile?.city && <span>{profile.city}</span>}
                {profile?.contact_number && <span>{profile.contact_number}</span>}
                <span style={{ textTransform: 'capitalize' }}>{profile?.role}</span>
                {profile?.created_at && <span>Since {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', flexShrink: 0, minHeight: 0 }}><X size={16} /></button>
        </div>
        {!loadingModal && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: 'var(--border)', borderBottom: '1px solid var(--border)' }}>
              {[{ label: 'Total Workouts', value: stats.total }, { label: 'This Month', value: stats.thisMonth }, { label: 'Personal Records', value: stats.totalPRs }].map(s => (
                <div key={s.label} style={{ padding: '1rem', textAlign: 'center', background: 'var(--surface)' }}>
                  <p style={{ fontFamily: 'var(--font-bebas)', fontSize: '2rem', color: 'var(--teal-secondary)', lineHeight: 1 }}>{s.value}</p>
                  <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
                </div>
              ))}
            </div>
            {allWorkouts.length > 0 && (() => {
              const counts = allWorkouts.reduce((acc, w) => { acc[w.type] = (acc[w.type] || 0) + 1; return acc }, {} as Record<string, number>)
              return (
                <div style={{ display: 'flex', gap: '0.5rem', padding: '0.625rem 1rem', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
                  {Object.entries(counts).map(([type, count]) => (
                    <span key={type} style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '999px', ...(TYPE_BADGE_M[type] ?? TYPE_BADGE_M.both) }}>
                      {type} · {count as number}
                    </span>
                  ))}
                </div>
              )
            })()}
          </>
        )}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          {(['overview', 'workouts', 'prs'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveModalTab(tab)} style={{
              flex: 1, padding: '0.75rem', fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize', cursor: 'pointer', background: 'none', border: 'none',
              color: activeModalTab === tab ? 'var(--teal-secondary)' : 'var(--text-secondary)',
              borderBottom: `2px solid ${activeModalTab === tab ? 'var(--teal-primary)' : 'transparent'}`,
              minHeight: 0,
            }}>
              {tab === 'prs' ? 'PRs' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        <div style={{ padding: '1.25rem' }}>
          {loadingModal ? <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading…</p> : (
            <>
              {activeModalTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {profile?.medical_info && (
                    <div style={{ background: 'rgba(245,158,11,0.08)', borderLeft: '3px solid #f59e0b', borderRadius: '0.5rem', padding: '0.75rem 1rem' }}>
                      <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#f59e0b', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><AlertTriangle size={11} /> Medical / Injury Info</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{profile.medical_info}</p>
                    </div>
                  )}
                  {profile?.goals && (
                    <div style={{ background: 'rgba(8,119,160,0.08)', borderLeft: '3px solid var(--teal-primary)', borderRadius: '0.5rem', padding: '0.75rem 1rem' }}>
                      <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--teal-secondary)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Target size={11} /> Goals</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{profile.goals}</p>
                    </div>
                  )}
                  <div>
                    <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Recent Activity</p>
                    {allWorkouts.slice(0, 3).map(w => (
                      <div key={w.id} style={{ background: 'var(--surface-raised)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '0.375rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{w.title}</p>
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>{new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}{w.duration ? ` · ${w.duration}min` : ''}</p>
                        </div>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '999px', textTransform: 'uppercase' as const, ...(TYPE_BADGE_M[w.type] ?? TYPE_BADGE_M.both) }}>{w.type}</span>
                      </div>
                    ))}
                    {allWorkouts.length === 0 && <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No workouts yet.</p>}
                  </div>
                </div>
              )}
              {activeModalTab === 'workouts' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {allWorkouts.length === 0 ? (
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No workouts logged yet.</p>
                  ) : allWorkouts.map(w => (
                    <WorkoutHistoryCard key={w.id} workout={w} supabase={supabase} />
                  ))}
                </div>
              )}
              {activeModalTab === 'prs' && (() => {
                if (prs.length === 0) return <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No PRs yet.</p>
                type PRGroup = { exercise: string; unit: string; best: number; all: any[] }
                const grouped = (Object.values(
                  prs.reduce((acc, pr) => {
                    const key = pr.exercise_name
                    if (!acc[key]) acc[key] = { exercise: key, unit: pr.unit, best: pr.value, all: [] as any[] }
                    if (pr.value > acc[key].best) acc[key].best = pr.value
                    acc[key].all.push(pr)
                    return acc
                  }, {} as Record<string, PRGroup>)
                ) as PRGroup[]).sort((a, b) => b.best - a.best)
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {grouped.map(group => (
                      <div key={group.exercise} style={{ background: 'var(--surface-raised)', borderRadius: '0.5rem', overflow: 'hidden' }}>
                        <div style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: group.all.length > 1 ? '1px solid var(--border)' : 'none' }}>
                          <div>
                            <p style={{ fontWeight: 700, fontSize: '0.875rem' }}>{group.exercise}</p>
                            <p style={{ fontSize: '0.65rem', color: 'var(--teal-secondary)', marginTop: '0.1rem' }}>Personal Best</p>
                          </div>
                          <p style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', color: 'var(--teal-secondary)' }}>{group.best} <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{group.unit}</span></p>
                        </div>
                        {group.all.length > 1 && (
                          <div style={{ padding: '0.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            {group.all.map(pr => (
                              <div key={pr.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                <span>{new Date(pr.recorded_at || pr.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                <span style={{ color: pr.value === group.best ? 'var(--teal-secondary)' : 'var(--text-secondary)', fontWeight: pr.value === group.best ? 700 : 400 }}>{pr.value} {pr.unit}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              })()}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', username: '', password: '', role: 'member', gender: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError('')
    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) {
      const { error: err } = await res.json().catch(() => ({ error: 'Failed to create user.' }))
      setError(err || 'Failed to create user.')
      setSaving(false)
      return
    }
    setSaving(false)
    setDone(true)
    onCreated()
  }

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '440px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '1rem', background: 'var(--surface)', border: '1px solid var(--border)', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', letterSpacing: '0.03em' }}>CREATE USER</h2>
          <button onClick={onClose} style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', flexShrink: 0, minHeight: 0 }}><X size={16} /></button>
        </div>
        {done ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <CheckCircle2 size={32} style={{ color: '#4ade80', marginBottom: '0.5rem' }} />
            <p style={{ color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem' }}>User created!</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1.25rem' }}>Share the temporary password with the user.</p>
            <button onClick={onClose} style={{ background: 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.7rem 1.5rem', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}>Done</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', padding: '0.75rem', color: '#f87171', fontSize: '0.875rem' }}>{error}</div>}
            <div>
              <label style={labelBase}>Name</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required style={{ ...inputBase, width: '100%' }} placeholder="Full name" />
            </div>
            <div>
              <label style={labelBase}>Username</label>
              <input type="text" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required style={{ ...inputBase, width: '100%' }} placeholder="e.g. juan_dc" autoCapitalize="none" autoCorrect="off" />
            </div>
            <div>
              <label style={labelBase}>Temporary Password</label>
              <input type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} style={{ ...inputBase, width: '100%' }} placeholder="At least 6 characters" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={labelBase}>Role</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={{ ...inputBase, width: '100%', cursor: 'pointer' }}>
                  <option value="member">Member</option>
                  <option value="coach">Coach</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label style={labelBase}>Gender</label>
                <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} style={{ ...inputBase, width: '100%', cursor: 'pointer' }}>
                  <option value="">—</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <button type="submit" disabled={saving} style={{
              background: saving ? '#0d1a1e' : 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.5rem',
              padding: '0.875rem', fontWeight: 700, fontSize: '0.875rem', cursor: saving ? 'not-allowed' : 'pointer', marginTop: '0.25rem',
            }}>
              {saving ? 'Creating…' : 'Create User'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function AdminPage() {
  const router = useRouter()
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<AdminTab>('members')
  const [loading, setLoading] = useState(true)

  // Members tab
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [pendingUsers, setPendingUsers] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [memberSearch, setMemberSearch] = useState('')
  const [memberRoleFilter, setMemberRoleFilter] = useState('all')

  // Groups tab
  const [groups, setGroups] = useState<any[]>([])
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
  const [groupMembers, setGroupMembers] = useState<Record<string, any[]>>({})
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupDesc, setNewGroupDesc] = useState('')
  const [newGroupCoach, setNewGroupCoach] = useState('')
  const [addMemberId, setAddMemberId] = useState<Record<string, string>>({})
  const [groupSaving, setGroupSaving] = useState(false)
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editGroupName, setEditGroupName] = useState('')
  const [editGroupDesc, setEditGroupDesc] = useState('')
  const [editGroupCoach, setEditGroupCoach] = useState('')
  const [editGroupSaving, setEditGroupSaving] = useState(false)

  // Leaderboard (still used by Settings tab PR management)
  const [allPRs, setAllPRs] = useState<any[]>([])

  const [classesThisWeekCount, setClassesThisWeekCount] = useState(0)
  const [settings, setSettings] = useState({ require_approval: true, instagram_handle: '', public_pr_exercises: [] as string[] })
  const [settingsSaved, setSettingsSaved] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [confirmAction, setConfirmAction] = useState<{ type: 'deleteGroup' | 'rejectUser' | 'removeUser' | 'deleteAllPRs' | 'clearActivityLog'; group?: any; user?: any } | null>(null)
  const [selectedMemberProfile, setSelectedMemberProfile] = useState<{id: string; name: string} | null>(null)
  const [showCreateUserModal, setShowCreateUserModal] = useState(false)
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null)
  const [resetPasswordValue, setResetPasswordValue] = useState('')
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false)

  const [activityLog, setActivityLog] = useState<any[]>([])
  const [activityLogLoading, setActivityLogLoading] = useState(false)
  const [activityLogFilter, setActivityLogFilter] = useState<'all' | 'classes' | 'other'>('all')
  const [activityLogPage, setActivityLogPage] = useState(1)
  const [activityLogClearing, setActivityLogClearing] = useState(false)

  const loadActivityLog = async () => {
    setActivityLogLoading(true)
    const { data } = await supabase
      .from('audit_log')
      .select('*, profiles(name)')
      .order('created_at', { ascending: false })
      .limit(200)
    setActivityLog(data || [])
    setActivityLogLoading(false)
  }

  useEffect(() => {
    if (activeTab === 'activity' && activityLog.length === 0 && !activityLogLoading) loadActivityLog()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  useEffect(() => {
    setActivityLogPage(1)
  }, [activityLogFilter])

  // Clears only the rows matching the currently active filter (all/classes/other) — same scoped-delete
  // convention as handleDeleteAllPublicPRs below, so an admin filtered to "Classes" only wipes that
  // category rather than every logged action.
  const handleClearActivityLog = async () => {
    setActivityLogClearing(true)
    setError('')
    const query = supabase.from('audit_log').delete()
    const { data, error: err } = activityLogFilter === 'all'
      ? await query.neq('id', '00000000-0000-0000-0000-000000000000').select('id')
      : await query.eq('category', activityLogFilter).select('id')
    setActivityLogClearing(false)
    if (err) { setError(err.message); return }
    if (!data || data.length === 0) {
      setError('Nothing was deleted — you may not have permission to clear the activity log (check the audit_log DELETE policy).')
      return
    }
    setActivityLog(prev => activityLogFilter === 'all' ? [] : prev.filter(a => a.category !== activityLogFilter))
    setActivityLogPage(1)
    setSuccess('Activity log cleared.')
    setTimeout(() => setSuccess(''), 3000)
  }

  const refreshMembers = async () => {
    const [pendingResult, allResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('approved', false).order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').eq('approved', true).order('created_at', { ascending: false }),
    ])
    setPendingUsers(pendingResult.data || [])
    setAllUsers(allResult.data || [])
  }

  const loadGroups = async () => {
    const { data } = await supabase
      .from('groups')
      .select('*, coach:profiles!groups_coach_id_fkey(name), group_members(count)')
      .order('created_at', { ascending: false })
    setGroups(data ?? [])
  }

  const loadGroupMembers = async (groupId: string) => {
    const { data } = await supabase
      .from('group_members')
      .select('*, profiles!member_id(name, email)')
      .eq('group_id', groupId)
    setGroupMembers(prev => ({ ...prev, [groupId]: data ?? [] }))
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (prof?.role !== 'admin') { router.push('/dashboard'); return }
      setCurrentUser(user)

      const [pendingResult, allResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('approved', false).order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').eq('approved', true).order('created_at', { ascending: false }),
      ])
      setPendingUsers(pendingResult.data || [])
      setAllUsers(allResult.data || [])

      await Promise.all([
        loadGroups(),
        supabase.from('personal_records').select('*, profiles(name, gender)').order('value', { ascending: false }).then(({ data }) => setAllPRs(data ?? [])),
      ])

      // Classes this week (Monday–Sunday, matching /classes' own week convention) — count actual
      // occurrences (not base rows) across both class systems, so a recurring class whose own
      // row/date is outside this week but still recurs into it gets counted, and bball_classes
      // occurrences are included too.
      const now = new Date()
      const mondayOffset = (now.getDay() + 6) % 7
      const weekStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset)
      const weekEndDate = new Date(weekStartDate)
      weekEndDate.setDate(weekStartDate.getDate() + 6)
      const startOfWeek = weekStartDate.toISOString().split('T')[0]
      const endOfWeek = weekEndDate.toISOString().split('T')[0]

      const [{ data: bballClasses }, { data: bballExceptions }, { data: scheduledClasses }] = await Promise.all([
        supabase.from('bball_classes').select('*'),
        supabase.from('bball_class_exceptions').select('class_id, excluded_date'),
        supabase.from('scheduled_classes').select('id, scheduled_date, is_recurring, recurrence_rule, recurrence_days'),
      ])
      const exceptionsByClass: Record<string, string[]> = {}
      for (const exc of bballExceptions || []) {
        (exceptionsByClass[exc.class_id] ??= []).push(exc.excluded_date)
      }
      const bballOccurrencesCount = (bballClasses || []).reduce((sum: number, c: any) =>
        sum + bballOccurrencesInRange(c, startOfWeek, endOfWeek, exceptionsByClass[c.id]).length, 0)
      const scheduledOccurrencesCount = (scheduledClasses || []).reduce((sum: number, c: any) => {
        let count = c.scheduled_date >= startOfWeek && c.scheduled_date <= endOfWeek ? 1 : 0
        if (c.is_recurring) {
          count += generateRecurringDates(c.scheduled_date, endOfWeek, c.recurrence_rule, c.recurrence_days || [])
            .filter((d: string) => d >= startOfWeek).length
        }
        return sum + count
      }, 0)
      setClassesThisWeekCount(bballOccurrencesCount + scheduledOccurrencesCount)

      // Settings
      const { data: appSettings } = await supabase.from('app_settings').select('*').eq('id', 'global').maybeSingle()
      if (appSettings) {
        setSettings({
          require_approval: appSettings.require_approval ?? true,
          instagram_handle: appSettings.instagram_handle || '',
          public_pr_exercises: appSettings.public_pr_exercises || [],
        })
      }

      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDeleteUser = async (userId: string): Promise<boolean> => {
    const res = await fetch('/api/admin/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    if (!res.ok) {
      const { error: err } = await res.json().catch(() => ({ error: 'Failed to delete user.' }))
      setError(err || 'Failed to delete user.')
      return false
    }
    return true
  }

  const handleRejectUser = async (u: any) => {
    const ok = await handleDeleteUser(u.id)
    if (ok) setPendingUsers(prev => prev.filter(p => p.id !== u.id))
  }

  const handleRemoveUser = async (u: any) => {
    const ok = await handleDeleteUser(u.id)
    if (ok) setAllUsers(prev => prev.filter(p => p.id !== u.id))
  }

  const handleResetPassword = async (userId: string) => {
    if (resetPasswordValue.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setResetPasswordLoading(true)
    setError(''); setSuccess('')
    const res = await fetch('/api/admin/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, newPassword: resetPasswordValue }),
    })
    if (!res.ok) {
      const { error: err } = await res.json().catch(() => ({ error: 'Failed to reset password.' }))
      setError(err || 'Failed to reset password.')
      setResetPasswordLoading(false)
      return
    }
    setSuccess('Password reset successfully.')
    setResetPasswordUserId(null)
    setResetPasswordValue('')
    setResetPasswordLoading(false)
  }

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGroupName.trim()) return
    setGroupSaving(true)
    setError('')
    const { error: err } = await supabase.from('groups').insert({
      name: newGroupName.trim(),
      description: newGroupDesc.trim() || null,
      coach_id: newGroupCoach || null,
    })
    if (err) { setError(err.message) } else {
      setSuccess('Group created!')
      setNewGroupName(''); setNewGroupDesc(''); setNewGroupCoach('')
      await loadGroups()
    }
    setGroupSaving(false)
  }

  const handleAddToGroup = async (groupId: string) => {
    const memberId = addMemberId[groupId]
    if (!memberId) return
    const { data, error } = await supabase
      .from('group_members')
      .insert({ group_id: groupId, member_id: memberId })
      .select('*, profiles!member_id(name, email, gender)')
      .single()
    if (error) {
      setError(error.message)
      return
    }
    if (data) {
      setGroupMembers(prev => ({ ...prev, [groupId]: [...(prev[groupId] ?? []), data] }))
    }
    await loadGroupMembers(groupId)
    setAddMemberId(prev => ({ ...prev, [groupId]: '' }))
    await loadGroups()
  }

  const handleRemoveFromGroup = async (groupId: string, gmId: string) => {
    await supabase.from('group_members').delete().eq('id', gmId)
    setGroupMembers(prev => ({ ...prev, [groupId]: (prev[groupId] ?? []).filter(gm => gm.id !== gmId) }))
    await loadGroupMembers(groupId)
    await loadGroups()
  }

  const toggleGroup = async (groupId: string) => {
    if (expandedGroup === groupId) { setExpandedGroup(null); return }
    setExpandedGroup(groupId)
    if (!groupMembers[groupId]) await loadGroupMembers(groupId)
  }

  const handleStartEditGroup = (g: any) => {
    setEditingGroupId(g.id)
    setEditGroupName(g.name ?? '')
    setEditGroupDesc(g.description ?? '')
    setEditGroupCoach(g.coach_id ?? '')
  }

  const handleCancelEditGroup = () => {
    setEditingGroupId(null)
    setEditGroupName(''); setEditGroupDesc(''); setEditGroupCoach('')
  }

  const handleUpdateGroup = async (groupId: string) => {
    if (!editGroupName.trim()) return
    setEditGroupSaving(true)
    setError('')
    const { error: err } = await supabase.from('groups').update({
      name: editGroupName.trim(),
      description: editGroupDesc.trim() || null,
      coach_id: editGroupCoach || null,
    }).eq('id', groupId)
    if (err) { setError(err.message) } else {
      await loadGroups()
      handleCancelEditGroup()
    }
    setEditGroupSaving(false)
  }

  const handleDeleteGroup = async (g: any) => {
    setError('')
    await supabase.from('group_members').delete().eq('group_id', g.id)
    const { error: err } = await supabase.from('groups').delete().eq('id', g.id)
    if (err) {
      await supabase.from('scheduled_classes').update({ group_id: null }).eq('group_id', g.id)
      const retry = await supabase.from('groups').delete().eq('id', g.id)
      if (retry.error) { setError(retry.error.message); return }
    }
    setGroupMembers(prev => {
      const next = { ...prev }
      delete next[g.id]
      return next
    })
    if (expandedGroup === g.id) setExpandedGroup(null)
    if (editingGroupId === g.id) handleCancelEditGroup()
    await loadGroups()
  }

  const handleDeleteAllPublicPRs = async () => {
    setError('')
    const { error: err } = await supabase.from('personal_records').delete().eq('is_public', true)
    if (err) { setError(err.message); return }
    const { data } = await supabase.from('personal_records').select('*, profiles(name, gender)').order('value', { ascending: false })
    setAllPRs(data ?? [])
    setSuccess('All public PRs deleted.')
    setTimeout(() => setSuccess(''), 3000)
  }

  const coaches = allUsers.filter(p => p.role === 'coach')
  const members = allUsers.filter(p => p.role === 'member')
  const adminCount = allUsers.filter(p => p.role === 'admin').length
  const recentUsers = allUsers.slice(0, 4)

  const filteredMembers = allUsers.filter(u => {
    const searchMatch = !memberSearch.trim() || u.name?.toLowerCase().includes(memberSearch.toLowerCase()) || u.email?.toLowerCase().includes(memberSearch.toLowerCase())
    const roleMatch = memberRoleFilter === 'all' || u.role === memberRoleFilter
    return searchMatch && roleMatch
  })

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>
      </div>
    )
  }

  const adminTabs: { value: AdminTab; label: string; icon: typeof Users }[] = [
    { value: 'members', label: 'Members', icon: Users },
    { value: 'groups', label: 'Groups', icon: Building2 },
    { value: 'activity', label: 'Activity Log', icon: History },
    { value: 'settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: '2.5rem', letterSpacing: '0.03em', marginBottom: '1.5rem' }}>
          ADMIN PANEL
        </h1>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
          {[
            { label: 'Classes This Week', value: classesThisWeekCount, color: 'var(--teal-secondary)', tab: 'groups' as AdminTab },
            { label: 'Active Members', value: members.length, color: 'var(--teal-secondary)', tab: 'members' as AdminTab },
            { label: 'Coaches', value: coaches.length, color: '#60a5fa', tab: 'members' as AdminTab },
            { label: 'Groups', value: groups.length, color: '#c084fc', tab: 'groups' as AdminTab },
          ].map(card => (
            <button
              key={card.label}
              onClick={() => setActiveTab(card.tab)}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.1rem', textAlign: 'left', cursor: 'pointer' }}
            >
              <p style={{ fontFamily: 'var(--font-bebas)', fontSize: '2.25rem', color: card.color, lineHeight: 1 }}>{card.value}</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', marginTop: '0.35rem' }}>{card.label}</p>
            </button>
          ))}
        </div>

        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', color: '#f87171', fontSize: '0.875rem' }}>{error}</div>}
        {success && <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', color: '#4ade80', fontSize: '0.875rem' }}>{success}</div>}

        {/* Tab Bar */}
        <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {adminTabs.map(t => (
            <button key={t.value} onClick={() => setActiveTab(t.value)} style={{
              background: 'none', border: 'none',
              borderBottom: activeTab === t.value ? '2px solid var(--teal-primary)' : '2px solid transparent',
              color: activeTab === t.value ? 'var(--teal-secondary)' : 'var(--text-secondary)',
              padding: '0.75rem 1rem', cursor: 'pointer', fontSize: '0.8rem',
              fontWeight: activeTab === t.value ? 700 : 400, marginBottom: '-1px', transition: 'all 0.15s',
              whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            }}>
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>

        {/* ── MEMBERS TAB ── */}
        {activeTab === 'members' && (
          <div key="tab-members">
            {/* Search + filter */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text" placeholder="Search by name or email…" value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                style={{ flex: 1, minWidth: '200px', background: '#0d1a1e', border: '1px solid #1a2e34', borderRadius: '0.5rem', padding: '0.6rem 0.875rem', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none' }}
              />
              {(['all', 'member', 'coach', 'admin'] as const).map(f => (
                <button key={f} onClick={() => setMemberRoleFilter(f)} style={{
                  background: memberRoleFilter === f ? 'rgba(8,119,160,0.2)' : 'none',
                  border: `1px solid ${memberRoleFilter === f ? 'var(--teal-primary)' : 'var(--border)'}`,
                  borderRadius: '999px', padding: '0.35rem 0.875rem', fontSize: '0.75rem',
                  color: memberRoleFilter === f ? 'var(--teal-secondary)' : 'var(--text-secondary)',
                  cursor: 'pointer', fontWeight: memberRoleFilter === f ? 700 : 400, textTransform: 'capitalize',
                }}>
                  {f === 'all' ? 'All' : f}
                </button>
              ))}
              <button onClick={() => setShowCreateUserModal(true)} style={{
                background: 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.5rem',
                padding: '0.6rem 1rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
              }}>
                + Create User
              </button>
            </div>

            {/* Pending Approvals */}
            {pendingUsers.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>Pending Approval</p>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '999px', background: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}>
                    {pendingUsers.length}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {pendingUsers.map(u => (
                    <div
                      key={u.id}
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '3px solid #f59e0b', borderRadius: '0.75rem', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>{u.name}</p>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                          Registered {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, flexWrap: 'wrap' }}>
                        <button
                          onClick={async () => {
                            await supabase.from('profiles').update({ approved: true, approved_at: new Date().toISOString(), approved_by: currentUser?.id }).eq('id', u.id)
                            setPendingUsers(prev => prev.filter(p => p.id !== u.id))
                            setAllUsers(prev => [...prev, { ...u, approved: true }])
                          }}
                          style={{ background: 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.4rem 0.875rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <Check size={12} /> Approve
                        </button>
                        <button
                          onClick={() => setConfirmAction({ type: 'rejectUser', user: u })}
                          style={{ background: 'none', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '0.5rem', padding: '0.4rem 0.875rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <X size={12} /> Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1.5rem 0' }} />
              </div>
            )}

            {/* Active Members */}
            <div>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Active Members ({filteredMembers.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {filteredMembers.map(u => (
                  <div key={u.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '0.875rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                      <button
                        onClick={() => setSelectedMemberProfile({ id: u.id, name: u.name })}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}
                      >
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--teal-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0 }}>
                          {u.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>{u.name}</p>
                        </div>
                      </button>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                        <select
                          value={u.role}
                          onChange={async e => {
                            const newRole = e.target.value
                            await supabase.from('profiles').update({ role: newRole }).eq('id', u.id)
                            setAllUsers(prev => prev.map(p => p.id === u.id ? { ...p, role: newRole } : p))
                            await logAction(supabase, {
                              category: 'other', action_type: 'role_change', target_type: 'profiles', target_id: u.id,
                              details: { target_name: u.name, old_value: u.role, new_value: newRole },
                            })
                          }}
                          style={{ ...inputBase, padding: '0.25rem 0.5rem', fontSize: '0.75rem', cursor: 'pointer',
                            color: u.role === 'admin' ? '#c084fc' : u.role === 'coach' ? '#34bac2' : 'var(--text-secondary)' }}
                        >
                          <option value="member">member</option>
                          <option value="coach">coach</option>
                          <option value="admin">admin</option>
                        </select>
                        <button
                          onClick={() => {
                            if (resetPasswordUserId === u.id) { setResetPasswordUserId(null); setResetPasswordValue(''); return }
                            setResetPasswordUserId(u.id)
                            setResetPasswordValue('')
                            setError(''); setSuccess('')
                          }}
                          title="Reset Password"
                          style={{ width: '28px', height: '28px', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: resetPasswordUserId === u.id ? 'rgba(8,119,160,0.15)' : 'var(--surface-raised)', border: `1px solid ${resetPasswordUserId === u.id ? 'var(--teal-primary)' : 'var(--border)'}`, color: resetPasswordUserId === u.id ? 'var(--teal-secondary)' : 'var(--text-secondary)', cursor: 'pointer', flexShrink: 0 }}
                        >
                          <KeyRound size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmAction({ type: 'removeUser', user: u })}
                          style={{ width: '28px', height: '28px', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-raised)', border: '1px solid var(--border)', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem', flexShrink: 0 }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                    {resetPasswordUserId === u.id && (
                      <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>New Password</label>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <input
                            type="password"
                            value={resetPasswordValue}
                            onChange={e => setResetPasswordValue(e.target.value)}
                            placeholder="At least 6 characters"
                            style={{ ...inputBase, flex: '1 1 200px' }}
                          />
                          <button
                            onClick={() => handleResetPassword(u.id)}
                            disabled={resetPasswordLoading}
                            style={{ background: 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.6rem 1rem', fontSize: '0.8rem', fontWeight: 700, cursor: resetPasswordLoading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
                          >
                            {resetPasswordLoading ? 'Saving…' : 'Confirm'}
                          </button>
                        </div>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>The user will need to use this new password next time they log in.</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── GROUPS TAB ── */}
        {activeTab === 'groups' && (
          <div key="tab-groups" className="admin-groups-grid" style={{ display: 'grid', alignItems: 'start' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', letterSpacing: '0.03em', marginBottom: '1rem' }}>
                GROUPS ({groups.length})
              </h2>
              {groups.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No groups yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {groups.map(g => {
                    const isExpanded = expandedGroup === g.id
                    const isEditing = editingGroupId === g.id
                    const gms = groupMembers[g.id] ?? []
                    const memberCount = groupMembers[g.id] ? groupMembers[g.id].length : ((g.group_members as any[])?.[0]?.count ?? 0)
                    return (
                      <div key={g.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', overflow: 'hidden' }}>
                        <div style={{ width: '100%', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#F2F2F2' }}>
                          <button
                            onClick={() => toggleGroup(g.id)}
                            style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: '#F2F2F2', padding: 0 }}
                          >
                            <h3 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.15rem' }}>{g.name}</h3>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              Coach: {g.coach?.name ?? 'Unassigned'} · {memberCount} members
                            </p>
                          </button>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                            <button onClick={() => handleStartEditGroup(g)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', minHeight: 0 }} aria-label="Edit group">
                              <Pencil size={16} />
                            </button>
                            <button onClick={() => setConfirmAction({ type: 'deleteGroup', group: g })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', display: 'flex', minHeight: 0 }} aria-label="Delete group">
                              <Trash2 size={16} />
                            </button>
                            <button onClick={() => toggleGroup(g.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', minHeight: 0 }}>
                              {isExpanded ? <ChevronUp size={16} style={{ color: 'var(--text-secondary)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-secondary)' }} />}
                            </button>
                          </div>
                        </div>

                        {isEditing && (
                          <div style={{ borderTop: '1px solid var(--border)', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                            <div>
                              <label style={labelBase}>Name *</label>
                              <input type="text" value={editGroupName} onChange={e => setEditGroupName(e.target.value)} required style={{ ...inputBase, width: '100%' }} placeholder="e.g. Morning Strength" />
                            </div>
                            <div>
                              <label style={labelBase}>Description</label>
                              <textarea value={editGroupDesc} onChange={e => setEditGroupDesc(e.target.value)} style={{ ...inputBase, width: '100%', minHeight: '60px', resize: 'vertical' }} placeholder="Optional…" />
                            </div>
                            <div>
                              <label style={labelBase}>Assign Coach</label>
                              <select value={editGroupCoach} onChange={e => setEditGroupCoach(e.target.value)} style={{ ...inputBase, width: '100%', cursor: 'pointer' }}>
                                <option value="">No coach</option>
                                {coaches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button onClick={() => handleUpdateGroup(g.id)} disabled={editGroupSaving} style={{
                                background: editGroupSaving ? '#0d1a1e' : 'var(--teal-primary)', color: 'white',
                                border: 'none', borderRadius: '0.5rem', padding: '0.6rem 1rem', fontWeight: 700, fontSize: '0.8rem',
                                cursor: editGroupSaving ? 'not-allowed' : 'pointer', flex: 1,
                              }}>
                                {editGroupSaving ? 'Saving…' : 'Save'}
                              </button>
                              <button onClick={handleCancelEditGroup} style={{
                                background: 'none', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.6rem 1rem',
                                fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text-secondary)', flex: 1,
                              }}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        {isExpanded && (
                          <div style={{ borderTop: '1px solid var(--border)', padding: '1rem 1.25rem' }}>
                            {gms.length === 0 ? (
                              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>No members yet.</p>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                {gms.map(gm => (
                                  <div key={gm.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                      <span
                                        onClick={() => gm.profiles?.name && setSelectedMemberProfile({ id: gm.member_id, name: gm.profiles.name })}
                                        style={{ fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(52,186,194,0.4)', textUnderlineOffset: '2px' }}
                                      >{gm.profiles?.name}</span>
                                    </div>
                                    <button onClick={() => handleRemoveFromGroup(g.id, gm.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', display: 'flex' }}>
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <select
                                value={addMemberId[g.id] ?? ''}
                                onChange={e => setAddMemberId(prev => ({ ...prev, [g.id]: e.target.value }))}
                                style={{ ...inputBase, flex: 1, cursor: 'pointer' }}
                              >
                                <option value="">Add member…</option>
                                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                              </select>
                              <button onClick={() => handleAddToGroup(g.id)} style={{
                                background: 'var(--teal-primary)', color: 'white', border: 'none',
                                borderRadius: '0.5rem', padding: '0.55rem 0.875rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700,
                              }}>Add</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Create Group Form */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.25rem' }}>
              <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.25rem', letterSpacing: '0.03em', marginBottom: '1rem' }}>CREATE GROUP</h2>
              <form onSubmit={handleCreateGroup} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                <div>
                  <label style={labelBase}>Name *</label>
                  <input type="text" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} required style={{ ...inputBase, width: '100%' }} placeholder="e.g. Morning Strength" />
                </div>
                <div>
                  <label style={labelBase}>Description</label>
                  <textarea value={newGroupDesc} onChange={e => setNewGroupDesc(e.target.value)} style={{ ...inputBase, width: '100%', minHeight: '60px', resize: 'vertical' }} placeholder="Optional…" />
                </div>
                <div>
                  <label style={labelBase}>Assign Coach</label>
                  <select value={newGroupCoach} onChange={e => setNewGroupCoach(e.target.value)} style={{ ...inputBase, width: '100%', cursor: 'pointer' }}>
                    <option value="">No coach</option>
                    {coaches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <button type="submit" disabled={groupSaving} style={{
                  background: groupSaving ? '#0d1a1e' : 'var(--teal-primary)', color: 'white',
                  border: 'none', borderRadius: '0.5rem', padding: '0.7rem', fontWeight: 700, fontSize: '0.875rem',
                  cursor: groupSaving ? 'not-allowed' : 'pointer',
                }}>
                  {groupSaving ? 'Creating…' : 'Create Group'}
                </button>
              </form>
            </div>

            <style>{`
              .admin-groups-grid { grid-template-columns: 1fr 320px; gap: 1.5rem; }
              @media (max-width: 768px) {
                .admin-groups-grid { grid-template-columns: 1fr; }
              }
            `}</style>
          </div>
        )}

        {/* ── ACTIVITY LOG TAB ── */}
        {activeTab === 'activity' && (() => {
          const filtered = activityLog.filter(a => activityLogFilter === 'all' || a.category === activityLogFilter)
          const totalPages = Math.max(1, Math.ceil(filtered.length / ACTIVITY_LOG_PAGE_SIZE))
          const page = Math.min(activityLogPage, totalPages)
          const pageRows = filtered.slice((page - 1) * ACTIVITY_LOG_PAGE_SIZE, page * ACTIVITY_LOG_PAGE_SIZE)
          return (
            <div key="tab-activity">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {(['all', 'classes', 'other'] as const).map(f => (
                    <button key={f} onClick={() => setActivityLogFilter(f)} style={{
                      background: activityLogFilter === f ? 'rgba(8,119,160,0.2)' : 'none',
                      border: `1px solid ${activityLogFilter === f ? 'var(--teal-primary)' : 'var(--border)'}`,
                      borderRadius: '999px', padding: '0.35rem 0.875rem', fontSize: '0.75rem',
                      color: activityLogFilter === f ? 'var(--teal-secondary)' : 'var(--text-secondary)',
                      cursor: 'pointer', fontWeight: activityLogFilter === f ? 700 : 400, textTransform: 'capitalize',
                    }}>
                      {f === 'all' ? 'All' : f}
                    </button>
                  ))}
                </div>
                {filtered.length > 0 && (
                  <button
                    onClick={() => setConfirmAction({ type: 'clearActivityLog' })}
                    disabled={activityLogClearing}
                    style={{
                      background: 'none', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '0.5rem',
                      padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, color: '#f87171',
                      cursor: activityLogClearing ? 'not-allowed' : 'pointer', opacity: activityLogClearing ? 0.6 : 1,
                      display: 'flex', alignItems: 'center', gap: '0.35rem',
                    }}
                  >
                    <Trash2 size={13} /> Clear History
                  </button>
                )}
              </div>

              {activityLogLoading ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading…</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {pageRows.map(a => (
                    <div key={a.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '0.875rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                          {a.profiles?.name || 'Unknown'} <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>— {a.action_type.replace(/_/g, ' ')}</span>
                          {a.target_type && <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}> · {targetTypeLabel(a.target_type)}</span>}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                          {formatActivityDetails(a)}
                        </p>
                      </div>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', flexShrink: 0 }}>
                        {new Date(a.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </p>
                    </div>
                  ))}
                  {filtered.length === 0 && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No activity recorded yet.</p>
                  )}
                  {filtered.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '0.75rem' }}>
                      <button
                        onClick={() => setActivityLogPage(p => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.4rem 0.875rem', fontSize: '0.8rem', color: page <= 1 ? 'var(--text-secondary)' : 'var(--text-primary)', cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.5 : 1 }}
                      >
                        Previous
                      </button>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Page {page} of {totalPages}</span>
                      <button
                        onClick={() => setActivityLogPage(p => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.4rem 0.875rem', fontSize: '0.8rem', color: page >= totalPages ? 'var(--text-secondary)' : 'var(--text-primary)', cursor: page >= totalPages ? 'not-allowed' : 'pointer', opacity: page >= totalPages ? 0.5 : 1 }}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })()}

        {activeTab === 'settings' && (
          <div key="tab-settings" style={{ maxWidth: '540px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {settingsSaved && (
              <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '0.5rem', padding: '0.75rem', color: '#4ade80', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={15} /> Settings saved
              </div>
            )}

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>Require Approval for New Signups</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.375rem', lineHeight: 1.5 }}>
                    When on, admins must approve each new account before they can log in.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    const newVal = !settings.require_approval
                    const { error: err } = await supabase.from('app_settings').update({ require_approval: newVal, updated_by: currentUser?.id, updated_at: new Date().toISOString() }).eq('id', 'global')
                    if (!err) {
                      setSettings(prev => ({ ...prev, require_approval: newVal }))
                      setSettingsSaved(true)
                      setTimeout(() => setSettingsSaved(false), 2000)
                    }
                  }}
                  style={{
                    width: '48px', height: '26px', borderRadius: '999px',
                    background: settings.require_approval ? 'var(--teal-primary)' : 'var(--border)',
                    border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0, transition: 'background 0.2s', minHeight: 0,
                  }}
                  aria-label="Toggle require approval"
                >
                  <div style={{
                    position: 'absolute', top: '3px',
                    left: settings.require_approval ? '26px' : '4px',
                    width: '20px', height: '20px', borderRadius: '50%',
                    background: '#fff', transition: 'left 0.2s',
                  }} />
                </button>
              </div>
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.25rem' }}>
              <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.375rem' }}>Instagram Handle</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.875rem' }}>Shown on the forgot password page.</p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text" value={settings.instagram_handle}
                  onChange={e => setSettings(prev => ({ ...prev, instagram_handle: e.target.value }))}
                  placeholder="velocityfitness.ph"
                  style={{ flex: 1, background: '#0d1a1e', border: '1px solid #1a2e34', borderRadius: '0.5rem', padding: '0.6rem 0.875rem', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none' }}
                />
                <button
                  onClick={async () => {
                    const { error: err } = await supabase.from('app_settings').update({ instagram_handle: settings.instagram_handle, updated_by: currentUser?.id, updated_at: new Date().toISOString() }).eq('id', 'global')
                    if (!err) { setSettingsSaved(true); setTimeout(() => setSettingsSaved(false), 2000) }
                  }}
                  style={{ background: 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.6rem 1rem', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Save
                </button>
              </div>
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.25rem' }}>
              <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.375rem' }}>Public Leaderboard Exercises</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.875rem' }}>Exercises members can submit to the public leaderboard.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {settings.public_pr_exercises.map((ex, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text" value={ex}
                      onChange={e => {
                        const updated = [...settings.public_pr_exercises]
                        updated[i] = e.target.value
                        setSettings(prev => ({ ...prev, public_pr_exercises: updated }))
                      }}
                      style={{ flex: 1, background: '#0d1a1e', border: '1px solid #1a2e34', borderRadius: '0.5rem', padding: '0.6rem 0.875rem', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none' }}
                    />
                    <button
                      onClick={() => setSettings(prev => ({ ...prev, public_pr_exercises: prev.public_pr_exercises.filter((_, idx) => idx !== i) }))}
                      style={{ width: '36px', height: '36px', borderRadius: '0.375rem', background: 'var(--surface-raised)', border: '1px solid var(--border)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}
                    ><X size={15} /></button>
                  </div>
                ))}
                <button
                  onClick={() => setSettings(prev => ({ ...prev, public_pr_exercises: [...prev.public_pr_exercises, ''] }))}
                  style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.6rem', fontSize: '0.875rem', color: 'var(--text-secondary)', cursor: 'pointer', width: '100%' }}
                >
                  + Add Exercise
                </button>
                <button
                  onClick={async () => {
                    const { error: err } = await supabase.from('app_settings').update({ public_pr_exercises: settings.public_pr_exercises, updated_by: currentUser?.id, updated_at: new Date().toISOString() }).eq('id', 'global')
                    if (!err) { setSettingsSaved(true); setTimeout(() => setSettingsSaved(false), 2000) }
                  }}
                  style={{ background: 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.75rem', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', width: '100%' }}
                >
                  Save Exercises
                </button>
              </div>
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.75rem', padding: '1.25rem' }}>
              <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.375rem' }}>Delete All Public PRs</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.875rem' }}>Removes all public leaderboard records. This cannot be undone.</p>
              <button
                onClick={() => setConfirmAction({ type: 'deleteAllPRs' })}
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '0.5rem', padding: '0.625rem 1.25rem', fontSize: '0.875rem', fontWeight: 700, color: '#ef4444', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <AlertTriangle size={14} /> Delete All Public PRs
              </button>
            </div>
          </div>
        )}

      </main>
      {selectedMemberProfile && (
        <MemberProfileModal
          memberId={selectedMemberProfile.id}
          memberName={selectedMemberProfile.name}
          onClose={() => setSelectedMemberProfile(null)}
        />
      )}
      {showCreateUserModal && (
        <CreateUserModal
          onClose={() => setShowCreateUserModal(false)}
          onCreated={refreshMembers}
        />
      )}
      {confirmAction && (() => {
        const config = {
          deleteGroup: {
            title: 'Delete Group',
            message: `Delete "${confirmAction.group?.name}"? This removes all its members from the group and cannot be undone.`,
            confirmLabel: 'Delete',
            variant: 'destructive' as const,
            onConfirm: () => handleDeleteGroup(confirmAction.group),
          },
          rejectUser: {
            title: 'Reject User',
            message: `Reject and remove ${confirmAction.user?.name}?`,
            confirmLabel: 'Reject',
            variant: 'destructive' as const,
            onConfirm: () => handleRejectUser(confirmAction.user),
          },
          removeUser: {
            title: 'Remove User',
            message: `Remove ${confirmAction.user?.name} from Velocity Tracker? This cannot be undone.`,
            confirmLabel: 'Remove',
            variant: 'destructive' as const,
            onConfirm: () => handleRemoveUser(confirmAction.user),
          },
          deleteAllPRs: {
            title: 'Delete All Public PRs',
            message: 'Are you sure? This will delete ALL public PR records from the leaderboard. This cannot be undone.',
            confirmLabel: 'Delete All',
            variant: 'destructive' as const,
            onConfirm: handleDeleteAllPublicPRs,
          },
          clearActivityLog: {
            title: 'Clear History',
            message: activityLogFilter === 'all'
              ? 'Delete the entire activity log? This cannot be undone.'
              : `Delete all "${activityLogFilter}" activity log entries? This cannot be undone.`,
            confirmLabel: 'Clear History',
            variant: 'destructive' as const,
            onConfirm: handleClearActivityLog,
          },
        }[confirmAction.type]
        return (
          <ConfirmModal
            title={config.title}
            message={config.message}
            confirmLabel={config.confirmLabel}
            variant={config.variant}
            onConfirm={() => { const run = config.onConfirm; setConfirmAction(null); run() }}
            onCancel={() => setConfirmAction(null)}
          />
        )
      })()}
    </div>
  )
}
