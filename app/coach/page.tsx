'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ChevronDown, ChevronUp, Trash2, Pencil, Plus, Calendar, Timer, Mars, Venus, Users, X, AlertTriangle, Target, CheckCircle2, Circle, XCircle, UserCog, ClipboardList, Check, Dumbbell, BicepsFlexed, Save, Pin, Eye, EyeOff, ArrowDown } from 'lucide-react'
import BasketballIcon from '@/components/icons/BasketballIcon'
import { getLocalDateString, formatLocalDate, bballOccurrencesInRange, formatTimeLabel, BballClassRow } from '@/lib/utils'
import CalendarGrid, { CalendarEntry } from '@/components/CalendarGrid'
import { BballClassDetailModal, BballOccurrence, genderBadgeStyle } from '@/components/BballClassModal'

type Tab = 'members' | 'groups' | 'assign' | 'assigned' | 'calendar' | 'notes' | 'programs'
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const inputBase: React.CSSProperties = {
  background: '#0d1a1e', border: '1px solid #1a2e34', borderRadius: '0.5rem',
  padding: '0.6rem 0.875rem', color: '#F2F2F2', fontSize: '1rem', outline: 'none',
}
const labelBase: React.CSSProperties = {
  display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)',
  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.375rem',
}
function typeIconFor(t: string) {
  if (t === 'conditioning') return Dumbbell
  if (t === 'basketball') return BasketballIcon
  return BicepsFlexed
}

const STRENGTH_EXERCISES = [
  'Back Squat','Front Squat','Deadlift','Romanian Deadlift','Bench Press','Overhead Press',
  'Barbell Row','Pull Up','Chin Up','Dip','Push Up','Incline Bench Press','Sumo Deadlift',
  'Hip Thrust','Leg Press','Lunges','Clean & Jerk','Snatch','Power Clean','Push Press',
]
const CONDITIONING_EXERCISES = [
  '400m Run','800m Run','1km Run','5km Run','10km Run','Treadmill Sprint','Treadmill Endurance',
  'Rowing 500m','Rowing 2000m','Assault Bike','Jump Rope','Box Jump','Burpees','Wall Balls','Kettlebell Swing',
]
const BASKETBALL_EXERCISES = [
  'Free Throw %','3-Point %','Vertical Jump','Sprint 20m','Sprint','Agility T-Test',
]
const ALL_EXERCISES = [...STRENGTH_EXERCISES, ...CONDITIONING_EXERCISES, ...BASKETBALL_EXERCISES]

function getSuggestions(query: string, type: string): string[] {
  if (!query.trim()) return []
  const q = query.toLowerCase()
  const ordered = type === 'basketball'
    ? [...BASKETBALL_EXERCISES, ...CONDITIONING_EXERCISES, ...STRENGTH_EXERCISES]
    : type === 'conditioning'
    ? [...CONDITIONING_EXERCISES, ...STRENGTH_EXERCISES, ...BASKETBALL_EXERCISES]
    : ALL_EXERCISES
  return ordered.filter(e => e.toLowerCase().includes(q)).slice(0, 6)
}

interface PlanExercise {
  name: string; sets: string; reps: string; weight: string; duration: string; distance: string; notes: string
}
const blankEx = (): PlanExercise => ({ name: '', sets: '', reps: '', weight: '', duration: '', distance: '', notes: '' })

const TYPE_BADGE: Record<string, { bg: string; color: string; border: string }> = {
  basketball: { bg: 'rgba(8,119,160,0.2)', color: '#34bac2', border: 'rgba(8,119,160,0.35)' },
  conditioning: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80', border: 'rgba(34,197,94,0.25)' },
  both: { bg: 'rgba(168,85,247,0.15)', color: '#c084fc', border: 'rgba(168,85,247,0.25)' },
}

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
            <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '999px', textTransform: 'uppercase', ...tb }}>{workout.type}</span>
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
                {ex.weight && <span><span style={{ color: 'var(--text-secondary)' }}>Weight </span><span style={{ fontWeight: 600, color: 'var(--teal-secondary)' }}>{ex.weight}kg</span></span>}
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
  const [memberGroups, setMemberGroups] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', memberId).single()
      setProfile(p)
      const { data: w } = await supabase.from('workouts').select('*, exercises(count)').eq('user_id', memberId).order('date', { ascending: false })
      setAllWorkouts(w || [])
      const { data: pr } = await supabase.from('personal_records').select('*').eq('user_id', memberId).order('value', { ascending: false })
      setPRs(pr || [])
      const { data: gm } = await supabase.from('group_members').select('groups(id, name)').eq('member_id', memberId)
      setMemberGroups((gm ?? []).map((g: any) => g.groups).filter(Boolean))
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
        {/* Header */}
        <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--teal-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700, flexShrink: 0 }}>
              {profile?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', letterSpacing: '0.03em' }}>{memberName}</h2>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem', fontSize: '0.7rem', color: 'var(--text-secondary)', flexWrap: 'wrap', alignItems: 'center' }}>
                {profile?.gender && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                    {profile.gender === 'male' ? <><Mars size={11} /> Male</> : profile.gender === 'female' ? <><Venus size={11} /> Female</> : profile.gender}
                  </span>
                )}
                {profile?.age && <span>Age {profile.age}</span>}
                {profile?.weight_kg && <span>{profile.weight_kg} {profile.weight_unit || 'kg'}</span>}
                {profile?.city && <span>{profile.city}</span>}
                {profile?.contact_number && <span>{profile.contact_number}</span>}
                {profile?.created_at && <span>Since {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>}
                {memberGroups.map(g => (
                  <span key={g.id} style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: '999px', background: 'rgba(8,119,160,0.15)', color: 'var(--teal-secondary)', border: '1px solid rgba(8,119,160,0.3)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Users size={10} /> {g.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', flexShrink: 0, minHeight: 0 }}><X size={16} /></button>
        </div>
        {/* Stats */}
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
            {/* Exercise type breakdown */}
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
        {/* Tabs */}
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
        {/* Content */}
        <div style={{ padding: '1.25rem' }}>
          {loadingModal ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading…</p>
          ) : (
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
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '999px', textTransform: 'uppercase', ...(TYPE_BADGE_M[w.type] ?? TYPE_BADGE_M.both) }}>{w.type}</span>
                      </div>
                    ))}
                    {allWorkouts.length === 0 && <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No workouts yet.</p>}
                  </div>
                  {prs.length > 0 && (
                    <div>
                      <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Top PRs</p>
                      {prs.slice(0, 3).map(pr => (
                        <div key={pr.id} style={{ background: 'var(--surface-raised)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '0.375rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{pr.exercise_name}</p>
                          <p style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.1rem', color: 'var(--teal-secondary)' }}>{pr.value} {pr.unit}</p>
                        </div>
                      ))}
                    </div>
                  )}
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
                if (prs.length === 0) return <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No PRs recorded yet.</p>
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

const ASSIGN_MODAL_PAGE_SIZE = 5

function AssignProgramModal({ program, members, groups, supabase, onClose }: { program: any; members: any[]; groups: any[]; supabase: any; onClose: () => void }) {
  const [selected, setSelected] = useState<string[]>([])
  const [startDate, setStartDate] = useState(getLocalDateString())
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [assignError, setAssignError] = useState('')
  const [filterMode, setFilterMode] = useState<'member' | 'group'>('member')
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [groupMembersList, setGroupMembersList] = useState<any[]>([])
  const [loadingGroupMembers, setLoadingGroupMembers] = useState(false)
  const [page, setPage] = useState(0)

  const toggleMember = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  useEffect(() => { setPage(0) }, [filterMode, selectedGroupId])

  useEffect(() => {
    if (filterMode !== 'group' || !selectedGroupId) { setGroupMembersList([]); return }
    setLoadingGroupMembers(true)
    supabase
      .from('group_members')
      .select('member_id, profiles!member_id(id, name)')
      .eq('group_id', selectedGroupId)
      .then(({ data, error }: any) => {
        if (error) console.error('AssignProgramModal: group_members query failed', error)
        setGroupMembersList((data ?? []).map((gm: any) => gm.profiles).filter(Boolean))
        setLoadingGroupMembers(false)
      })
  }, [filterMode, selectedGroupId, supabase])

  const activeList = filterMode === 'member' ? members : groupMembersList
  const totalPages = Math.max(1, Math.ceil(activeList.length / ASSIGN_MODAL_PAGE_SIZE))
  const pageItems = activeList.slice(page * ASSIGN_MODAL_PAGE_SIZE, page * ASSIGN_MODAL_PAGE_SIZE + ASSIGN_MODAL_PAGE_SIZE)

  const handleAssign = async () => {
    if (selected.length === 0) return
    setSaving(true)
    setAssignError('')

    const memberNameById = new Map([...members, ...groupMembersList].map((m: any) => [m.id, m.name]))
    const errors: string[] = []

    const { data: workouts } = await supabase.from('program_workouts').select('*, program_workout_exercises(*)').eq('program_id', program.id)

    for (const memberId of selected) {
      const memberLabel = memberNameById.get(memberId) ?? memberId

      const { error: assignmentError } = await supabase.from('program_assignments').insert({ program_id: program.id, member_id: memberId, start_date: startDate })
      if (assignmentError) {
        console.error(`handleAssign: program_assignments insert failed for ${memberLabel}`, assignmentError)
        errors.push(`${memberLabel}: failed to create program assignment (${assignmentError.message})`)
        continue
      }

      await supabase.from('coach_students').upsert({ coach_id: program.coach_id, member_id: memberId }, { onConflict: 'coach_id,member_id' })

      for (const w of workouts ?? []) {
        const offsetDays = (w.week_number - 1) * 7 + w.day_of_week
        const d = new Date(startDate + 'T00:00:00')
        d.setDate(d.getDate() + offsetDays)
        const scheduledDate = formatLocalDate(d)
        const isDeload = !!program.deload_week && w.week_number === program.deload_week
        const title = isDeload ? `${w.title} (Deload)` : w.title

        const { data: plan, error: planError } = await supabase.from('workout_plans').insert({
          coach_id: program.coach_id, member_id: memberId, title, type: w.type,
          scheduled_date: scheduledDate, status: 'pending',
        }).select().single()

        if (planError || !plan) {
          console.error(`handleAssign: workout_plans insert failed for ${memberLabel} / "${title}"`, planError)
          errors.push(`${memberLabel}: failed to create workout plan "${title}" (${planError?.message ?? 'no plan returned'})`)
          continue
        }

        const exs = w.program_workout_exercises ?? []
        if (exs.length > 0) {
          const factor = isDeload ? (program.deload_intensity_pct / 100) : 1
          const { error: exercisesError } = await supabase.from('workout_plan_exercises').insert(exs.map((e: any, i: number) => ({
            plan_id: plan.id, name: e.name, sets: e.sets, reps: e.reps,
            weight: e.weight != null ? Math.round(e.weight * factor * 2) / 2 : null,
            duration: e.duration, distance: e.distance, notes: e.notes, order_index: i,
          })))
          if (exercisesError) {
            console.error(`handleAssign: workout_plan_exercises insert failed for ${memberLabel} / "${title}"`, exercisesError)
            errors.push(`${memberLabel}: failed to save exercises for "${title}" (${exercisesError.message})`)
          }
        }
      }
    }

    setSaving(false)
    if (errors.length > 0) {
      setAssignError(errors.join('; '))
    } else {
      setDone(true)
    }
  }

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '480px', maxHeight: '85vh', overflowY: 'auto', borderRadius: '1rem', background: 'var(--surface)', border: '1px solid var(--border)', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', letterSpacing: '0.03em' }}>ASSIGN “{program.title}”</h2>
          <button onClick={onClose} style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', flexShrink: 0, minHeight: 0 }}><X size={16} /></button>
        </div>
        {done ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <CheckCircle2 size={32} style={{ color: '#4ade80', marginBottom: '0.5rem' }} />
            <p style={{ color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Assigned to {selected.length} member{selected.length === 1 ? '' : 's'}!</p>
            <button onClick={onClose} style={{ background: 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.7rem 1.5rem', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}>Done</button>
          </div>
        ) : assignError ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <AlertTriangle size={32} style={{ color: '#f59e0b', marginBottom: '0.5rem' }} />
            <p style={{ color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem' }}>Assignment partially failed</p>
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '0.5rem', padding: '0.875rem', marginBottom: '1rem', textAlign: 'left' }}>
              <p style={{ color: '#fca5a5', fontSize: '0.8rem', lineHeight: 1.5 }}>{assignError}</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              <button onClick={() => setAssignError('')} style={{ background: 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.7rem 1.5rem', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}>Try Again</button>
              <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.7rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelBase}>Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ ...inputBase, width: '100%' }} />
            </div>
            <label style={labelBase}>Members</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              {(['member', 'group'] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFilterMode(mode)}
                  style={{
                    padding: '0.35rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
                    background: filterMode === mode ? 'var(--teal-primary)' : 'var(--surface-raised)',
                    color: filterMode === mode ? '#fff' : 'var(--text-secondary)',
                    border: `1px solid ${filterMode === mode ? 'var(--teal-primary)' : 'var(--border)'}`,
                    minHeight: 0,
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>

            {filterMode === 'group' && (
              <select
                value={selectedGroupId}
                onChange={e => setSelectedGroupId(e.target.value)}
                style={{ ...inputBase, width: '100%', cursor: 'pointer', marginBottom: '0.75rem' }}
              >
                <option value="">— Select a group —</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', minHeight: '80px', marginBottom: '0.5rem' }}>
              {filterMode === 'group' && !selectedGroupId ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Select a group to see its members.</p>
              ) : filterMode === 'group' && loadingGroupMembers ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Loading…</p>
              ) : activeList.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No athletes found.</p>
              ) : (
                pageItems.map(m => (
                  <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 0.625rem', borderRadius: '0.5rem', background: selected.includes(m.id) ? 'rgba(8,119,160,0.15)' : 'var(--surface-raised)', cursor: 'pointer', border: `1px solid ${selected.includes(m.id) ? 'var(--teal-primary)' : 'transparent'}` }}>
                    <input type="checkbox" checked={selected.includes(m.id)} onChange={() => toggleMember(m.id)} style={{ minHeight: 0, width: 'auto' }} />
                    <span style={{ fontSize: '0.875rem' }}>{m.name}</span>
                  </label>
                ))
              )}
            </div>

            {activeList.length > ASSIGN_MODAL_PAGE_SIZE && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  style={{ padding: '0.35rem 0.75rem', borderRadius: '0.375rem', background: 'var(--surface-raised)', border: '1px solid var(--border)', color: page === 0 ? 'var(--text-secondary)' : 'var(--text-primary)', fontSize: '0.75rem', fontWeight: 600, cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.5 : 1, minHeight: 0 }}
                >
                  ← Prev
                </button>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Page {page + 1} of {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  style={{ padding: '0.35rem 0.75rem', borderRadius: '0.375rem', background: 'var(--surface-raised)', border: '1px solid var(--border)', color: page >= totalPages - 1 ? 'var(--text-secondary)' : 'var(--text-primary)', fontSize: '0.75rem', fontWeight: 600, cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', opacity: page >= totalPages - 1 ? 0.5 : 1, minHeight: 0 }}
                >
                  Next →
                </button>
              </div>
            )}
            <button onClick={handleAssign} disabled={saving || selected.length === 0} style={{
              width: '100%', background: saving || selected.length === 0 ? '#0d1a1e' : 'var(--teal-primary)', color: 'white',
              border: 'none', borderRadius: '0.5rem', padding: '0.875rem', fontWeight: 700, fontSize: '0.875rem',
              cursor: saving || selected.length === 0 ? 'not-allowed' : 'pointer',
            }}>
              {saving ? 'Assigning…' : `Assign to ${selected.length || ''} Member${selected.length === 1 ? '' : 's'}`}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function CoachPage() {
  const router = useRouter()
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [gender, setGender] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('members')
  const [loading, setLoading] = useState(true)

  const noteTextRef = useRef<HTMLTextAreaElement | null>(null)

  const switchTab = (tab: Tab) => {
    setActiveTab(tab)
  }

  const jumpToNoteEdit = (note: any) => {
    switchTab('notes')
    setEditingNote(note.id)
    setEditText(note.note)
  }

  const jumpToAddNote = () => {
    switchTab('notes')
    setTimeout(() => noteTextRef.current?.focus(), 50)
  }
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // My Members
  const [myMembers, setMyMembers] = useState<any[]>([])
  const [expandedMember, setExpandedMember] = useState<string | null>(null)
  const [memberWorkouts, setMemberWorkouts] = useState<Record<string, any[]>>({})
  const [showAddAthlete, setShowAddAthlete] = useState(false)
  const [addAthleteSearch, setAddAthleteSearch] = useState('')
  const [addingAthleteId, setAddingAthleteId] = useState<string | null>(null)

  // Groups
  const [myGroups, setMyGroups] = useState<any[]>([])
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
  const [groupMembers, setGroupMembers] = useState<Record<string, any[]>>({})
  const [allMembers, setAllMembers] = useState<any[]>([])
  const [addMemberId, setAddMemberId] = useState<Record<string, string>>({})
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupDesc, setNewGroupDesc] = useState('')
  const [groupSaving, setGroupSaving] = useState(false)

  // Assign Workout Plan
  const [assignForm, setAssignForm] = useState({
    member_id: '', title: '', description: '', type: 'conditioning',
    scheduled_date: getLocalDateString(),
  })
  const [planExercises, setPlanExercises] = useState<PlanExercise[]>([blankEx()])
  const [planSaving, setPlanSaving] = useState(false)
  const [assignedPlans, setAssignedPlans] = useState<any[]>([])
  const [activePlanSuggestion, setActivePlanSuggestion] = useState<number | null>(null)

  // Templates
  const [templates, setTemplates] = useState<any[]>([])
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [shareTemplate, setShareTemplate] = useState(false)
  const [templateSaved, setTemplateSaved] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  const [templateSource, setTemplateSource] = useState<'shared' | 'mine'>('shared')
  const [templateDropdownOpen, setTemplateDropdownOpen] = useState(false)
  const [templateSearch, setTemplateSearch] = useState('')

  // Edit assigned plan
  const [editingPlan, setEditingPlan] = useState<string | null>(null)
  const [editPlanForm, setEditPlanForm] = useState<any>({})
  const [editPlanExercises, setEditPlanExercises] = useState<PlanExercise[]>([])
  const [activePlanEditSuggestion, setActivePlanEditSuggestion] = useState<number | null>(null)
  const [planStatusFilter, setPlanStatusFilter] = useState<'all'|'pending'|'completed'|'skipped'|'rescheduled'>('all')
  const [planMemberFilter, setPlanMemberFilter] = useState('all')
  const [expandedPlanMember, setExpandedPlanMember] = useState<string | null>(null)
  const [planActionLoading, setPlanActionLoading] = useState<string | null>(null)
  const [reschedulingPlan, setReschedulingPlan] = useState<string | null>(null)
  const [reschedulePlanDate, setReschedulePlanDate] = useState('')
  const [completingPlan, setCompletingPlan] = useState<string | null>(null)
  const [completePlanDuration, setCompletePlanDuration] = useState('')
  const [planSearch, setPlanSearch] = useState('')
  const [selectedMemberProfile, setSelectedMemberProfile] = useState<{id: string; name: string} | null>(null)
  const [memberSearch, setMemberSearch] = useState('')
  const [memberSort, setMemberSort] = useState<'name' | 'most-active' | 'least-active' | 'last-workout'>('name')
  const [memberGroupFilter, setMemberGroupFilter] = useState('all')
  const [assignMemberId, setAssignMemberId] = useState('')
  const [bulkAssignMode, setBulkAssignMode] = useState(false)
  const [bulkSelected, setBulkSelected] = useState<string[]>([])
  const [assignMemberWorkouts, setAssignMemberWorkouts] = useState<any[]>([])
  const [visibleToMember, setVisibleToMember] = useState(false)

  // Workout Calendar
  const [calendarDate, setCalendarDate] = useState(getLocalDateString())
  const [calendarWorkouts, setCalendarWorkouts] = useState<any[]>([])
  const [expandedCalWorkout, setExpandedCalWorkout] = useState<string | null>(null)
  const [memberFilter, setMemberFilter] = useState('all')
  const [calendarMemberSearch, setCalendarMemberSearch] = useState('')
  const [calLoading, setCalLoading] = useState(false)
  const [expandedCalendarPlanId, setExpandedCalendarPlanId] = useState<string | null>(null)
  const [calendarPlanExercises, setCalendarPlanExercises] = useState<Record<string, any[]>>({})
  const [loadingCalendarPlanExercises, setLoadingCalendarPlanExercises] = useState<string | null>(null)
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<string | null>(null)
  const [selectedBballOcc, setSelectedBballOcc] = useState<BballOccurrence | null>(null)
  const [bballBusyKey, setBballBusyKey] = useState<string | null>(null)
  const [bballError, setBballError] = useState('')
  const [bballJoinBlockedMsg, setBballJoinBlockedMsg] = useState('')

  // Notes
  const [notes, setNotes] = useState<any[]>([])
  const [notesMemberId, setNotesMemberId] = useState('')
  const [noteMemberFilter, setNoteMemberFilter] = useState('all')
  const [noteSearch, setNoteSearch] = useState('')
  const [noteText, setNoteText] = useState('')
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [noteSaving, setNoteSaving] = useState(false)

  // Programs
  const [programs, setPrograms] = useState<any[]>([])
  const [programView, setProgramView] = useState<'list' | 'builder'>('list')
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null)
  const [programForm, setProgramForm] = useState({ title: '', description: '', total_weeks: '4', deload_week: '', deload_intensity_pct: '60' })
  const [programWeek, setProgramWeek] = useState(1)
  const [draftWorkouts, setDraftWorkouts] = useState<Array<{ week_number: number; day_of_week: number; title: string; type: string; exercises: PlanExercise[] }>>([])
  const [openDaySlot, setOpenDaySlot] = useState<{ week: number; day: number } | null>(null)
  const [dayDraft, setDayDraft] = useState<{ title: string; type: string; exercises: PlanExercise[] }>({ title: '', type: 'conditioning', exercises: [blankEx()] })
  const [copyWeekSource, setCopyWeekSource] = useState('')
  const [programSaving, setProgramSaving] = useState(false)
  const [assigningProgram, setAssigningProgram] = useState<any | null>(null)

  const loadMyMembers = async (coachId: string) => {
    // coach_students is the authoritative source of "is this my current athlete" — every place a
    // coach first interacts with a member (add to group, assign plan, assign program, or the
    // explicit "+ Add Athlete" picker) upserts a row here. This means removing an athlete actually
    // removes them, instead of historical workout_plans/group_members/program_assignments rows
    // permanently re-qualifying them after removal.
    const { data: csData, error: csErr } = await supabase.from('coach_students').select('member_id').eq('coach_id', coachId)
    if (csErr) console.error('loadMyMembers: coach_students query failed', csErr)
    const memberIds = new Set<string>((csData ?? []).map((cs: any) => cs.member_id))

    if (memberIds.size === 0) { setMyMembers([]); return }

    const { data: profilesData, error: profilesErr } = await supabase
      .from('profiles')
      .select('id, name, email')
      .in('id', Array.from(memberIds))
    if (profilesErr) console.error('loadMyMembers: profiles query failed', profilesErr)

    const withCounts = await Promise.all((profilesData ?? []).map(async (m: any) => {
      const { count, error: countErr } = await supabase.from('workouts').select('*', { count: 'exact', head: true }).eq('user_id', m.id)
      if (countErr) console.error('loadMyMembers: workout count query failed', countErr)
      const { data: last, error: lastErr } = await supabase.from('workouts').select('date, created_at').eq('user_id', m.id).order('created_at', { ascending: false }).limit(1)
      if (lastErr) console.error('loadMyMembers: last workout query failed', lastErr)
      return { ...m, workoutCount: count ?? 0, lastWorkout: last?.[0]?.date ?? last?.[0]?.created_at ?? null }
    }))
    setMyMembers(withCounts)
  }

  const loadMyGroups = async (coachId: string) => {
    const { data } = await supabase.from('groups').select('*, group_members(count)').eq('coach_id', coachId).order('created_at', { ascending: false })
    setMyGroups(data ?? [])
  }

  const loadGroupMembers = async (groupId: string) => {
    const { data } = await supabase.from('group_members').select('*, profiles!member_id(name, email)').eq('group_id', groupId)
    setGroupMembers(prev => ({ ...prev, [groupId]: data ?? [] }))
  }

  const loadNotes = async (coachId: string) => {
    const { data } = await supabase.from('coach_notes').select('*, member:profiles!coach_notes_member_id_fkey(name)').eq('coach_id', coachId).order('created_at', { ascending: false })
    setNotes(data ?? [])
  }

  const loadAssignedPlans = async (coachId: string) => {
    const { data } = await supabase
      .from('workout_plans')
      .select('*, member:profiles!workout_plans_member_id_fkey(name), workout_plan_exercises(count)')
      .eq('coach_id', coachId)
      .order('scheduled_date', { ascending: false })

    // Client-side catch-up only — a plan won't flip to 'skipped' until the coach next opens Assigned
    // Plans, not on a schedule. Same limitation as the equivalent logic in dashboard/athlete pages.
    const today = getLocalDateString()
    const overdueIds = (data ?? []).filter((p: any) => (p.status === 'pending' || p.status === 'rescheduled') && p.scheduled_date < today).map((p: any) => p.id)
    let finalPlans = data ?? []
    if (overdueIds.length > 0) {
      await supabase.from('workout_plans').update({ status: 'skipped' }).in('id', overdueIds)
      finalPlans = finalPlans.map((p: any) => overdueIds.includes(p.id) ? { ...p, status: 'skipped' } : p)
    }
    setAssignedPlans(finalPlans)
  }

  const loadPrograms = async (coachId: string) => {
    const { data } = await supabase
      .from('programs')
      .select('*, program_assignments(count)')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false })
    setPrograms(data ?? [])
  }

  const loadCalendarWorkouts = async () => {
    setCalLoading(true)
    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth()
    // Padded by a week on each side so week-view rows that straddle a month boundary still have
    // their adjacent-month days' data loaded (CalendarGrid's week mode can show days outside `month`).
    const startOfMonth = formatLocalDate(new Date(year, month, 1 - 7))
    const endStr = formatLocalDate(new Date(year, month + 1, 0 + 7))

    // Logged workouts (what an athlete has DONE)
    let query = supabase
      .from('workouts')
      .select('*, profiles(name), exercises(count)')
      .gte('date', `${startOfMonth}T00:00:00`)
      .lte('date', `${endStr}T23:59:59`)
      .order('date', { ascending: false })
    if (memberFilter !== 'all') query = query.eq('user_id', memberFilter)
    const { data: loggedData } = await query
    const loggedWorkouts = (loggedData ?? []).map((w: any) => ({ ...w, isPlan: false, member_name: w.profiles?.name }))

    // Assigned workout_plans (what's UPCOMING/ASSIGNED) — this already covers both manually-assigned
    // plans and program-derived ones (assigning a program materializes one workout_plans row per
    // program workout, see AssignProgramModal.handleAssign), so this is the single source of truth
    // for anything not yet logged. Exclude completed since those already show as logged workouts
    // above, but keep skipped so misses are still visible on the calendar.
    let planQuery = supabase
      .from('workout_plans')
      .select('*, member:profiles!workout_plans_member_id_fkey(name)')
      .gte('scheduled_date', startOfMonth)
      .lte('scheduled_date', endStr)
      .neq('status', 'completed')
    if (memberFilter !== 'all') planQuery = planQuery.eq('member_id', memberFilter)
    else planQuery = planQuery.eq('coach_id', userId)
    const { data: planData } = await planQuery.order('scheduled_date', { ascending: false })
    const normalizedPlans = (planData ?? []).map((p: any) => ({
      ...p,
      isPlan: true,
      date: p.scheduled_date,
      member_name: p.member?.name,
    }))

    // Basketball classes (bball_classes) — small, admin-managed list; expand into occurrences for
    // this range the same way app/calendar/page.tsx does, so coaches see + can join them here too.
    const { data: bballClassData } = await supabase.from('bball_classes').select('*')
    const bballList: BballClassRow[] = bballClassData || []
    const bballOccurrences = bballList.flatMap(c =>
      bballOccurrencesInRange(c, startOfMonth, endStr).map(date => ({
        id: `bball-${c.id}-${date}`, classId: c.id, cls: c, date, isBballClass: true, count: 0, joined: false,
      }))
    )
    if (bballOccurrences.length > 0) {
      const classIds = Array.from(new Set(bballOccurrences.map(o => o.classId)))
      const dates = Array.from(new Set(bballOccurrences.map(o => o.date)))
      const { data: signups } = await supabase
        .from('bball_class_signups')
        .select('class_id, user_id, occurrence_date')
        .in('class_id', classIds)
        .in('occurrence_date', dates)
      const countMap: Record<string, number> = {}
      const joinedSet = new Set<string>()
      for (const row of signups || []) {
        const key = `${row.class_id}_${row.occurrence_date}`
        countMap[key] = (countMap[key] || 0) + 1
        if (row.user_id === userId) joinedSet.add(key)
      }
      for (const occ of bballOccurrences) {
        const key = `${occ.classId}_${occ.date}`
        occ.count = countMap[key] || 0
        occ.joined = joinedSet.has(key)
      }
    }

    setCalendarWorkouts([...loggedWorkouts, ...normalizedPlans, ...bballOccurrences])
    setCalLoading(false)
  }

  const bballGenderMatches = (restriction: string) => {
    if (restriction === 'mixed') return true
    if (restriction === 'men') return gender === 'male'
    if (restriction === 'women') return gender === 'female'
    return true
  }

  const handleBballJoin = async (occ: BballOccurrence) => {
    const key = `${occ.cls.id}_${occ.date}`
    setBballError(''); setBballJoinBlockedMsg('')
    if (!bballGenderMatches(occ.cls.gender_restriction)) {
      const label = occ.cls.gender_restriction === 'men' ? 'men' : 'women'
      setBballJoinBlockedMsg(`This class is for ${label} only.`)
      return
    }
    setBballBusyKey(key)
    const { error: err } = await supabase.from('bball_class_signups').insert({
      class_id: occ.cls.id, user_id: userId, occurrence_date: occ.date,
    })
    if (err) {
      setBballError(err.message.toLowerCase().includes('full') ? 'This class just filled up.' : err.message)
      setBballBusyKey(null)
      await loadCalendarWorkouts()
      return
    }
    await loadCalendarWorkouts()
    setBballBusyKey(null)
  }

  const handleBballLeave = async (occ: BballOccurrence) => {
    const key = `${occ.cls.id}_${occ.date}`
    setBballError('')
    setBballBusyKey(key)
    const { error: err } = await supabase.from('bball_class_signups')
      .delete().eq('class_id', occ.cls.id).eq('user_id', userId).eq('occurrence_date', occ.date)
    if (err) { setBballError(err.message); setBballBusyKey(null); return }
    await loadCalendarWorkouts()
    setBballBusyKey(null)
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('role, gender').eq('id', user.id).single()
      if (prof?.role !== 'coach' && prof?.role !== 'admin') { router.push('/dashboard'); return }
      setUserId(user.id)
      setGender(prof?.gender ?? null)
      const { data: membersData } = await supabase.from('profiles').select('id, name, email').eq('role', 'member')
      setAllMembers(membersData ?? [])
      const { data: tmpl } = await supabase
        .from('workout_templates')
        .select('*, workout_template_exercises(*)')
        .or(`created_by.eq.${user.id},is_shared.eq.true`)
        .order('created_at', { ascending: false })
      setTemplates(tmpl ?? [])
      await Promise.all([loadMyMembers(user.id), loadMyGroups(user.id), loadNotes(user.id), loadAssignedPlans(user.id), loadPrograms(user.id)])
      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!loading) loadCalendarWorkouts()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarDate, memberFilter, calendarMonth, loading])

  useEffect(() => {
    if (!assignForm.member_id) { setAssignMemberWorkouts([]); return }
    supabase.from('workouts').select('id, title, type, date, duration').eq('user_id', assignForm.member_id).order('date', { ascending: false }).limit(3).then(({ data }) => setAssignMemberWorkouts(data || []))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignForm.member_id])

  useEffect(() => {
    if (planMemberFilter !== 'all' && !groupMembers[planMemberFilter]) loadGroupMembers(planMemberFilter)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planMemberFilter])

  useEffect(() => {
    if (noteMemberFilter !== 'all' && !groupMembers[noteMemberFilter]) loadGroupMembers(noteMemberFilter)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteMemberFilter])

  const toggleMember = async (memberId: string) => {
    if (expandedMember === memberId) { setExpandedMember(null); return }
    setExpandedMember(memberId)
    const { data } = await supabase.from('workouts').select('id, title, type, date, created_at, duration, exercises(count)').eq('user_id', memberId).order('date', { ascending: false }).limit(5)
    setMemberWorkouts(prev => ({ ...prev, [memberId]: data ?? [] }))
  }

  const toggleGroup = async (groupId: string) => {
    if (expandedGroup === groupId) { setExpandedGroup(null); return }
    setExpandedGroup(groupId)
    if (!groupMembers[groupId]) await loadGroupMembers(groupId)
  }

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGroupName.trim() || !userId) return
    setGroupSaving(true); setError('')
    const { error: err } = await supabase.from('groups').insert({ name: newGroupName.trim(), description: newGroupDesc.trim() || null, coach_id: userId })
    if (err) { setError(err.message) } else {
      setSuccess('Group created!'); setNewGroupName(''); setNewGroupDesc('')
      await loadMyGroups(userId)
    }
    setGroupSaving(false)
  }

  const handleAddToGroup = async (groupId: string) => {
    const memberId = addMemberId[groupId]
    if (!memberId || !userId) return
    const { data, error } = await supabase
      .from('group_members')
      .insert({ group_id: groupId, member_id: memberId })
      .select('*, profiles!member_id(name, email, gender)')
      .single()
    if (!error && data) {
      // Optimistic update for instant feedback — reloads below reconcile with the server
      setGroupMembers(prev => ({ ...prev, [groupId]: [...(prev[groupId] ?? []), data] }))
    }
    await supabase.from('coach_students').upsert({ coach_id: userId, member_id: memberId }, { onConflict: 'coach_id,member_id' })
    await loadGroupMembers(groupId)
    await loadMyGroups(userId)
    await loadMyMembers(userId)
    setAddMemberId(prev => ({ ...prev, [groupId]: '' }))
  }

  const handleRemoveFromGroup = async (groupId: string, gmId: string) => {
    if (!userId) return
    await supabase.from('group_members').delete().eq('id', gmId)
    await loadGroupMembers(groupId)
    await loadMyGroups(userId)
    await loadMyMembers(userId)
  }

  const handleRemoveAthlete = async (athleteId: string, athleteName: string) => {
    if (!userId) return
    if (!confirm(`Remove ${athleteName} as your athlete? This deletes their upcoming plans/programs and your notes about them. Completed workout history is kept. This cannot be undone.`)) return

    setError(''); setSuccess('')

    // a) Remove from this coach's groups only
    const myGroupIds = myGroups.length > 0
      ? myGroups.map((g: any) => g.id)
      : ((await supabase.from('groups').select('id').eq('coach_id', userId)).data ?? []).map((g: any) => g.id)
    if (myGroupIds.length > 0) {
      const { error: gmErr } = await supabase
        .from('group_members')
        .delete()
        .eq('member_id', athleteId)
        .in('group_id', myGroupIds)
      if (gmErr) { setError(gmErr.message); return }
    }

    // b) Delete this coach's pending/rescheduled plans for this athlete entirely — completed plans
    // (and any workouts/exercises auto-logged from them) are left completely untouched
    const { data: pendingPlans, error: pendingPlansErr } = await supabase
      .from('workout_plans')
      .select('id')
      .eq('coach_id', userId)
      .eq('member_id', athleteId)
      .in('status', ['pending', 'rescheduled'])
    if (pendingPlansErr) { setError(pendingPlansErr.message); return }
    const pendingPlanIds = (pendingPlans ?? []).map((p: any) => p.id)
    if (pendingPlanIds.length > 0) {
      const { error: planExErr } = await supabase
        .from('workout_plan_exercises')
        .delete()
        .in('plan_id', pendingPlanIds)
      if (planExErr) { setError(planExErr.message); return }

      const { error: planDelErr } = await supabase
        .from('workout_plans')
        .delete()
        .in('id', pendingPlanIds)
      if (planDelErr) { setError(planDelErr.message); return }
    }

    // c) Unassign from this coach's programs (no status column, so delete is the only option)
    const { data: myPrograms, error: programsErr } = await supabase.from('programs').select('id').eq('coach_id', userId)
    if (programsErr) { setError(programsErr.message); return }
    const programIds = (myPrograms ?? []).map((p: any) => p.id)
    if (programIds.length > 0) {
      const { error: assignErr } = await supabase
        .from('program_assignments')
        .delete()
        .eq('member_id', athleteId)
        .in('program_id', programIds)
      if (assignErr) { setError(assignErr.message); return }
    }

    // d) Remove from this coach's explicit add-list (coach_students)
    const { error: csErr } = await supabase
      .from('coach_students')
      .delete()
      .eq('coach_id', userId)
      .eq('member_id', athleteId)
    if (csErr) { setError(csErr.message); return }

    // e) Delete this coach's notes about this athlete (notes from other coaches are unaffected)
    const { error: notesErr } = await supabase
      .from('coach_notes')
      .delete()
      .eq('coach_id', userId)
      .eq('member_id', athleteId)
    if (notesErr) { setError(notesErr.message); return }

    await loadMyMembers(userId)
    setSuccess(`${athleteName} has been removed as your athlete.`)
  }

  const handleAddAthlete = async (memberId: string) => {
    if (!userId) return
    setAddingAthleteId(memberId)
    setError('')
    const { error: err } = await supabase.from('coach_students').insert({ coach_id: userId, member_id: memberId })
    if (err) {
      setError(err.message)
    } else {
      await loadMyMembers(userId)
      setShowAddAthlete(false)
      setAddAthleteSearch('')
    }
    setAddingAthleteId(null)
  }

  const handleAssignPlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assignForm.title.trim() || !assignForm.member_id || !userId) return
    setPlanSaving(true); setError(''); setSuccess('')
    const { data: plan, error: planErr } = await supabase.from('workout_plans').insert({
      coach_id: userId,
      member_id: assignForm.member_id,
      title: assignForm.title.trim(),
      description: assignForm.description.trim() || null,
      type: assignForm.type,
      scheduled_date: assignForm.scheduled_date,
      status: 'pending',
    }).select().single()
    if (planErr || !plan) { setError(planErr?.message ?? 'Failed to create plan'); setPlanSaving(false); return }
    const validExs = planExercises.filter(e => e.name.trim())
    if (validExs.length > 0) {
      await supabase.from('workout_plan_exercises').insert(
        validExs.map((ex, i) => ({
          plan_id: plan.id, name: ex.name.trim(),
          sets: ex.sets ? Number(ex.sets) : null,
          reps: ex.reps ? Number(ex.reps) : null,
          weight: ex.weight ? Number(ex.weight) : null,
          duration: ex.duration ? Number(ex.duration) : null,
          distance: ex.distance ? Number(ex.distance) : null,
          notes: ex.notes || null, order_index: i,
        }))
      )
    }
    await supabase.from('coach_students').upsert({ coach_id: userId, member_id: assignForm.member_id }, { onConflict: 'coach_id,member_id' })
    setSuccess('Plan assigned!')
    setAssignForm({ member_id: '', title: '', description: '', type: 'conditioning', scheduled_date: getLocalDateString() })
    setPlanExercises([blankEx()])
    await loadAssignedPlans(userId)
    await loadMyMembers(userId)
    setPlanSaving(false)
  }

  const toggleCalendarPlanExpand = async (planId: string) => {
    if (expandedCalendarPlanId === planId) { setExpandedCalendarPlanId(null); return }
    setExpandedCalendarPlanId(planId)
    if (!calendarPlanExercises[planId]) {
      setLoadingCalendarPlanExercises(planId)
      const { data } = await supabase.from('workout_plan_exercises').select('*').eq('plan_id', planId).order('order_index')
      setCalendarPlanExercises(prev => ({ ...prev, [planId]: data || [] }))
      setLoadingCalendarPlanExercises(null)
    }
  }

  const openPlanEdit = async (p: any) => {
    const { data: exs } = await supabase.from('workout_plan_exercises').select('*').eq('plan_id', p.id).order('order_index')
    setEditPlanForm({ title: p.title, description: p.description || '', type: p.type, scheduled_date: p.scheduled_date, member_id: p.member_id })
    setEditPlanExercises((exs || []).map(ex => ({
      name: ex.name, sets: ex.sets?.toString() || '', reps: ex.reps?.toString() || '',
      weight: ex.weight?.toString() || '', duration: ex.duration?.toString() || '',
      distance: ex.distance?.toString() || '', notes: ex.notes || '',
    })))
    setEditingPlan(p.id)
  }

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('Remove this assigned plan? This cannot be undone.')) return

    const { error: exError } = await supabase
      .from('workout_plan_exercises')
      .delete()
      .eq('plan_id', planId)

    if (exError) {
      alert('Failed to delete plan exercises: ' + exError.message)
      return
    }

    const { error: planError } = await supabase
      .from('workout_plans')
      .delete()
      .eq('id', planId)

    if (planError) {
      alert('Failed to delete plan: ' + planError.message)
      return
    }

    if (userId) await loadAssignedPlans(userId)
  }

  const handleCompletePlan = async (plan: any, durationMinutes: number | null = null) => {
    if (!userId) return
    setPlanActionLoading(plan.id)
    setError('')

    const { data: planExercises, error: planExError } = await supabase
      .from('workout_plan_exercises')
      .select('*')
      .eq('plan_id', plan.id)
      .order('order_index')

    if (planExError) {
      console.error('handleCompletePlan: workout_plan_exercises fetch failed', planExError)
      setError(planExError.message)
      setPlanActionLoading(null)
      return
    }

    const { data: newWorkout, error: workoutErr } = await supabase.from('workouts').insert({
      user_id: plan.member_id,
      title: plan.title,
      type: plan.type,
      notes: `Auto-logged from assigned plan. ${plan.description || ''}`.trim(),
      duration: durationMinutes,
      date: new Date().toISOString(),
    }).select().single()

    if (workoutErr) {
      console.error('handleCompletePlan: workouts insert failed', workoutErr)
      setError(workoutErr.message)
      setPlanActionLoading(null)
      return
    }

    if (newWorkout && planExercises && planExercises.length > 0) {
      const { error: exError } = await supabase.from('exercises').insert(
        planExercises.map((ex: any) => ({
          workout_id: newWorkout.id,
          name: ex.name, sets: ex.sets, reps: ex.reps,
          weight: ex.weight, duration: ex.duration,
          distance: ex.distance, notes: ex.notes,
        }))
      )

      if (exError) {
        console.error('handleCompletePlan: exercises insert failed', exError)
        setError(exError.message)
        setPlanActionLoading(null)
        return
      }
    }

    const { error: updateErr } = await supabase.from('workout_plans').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      auto_logged_workout_id: newWorkout?.id ?? null,
    }).eq('id', plan.id)

    if (updateErr) {
      console.error('handleCompletePlan: workout_plans update failed', updateErr)
      setError(updateErr.message)
      setPlanActionLoading(null)
      return
    }

    setCompletingPlan(null)
    setCompletePlanDuration('')
    await loadAssignedPlans(userId)
    setPlanActionLoading(null)
  }

  const handleUndoCompletePlan = async (plan: any) => {
    if (!userId) return
    setPlanActionLoading(plan.id)
    setError('')

    if (plan.auto_logged_workout_id) {
      const { error: exDelErr } = await supabase.from('exercises').delete().eq('workout_id', plan.auto_logged_workout_id)
      if (exDelErr) {
        console.error('handleUndoCompletePlan: exercises delete failed', exDelErr)
        setError(exDelErr.message)
        setPlanActionLoading(null)
        return
      }

      const { error: workoutDelErr } = await supabase.from('workouts').delete().eq('id', plan.auto_logged_workout_id)
      if (workoutDelErr) {
        console.error('handleUndoCompletePlan: workouts delete failed', workoutDelErr)
        setError(workoutDelErr.message)
        setPlanActionLoading(null)
        return
      }
    }

    const { error: updateErr } = await supabase.from('workout_plans').update({ status: 'pending', completed_at: null, auto_logged_workout_id: null }).eq('id', plan.id)
    if (updateErr) {
      console.error('handleUndoCompletePlan: workout_plans update failed', updateErr)
      setError(updateErr.message)
      setPlanActionLoading(null)
      return
    }

    await loadAssignedPlans(userId)
    setPlanActionLoading(null)
  }

  const handleReschedulePlan = async (planId: string) => {
    if (!userId || !reschedulePlanDate) return
    setPlanActionLoading(planId)
    await supabase.from('workout_plans').update({
      status: 'rescheduled', scheduled_date: reschedulePlanDate, rescheduled_date: reschedulePlanDate,
    }).eq('id', planId)
    setReschedulingPlan(null)
    setReschedulePlanDate('')
    await loadAssignedPlans(userId)
    setPlanActionLoading(null)
  }

  const updatePlanEx = (idx: number, field: keyof PlanExercise, val: string) => {
    const next = [...planExercises]
    next[idx] = { ...next[idx], [field]: val }
    setPlanExercises(next)
  }

  const updateEditPlanEx = (idx: number, field: keyof PlanExercise, val: string) => {
    const next = [...editPlanExercises]
    next[idx] = { ...next[idx], [field]: val }
    setEditPlanExercises(next)
  }

  const handleSavePlanEdit = async () => {
    if (!editingPlan || !userId) return
    await supabase.from('workout_plans').update({
      title: editPlanForm.title,
      description: editPlanForm.description || null,
      type: editPlanForm.type,
      scheduled_date: editPlanForm.scheduled_date,
    }).eq('id', editingPlan)
    await supabase.from('workout_plan_exercises').delete().eq('plan_id', editingPlan)
    const toInsert = editPlanExercises.filter(e => e.name.trim()).map((ex, i) => ({
      plan_id: editingPlan,
      name: ex.name, sets: ex.sets ? Number(ex.sets) : null,
      reps: ex.reps ? Number(ex.reps) : null, weight: ex.weight ? Number(ex.weight) : null,
      duration: ex.duration ? Number(ex.duration) : null, distance: ex.distance ? Number(ex.distance) : null,
      notes: ex.notes || null, order_index: i,
    }))
    if (toInsert.length > 0) await supabase.from('workout_plan_exercises').insert(toInsert)
    setEditingPlan(null)
    await loadAssignedPlans(userId)
  }

  // ── Programs ──
  const startNewProgram = () => {
    setEditingProgramId(null)
    setProgramForm({ title: '', description: '', total_weeks: '4', deload_week: '', deload_intensity_pct: '60' })
    setDraftWorkouts([])
    setProgramWeek(1)
    setOpenDaySlot(null)
    setProgramView('builder')
  }

  const startEditProgram = async (program: any) => {
    setEditingProgramId(program.id)
    setProgramForm({
      title: program.title, description: program.description || '',
      total_weeks: program.total_weeks.toString(),
      deload_week: program.deload_week?.toString() || '',
      deload_intensity_pct: program.deload_intensity_pct?.toString() || '60',
    })
    const { data: workouts } = await supabase
      .from('program_workouts')
      .select('*, program_workout_exercises(*)')
      .eq('program_id', program.id)
      .order('week_number').order('day_of_week')
    setDraftWorkouts((workouts ?? []).map((w: any) => ({
      week_number: w.week_number, day_of_week: w.day_of_week, title: w.title, type: w.type,
      exercises: (w.program_workout_exercises ?? [])
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map((e: any) => ({
          name: e.name, sets: e.sets?.toString() || '', reps: e.reps?.toString() || '', weight: e.weight?.toString() || '',
          duration: e.duration?.toString() || '', distance: e.distance?.toString() || '', notes: e.notes || '',
        })),
    })))
    setProgramWeek(1)
    setOpenDaySlot(null)
    setProgramView('builder')
  }

  const openDaySlotEditor = (week: number, day: number) => {
    const existing = draftWorkouts.find(w => w.week_number === week && w.day_of_week === day)
    setDayDraft(existing
      ? { title: existing.title, type: existing.type, exercises: existing.exercises.length ? existing.exercises : [blankEx()] }
      : { title: '', type: 'conditioning', exercises: [blankEx()] })
    setOpenDaySlot({ week, day })
  }

  const updateDayDraftEx = (idx: number, field: keyof PlanExercise, val: string) => {
    const next = [...dayDraft.exercises]
    next[idx] = { ...next[idx], [field]: val }
    setDayDraft({ ...dayDraft, exercises: next })
  }

  const saveDaySlot = () => {
    if (!openDaySlot) return
    if (!dayDraft.title.trim()) { setOpenDaySlot(null); return }
    const { week, day } = openDaySlot
    setDraftWorkouts(prev => {
      const filtered = prev.filter(w => !(w.week_number === week && w.day_of_week === day))
      return [...filtered, { week_number: week, day_of_week: day, title: dayDraft.title.trim(), type: dayDraft.type, exercises: dayDraft.exercises.filter(e => e.name.trim()) }]
    })
    setOpenDaySlot(null)
  }

  const clearDaySlot = (week: number, day: number) => {
    setDraftWorkouts(prev => prev.filter(w => !(w.week_number === week && w.day_of_week === day)))
  }

  const handleCopyWeek = () => {
    const src = Number(copyWeekSource)
    if (!src || src === programWeek) return
    const srcWorkouts = draftWorkouts.filter(w => w.week_number === src)
    setDraftWorkouts(prev => {
      const filtered = prev.filter(w => w.week_number !== programWeek)
      const copied = srcWorkouts.map(w => ({ ...w, week_number: programWeek, exercises: w.exercises.map(e => ({ ...e })) }))
      return [...filtered, ...copied]
    })
    setCopyWeekSource('')
  }

  const handleSaveProgram = async () => {
    if (!programForm.title.trim() || !userId) return
    setProgramSaving(true); setError(''); setSuccess('')
    const payload = {
      coach_id: userId,
      title: programForm.title.trim(),
      description: programForm.description.trim() || null,
      total_weeks: Number(programForm.total_weeks),
      deload_week: programForm.deload_week ? Number(programForm.deload_week) : null,
      deload_intensity_pct: Number(programForm.deload_intensity_pct) || 60,
    }
    let programId = editingProgramId
    if (programId) {
      const { error: err } = await supabase.from('programs').update(payload).eq('id', programId)
      if (err) { setError(err.message); setProgramSaving(false); return }
      await supabase.from('program_workouts').delete().eq('program_id', programId)
    } else {
      const { data, error: err } = await supabase.from('programs').insert(payload).select().single()
      if (err || !data) { setError(err?.message ?? 'Failed to create program'); setProgramSaving(false); return }
      programId = data.id
    }
    for (const w of draftWorkouts) {
      if (!w.title.trim()) continue
      const { data: pw, error: pwErr } = await supabase.from('program_workouts').insert({
        program_id: programId, week_number: w.week_number, day_of_week: w.day_of_week, title: w.title, type: w.type,
      }).select().single()
      if (pwErr || !pw) continue
      if (w.exercises.length > 0) {
        await supabase.from('program_workout_exercises').insert(w.exercises.map((ex, i) => ({
          program_workout_id: pw.id, name: ex.name.trim(),
          sets: ex.sets ? Number(ex.sets) : null, reps: ex.reps ? Number(ex.reps) : null,
          weight: ex.weight ? Number(ex.weight) : null, duration: ex.duration ? Number(ex.duration) : null,
          distance: ex.distance ? Number(ex.distance) : null, notes: ex.notes || null, order_index: i,
        })))
      }
    }
    setSuccess('Program saved!')
    setProgramView('list')
    await loadPrograms(userId)
    setProgramSaving(false)
  }

  const handleCloneProgram = async (program: any) => {
    if (!userId) return
    const { data: newProg, error: err } = await supabase.from('programs').insert({
      coach_id: userId, title: `${program.title} (Copy)`, description: program.description,
      total_weeks: program.total_weeks, deload_week: program.deload_week, deload_intensity_pct: program.deload_intensity_pct,
    }).select().single()
    if (err || !newProg) return
    const { data: workouts } = await supabase.from('program_workouts').select('*, program_workout_exercises(*)').eq('program_id', program.id)
    for (const w of workouts ?? []) {
      const { data: newW } = await supabase.from('program_workouts').insert({
        program_id: newProg.id, week_number: w.week_number, day_of_week: w.day_of_week, title: w.title, type: w.type,
      }).select().single()
      if (!newW) continue
      const exs = w.program_workout_exercises ?? []
      if (exs.length > 0) {
        await supabase.from('program_workout_exercises').insert(exs.map((e: any) => ({
          program_workout_id: newW.id, name: e.name, sets: e.sets, reps: e.reps, weight: e.weight,
          duration: e.duration, distance: e.distance, notes: e.notes, order_index: e.order_index,
        })))
      }
    }
    await loadPrograms(userId)
  }

  const handleDeleteProgram = async (programId: string) => {
    if (!confirm('Delete this program? This cannot be undone.')) return
    await supabase.from('program_workouts').delete().eq('program_id', programId)
    await supabase.from('programs').delete().eq('id', programId)
    if (userId) await loadPrograms(userId)
  }

  const refreshTemplates = async (uid: string) => {
    const { data } = await supabase
      .from('workout_templates')
      .select('*, workout_template_exercises(*)')
      .or(`created_by.eq.${uid},is_shared.eq.true`)
      .order('created_at', { ascending: false })
    setTemplates(data ?? [])
  }

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!noteText.trim() || !userId) return
    if (!notesMemberId) { setError('Select a member for this note.'); return }
    setNoteSaving(true); setError(''); setSuccess('')
    const { error: err } = await supabase.from('coach_notes').insert({
      coach_id: userId,
      member_id: notesMemberId,
      note: noteText.trim(),
      visible_to_member: visibleToMember,
      is_pinned: false,
    })
    if (err) { setError(err.message) } else {
      setSuccess('Note saved!'); setNoteText(''); setNotesMemberId(''); setVisibleToMember(false)
      await loadNotes(userId)
    }
    setNoteSaving(false)
  }

  const handleUpdateNote = async (noteId: string) => {
    if (!editText.trim() || !userId) return
    await supabase.from('coach_notes').update({ note: editText.trim() }).eq('id', noteId)
    setEditingNote(null); setEditText('')
    await loadNotes(userId)
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!userId) return
    await supabase.from('coach_notes').delete().eq('id', noteId)
    await loadNotes(userId)
  }

  const handlePinNote = async (noteId: string, currentPinned: boolean) => {
    if (!userId) return
    await supabase.from('coach_notes').update({ is_pinned: !currentPinned }).eq('id', noteId)
    await loadNotes(userId)
  }
  const handleToggleVisibility = async (noteId: string, currentVisible: boolean) => {
    if (!userId) return
    await supabase.from('coach_notes').update({ visible_to_member: !currentVisible }).eq('id', noteId)
    await loadNotes(userId)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>
      </div>
    )
  }

  const typeBadgeColor: Record<string, string> = {
    basketball: '#34bac2', conditioning: '#4ade80', both: '#c084fc',
  }

  const PLAN_STATUS: Record<string, { label: string; color: string; icon: typeof Circle }> = {
    pending: { label: 'Pending', color: '#f59e0b', icon: Circle },
    completed: { label: 'Completed', color: '#22c55e', icon: CheckCircle2 },
    skipped: { label: 'Missed', color: '#ef4444', icon: XCircle },
    rescheduled: { label: 'Rescheduled', color: '#60a5fa', icon: Calendar },
  }

  const pendingPlanCount = assignedPlans.filter(p => p.status === 'pending' || p.status === 'rescheduled').length
  const completedPlanCount = assignedPlans.filter(p => p.status === 'completed').length
  const skippedPlanCount = assignedPlans.filter(p => p.status === 'skipped').length
  const inactiveMembers = myMembers.filter(m => {
    if (!m.lastWorkout) return true
    const daysSince = (Date.now() - new Date(m.lastWorkout).getTime()) / 86400000
    return daysSince > 7
  })
  const recentNotes = notes.slice(0, 3)

  const tabs: { value: Tab; label: string }[] = [
    { value: 'members', label: 'My Athletes' },
    { value: 'groups', label: 'Groups' },
    { value: 'assign', label: 'Assign Plan' },
    { value: 'assigned', label: 'Assigned Plans' },
    { value: 'programs', label: 'Programs' },
    { value: 'calendar', label: 'Workout Calendar' },
    { value: 'notes', label: 'Notes' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <div>
            <p style={{ color: 'var(--teal-secondary)', fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Coach Panel</p>
            <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: 'clamp(2rem, 6vw, 3.5rem)', letterSpacing: '0.03em' }}>COACH PANEL</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Athletes, groups, assignments, reviews, and coach notes.</p>
          </div>
          <Link href="/dashboard" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '0.625rem 1rem', borderRadius: '0.5rem', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap', minHeight: 44, display: 'flex', alignItems: 'center' }}>
            ← My Dashboard
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
          {[
            { label: 'Athletes', value: myMembers.length, color: 'var(--teal-secondary)' },
            { label: 'Groups', value: myGroups.length, color: '#60a5fa' },
            { label: 'Needs Review', value: pendingPlanCount, color: '#f59e0b' },
            { label: 'Inactive 7d+', value: inactiveMembers.length, color: inactiveMembers.length > 0 ? '#f87171' : '#4ade80' },
          ].map(card => (
            <button
              key={card.label}
              onClick={() => {
                if (card.label === 'Groups') switchTab('groups')
                else if (card.label === 'Needs Review') switchTab('assigned')
                else switchTab('members')
              }}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.1rem', textAlign: 'left', cursor: 'pointer' }}
            >
              <p style={{ fontFamily: 'var(--font-bebas)', fontSize: '2.25rem', color: card.color, lineHeight: 1 }}>{card.value}</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', marginTop: '0.35rem' }}>{card.label}</p>
            </button>
          ))}
        </div>

        <div className="coach-overview" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(260px, 0.75fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.25rem' }}>
            <p style={{ color: 'var(--teal-secondary)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>Attention Queue</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
              <div>
                <p style={{ fontWeight: 700 }}>{inactiveMembers.length} athlete{inactiveMembers.length === 1 ? '' : 's'} need check-in</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.5, marginTop: '0.25rem' }}>No workout in the last seven days or no workout logged yet.</p>
              </div>
              <div>
                <p style={{ fontWeight: 700 }}>{skippedPlanCount} skipped plans</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.5, marginTop: '0.25rem' }}>{completedPlanCount} completed plans in your current assignment list.</p>
              </div>
            </div>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Recent Notes</p>
              <button
                onClick={jumpToAddNote}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '0.375rem', padding: '0.25rem 0.6rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--teal-secondary)', cursor: 'pointer', minHeight: 0 }}
              >
                + Add note
              </button>
            </div>
            {recentNotes.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No coach notes yet.</p>
            ) : recentNotes.map(note => (
              <div
                key={note.id}
                onClick={() => jumpToNoteEdit(note)}
                role="button"
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); jumpToNoteEdit(note) } }}
                style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.6rem', marginBottom: '0.6rem', cursor: 'pointer' }}
              >
                <p style={{ fontSize: '0.8rem', fontWeight: 700 }}>{note.member?.name ?? 'General note'}</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', lineHeight: 1.45, marginTop: '0.2rem' }}>{note.note}</p>
              </div>
            ))}
          </div>
        </div>

        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', color: '#f87171', fontSize: '0.875rem' }}>{error}</div>}
        {success && <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', color: '#4ade80', fontSize: '0.875rem' }}>{success}</div>}

        {/* Tab Bar — scrollable */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
          {tabs.map(t => (
            <button key={t.value} onClick={() => { switchTab(t.value); setError(''); setSuccess('') }} style={{
              background: 'none', border: 'none', flexShrink: 0,
              borderBottom: activeTab === t.value ? '2px solid var(--teal-primary)' : '2px solid transparent',
              color: activeTab === t.value ? 'var(--teal-secondary)' : 'var(--text-secondary)',
              padding: '0.75rem 1.25rem', cursor: 'pointer', fontSize: '0.875rem',
              fontWeight: activeTab === t.value ? 700 : 400, marginBottom: '-1px', transition: 'all 0.15s', whiteSpace: 'nowrap',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── MY MEMBERS TAB ── */}
        {activeTab === 'members' && (
          <div key="tab-members">
            {/* Search + Sort + Group filter */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text" placeholder="Search athletes…" value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                style={{ flex: 1, minWidth: '160px', background: '#0d1a1e', border: '1px solid #1a2e34', borderRadius: '0.5rem', padding: '0.6rem 0.875rem', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none' }}
              />
              <select
                value={memberGroupFilter}
                onChange={e => setMemberGroupFilter(e.target.value)}
                style={{ background: '#0d1a1e', border: '1px solid #1a2e34', borderRadius: '0.5rem', padding: '0.6rem 0.875rem', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none', cursor: 'pointer' }}
              >
                <option value="all">All Groups</option>
                {myGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <select
                value={memberSort}
                onChange={e => setMemberSort(e.target.value as any)}
                style={{ background: '#0d1a1e', border: '1px solid #1a2e34', borderRadius: '0.5rem', padding: '0.6rem 0.875rem', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none', cursor: 'pointer' }}
              >
                <option value="name">Sort: Name</option>
                <option value="most-active">Sort: Most Active</option>
                <option value="least-active">Sort: Least Active</option>
                <option value="last-workout">Sort: Last Workout</option>
              </select>
              <button
                onClick={() => setShowAddAthlete(prev => !prev)}
                style={{
                  background: showAddAthlete ? 'var(--surface)' : 'var(--teal-primary)',
                  color: showAddAthlete ? 'var(--text-primary)' : '#fff',
                  border: showAddAthlete ? '1px solid var(--border)' : 'none',
                  borderRadius: '0.5rem', padding: '0.6rem 1rem', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', minHeight: 0, whiteSpace: 'nowrap',
                }}
              >
                {showAddAthlete ? 'Cancel' : '+ Add Athlete'}
              </button>
            </div>

            {showAddAthlete && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1rem' }}>
                <input
                  type="text" placeholder="Search members by name…" value={addAthleteSearch}
                  onChange={e => setAddAthleteSearch(e.target.value)}
                  style={{ ...inputBase, width: '100%', marginBottom: '0.75rem' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', maxHeight: '240px', overflowY: 'auto' }}>
                  {(() => {
                    const myMemberIds = new Set(myMembers.map(m => m.id))
                    const candidates = allMembers.filter(m =>
                      !myMemberIds.has(m.id) &&
                      (!addAthleteSearch.trim() || m.name?.toLowerCase().includes(addAthleteSearch.toLowerCase()))
                    )
                    if (candidates.length === 0) {
                      return <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No matching members found.</p>
                    }
                    return candidates.map(m => (
                      <button
                        key={m.id}
                        onClick={() => handleAddAthlete(m.id)}
                        disabled={addingAthleteId === m.id}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '0.5rem',
                          padding: '0.5rem 0.75rem', cursor: addingAthleteId === m.id ? 'not-allowed' : 'pointer',
                          color: 'var(--text-primary)', fontSize: '0.875rem', textAlign: 'left', minHeight: 0,
                          opacity: addingAthleteId === m.id ? 0.6 : 1,
                        }}
                      >
                        <span>{m.name}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--teal-secondary)', fontWeight: 700 }}>
                          {addingAthleteId === m.id ? 'Adding…' : '+ Add'}
                        </span>
                      </button>
                    ))
                  })()}
                </div>
              </div>
            )}

            {myMembers.length === 0 ? (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '3rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No members in your groups yet. Add members in the Groups tab.</p>
              </div>
            ) : (() => {
              // Filter
              let filtered = myMembers.filter(m => {
                const searchMatch = !memberSearch.trim() || m.name?.toLowerCase().includes(memberSearch.toLowerCase()) || m.email?.toLowerCase().includes(memberSearch.toLowerCase())
                return searchMatch
              })
              // Sort
              filtered = [...filtered].sort((a, b) => {
                if (memberSort === 'name') return (a.name || '').localeCompare(b.name || '')
                if (memberSort === 'most-active') return (b.workoutCount || 0) - (a.workoutCount || 0)
                if (memberSort === 'least-active') return (a.workoutCount || 0) - (b.workoutCount || 0)
                if (memberSort === 'last-workout') {
                  if (!a.lastWorkout) return 1
                  if (!b.lastWorkout) return -1
                  return new Date(b.lastWorkout).getTime() - new Date(a.lastWorkout).getTime()
                }
                return 0
              })

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {filtered.map(m => {
                    const isExpanded = expandedMember === m.id
                    const wks = memberWorkouts[m.id] ?? []
                    // Activity dot
                    const daysSince = m.lastWorkout ? Math.floor((Date.now() - new Date(m.lastWorkout).getTime()) / 86400000) : 999
                    const actColor = daysSince <= 7 ? '#4ade80' : daysSince <= 14 ? '#f59e0b' : '#ef4444'
                    // Plan completion for this member
                    const memberPlans = assignedPlans.filter(p => p.member_id === m.id)
                    const memberCompleted = memberPlans.filter(p => p.status === 'completed').length
                    const memberCompletionRate = memberPlans.length > 0 ? Math.round((memberCompleted / memberPlans.length) * 100) : 0

                    return (
                      <div key={m.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', overflow: 'hidden' }}>
                        <button onClick={() => toggleMember(m.id)} className="coach-member-header" style={{ width: '100%', background: 'none', border: 'none', padding: '1.25rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-primary)' }}>
                          <div className="coach-member-name-wrap" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', minWidth: 0, textAlign: 'left' }}>
                            {/* Activity dot */}
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: actColor, flexShrink: 0 }} title={`Last workout: ${m.lastWorkout ? new Date(m.lastWorkout).toLocaleDateString() : 'Never'}`} />
                            <div style={{ minWidth: 0 }}>
                              <h3
                                onClick={e => { e.stopPropagation(); setSelectedMemberProfile({ id: m.id, name: m.name }) }}
                                className="coach-member-name"
                                style={{ fontWeight: 600, marginBottom: '0.1rem', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(52,186,194,0.4)', textUnderlineOffset: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                              >{m.name}</h3>
                              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {m.lastWorkout
                                  ? `Last: ${new Date(m.lastWorkout).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                                  : 'No workouts yet'}
                              </p>
                              {/* Plan completion mini-bar */}
                              {memberPlans.length > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.25rem' }}>
                                  <div style={{ width: '60px', height: '4px', borderRadius: '999px', background: 'var(--border)', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${memberCompletionRate}%`, background: 'var(--teal-primary)', borderRadius: '999px' }} />
                                  </div>
                                  <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>{memberCompletionRate}% done</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="coach-member-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                            {/* Assign Plan shortcut */}
                            <button
                              onClick={e => {
                                e.stopPropagation()
                                setAssignForm(p => ({ ...p, member_id: m.id }))
                                switchTab('assign')
                              }}
                              className="coach-action-btn"
                              style={{ background: 'rgba(8,119,160,0.15)', border: '1px solid rgba(8,119,160,0.35)', borderRadius: '0.375rem', padding: '0.3rem 0.5rem', color: 'var(--teal-secondary)', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', minHeight: 0 }}
                            >
                              + Plan
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); setMemberFilter(m.id); switchTab('calendar') }}
                              className="coach-action-btn"
                              style={{ background: 'rgba(8,119,160,0.15)', border: '1px solid rgba(8,119,160,0.35)', borderRadius: '0.375rem', padding: '0.3rem 0.5rem', color: 'var(--teal-secondary)', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', minHeight: 0 }}
                            >
                              <Calendar size={11} /> Calendar
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); handleRemoveAthlete(m.id, m.name) }}
                              className="coach-action-btn"
                              style={{ background: 'none', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '0.375rem', padding: '0.3rem 0.5rem', color: '#f87171', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', minHeight: 0 }}
                            >
                              Remove
                            </button>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', color: 'var(--teal-secondary)', lineHeight: 1 }}>{m.workoutCount}</div>
                              <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>workouts</div>
                            </div>
                            {isExpanded ? <ChevronUp size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />}
                          </div>
                        </button>
                        {isExpanded && (
                          <div style={{ borderTop: '1px solid var(--border)', padding: '1rem 1.25rem' }}>
                            <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Recent Workouts</p>
                            {wks.length === 0 ? (
                              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No workouts logged yet.</p>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                {wks.map(w => (
                                  <div key={w.id} style={{ background: 'var(--surface-raised)', borderRadius: '0.5rem', padding: '0.625rem 0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                                    <div>
                                      <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{w.title}</p>
                                      <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                                        {new Date(w.date ?? w.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        {w.duration ? ` · ${w.duration}min` : ''}
                                      </p>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                                      <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '999px', textTransform: 'uppercase' as const, ...(TYPE_BADGE[w.type] ?? TYPE_BADGE.both) }}>{w.type}</span>
                                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{(w.exercises as any[])?.[0]?.count ?? 0} ex</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        )}

        {/* ── GROUPS TAB ── */}
        {activeTab === 'groups' && (
          <div key="tab-groups" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', letterSpacing: '0.03em', marginBottom: '1rem' }}>MY GROUPS ({myGroups.length})</h2>
              {myGroups.length === 0 ? <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No groups yet. Create one →</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {myGroups.map(g => {
                    const isExpanded = expandedGroup === g.id
                    const gms = groupMembers[g.id] ?? []
                    const memberCount = groupMembers[g.id] ? groupMembers[g.id].length : ((g.group_members as any[])?.[0]?.count ?? 0)
                    return (
                      <div key={g.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', overflow: 'hidden' }}>
                        <button onClick={() => toggleGroup(g.id)} style={{ width: '100%', background: 'none', border: 'none', padding: '1rem 1.25rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#F2F2F2' }}>
                          <div style={{ textAlign: 'left' }}>
                            <h3 style={{ fontWeight: 600, marginBottom: '0.15rem' }}>{g.name}</h3>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{memberCount} members</p>
                          </div>
                          {isExpanded ? <ChevronUp size={16} style={{ color: 'var(--text-secondary)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-secondary)' }} />}
                        </button>
                        {isExpanded && (
                          <div style={{ borderTop: '1px solid var(--border)', padding: '1rem 1.25rem' }}>
                            {gms.length === 0 ? <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>No members yet.</p> : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                {gms.map(gm => (
                                  <div key={gm.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span
                                      onClick={() => gm.profiles?.name && setSelectedMemberProfile({ id: gm.member_id, name: gm.profiles.name })}
                                      style={{ fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(52,186,194,0.4)', textUnderlineOffset: '2px' }}
                                    >{gm.profiles?.name}</span>
                                    <button onClick={() => handleRemoveFromGroup(g.id, gm.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', display: 'flex', minHeight: 0 }}>
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <select value={addMemberId[g.id] ?? ''} onChange={e => setAddMemberId(prev => ({ ...prev, [g.id]: e.target.value }))} style={{ ...inputBase, flex: 1, cursor: 'pointer' }}>
                                <option value="">Add member…</option>
                                {allMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                              </select>
                              <button onClick={() => handleAddToGroup(g.id)} style={{ background: 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.55rem 0.875rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, minHeight: 0 }}>Add</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.25rem' }}>
              <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.25rem', letterSpacing: '0.03em', marginBottom: '1rem' }}>NEW GROUP</h2>
              <form onSubmit={handleCreateGroup} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                <div>
                  <label style={labelBase}>Name *</label>
                  <input type="text" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} required style={{ ...inputBase, width: '100%' }} placeholder="e.g. Monday Warriors" />
                </div>
                <div>
                  <label style={labelBase}>Description</label>
                  <textarea value={newGroupDesc} onChange={e => setNewGroupDesc(e.target.value)} style={{ ...inputBase, width: '100%', minHeight: '60px', resize: 'vertical' }} placeholder="Optional…" />
                </div>
                <button type="submit" disabled={groupSaving} style={{ background: groupSaving ? '#0d1a1e' : 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.7rem', fontWeight: 700, fontSize: '0.875rem', cursor: groupSaving ? 'not-allowed' : 'pointer' }}>
                  {groupSaving ? 'Creating…' : 'Create Group'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── ASSIGN PLAN TAB ── */}
        {activeTab === 'assign' && (
          <div key="tab-assign">
            {/* Load from Template */}
            {(() => {
              const sharedTemplates = templates.filter((t: any) => t.is_shared)
              const myTemplates = templates.filter((t: any) => t.created_by === userId)
              if (sharedTemplates.length === 0 && myTemplates.length === 0) return null
              return (
                <div style={{ marginBottom: '1.5rem' }}>
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
                            minHeight: 0, display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                          }}>
                          {src === 'shared' ? <><UserCog size={11} /> Shared by Coach</> : <><ClipboardList size={11} /> My Templates</>}
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
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 0,
                      }}>
                      <span>{selectedTemplate ? selectedTemplate.title : 'Select a template...'}</span>
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
                          .filter((t: any) => !templateSearch || t.title.toLowerCase().includes(templateSearch.toLowerCase()))
                          .map((t: any) => (
                            <button key={t.id} type="button"
                              onClick={() => {
                                setSelectedTemplate(t)
                                setAssignForm(p => ({ ...p, title: t.title, type: t.type, description: t.description || p.description }))
                                const exs = (t.workout_template_exercises || []).sort((a: any, b: any) => a.order_index - b.order_index)
                                setPlanExercises(exs.length > 0 ? exs.map((ex: any) => ({
                                  name: ex.name, sets: ex.sets?.toString() || '', reps: ex.reps?.toString() || '',
                                  weight: ex.weight?.toString() || '', duration: ex.duration?.toString() || '',
                                  distance: ex.distance?.toString() || '', notes: ex.notes || '',
                                })) : [blankEx()])
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
                          .filter((t: any) => !templateSearch || t.title.toLowerCase().includes(templateSearch.toLowerCase()))
                          .length === 0 && (
                          <p style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem', textAlign: 'center' }}>
                            {templateSearch ? 'No templates match your search.' : templateSource === 'shared' ? 'No shared templates yet.' : 'No personal templates yet.'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {selectedTemplate && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--teal-secondary)', marginTop: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Check size={12} /> Loaded: {selectedTemplate.title} — you can still customize
                    </p>
                  )}
                </div>
              )
            })()}

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '1rem', padding: '1.5rem', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', letterSpacing: '0.03em', marginBottom: '1rem' }}>ASSIGN WORKOUT PLAN</h2>
              <form onSubmit={handleAssignPlan} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Row 1: Member + Date */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={labelBase}>Member *</label>
                    <select value={assignForm.member_id} onChange={e => setAssignForm(p => ({ ...p, member_id: e.target.value }))} required style={{ ...inputBase, width: '100%', cursor: 'pointer' }}>
                      <option value="">Select member…</option>
                      {allMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    {/* Last 3 workouts for selected member */}
                    {assignForm.member_id && assignMemberWorkouts.length > 0 && (
                      <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: '#0a1518', borderRadius: '0.5rem', border: '1px solid #1a2e34' }}>
                        <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Last 3 Workouts</p>
                        {assignMemberWorkouts.map(w => (
                          <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '0.2rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{w.title}</span>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', flexShrink: 0 }}>{new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={labelBase}>Scheduled Date</label>
                    <input type="date" value={assignForm.scheduled_date} onChange={e => setAssignForm(p => ({ ...p, scheduled_date: e.target.value }))} style={{ ...inputBase, width: '100%' }} />
                  </div>
                </div>
                {/* Row 2: Title + Type */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'end' }}>
                  <div>
                    <label style={labelBase}>Plan Title *</label>
                    <input type="text" value={assignForm.title} onChange={e => setAssignForm(p => ({ ...p, title: e.target.value }))} required style={{ ...inputBase, width: '100%' }} placeholder="e.g. Week 1 Strength Block" />
                  </div>
                  <div>
                    <label style={labelBase}>Type</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {(['conditioning', 'basketball', 'both'] as const).map(t => {
                        const TypeIcon = typeIconFor(t)
                        return (
                          <button key={t} type="button" onClick={() => setAssignForm(p => ({ ...p, type: t }))} style={{
                            background: assignForm.type === t ? 'rgba(8,119,160,0.2)' : '#0d1a1e',
                            border: `1px solid ${assignForm.type === t ? 'var(--teal-primary)' : '#1a2e34'}`,
                            borderRadius: '0.375rem', padding: '0.5rem 0.75rem',
                            color: assignForm.type === t ? 'var(--teal-secondary)' : 'var(--text-secondary)',
                            fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize', minHeight: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}><TypeIcon size={13} /></button>
                        )
                      })}
                    </div>
                  </div>
                </div>
                {/* Row 3: Description */}
                <div>
                  <label style={labelBase}>Description (optional)</label>
                  <textarea value={assignForm.description} onChange={e => setAssignForm(p => ({ ...p, description: e.target.value }))} style={{ ...inputBase, width: '100%', minHeight: '60px', resize: 'vertical' }} placeholder="Plan details…" />
                </div>
                {/* Exercises */}
                <div>
                  <label style={{ ...labelBase, marginBottom: '0.5rem' }}>Exercises</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {planExercises.map((ex, idx) => {
                      const suggestions = getSuggestions(ex.name, assignForm.type)
                      return (
                        <div key={idx} style={{ background: '#0a1518', border: '1px solid #1a2e34', borderRadius: '0.5rem', padding: '0.875rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.65rem', color: 'var(--teal-secondary)', fontWeight: 700, letterSpacing: '0.08em' }}>EXERCISE {idx + 1}</span>
                            {planExercises.length > 1 && (
                              <button type="button" onClick={() => setPlanExercises(planExercises.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', minHeight: 0 }}>
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                          {/* Name with suggestions */}
                          <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                            <input
                              type="text" value={ex.name} autoComplete="off" placeholder="Exercise name"
                              onChange={e => { updatePlanEx(idx, 'name', e.target.value); setActivePlanSuggestion(idx) }}
                              onFocus={() => ex.name.length > 0 && setActivePlanSuggestion(idx)}
                              onBlur={() => setTimeout(() => setActivePlanSuggestion(null), 150)}
                              style={{ ...inputBase, width: '100%' }}
                            />
                            {activePlanSuggestion === idx && suggestions.length > 0 && (
                              <div style={{ position: 'absolute', top: 'calc(100% - 1px)', left: 0, right: 0, zIndex: 20, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0 0 0.5rem 0.5rem', maxHeight: '160px', overflowY: 'auto' }}>
                                {suggestions.map(s => (
                                  <button key={s} type="button"
                                    onMouseDown={() => { updatePlanEx(idx, 'name', s); setActivePlanSuggestion(null) }}
                                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.4rem 0.875rem', background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#F2F2F2', fontSize: '0.8rem', cursor: 'pointer', minHeight: 32 }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(8,119,160,0.15)' }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
                                  >{s}</button>
                                ))}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                            {(['sets', 'reps', 'weight'] as const).map(f => (
                              <div key={f}>
                                <label style={{ ...labelBase, marginBottom: '0.2rem' }}>{f === 'weight' ? 'Weight kg' : f.charAt(0).toUpperCase() + f.slice(1)}</label>
                                <input type="number" value={ex[f]} onChange={e => updatePlanEx(idx, f, e.target.value)} style={{ ...inputBase, width: '100%' }} placeholder="—" min="0" step="0.5" />
                              </div>
                            ))}
                            {(['duration', 'distance'] as const).map(f => (
                              <div key={f}>
                                <label style={{ ...labelBase, marginBottom: '0.2rem' }}>{f === 'duration' ? 'Dur. (min)' : 'Dist. (km)'}</label>
                                <input type="number" value={ex[f]} onChange={e => updatePlanEx(idx, f, e.target.value)} style={{ ...inputBase, width: '100%' }} placeholder="—" min="0" step="0.1" />
                              </div>
                            ))}
                            <div style={{ gridColumn: '3' }}>
                              <label style={{ ...labelBase, marginBottom: '0.2rem' }}>Notes</label>
                              <input type="text" value={ex.notes} onChange={e => updatePlanEx(idx, 'notes', e.target.value)} style={{ ...inputBase, width: '100%' }} placeholder="—" />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <button type="button" onClick={() => setPlanExercises([...planExercises, blankEx()])} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                    width: '100%', marginTop: '0.5rem',
                    background: 'transparent', border: '1px dashed #1a2e34', borderRadius: '0.5rem',
                    padding: '0.6rem', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem',
                  }}>
                    <Plus size={14} /> Add Exercise
                  </button>
                </div>
                {/* Save as Template */}
                <div style={{ marginTop: '0.5rem', paddingTop: '0.875rem', borderTop: '1px solid var(--border)' }}>
                  {templateSaved && (
                    <div style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '0.5rem', padding: '0.625rem 0.875rem', marginBottom: '0.75rem', color: '#4ade80', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Check size={13} style={{ flexShrink: 0 }} /> Template saved!{shareTemplate ? " It's now visible in Shared by Coaches." : ''}
                    </div>
                  )}
                  {!showSaveTemplate ? (
                    <button type="button" onClick={() => setShowSaveTemplate(true)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '0.375rem', padding: '0.4rem 0.875rem', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer', minHeight: 0, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                      <Save size={13} /> Save as Reusable Template
                    </button>
                  ) : (
                    <div style={{ background: '#0a1518', border: '1px solid #1a2e34', borderRadius: '0.5rem', padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                      <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>Save as Template</p>
                      <input type="text" value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="Template name…" style={{ ...inputBase, width: '100%' }} />
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer' }}>
                        <div
                          onClick={() => setShareTemplate(!shareTemplate)}
                          style={{ width: '36px', height: '22px', borderRadius: '999px', position: 'relative', flexShrink: 0, background: shareTemplate ? 'var(--teal-primary)' : 'var(--border)', cursor: 'pointer', transition: 'background 0.2s' }}
                        >
                          <div style={{ position: 'absolute', top: '3px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', left: shareTemplate ? '17px' : '3px' }} />
                        </div>
                        <div>
                          <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Share with all coaches</p>
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0 }}>{shareTemplate ? 'Will appear in Shared by Coaches tab' : 'Only you can see this template'}</p>
                        </div>
                      </label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="button" onClick={async () => {
                          if (!templateName.trim() || !userId) return
                          const { data: tmpl } = await supabase.from('workout_templates').insert({
                            created_by: userId, title: templateName.trim(), description: assignForm.description || null,
                            type: assignForm.type, is_shared: shareTemplate, is_default: false, is_visible_to_members: false,
                          }).select().single()
                          if (tmpl) {
                            const exs = planExercises.filter(e => e.name.trim()).map((ex, i) => ({
                              template_id: tmpl.id, name: ex.name,
                              sets: ex.sets ? Number(ex.sets) : null, reps: ex.reps ? Number(ex.reps) : null,
                              weight: ex.weight ? Number(ex.weight) : null, duration: ex.duration ? Number(ex.duration) : null,
                              distance: ex.distance ? Number(ex.distance) : null, notes: ex.notes || null, order_index: i,
                            }))
                            if (exs.length > 0) await supabase.from('workout_template_exercises').insert(exs)
                            await refreshTemplates(userId)
                          }
                          setTemplateSaved(true)
                          setTemplateName(''); setShowSaveTemplate(false); setShareTemplate(false)
                          setTimeout(() => setTemplateSaved(false), 3000)
                        }} style={{ flex: 1, background: templateName.trim() ? 'var(--teal-primary)' : '#0d1a1e', color: 'white', border: 'none', borderRadius: '0.375rem', padding: '0.5rem 0.875rem', fontSize: '0.8rem', fontWeight: 700, cursor: templateName.trim() ? 'pointer' : 'not-allowed', minHeight: 0 }}>
                          Save Template
                        </button>
                        <button type="button" onClick={() => { setShowSaveTemplate(false); setTemplateName(''); setShareTemplate(false) }} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '0.375rem', padding: '0.5rem 0.625rem', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer', minHeight: 0 }}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>

                <button type="submit" disabled={planSaving} style={{ background: planSaving ? '#0d1a1e' : 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.875rem', fontWeight: 700, fontSize: '0.95rem', cursor: planSaving ? 'not-allowed' : 'pointer' }}>
                  {planSaving ? 'Assigning…' : 'Assign Plan'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── ASSIGNED PLANS TAB ── */}
        {activeTab === 'assigned' && (
          <div key="tab-assigned">
            {/* Filter assigned plans by member */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text" placeholder="Search athletes…" value={planSearch}
                onChange={e => setPlanSearch(e.target.value)}
                style={{ flex: 1, minWidth: '160px', background: '#0d1a1e', border: '1px solid #1a2e34', borderRadius: '0.5rem', padding: '0.6rem 0.875rem', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none' }}
              />
              <select
                value={planMemberFilter}
                onChange={e => setPlanMemberFilter(e.target.value)}
                style={{ background: '#0d1a1e', border: '1px solid #1a2e34', borderRadius: '0.5rem', padding: '0.6rem 0.875rem', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none', cursor: 'pointer' }}
              >
                <option value="all">All Athletes</option>
                {myGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>

            {/* Assigned Plans List */}
            <div style={{ marginBottom: '0.75rem' }}>
              <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', letterSpacing: '0.03em', marginBottom: '0.75rem' }}>ASSIGNED PLANS ({assignedPlans.length})</h2>
              <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.375rem', scrollbarWidth: 'none' }}>
                {([
                  { key: 'all', label: 'All', icon: ClipboardList },
                  { key: 'pending', label: 'Pending', icon: Circle },
                  { key: 'completed', label: 'Completed', icon: CheckCircle2 },
                  { key: 'skipped', label: 'Missed', icon: XCircle },
                  { key: 'rescheduled', label: 'Rescheduled', icon: Calendar },
                ] as const).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setPlanStatusFilter(tab.key)}
                    style={{
                      padding: '0.35rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s', flexShrink: 0,
                      background: planStatusFilter === tab.key ? 'var(--teal-primary)' : 'var(--surface-raised)',
                      color: planStatusFilter === tab.key ? '#fff' : 'var(--text-secondary)',
                      border: `1px solid ${planStatusFilter === tab.key ? 'var(--teal-primary)' : 'var(--border)'}`,
                      minHeight: 0, display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                    }}
                  >
                    <tab.icon size={12} /> {tab.label}
                  </button>
                ))}
              </div>
            </div>
            {(() => {
              let filteredAssignedPlans = !planSearch.trim()
                ? assignedPlans
                : assignedPlans.filter((p: any) => p.member?.name?.toLowerCase().includes(planSearch.toLowerCase()))
              if (planMemberFilter !== 'all') {
                const groupMemberIds = new Set((groupMembers[planMemberFilter] ?? []).map((gm: any) => gm.member_id))
                filteredAssignedPlans = filteredAssignedPlans.filter((p: any) => groupMemberIds.has(p.member_id))
              }
              const filtered = planStatusFilter === 'all' ? filteredAssignedPlans : filteredAssignedPlans.filter(p => p.status === planStatusFilter)
              if (filtered.length === 0) return <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No {planStatusFilter !== 'all' ? planStatusFilter : ''} plans yet.</p>

              const todayStr = getLocalDateString()
              const byMember = filtered.reduce((acc: Record<string, any[]>, plan: any) => {
                if (!acc[plan.member_id]) acc[plan.member_id] = []
                acc[plan.member_id].push(plan)
                return acc
              }, {})

              const athleteGroups = Object.entries(byMember).map(([memberId, plans]) => {
                const memberName = (plans as any[])[0]?.member?.name ?? '—'
                const pendingCount = (plans as any[]).filter(p => p.status === 'pending' || p.status === 'rescheduled').length
                const todayCount = (plans as any[]).filter(p => p.scheduled_date === todayStr).length
                const skippedCount = (plans as any[]).filter(p => p.status === 'skipped').length
                const priority = todayCount > 0 ? 0 : skippedCount > 0 ? 1 : 2
                return {
                  memberId, memberName, pendingCount, todayCount, skippedCount, priority,
                  plans: (plans as any[]).sort((a, b) => (b.scheduled_date ?? '').localeCompare(a.scheduled_date ?? '')),
                }
              }).sort((a, b) => a.priority - b.priority || a.memberName.localeCompare(b.memberName))

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {athleteGroups.map(sg => {
                    const isExpanded = expandedPlanMember === sg.memberId
                    return (
                      <div key={sg.memberId} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', overflow: 'hidden' }}>
                        <button
                          onClick={() => setExpandedPlanMember(prev => prev === sg.memberId ? null : sg.memberId)}
                          style={{ width: '100%', background: 'none', border: 'none', padding: '1rem 1.25rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', color: '#F2F2F2' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--teal-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700, flexShrink: 0 }}>
                              {sg.memberName?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div style={{ textAlign: 'left', minWidth: 0 }}>
                              <h3 style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.3rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sg.memberName}</h3>
                              <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                                {sg.pendingCount > 0 && (
                                  <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '999px', background: 'var(--surface-raised)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                                    {sg.pendingCount} pending
                                  </span>
                                )}
                                {sg.todayCount > 0 && (
                                  <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '999px', background: 'rgba(8,119,160,0.15)', color: 'var(--teal-secondary)', border: '1px solid rgba(8,119,160,0.35)' }}>
                                    {sg.todayCount} today
                                  </span>
                                )}
                                {sg.skippedCount > 0 && (
                                  <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '999px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.35)' }}>
                                    {sg.skippedCount} skipped
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          {isExpanded ? <ChevronUp size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />}
                        </button>
                        {isExpanded && (
                          <div style={{ borderTop: '1px solid var(--border)', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {sg.plans.map((p: any) => {
                              const tb = TYPE_BADGE[p.type] ?? TYPE_BADGE.both
                              const st = PLAN_STATUS[p.status ?? 'pending'] ?? PLAN_STATUS.pending
                              const isEditingThis = editingPlan === p.id
                              const isReschedulingThis = reschedulingPlan === p.id
                              const isActingThis = planActionLoading === p.id
                              const isCompletingThis = completingPlan === p.id
                              return (
                                <div key={p.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', overflow: 'hidden' }}>
                                  <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                                        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{p.title}</span>
                                        <span style={{ ...tb, fontSize: '0.6rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '999px', textTransform: 'uppercase' }}>{p.type}</span>
                                        <span style={{ fontSize: '0.75rem', color: st.color, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><st.icon size={11} /> {st.label}</span>
                                      </div>
                                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                        {p.member?.name} · {(p.workout_plan_exercises as any[])?.[0]?.count ?? 0} exercises
                                      </p>
                                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                                        {new Date(p.scheduled_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                                      </p>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', gap: '0.5rem', padding: '0 1rem 0.875rem', flexWrap: 'wrap' }}>
                                    {p.status !== 'completed' ? (
                                      <button
                                        onClick={() => {
                                          if (isCompletingThis) { setCompletingPlan(null); setCompletePlanDuration(''); return }
                                          setCompletePlanDuration('')
                                          setCompletingPlan(p.id)
                                        }}
                                        disabled={isActingThis}
                                        style={{ flex: '1 1 auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.35)', borderRadius: '0.375rem', padding: '0.3rem 0.625rem', color: '#4ade80', fontSize: '0.75rem', cursor: isActingThis ? 'not-allowed' : 'pointer', minHeight: 0 }}
                                      >
                                        <CheckCircle2 size={12} /> {isActingThis ? 'Saving…' : isCompletingThis ? 'Cancel' : 'Complete'}
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleUndoCompletePlan(p)}
                                        disabled={isActingThis}
                                        style={{ flex: '1 1 auto', background: 'none', border: '1px solid var(--border)', borderRadius: '0.375rem', padding: '0.3rem 0.625rem', color: 'var(--text-secondary)', fontSize: '0.75rem', cursor: isActingThis ? 'not-allowed' : 'pointer', minHeight: 0 }}
                                      >
                                        ↩️ {isActingThis ? 'Saving…' : 'Undo Completion'}
                                      </button>
                                    )}
                                    {p.status !== 'completed' && (
                                      <button
                                        onClick={() => {
                                          if (isReschedulingThis) { setReschedulingPlan(null); setReschedulePlanDate(''); return }
                                          setReschedulePlanDate(p.scheduled_date)
                                          setReschedulingPlan(p.id)
                                        }}
                                        style={{ flex: '1 1 auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', background: isReschedulingThis ? 'rgba(96,165,250,0.15)' : 'none', border: `1px solid ${isReschedulingThis ? '#60a5fa' : 'var(--border)'}`, borderRadius: '0.375rem', padding: '0.3rem 0.625rem', color: isReschedulingThis ? '#60a5fa' : 'var(--text-secondary)', fontSize: '0.75rem', cursor: 'pointer', minHeight: 0 }}
                                      >
                                        <Calendar size={12} /> {isReschedulingThis ? 'Cancel' : 'Reschedule'}
                                      </button>
                                    )}
                                    <button onClick={() => { if (isEditingThis) { setEditingPlan(null); return }; openPlanEdit(p) }} style={{ flex: '1 1 auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', background: isEditingThis ? 'rgba(8,119,160,0.15)' : 'none', border: `1px solid ${isEditingThis ? 'var(--teal-primary)' : 'var(--border)'}`, borderRadius: '0.375rem', padding: '0.3rem 0.625rem', color: isEditingThis ? 'var(--teal-secondary)' : 'var(--text-secondary)', fontSize: '0.75rem', cursor: 'pointer', minHeight: 0 }}>
                                      <Pencil size={12} /> {isEditingThis ? 'Editing…' : 'Edit'}
                                    </button>
                                    <button onClick={() => handleDeletePlan(p.id)} style={{ flex: '1 1 auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', background: 'none', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '0.375rem', padding: '0.3rem 0.625rem', color: '#f87171', fontSize: '0.75rem', cursor: 'pointer', minHeight: 0 }}>
                                      <Trash2 size={12} /> Remove
                                    </button>
                                  </div>

                                  {isReschedulingThis && (
                                    <div style={{ padding: '0 1rem 0.875rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                      <input
                                        type="date"
                                        value={reschedulePlanDate}
                                        onChange={e => setReschedulePlanDate(e.target.value)}
                                        style={{ ...inputBase, flex: 1 }}
                                      />
                                      <button
                                        onClick={() => handleReschedulePlan(p.id)}
                                        disabled={isActingThis || !reschedulePlanDate}
                                        style={{ background: 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.375rem', padding: '0.4rem 0.875rem', fontWeight: 700, fontSize: '0.75rem', cursor: (isActingThis || !reschedulePlanDate) ? 'not-allowed' : 'pointer', minHeight: 0 }}
                                      >
                                        {isActingThis ? 'Saving…' : 'Confirm'}
                                      </button>
                                    </div>
                                  )}

                                  {isCompletingThis && (
                                    <div style={{ padding: '0 1rem 0.875rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                      <input
                                        type="number" min="0" placeholder="Duration (minutes) — optional"
                                        value={completePlanDuration}
                                        onChange={e => setCompletePlanDuration(e.target.value)}
                                        style={{ ...inputBase, flex: 1 }}
                                      />
                                      <button
                                        onClick={() => handleCompletePlan(p, completePlanDuration ? Number(completePlanDuration) : null)}
                                        disabled={isActingThis}
                                        style={{ background: 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.375rem', padding: '0.4rem 0.875rem', fontWeight: 700, fontSize: '0.75rem', cursor: isActingThis ? 'not-allowed' : 'pointer', minHeight: 0 }}
                                      >
                                        {isActingThis ? 'Saving…' : 'Confirm'}
                                      </button>
                                    </div>
                                  )}

                                  {isEditingThis && (
                                    <div style={{ borderTop: '1px solid var(--border)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem', background: '#0a1518' }}>
                                      <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--teal-secondary)' }}>EDIT PLAN</p>
                                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                        <div>
                                          <label style={labelBase}>Title</label>
                                          <input type="text" value={editPlanForm.title || ''} onChange={e => setEditPlanForm((prev: any) => ({ ...prev, title: e.target.value }))} style={{ ...inputBase, width: '100%' }} />
                                        </div>
                                        <div>
                                          <label style={labelBase}>Date</label>
                                          <input type="date" value={editPlanForm.scheduled_date || ''} onChange={e => setEditPlanForm((prev: any) => ({ ...prev, scheduled_date: e.target.value }))} style={{ ...inputBase, width: '100%' }} />
                                        </div>
                                      </div>
                                      <div>
                                        <label style={labelBase}>Type</label>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                          {(['conditioning', 'basketball', 'both'] as const).map(t => {
                                            const TypeIcon = typeIconFor(t)
                                            return (
                                              <button key={t} type="button" onClick={() => setEditPlanForm((prev: any) => ({ ...prev, type: t }))} style={{
                                                flex: 1, background: editPlanForm.type === t ? 'rgba(8,119,160,0.2)' : '#0d1a1e',
                                                border: `1px solid ${editPlanForm.type === t ? 'var(--teal-primary)' : '#1a2e34'}`,
                                                borderRadius: '0.375rem', padding: '0.4rem', color: editPlanForm.type === t ? 'var(--teal-secondary)' : 'var(--text-secondary)',
                                                fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize', minHeight: 0,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                              }}><TypeIcon size={13} /></button>
                                            )
                                          })}
                                        </div>
                                      </div>
                                      <div>
                                        <label style={labelBase}>Description</label>
                                        <textarea value={editPlanForm.description || ''} onChange={e => setEditPlanForm((prev: any) => ({ ...prev, description: e.target.value }))} style={{ ...inputBase, width: '100%', minHeight: '50px', resize: 'vertical' }} />
                                      </div>
                                      <div>
                                        <label style={{ ...labelBase, marginBottom: '0.375rem' }}>Exercises</label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                          {editPlanExercises.map((ex, idx) => {
                                            const sug = getSuggestions(ex.name, editPlanForm.type || 'conditioning')
                                            return (
                                              <div key={idx} style={{ background: '#0d1a1e', border: '1px solid #1a2e34', borderRadius: '0.375rem', padding: '0.625rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                                                  <span style={{ fontSize: '0.65rem', color: 'var(--teal-secondary)', fontWeight: 700 }}>EX {idx + 1}</span>
                                                  {editPlanExercises.length > 1 && (
                                                    <button type="button" onClick={() => setEditPlanExercises(editPlanExercises.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', minHeight: 0 }}>
                                                      <Trash2 size={12} />
                                                    </button>
                                                  )}
                                                </div>
                                                <div style={{ position: 'relative', marginBottom: '0.375rem' }}>
                                                  <input type="text" value={ex.name} autoComplete="off" placeholder="Exercise name"
                                                    onChange={e => { updateEditPlanEx(idx, 'name', e.target.value); setActivePlanEditSuggestion(idx) }}
                                                    onFocus={() => ex.name.length > 0 && setActivePlanEditSuggestion(idx)}
                                                    onBlur={() => setTimeout(() => setActivePlanEditSuggestion(null), 150)}
                                                    style={{ ...inputBase, width: '100%' }}
                                                  />
                                                  {activePlanEditSuggestion === idx && sug.length > 0 && (
                                                    <div style={{ position: 'absolute', top: 'calc(100% - 1px)', left: 0, right: 0, zIndex: 20, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0 0 0.375rem 0.375rem', maxHeight: '140px', overflowY: 'auto' }}>
                                                      {sug.map(s => (
                                                        <button key={s} type="button"
                                                          onMouseDown={() => { updateEditPlanEx(idx, 'name', s); setActivePlanEditSuggestion(null) }}
                                                          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.4rem 0.75rem', background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#F2F2F2', fontSize: '0.8rem', cursor: 'pointer', minHeight: 30 }}
                                                        >{s}</button>
                                                      ))}
                                                    </div>
                                                  )}
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.375rem' }}>
                                                  {(['sets', 'reps', 'weight'] as const).map(f => (
                                                    <input key={f} type="number" value={ex[f]} onChange={e => updateEditPlanEx(idx, f, e.target.value)} style={{ ...inputBase, width: '100%' }} placeholder={f === 'weight' ? 'kg' : f === 'sets' ? 'Sets' : 'Reps'} min="0" />
                                                  ))}
                                                </div>
                                              </div>
                                            )
                                          })}
                                          <button type="button" onClick={() => setEditPlanExercises([...editPlanExercises, blankEx()])} style={{ background: 'transparent', border: '1px dashed #1a2e34', borderRadius: '0.375rem', padding: '0.4rem', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.75rem', minHeight: 0 }}>
                                            + Add Exercise
                                          </button>
                                        </div>
                                      </div>
                                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button type="button" onClick={handleSavePlanEdit} style={{ flex: 1, background: 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.375rem', padding: '0.625rem', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', minHeight: 0 }}>Save Changes</button>
                                        <button type="button" onClick={() => setEditingPlan(null)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '0.375rem', padding: '0.625rem 0.875rem', color: 'var(--text-secondary)', fontSize: '0.875rem', cursor: 'pointer', minHeight: 0 }}>Cancel</button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        )}

        {/* ── WORKOUT CALENDAR TAB ── */}
        {activeTab === 'calendar' && (
          <div key="tab-calendar">
            {bballError && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', color: '#f87171', fontSize: '0.875rem' }}>{bballError}</div>}
            {bballJoinBlockedMsg && (
              <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', color: '#f59e0b', fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                <span>{bballJoinBlockedMsg}</span>
                <button onClick={() => setBballJoinBlockedMsg('')} style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', minHeight: 0, padding: 0 }}><X size={14} /></button>
              </div>
            )}
            <CalendarGrid
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              entries={calendarWorkouts.map((w: any): CalendarEntry => ({ ...w, date: (w.date || '').slice(0, 10) }))}
              selectedDate={calendarSelectedDate}
              onSelectDate={setCalendarSelectedDate}
              headerExtra={
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <input
                    type="text" placeholder="Search athletes…" value={calendarMemberSearch}
                    onChange={e => setCalendarMemberSearch(e.target.value)}
                    style={{ flex: 1, minWidth: '160px', background: '#0d1a1e', border: '1px solid #1a2e34', borderRadius: '0.5rem', padding: '0.6rem 0.875rem', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none' }}
                  />
                  <select
                    value={memberFilter}
                    onChange={e => setMemberFilter(e.target.value)}
                    style={{ background: '#0d1a1e', border: '1px solid #1a2e34', borderRadius: '0.5rem', padding: '0.6rem 0.875rem', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="all">All Athletes</option>
                    {myMembers
                      .filter((m: any) => !calendarMemberSearch.trim() || m.name?.toLowerCase().includes(calendarMemberSearch.toLowerCase()))
                      .map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              }
              renderDayCellContent={(dayEntries) => (
                <>
                  {dayEntries.slice(0, 2).map((w: any) => {
                    const badgeStyle: React.CSSProperties = { borderRadius: '0.2rem', fontSize: '0.55rem', padding: '0.1rem 0.25rem', marginBottom: '0.1rem', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }
                    if (w.isBballClass) {
                      return (
                        <div key={w.id} onClick={e => { e.stopPropagation(); setSelectedBballOcc(w as BballOccurrence) }} style={{ ...badgeStyle, background: 'rgba(52,186,194,0.2)', color: '#34bac2', cursor: 'pointer' }}>
                          🏀 {w.cls.start_time?.slice(0, 5)} {w.cls.title}
                        </div>
                      )
                    }
                    const label = `${w.member_name?.split(' ')[0] ?? '—'}: ${w.title}`
                    if (w.isPlan) {
                      const isSkipped = w.status === 'skipped'
                      return (
                        <div style={{ ...badgeStyle, background: 'transparent', color: isSkipped ? '#ef4444' : '#34bac2', border: `1px dashed ${isSkipped ? 'rgba(239,68,68,0.6)' : 'rgba(8,119,160,0.5)'}`, display: 'flex', alignItems: 'center', gap: '0.15rem' }} key={w.id}>
                          {isSkipped ? <XCircle size={8} style={{ flexShrink: 0 }} /> : <ClipboardList size={8} style={{ flexShrink: 0 }} />} {label}
                        </div>
                      )
                    }
                    return (
                      <div key={w.id} style={{ ...badgeStyle, background: 'rgba(8,119,160,0.2)', color: 'var(--teal-secondary)' }}>
                        {label}
                      </div>
                    )
                  })}
                  {dayEntries.length > 2 && <p style={{ fontSize: '0.55rem', color: 'var(--text-secondary)' }}>+{dayEntries.length - 2}</p>}
                </>
              )}
              renderDetailPanel={(selDate, selEntries) => (
                selDate ? (
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', marginBottom: '1rem', letterSpacing: '0.03em' }}>
                      {new Date(selDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {selEntries.length === 0 ? (
                        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '2rem', textAlign: 'center' }}>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No workouts or plans on this date.</p>
                        </div>
                      ) : selEntries.map((w: any) => {
                        if (w.isBballClass) {
                          const occ = w as BballOccurrence & { id: string }
                          const badge = genderBadgeStyle[occ.cls.gender_restriction]
                          const full = occ.count >= occ.cls.max_slots
                          const key = `${occ.cls.id}_${occ.date}`
                          const busy = bballBusyKey === key
                          return (
                            <div key={w.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '0.875rem' }}>
                              <div onClick={() => setSelectedBballOcc(occ)} style={{ cursor: 'pointer' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                                  <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{occ.cls.title}</p>
                                  {badge && (
                                    <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '999px', textTransform: 'uppercase', background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>{badge.label}</span>
                                  )}
                                </div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
                                  {formatTimeLabel(occ.cls.start_time)} – {formatTimeLabel(occ.cls.end_time)} · {occ.count} / {occ.cls.max_slots} spots filled{full ? ' · Full' : ''}
                                </p>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <p onClick={() => setSelectedBballOcc(occ)} style={{ fontSize: '0.7rem', color: 'var(--teal-secondary)', fontWeight: 600, cursor: 'pointer' }}>View Details →</p>
                                {occ.joined ? (
                                  <button onClick={() => handleBballLeave(occ)} disabled={busy} style={{ background: 'none', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '0.5rem', padding: '0.4rem 0.875rem', fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', cursor: busy ? 'not-allowed' : 'pointer' }}>
                                    {busy ? 'Leaving…' : 'Leave'}
                                  </button>
                                ) : full ? (
                                  <button disabled style={{ background: 'var(--border)', border: 'none', borderRadius: '0.5rem', padding: '0.4rem 0.875rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', cursor: 'not-allowed' }}>
                                    Class Full
                                  </button>
                                ) : (
                                  <button onClick={() => handleBballJoin(occ)} disabled={busy} style={{ background: 'var(--teal-primary)', border: 'none', borderRadius: '0.5rem', padding: '0.4rem 0.875rem', fontSize: '0.75rem', fontWeight: 700, color: 'white', cursor: busy ? 'not-allowed' : 'pointer' }}>
                                    {busy ? 'Joining…' : 'Join'}
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        }
                        if (w.isPlan) {
                          const isSkipped = w.status === 'skipped'
                          const isCompleted = w.status === 'completed'
                          const tb = TYPE_BADGE[w.type] ?? TYPE_BADGE.both
                          const isExpanded = expandedCalendarPlanId === w.id
                          const exs = calendarPlanExercises[w.id] ?? []
                          return (
                            <div key={w.id} style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderLeft: `2px dashed ${isSkipped ? '#ef4444' : 'var(--teal-primary)'}`, borderRadius: '0.75rem', overflow: 'hidden', opacity: isSkipped ? 0.7 : 1 }}>
                              <div onClick={() => toggleCalendarPlanExpand(w.id)} style={{ padding: '1rem', cursor: 'pointer' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '999px', textTransform: 'uppercase', ...tb }}>{w.type}</span>
                                  <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '999px', background: isSkipped ? 'rgba(239,68,68,0.15)' : isCompleted ? 'rgba(34,197,94,0.15)' : 'rgba(8,119,160,0.15)', color: isSkipped ? '#ef4444' : isCompleted ? '#4ade80' : 'var(--teal-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                                    {isSkipped ? <><XCircle size={10} /> Missed</> : isCompleted ? <><CheckCircle2 size={10} /> Completed</> : <><ClipboardList size={10} /> Assigned</>}
                                  </span>
                                </div>
                                <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{w.title}</p>
                                <p style={{ fontSize: '0.7rem', marginTop: '0.15rem', color: 'var(--text-secondary)' }}>{w.member_name ?? '—'}</p>
                              </div>
                              {isExpanded && (
                                <div style={{ borderTop: '1px solid var(--border)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                  <div>
                                    <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Exercises</p>
                                    {loadingCalendarPlanExercises === w.id ? (
                                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Loading…</p>
                                    ) : exs.length === 0 ? (
                                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No exercises listed for this plan.</p>
                                    ) : (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                        {exs.map((ex: any) => (
                                          <div key={ex.id} style={{ background: 'var(--surface)', borderRadius: '0.5rem', padding: '0.5rem 0.625rem' }}>
                                            <p style={{ fontSize: '0.8rem', fontWeight: 600 }}>{ex.name}</p>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.15rem', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                              {ex.sets != null && ex.reps != null && <span>{ex.sets}×{ex.reps} reps</span>}
                                              {ex.weight != null && <span>{ex.weight}kg</span>}
                                              {ex.duration != null && <span>{ex.duration}min</span>}
                                              {ex.distance != null && <span>{ex.distance}km</span>}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    {!isCompleted && !isSkipped && (
                                      <button
                                        onClick={e => { e.stopPropagation(); handleCompletePlan(w, null).then(() => loadCalendarWorkouts()) }}
                                        disabled={planActionLoading === w.id}
                                        style={{ flex: '1 1 auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.35)', borderRadius: '0.375rem', padding: '0.4rem 0.75rem', color: '#4ade80', fontSize: '0.75rem', fontWeight: 700, cursor: planActionLoading === w.id ? 'not-allowed' : 'pointer', minHeight: 0 }}
                                      >
                                        <CheckCircle2 size={12} /> {planActionLoading === w.id ? 'Saving…' : 'Mark Done'}
                                      </button>
                                    )}
                                    <button
                                      onClick={e => { e.stopPropagation(); openPlanEdit(w); switchTab('assigned') }}
                                      style={{ flex: '1 1 auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', background: 'none', border: '1px solid var(--border)', borderRadius: '0.375rem', padding: '0.4rem 0.75rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', minHeight: 0 }}
                                    >
                                      <Pencil size={12} /> Edit
                                    </button>
                                    <button
                                      onClick={e => { e.stopPropagation(); handleDeletePlan(w.id).then(() => loadCalendarWorkouts()) }}
                                      style={{ flex: '1 1 auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', background: 'none', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '0.375rem', padding: '0.4rem 0.75rem', color: '#f87171', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', minHeight: 0 }}
                                    >
                                      <Trash2 size={12} /> Remove
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        }
                        return <WorkoutHistoryCard key={w.id} workout={w} supabase={supabase} />
                      })}
                    </div>
                  </div>
                ) : (
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '2rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Click a date to see workouts and plans.</p>
                  </div>
                )
              )}
            />
          </div>
        )}

        {selectedBballOcc && (
          <BballClassDetailModal
            occ={selectedBballOcc}
            myUserId={userId || ''}
            myGender={gender}
            isAdmin={false}
            onClose={() => setSelectedBballOcc(null)}
            onJoinLeave={loadCalendarWorkouts}
          />
        )}

        {/* ── NOTES TAB ── */}
        {activeTab === 'notes' && (
          <div key="tab-notes">
            {/* Add Note form */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.25rem', letterSpacing: '0.03em', marginBottom: '1rem' }}>ADD NOTE</h2>
              <form onSubmit={handleAddNote} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label style={labelBase}>For Member *</label>
                  <select value={notesMemberId} onChange={e => setNotesMemberId(e.target.value)} required style={{ ...inputBase, width: '100%', cursor: 'pointer' }}>
                    <option value="">Select an athlete…</option>
                    {myMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelBase}>Note</label>
                  <textarea ref={noteTextRef} value={noteText} onChange={e => setNoteText(e.target.value)} required style={{ ...inputBase, width: '100%', minHeight: '80px', resize: 'vertical' }} placeholder="Write a coaching note…" />
                </div>
                {/* Visible to member toggle */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                  <div
                    onClick={() => setVisibleToMember(!visibleToMember)}
                    style={{ width: '36px', height: '22px', borderRadius: '999px', position: 'relative', flexShrink: 0, background: visibleToMember ? 'var(--teal-primary)' : 'var(--border)', cursor: 'pointer', transition: 'background 0.2s', minHeight: 0 }}
                  >
                    <div style={{ position: 'absolute', top: '3px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', left: visibleToMember ? '17px' : '3px' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Visible to member</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0 }}>{visibleToMember ? 'Member will see this note on their dashboard' : 'Only you can see this note'}</p>
                  </div>
                </label>
                <button type="submit" disabled={noteSaving || !notesMemberId} style={{ background: (noteSaving || !notesMemberId) ? '#0d1a1e' : 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.7rem', fontWeight: 700, fontSize: '0.875rem', cursor: (noteSaving || !notesMemberId) ? 'not-allowed' : 'pointer' }}>
                  {noteSaving ? 'Saving…' : 'Save Note'}
                </button>
              </form>
            </div>

            {/* Filter notes by member */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text" placeholder="Search athletes…" value={noteSearch}
                onChange={e => setNoteSearch(e.target.value)}
                style={{ flex: 1, minWidth: '160px', background: '#0d1a1e', border: '1px solid #1a2e34', borderRadius: '0.5rem', padding: '0.6rem 0.875rem', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none' }}
              />
              <select
                value={noteMemberFilter}
                onChange={e => setNoteMemberFilter(e.target.value)}
                style={{ background: '#0d1a1e', border: '1px solid #1a2e34', borderRadius: '0.5rem', padding: '0.6rem 0.875rem', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none', cursor: 'pointer' }}
              >
                <option value="all">All Athletes</option>
                {myGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>

            {/* Notes list — pinned first */}
            {(() => {
              let filteredNotes = !noteSearch.trim()
                ? notes
                : notes.filter((n: any) => n.member?.name?.toLowerCase().includes(noteSearch.toLowerCase()))
              if (noteMemberFilter !== 'all') {
                const groupMemberIds = new Set((groupMembers[noteMemberFilter] ?? []).map((gm: any) => gm.member_id))
                filteredNotes = filteredNotes.filter((n: any) => groupMemberIds.has(n.member_id))
              }
              if (filteredNotes.length === 0) return <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No notes for this athlete yet.</p>
              return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[...filteredNotes].sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0)).map(note => (
                <div key={note.id} style={{
                  background: 'var(--surface)', borderRadius: '0.75rem', overflow: 'hidden',
                  border: note.is_pinned ? '1px solid var(--teal-primary)' : '1px solid var(--border)',
                }}>
                  <div style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                        {note.is_pinned && <Pin size={12} style={{ color: 'var(--teal-secondary)', flexShrink: 0 }} />}
                        <p style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {note.member?.name ?? 'General note'}
                        </p>
                        {note.visible_to_member && (
                          <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: '999px', background: 'rgba(8,119,160,0.2)', color: 'var(--teal-secondary)', border: '1px solid rgba(8,119,160,0.3)', flexShrink: 0 }}>
                            Visible
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                        {/* Pin button */}
                        <button
                          onClick={() => handlePinNote(note.id, !!note.is_pinned)}
                          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '0.375rem', padding: '0.25rem 0.5rem', fontSize: '0.7rem', cursor: 'pointer', color: note.is_pinned ? 'var(--teal-secondary)' : 'var(--text-secondary)', minHeight: 0 }}
                          title={note.is_pinned ? 'Unpin' : 'Pin'}
                        >
                          <Pin size={12} />
                        </button>
                        {/* Visibility toggle */}
                        <button
                          onClick={() => handleToggleVisibility(note.id, !!note.visible_to_member)}
                          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '0.375rem', padding: '0.25rem 0.5rem', fontSize: '0.7rem', cursor: 'pointer', color: note.visible_to_member ? 'var(--teal-secondary)' : 'var(--text-secondary)', minHeight: 0 }}
                          title={note.visible_to_member ? 'Hide from member' : 'Show to member'}
                        >
                          {note.visible_to_member ? <Eye size={12} /> : <EyeOff size={12} />}
                        </button>
                        {/* Edit */}
                        <button
                          onClick={() => { setEditingNote(note.id); setEditText(note.note) }}
                          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '0.375rem', padding: '0.25rem 0.5rem', fontSize: '0.7rem', cursor: 'pointer', color: 'var(--text-secondary)', minHeight: 0 }}
                        >
                          <Pencil size={12} />
                        </button>
                        {/* Delete */}
                        <button
                          onClick={() => confirm('Delete this note?') && handleDeleteNote(note.id)}
                          style={{ background: 'none', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '0.375rem', padding: '0.25rem 0.5rem', fontSize: '0.7rem', cursor: 'pointer', color: '#f87171', minHeight: 0 }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    {editingNote === note.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <textarea
                          value={editText} onChange={e => setEditText(e.target.value)}
                          style={{ ...inputBase, width: '100%', minHeight: '70px', resize: 'vertical' }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => handleUpdateNote(note.id)} style={{ flex: 1, background: 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.375rem', padding: '0.45rem 0.75rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', minHeight: 0 }}>Save</button>
                          <button onClick={() => setEditingNote(null)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '0.375rem', padding: '0.45rem 0.625rem', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text-secondary)', minHeight: 0 }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--text-primary)' }}>{note.note}</p>
                    )}
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                      {new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {note.updated_at && note.updated_at !== note.created_at && ` · edited ${new Date(note.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
              )
            })()}
          </div>
        )}

        {/* ── PROGRAMS TAB ── */}
        {activeTab === 'programs' && (
          <div key="tab-programs">
            {programView === 'list' ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                  <button onClick={startNewProgram} style={{ background: 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.7rem 1.25rem', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Plus size={16} /> New Program
                  </button>
                </div>
                {programs.length === 0 ? (
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '3rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No programs yet. Build a multi-week training program to assign to your members.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {programs.map(p => (
                      <div key={p.id} className="card-vel" style={{ padding: '1.1rem 1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <p style={{ fontWeight: 700, fontSize: '1rem' }}>{p.title}</p>
                              {p.deload_week && (
                                <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '999px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
                                  Deload Wk {p.deload_week}
                                </span>
                              )}
                            </div>
                            {p.description && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{p.description}</p>}
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                              {p.total_weeks} week{p.total_weeks === 1 ? '' : 's'} · {p.program_assignments?.[0]?.count ?? 0} assigned
                            </p>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <button onClick={() => setAssigningProgram(p)} style={{ background: 'rgba(8,119,160,0.15)', border: '1px solid var(--teal-primary)', color: 'var(--teal-secondary)', borderRadius: '0.375rem', padding: '0.4rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', minHeight: 0 }}>Assign</button>
                            <button onClick={() => startEditProgram(p)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '0.375rem', padding: '0.4rem 0.75rem', fontSize: '0.75rem', cursor: 'pointer', minHeight: 0 }}>Edit</button>
                            <button onClick={() => handleCloneProgram(p)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '0.375rem', padding: '0.4rem 0.75rem', fontSize: '0.75rem', cursor: 'pointer', minHeight: 0 }}>Clone</button>
                            <button onClick={() => handleDeleteProgram(p.id)} style={{ background: 'none', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171', borderRadius: '0.375rem', padding: '0.4rem 0.75rem', fontSize: '0.75rem', cursor: 'pointer', minHeight: 0 }}>Delete</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', letterSpacing: '0.03em' }}>{editingProgramId ? 'EDIT PROGRAM' : 'NEW PROGRAM'}</h2>
                  <button onClick={() => setProgramView('list')} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '0.375rem', padding: '0.4rem 0.75rem', fontSize: '0.75rem', cursor: 'pointer', minHeight: 0 }}>← Back to list</button>
                </div>

                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.875rem', marginBottom: '0.875rem' }}>
                    <div>
                      <label style={labelBase}>Title</label>
                      <input type="text" value={programForm.title} onChange={e => setProgramForm({ ...programForm, title: e.target.value })} style={{ ...inputBase, width: '100%' }} placeholder="e.g. 8-Week Strength Block" />
                    </div>
                    <div>
                      <label style={labelBase}>Description</label>
                      <textarea value={programForm.description} onChange={e => setProgramForm({ ...programForm, description: e.target.value })} style={{ ...inputBase, width: '100%', minHeight: '60px', resize: 'vertical' }} placeholder="Optional" />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                    <div>
                      <label style={labelBase}>Total Weeks</label>
                      <input type="number" min="1" max="12" value={programForm.total_weeks} onChange={e => {
                        const weeks = Math.max(1, Math.min(12, Number(e.target.value) || 1))
                        setProgramForm({ ...programForm, total_weeks: weeks.toString() })
                        if (programWeek > weeks) setProgramWeek(weeks)
                      }} style={{ ...inputBase, width: '100%' }} />
                    </div>
                    <div>
                      <label style={labelBase}>Deload Week</label>
                      <select value={programForm.deload_week} onChange={e => setProgramForm({ ...programForm, deload_week: e.target.value })} style={{ ...inputBase, width: '100%', cursor: 'pointer' }}>
                        <option value="">None</option>
                        {Array.from({ length: Number(programForm.total_weeks) || 1 }, (_, i) => i + 1).map(w => <option key={w} value={w}>Week {w}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelBase}>Deload Intensity %</label>
                      <input type="number" min="1" max="100" value={programForm.deload_intensity_pct} onChange={e => setProgramForm({ ...programForm, deload_intensity_pct: e.target.value })} style={{ ...inputBase, width: '100%' }} />
                    </div>
                  </div>
                </div>

                {/* Week tabs */}
                <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', marginBottom: '0.75rem' }}>
                  {Array.from({ length: Number(programForm.total_weeks) || 1 }, (_, i) => i + 1).map(w => (
                    <button key={w} onClick={() => { setProgramWeek(w); setOpenDaySlot(null) }} style={{
                      flexShrink: 0, padding: '0.5rem 0.875rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                      background: programWeek === w ? 'var(--teal-primary)' : 'var(--surface)',
                      color: programWeek === w ? '#fff' : 'var(--text-secondary)',
                      border: `1px solid ${programWeek === w ? 'var(--teal-primary)' : 'var(--border)'}`,
                      minHeight: 36, display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                    }}>
                      Wk {w}{Number(programForm.deload_week) === w && <ArrowDown size={11} />}
                    </button>
                  ))}
                </div>

                {/* Copy week */}
                {draftWorkouts.some(w => w.week_number !== programWeek) && (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.875rem' }}>
                    <select value={copyWeekSource} onChange={e => setCopyWeekSource(e.target.value)} style={{ ...inputBase, cursor: 'pointer' }}>
                      <option value="">Copy from week…</option>
                      {Array.from(new Set(draftWorkouts.filter(w => w.week_number !== programWeek).map(w => w.week_number))).sort((a, b) => a - b).map(w => (
                        <option key={w} value={w}>Week {w}</option>
                      ))}
                    </select>
                    <button onClick={handleCopyWeek} disabled={!copyWeekSource} style={{ background: 'none', border: '1px solid var(--border)', color: copyWeekSource ? 'var(--teal-secondary)' : 'var(--text-secondary)', borderRadius: '0.375rem', padding: '0.5rem 0.875rem', fontSize: '0.8rem', cursor: copyWeekSource ? 'pointer' : 'not-allowed', minHeight: 0 }}>
                      Copy Week
                    </button>
                  </div>
                )}

                {/* 7-day grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', marginBottom: '1rem' }} className="program-day-grid">
                  {DAY_LABELS.map((label, day) => {
                    const workout = draftWorkouts.find(w => w.week_number === programWeek && w.day_of_week === day)
                    return (
                      <div key={day} style={{ background: '#0a1518', border: '1px solid #1a2e34', borderRadius: '0.5rem', padding: '0.6rem', minHeight: '84px', display: 'flex', flexDirection: 'column' }}>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '0.4rem' }}>{label}</p>
                        {workout ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                            <button onClick={() => openDaySlotEditor(programWeek, day)} style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', color: 'var(--teal-secondary)', fontSize: '0.75rem', fontWeight: 600, minHeight: 0 }}>
                              {workout.title}
                            </button>
                            <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>{workout.exercises.length} exercise{workout.exercises.length === 1 ? '' : 's'}</span>
                            <button onClick={() => clearDaySlot(programWeek, day)} style={{ background: 'none', border: 'none', color: '#f87171', fontSize: '0.65rem', cursor: 'pointer', padding: 0, textAlign: 'left', marginTop: 'auto', minHeight: 0 }}>Remove</button>
                          </div>
                        ) : (
                          <button onClick={() => openDaySlotEditor(programWeek, day)} style={{ flex: 1, background: 'none', border: '1px dashed #1a2e34', borderRadius: '0.375rem', color: 'var(--text-secondary)', fontSize: '1rem', cursor: 'pointer', minHeight: 0 }}>
                            +
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Day editor */}
                {openDaySlot && (
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--teal-primary)', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.25rem' }}>
                    <h3 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.1rem', letterSpacing: '0.03em', marginBottom: '0.875rem' }}>
                      WEEK {openDaySlot.week} · {DAY_LABELS[openDaySlot.day]}
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem', marginBottom: '0.875rem' }}>
                      <div>
                        <label style={labelBase}>Workout Title</label>
                        <input type="text" value={dayDraft.title} onChange={e => setDayDraft({ ...dayDraft, title: e.target.value })} style={{ ...inputBase, width: '100%' }} placeholder="e.g. Upper Body Strength" />
                      </div>
                      <div>
                        <label style={labelBase}>Type</label>
                        <select value={dayDraft.type} onChange={e => setDayDraft({ ...dayDraft, type: e.target.value })} style={{ ...inputBase, width: '100%', cursor: 'pointer' }}>
                          <option value="conditioning">Conditioning</option>
                          <option value="basketball">Basketball</option>
                          <option value="both">Both</option>
                        </select>
                      </div>
                    </div>
                    <label style={{ ...labelBase, marginBottom: '0.5rem' }}>Exercises</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      {dayDraft.exercises.map((ex, idx) => (
                        <div key={idx} style={{ background: '#0a1518', border: '1px solid #1a2e34', borderRadius: '0.5rem', padding: '0.875rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.65rem', color: 'var(--teal-secondary)', fontWeight: 700, letterSpacing: '0.08em' }}>EXERCISE {idx + 1}</span>
                            {dayDraft.exercises.length > 1 && (
                              <button type="button" onClick={() => setDayDraft({ ...dayDraft, exercises: dayDraft.exercises.filter((_, i) => i !== idx) })} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', minHeight: 0 }}>
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                          <input
                            type="text" value={ex.name} autoComplete="off" placeholder="Exercise name"
                            onChange={e => updateDayDraftEx(idx, 'name', e.target.value)}
                            style={{ ...inputBase, width: '100%', marginBottom: '0.5rem' }}
                          />
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                            {(['sets', 'reps', 'weight'] as const).map(f => (
                              <div key={f}>
                                <label style={{ ...labelBase, marginBottom: '0.2rem' }}>{f === 'weight' ? 'Weight kg' : f.charAt(0).toUpperCase() + f.slice(1)}</label>
                                <input type="number" value={ex[f]} onChange={e => updateDayDraftEx(idx, f, e.target.value)} style={{ ...inputBase, width: '100%' }} placeholder="—" min="0" step="0.5" />
                              </div>
                            ))}
                            {(['duration', 'distance'] as const).map(f => (
                              <div key={f}>
                                <label style={{ ...labelBase, marginBottom: '0.2rem' }}>{f === 'duration' ? 'Dur. (min)' : 'Dist. (km)'}</label>
                                <input type="number" value={ex[f]} onChange={e => updateDayDraftEx(idx, f, e.target.value)} style={{ ...inputBase, width: '100%' }} placeholder="—" min="0" step="0.1" />
                              </div>
                            ))}
                            <div style={{ gridColumn: '3' }}>
                              <label style={{ ...labelBase, marginBottom: '0.2rem' }}>Notes</label>
                              <input type="text" value={ex.notes} onChange={e => updateDayDraftEx(idx, 'notes', e.target.value)} style={{ ...inputBase, width: '100%' }} placeholder="—" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button type="button" onClick={() => setDayDraft({ ...dayDraft, exercises: [...dayDraft.exercises, blankEx()] })} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', width: '100%', marginBottom: '1rem',
                      background: 'transparent', border: '1px dashed #1a2e34', borderRadius: '0.5rem', padding: '0.6rem', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem',
                    }}>
                      <Plus size={14} /> Add Exercise
                    </button>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={saveDaySlot} style={{ flex: 1, background: 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.7rem', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}>Save Day</button>
                      <button onClick={() => setOpenDaySlot(null)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '0.5rem', padding: '0.7rem 1.25rem', fontSize: '0.875rem', cursor: 'pointer' }}>Cancel</button>
                    </div>
                  </div>
                )}

                {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', color: '#f87171', fontSize: '0.875rem' }}>{error}</div>}
                {success && <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', color: '#4ade80', fontSize: '0.875rem' }}>{success}</div>}

                <button onClick={handleSaveProgram} disabled={programSaving || !programForm.title.trim()} style={{
                  width: '100%', background: programSaving || !programForm.title.trim() ? '#0d1a1e' : 'var(--teal-primary)', color: 'white',
                  border: 'none', borderRadius: '0.5rem', padding: '0.875rem', fontWeight: 700, fontSize: '0.95rem',
                  cursor: programSaving || !programForm.title.trim() ? 'not-allowed' : 'pointer',
                }}>
                  {programSaving ? 'Saving…' : 'Save Program'}
                </button>
              </div>
            )}
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
      {assigningProgram && (
        <AssignProgramModal
          program={assigningProgram}
          members={myMembers}
          groups={myGroups}
          supabase={supabase}
          onClose={() => setAssigningProgram(null)}
        />
      )}
      <style>{`
        @media (max-width: 760px) {
          .coach-overview { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .coach-member-header { flex-direction: column !important; align-items: flex-start !important; gap: 0.75rem !important; }
          .coach-member-name-wrap { width: 100%; }
          .coach-member-name { white-space: normal !important; overflow: visible !important; text-overflow: clip !important; word-break: break-word; }
          .coach-member-actions { width: 100%; flex-wrap: wrap !important; justify-content: flex-start !important; }
          .coach-action-btn { min-height: 44px; }
        }
      `}</style>
    </div>
  )
}
