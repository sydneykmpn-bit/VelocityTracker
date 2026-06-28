'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'
import { ChevronDown, ChevronUp, Trash2, Pencil, Plus, Calendar } from 'lucide-react'
import { getLocalDateString } from '@/lib/utils'

type Tab = 'members' | 'groups' | 'assign' | 'calendar' | 'notes'

const inputBase: React.CSSProperties = {
  background: '#0d1a1e', border: '1px solid #1a2e34', borderRadius: '0.5rem',
  padding: '0.6rem 0.875rem', color: '#F2F2F2', fontSize: '1rem', outline: 'none',
}
const labelBase: React.CSSProperties = {
  display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)',
  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.375rem',
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
  'Free Throw %','3-Point %','Vertical Jump','Sprint 20m','Sprint 40m','Agility T-Test',
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
            {workout.duration && <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>⏱ {workout.duration}min</span>}
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
  const [workoutLimit, setWorkoutLimit] = useState(10)
  const [profile, setProfile] = useState<any>(null)
  const [recentWorkouts, setRecentWorkouts] = useState<any[]>([])
  const [prs, setPRs] = useState<any[]>([])
  const [stats, setStats] = useState({ total: 0, thisMonth: 0, totalPRs: 0 })
  const [loadingModal, setLoadingModal] = useState(true)
  const [activeModalTab, setActiveModalTab] = useState<'overview'|'workouts'|'prs'>('overview')

  useEffect(() => {
    async function load() {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', memberId).single()
      setProfile(p)
      const { data: w } = await supabase.from('workouts').select('*, exercises(count)').eq('user_id', memberId).order('date', { ascending: false }).limit(workoutLimit)
      setRecentWorkouts(w || [])
      const { data: pr } = await supabase.from('personal_records').select('*').eq('user_id', memberId).order('recorded_at', { ascending: false }).limit(10)
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
  }, [memberId, workoutLimit])

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
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{profile?.email}</p>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem', fontSize: '0.7rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                {profile?.gender && <span>{profile.gender === 'male' ? '♂ Male' : profile.gender === 'female' ? '♀ Female' : profile.gender}</span>}
                {profile?.age && <span>Age {profile.age}</span>}
                {profile?.weight_kg && <span>{profile.weight_kg} {profile.weight_unit || 'kg'}</span>}
                {profile?.created_at && <span>Since {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', flexShrink: 0, minHeight: 0 }}>✕</button>
        </div>
        {/* Stats */}
        {!loadingModal && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: 'var(--border)', borderBottom: '1px solid var(--border)' }}>
            {[{ label: 'Total Workouts', value: stats.total }, { label: 'This Month', value: stats.thisMonth }, { label: 'Personal Records', value: stats.totalPRs }].map(s => (
              <div key={s.label} style={{ padding: '1rem', textAlign: 'center', background: 'var(--surface)' }}>
                <p style={{ fontFamily: 'var(--font-bebas)', fontSize: '2rem', color: 'var(--teal-secondary)', lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
              </div>
            ))}
          </div>
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
                  <div>
                    <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Recent Activity</p>
                    {recentWorkouts.slice(0, 3).map(w => (
                      <div key={w.id} style={{ background: 'var(--surface-raised)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '0.375rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{w.title}</p>
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>{new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}{w.duration ? ` · ${w.duration}min` : ''}</p>
                        </div>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '999px', textTransform: 'uppercase', ...(TYPE_BADGE_M[w.type] ?? TYPE_BADGE_M.both) }}>{w.type}</span>
                      </div>
                    ))}
                    {recentWorkouts.length === 0 && <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No workouts yet.</p>}
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
                  {recentWorkouts.length === 0 ? (
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No workouts logged yet.</p>
                  ) : recentWorkouts.map(w => (
                    <WorkoutHistoryCard key={w.id} workout={w} supabase={supabase} />
                  ))}
                  {recentWorkouts.length === workoutLimit && (
                    <button
                      onClick={() => setWorkoutLimit(prev => prev + 10)}
                      style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.625rem', color: 'var(--text-secondary)', fontSize: '0.875rem', cursor: 'pointer', width: '100%', marginTop: '0.25rem' }}
                    >
                      Load More Workouts
                    </button>
                  )}
                </div>
              )}
              {activeModalTab === 'prs' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  {prs.length === 0 ? <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No PRs recorded yet.</p>
                  : prs.map(pr => (
                    <div key={pr.id} style={{ background: 'var(--surface-raised)', borderRadius: '0.5rem', padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{pr.exercise_name}</p>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>{new Date(pr.recorded_at || pr.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}{pr.is_public ? ' · 🌐 Public' : ' · 🔒 Private'}</p>
                      </div>
                      <p style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.25rem', color: 'var(--teal-secondary)' }}>{pr.value} {pr.unit}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CoachPage() {
  const router = useRouter()
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('members')
  const [tabLoading, setTabLoading] = useState(false)
  const [loading, setLoading] = useState(true)

  const switchTab = (tab: Tab) => {
    setTabLoading(true)
    setActiveTab(tab)
    setTimeout(() => setTabLoading(false), 50)
  }
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // My Members
  const [myMembers, setMyMembers] = useState<any[]>([])
  const [expandedMember, setExpandedMember] = useState<string | null>(null)
  const [memberWorkouts, setMemberWorkouts] = useState<Record<string, any[]>>({})

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

  // Edit assigned plan
  const [editingPlan, setEditingPlan] = useState<string | null>(null)
  const [editPlanForm, setEditPlanForm] = useState<any>({})
  const [editPlanExercises, setEditPlanExercises] = useState<PlanExercise[]>([])
  const [activePlanEditSuggestion, setActivePlanEditSuggestion] = useState<number | null>(null)
  const [planStatusFilter, setPlanStatusFilter] = useState<'all'|'pending'|'completed'|'skipped'|'rescheduled'>('all')
  const [selectedMemberProfile, setSelectedMemberProfile] = useState<{id: string; name: string} | null>(null)

  // Workout Calendar
  const [calendarDate, setCalendarDate] = useState(getLocalDateString())
  const [calendarWorkouts, setCalendarWorkouts] = useState<any[]>([])
  const [expandedCalWorkout, setExpandedCalWorkout] = useState<string | null>(null)
  const [memberFilter, setMemberFilter] = useState('all')
  const [calLoading, setCalLoading] = useState(false)

  // Notes
  const [notes, setNotes] = useState<any[]>([])
  const [notesMemberId, setNotesMemberId] = useState('')
  const [noteText, setNoteText] = useState('')
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [noteSaving, setNoteSaving] = useState(false)

  const loadMyMembers = async (coachId: string) => {
    const { data: groupData } = await supabase.from('groups').select('id').eq('coach_id', coachId)
    if (!groupData || groupData.length === 0) { setMyMembers([]); return }
    const groupIds = groupData.map((g: any) => g.id)
    const { data: gmData } = await supabase.from('group_members').select('member_id, profiles(id, name, email)').in('group_id', groupIds)
    const seen = new Set<string>()
    const unique: any[] = []
    for (const gm of gmData ?? []) {
      if (!seen.has(gm.member_id)) { seen.add(gm.member_id); unique.push(gm.profiles) }
    }
    const withCounts = await Promise.all(unique.map(async m => {
      const { count } = await supabase.from('workouts').select('*', { count: 'exact', head: true }).eq('user_id', m.id)
      const { data: last } = await supabase.from('workouts').select('date, created_at').eq('user_id', m.id).order('created_at', { ascending: false }).limit(1)
      return { ...m, workoutCount: count ?? 0, lastWorkout: last?.[0]?.date ?? last?.[0]?.created_at ?? null }
    }))
    setMyMembers(withCounts)
  }

  const loadMyGroups = async (coachId: string) => {
    const { data } = await supabase.from('groups').select('*, group_members(count)').eq('coach_id', coachId).order('created_at', { ascending: false })
    setMyGroups(data ?? [])
  }

  const loadGroupMembers = async (groupId: string) => {
    const { data } = await supabase.from('group_members').select('*, profiles(name, email)').eq('group_id', groupId)
    setGroupMembers(prev => ({ ...prev, [groupId]: data ?? [] }))
  }

  const loadNotes = async (coachId: string) => {
    const { data } = await supabase.from('coach_notes').select('*, member:profiles!coach_notes_member_id_fkey(name)').eq('coach_id', coachId).order('created_at', { ascending: false })
    setNotes(data ?? [])
  }

  const loadAssignedPlans = async (coachId: string) => {
    const { data } = await supabase
      .from('workout_plans')
      .select('*, profiles!workout_plans_member_id_fkey(name), workout_plan_exercises(count)')
      .eq('coach_id', coachId)
      .order('scheduled_date', { ascending: false })
    setAssignedPlans(data ?? [])
  }

  const loadCalendarWorkouts = async () => {
    setCalLoading(true)
    let query = supabase
      .from('workouts')
      .select('*, profiles(name), exercises(*)')
      .gte('date', `${calendarDate}T00:00:00`)
      .lte('date', `${calendarDate}T23:59:59`)
      .order('date', { ascending: false })
    if (memberFilter !== 'all') query = query.eq('user_id', memberFilter)
    const { data } = await query
    setCalendarWorkouts(data ?? [])
    setCalLoading(false)
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (prof?.role !== 'coach' && prof?.role !== 'admin') { router.push('/dashboard'); return }
      setUserId(user.id)
      const { data: membersData } = await supabase.from('profiles').select('id, name, email').eq('role', 'member')
      setAllMembers(membersData ?? [])
      const { data: tmpl } = await supabase
        .from('workout_templates')
        .select('*, workout_template_exercises(*)')
        .or(`created_by.eq.${user.id},is_shared.eq.true`)
        .order('created_at', { ascending: false })
      setTemplates(tmpl ?? [])
      await Promise.all([loadMyMembers(user.id), loadMyGroups(user.id), loadNotes(user.id), loadAssignedPlans(user.id)])
      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!loading) loadCalendarWorkouts()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarDate, memberFilter])

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
    await supabase.from('group_members').insert({ group_id: groupId, member_id: memberId })
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
    setSuccess('Plan assigned!')
    setAssignForm({ member_id: '', title: '', description: '', type: 'conditioning', scheduled_date: getLocalDateString() })
    setPlanExercises([blankEx()])
    await loadAssignedPlans(userId)
    setPlanSaving(false)
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
    setNoteSaving(true); setError(''); setSuccess('')
    const { error: err } = await supabase.from('coach_notes').insert({ coach_id: userId, member_id: notesMemberId || null, note: noteText.trim() })
    if (err) { setError(err.message) } else {
      setSuccess('Note saved!'); setNoteText(''); setNotesMemberId('')
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

  const PLAN_STATUS: Record<string, { label: string; color: string }> = {
    pending: { label: '🟡 Pending', color: '#f59e0b' },
    completed: { label: '✅ Completed', color: '#22c55e' },
    skipped: { label: '⏭️ Skipped', color: '#8A8A8A' },
    rescheduled: { label: '📅 Rescheduled', color: '#60a5fa' },
  }

  const tabs: { value: Tab; label: string }[] = [
    { value: 'members', label: 'My Members' },
    { value: 'groups', label: 'Groups' },
    { value: 'assign', label: 'Assign Plan' },
    { value: 'calendar', label: 'Workout Calendar' },
    { value: 'notes', label: 'Notes' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      <Navbar />
      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1rem' }}>
        <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: '2.5rem', letterSpacing: '0.03em', marginBottom: '1.5rem' }}>
          COACH DASHBOARD
        </h1>

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

        {tabLoading ? null : (<>

        {/* ── MY MEMBERS TAB ── */}
        {activeTab === 'members' && (
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
              {myMembers.length} member{myMembers.length !== 1 ? 's' : ''} across your groups
            </p>
            {myMembers.length === 0 ? (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '3rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No members in your groups yet. Add members in the Groups tab.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {myMembers.map(m => {
                  const isExpanded = expandedMember === m.id
                  const wks = memberWorkouts[m.id] ?? []
                  return (
                    <div key={m.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', overflow: 'hidden' }}>
                      <button onClick={() => toggleMember(m.id)} style={{ width: '100%', background: 'none', border: 'none', padding: '1.25rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#F2F2F2' }}>
                        <div style={{ textAlign: 'left' }}>
                          <h3
                            onClick={e => { e.stopPropagation(); setSelectedMemberProfile({ id: m.id, name: m.name }) }}
                            style={{ fontWeight: 600, marginBottom: '0.2rem', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(52,186,194,0.4)', textUnderlineOffset: '2px' }}
                          >{m.name}</h3>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{m.email}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <button
                            onClick={e => { e.stopPropagation(); setMemberFilter(m.id); switchTab('calendar') }}
                            style={{ background: 'rgba(8,119,160,0.15)', border: '1px solid rgba(8,119,160,0.35)', borderRadius: '0.375rem', padding: '0.3rem 0.625rem', color: 'var(--teal-secondary)', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', minHeight: 0 }}
                          >
                            <Calendar size={12} /> View Day
                          </button>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', color: 'var(--teal-secondary)', lineHeight: 1 }}>{m.workoutCount}</div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>workouts</div>
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
                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '999px', textTransform: 'uppercase', ...TYPE_BADGE[w.type] ?? TYPE_BADGE.both }}>{w.type}</span>
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
            )}
          </div>
        )}

        {/* ── GROUPS TAB ── */}
        {activeTab === 'groups' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', letterSpacing: '0.03em', marginBottom: '1rem' }}>MY GROUPS ({myGroups.length})</h2>
              {myGroups.length === 0 ? <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No groups yet. Create one →</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {myGroups.map(g => {
                    const isExpanded = expandedGroup === g.id
                    const gms = groupMembers[g.id] ?? []
                    return (
                      <div key={g.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', overflow: 'hidden' }}>
                        <button onClick={() => toggleGroup(g.id)} style={{ width: '100%', background: 'none', border: 'none', padding: '1rem 1.25rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#F2F2F2' }}>
                          <div style={{ textAlign: 'left' }}>
                            <h3 style={{ fontWeight: 600, marginBottom: '0.15rem' }}>{g.name}</h3>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{(g.group_members as any[])?.[0]?.count ?? 0} members</p>
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
          <div>
            {/* Load from Template */}
            {templates.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Load from Saved Template</p>
                <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.375rem', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                  {templates.map(t => (
                    <button key={t.id} type="button" onClick={() => {
                      setSelectedTemplate(t)
                      setAssignForm(p => ({ ...p, title: t.title, description: t.description || '', type: t.type }))
                      setPlanExercises(
                        t.workout_template_exercises.sort((a: any, b: any) => a.order_index - b.order_index).map((ex: any) => ({
                          name: ex.name, sets: ex.sets?.toString() || '', reps: ex.reps?.toString() || '',
                          weight: ex.weight?.toString() || '', duration: ex.duration?.toString() || '',
                          distance: ex.distance?.toString() || '', notes: ex.notes || '',
                        }))
                      )
                    }} style={{
                      flexShrink: 0, padding: '0.625rem 0.875rem', borderRadius: '0.5rem', textAlign: 'left', cursor: 'pointer',
                      background: selectedTemplate?.id === t.id ? 'rgba(8,119,160,0.2)' : 'var(--surface-raised)',
                      border: `1px solid ${selectedTemplate?.id === t.id ? 'var(--teal-primary)' : 'var(--border)'}`,
                      color: 'var(--text-primary)', minWidth: '140px', minHeight: 0,
                    }}>
                      <p style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{t.type} · {t.workout_template_exercises?.length || 0} exercises</p>
                    </button>
                  ))}
                </div>
                {selectedTemplate && (
                  <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--teal-secondary)' }}>✓ Template loaded — you can still customize before assigning</p>
                )}
              </div>
            )}

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
                      {(['conditioning', 'basketball', 'both'] as const).map(t => (
                        <button key={t} type="button" onClick={() => setAssignForm(p => ({ ...p, type: t }))} style={{
                          background: assignForm.type === t ? 'rgba(8,119,160,0.2)' : '#0d1a1e',
                          border: `1px solid ${assignForm.type === t ? 'var(--teal-primary)' : '#1a2e34'}`,
                          borderRadius: '0.375rem', padding: '0.5rem 0.75rem',
                          color: assignForm.type === t ? 'var(--teal-secondary)' : 'var(--text-secondary)',
                          fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize', minHeight: 0,
                        }}>{t === 'conditioning' ? '🏋️' : t === 'basketball' ? '🏀' : '💪'}</button>
                      ))}
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
                    <div style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '0.5rem', padding: '0.625rem 0.875rem', marginBottom: '0.75rem', color: '#4ade80', fontSize: '0.8rem' }}>
                      ✅ Template saved!{shareTemplate ? " It's now visible in Shared by Coaches." : ''}
                    </div>
                  )}
                  {!showSaveTemplate ? (
                    <button type="button" onClick={() => setShowSaveTemplate(true)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '0.375rem', padding: '0.4rem 0.875rem', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer', minHeight: 0, width: '100%' }}>
                      💾 Save as Reusable Template
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

            {/* Assigned Plans List */}
            <div style={{ marginBottom: '0.75rem' }}>
              <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', letterSpacing: '0.03em', marginBottom: '0.75rem' }}>ASSIGNED PLANS ({assignedPlans.length})</h2>
              <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.375rem', scrollbarWidth: 'none' }}>
                {([
                  { key: 'all', label: 'All', icon: '📋' },
                  { key: 'pending', label: 'Pending', icon: '🟡' },
                  { key: 'completed', label: 'Completed', icon: '✅' },
                  { key: 'skipped', label: 'Skipped', icon: '⏭️' },
                  { key: 'rescheduled', label: 'Rescheduled', icon: '📅' },
                ] as const).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setPlanStatusFilter(tab.key)}
                    style={{
                      padding: '0.35rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s', flexShrink: 0,
                      background: planStatusFilter === tab.key ? 'var(--teal-primary)' : 'var(--surface-raised)',
                      color: planStatusFilter === tab.key ? '#fff' : 'var(--text-secondary)',
                      border: `1px solid ${planStatusFilter === tab.key ? 'var(--teal-primary)' : 'var(--border)'}`,
                      minHeight: 0,
                    }}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>
            </div>
            {(() => {
              const filtered = planStatusFilter === 'all' ? assignedPlans : assignedPlans.filter(p => p.status === planStatusFilter)
              if (filtered.length === 0) return <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No {planStatusFilter !== 'all' ? planStatusFilter : ''} plans yet.</p>
              const grouped = filtered.reduce((acc: any, plan: any) => {
                const date = plan.scheduled_date
                if (!acc[date]) acc[date] = []
                acc[date].push(plan)
                return acc
              }, {})
              return (
                <div>
                  {Object.entries(grouped)
                    .sort(([a], [b]) => (b as string).localeCompare(a as string))
                    .map(([date, plans]: [string, any]) => (
                      <div key={date} style={{ marginBottom: '1.5rem' }}>
                        <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '0.625rem', paddingBottom: '0.375rem', borderBottom: '1px solid var(--border)' }}>
                          {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {(plans as any[]).map((p: any) => {
                            const tb = TYPE_BADGE[p.type] ?? TYPE_BADGE.both
                            const st = PLAN_STATUS[p.status ?? 'pending'] ?? PLAN_STATUS.pending
                            const isEditingThis = editingPlan === p.id
                            return (
                              <div key={p.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', overflow: 'hidden' }}>
                                <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                                      <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{p.title}</span>
                                      <span style={{ ...tb, fontSize: '0.6rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '999px', textTransform: 'uppercase' }}>{p.type}</span>
                                      <span style={{ fontSize: '0.75rem', color: st.color }}>{st.label}</span>
                                    </div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                      {p.profiles?.name} · {(p.workout_plan_exercises as any[])?.[0]?.count ?? 0} exercises
                                    </p>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', padding: '0 1rem 0.875rem' }}>
                                  <button onClick={async () => {
                                    if (isEditingThis) { setEditingPlan(null); return }
                                    const { data: exs } = await supabase.from('workout_plan_exercises').select('*').eq('plan_id', p.id).order('order_index')
                                    setEditPlanForm({ title: p.title, description: p.description || '', type: p.type, scheduled_date: p.scheduled_date, member_id: p.member_id })
                                    setEditPlanExercises((exs || []).map(ex => ({
                                      name: ex.name, sets: ex.sets?.toString() || '', reps: ex.reps?.toString() || '',
                                      weight: ex.weight?.toString() || '', duration: ex.duration?.toString() || '',
                                      distance: ex.distance?.toString() || '', notes: ex.notes || '',
                                    })))
                                    setEditingPlan(p.id)
                                  }} style={{ flex: 1, background: isEditingThis ? 'rgba(8,119,160,0.15)' : 'none', border: `1px solid ${isEditingThis ? 'var(--teal-primary)' : 'var(--border)'}`, borderRadius: '0.375rem', padding: '0.3rem 0.625rem', color: isEditingThis ? 'var(--teal-secondary)' : 'var(--text-secondary)', fontSize: '0.75rem', cursor: 'pointer', minHeight: 0 }}>
                                    ✏️ {isEditingThis ? 'Editing…' : 'Edit'}
                                  </button>
                                  <button onClick={() => handleDeletePlan(p.id)} style={{ background: 'none', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '0.375rem', padding: '0.3rem 0.625rem', color: '#f87171', fontSize: '0.75rem', cursor: 'pointer', minHeight: 0 }}>
                                    🗑️ Remove
                                  </button>
                                </div>

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
                              {(['conditioning', 'basketball', 'both'] as const).map(t => (
                                <button key={t} type="button" onClick={() => setEditPlanForm((prev: any) => ({ ...prev, type: t }))} style={{
                                  flex: 1, background: editPlanForm.type === t ? 'rgba(8,119,160,0.2)' : '#0d1a1e',
                                  border: `1px solid ${editPlanForm.type === t ? 'var(--teal-primary)' : '#1a2e34'}`,
                                  borderRadius: '0.375rem', padding: '0.4rem', color: editPlanForm.type === t ? 'var(--teal-secondary)' : 'var(--text-secondary)',
                                  fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize', minHeight: 0,
                                }}>{t === 'conditioning' ? '🏋️' : t === 'basketball' ? '🏀' : '💪'}</button>
                              ))}
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
                      </div>
                    ))}
                  </div>
                )
              })()}
          </div>
        )}

        {/* ── WORKOUT CALENDAR TAB ── */}
        {activeTab === 'calendar' && (
          <div>
            <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', letterSpacing: '0.03em', marginBottom: '1rem' }}>WORKOUT CALENDAR</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={labelBase}>Date</label>
                <input type="date" value={calendarDate} onChange={e => setCalendarDate(e.target.value)} style={{ ...inputBase, width: '100%' }} />
              </div>
              <div>
                <label style={labelBase}>Member</label>
                <select value={memberFilter} onChange={e => setMemberFilter(e.target.value)} style={{ ...inputBase, width: '100%', cursor: 'pointer' }}>
                  <option value="all">All Members</option>
                  {allMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>

            {calLoading ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading…</p>
            ) : calendarWorkouts.length === 0 ? (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '3rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No workouts logged on this date.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {calendarWorkouts.map(w => {
                  const isExpanded = expandedCalWorkout === w.id
                  const tb = TYPE_BADGE[w.type] ?? TYPE_BADGE.both
                  return (
                    <div key={w.id} style={{ background: 'var(--surface)', border: `1px solid ${isExpanded ? 'var(--teal-primary)' : 'var(--border)'}`, borderRadius: '0.75rem', overflow: 'hidden', borderLeft: isExpanded ? '3px solid var(--teal-primary)' : '1px solid var(--border)' }}>
                      <button onClick={() => setExpandedCalWorkout(isExpanded ? null : w.id)} style={{ width: '100%', background: 'none', border: 'none', padding: '1rem 1.25rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#F2F2F2' }}>
                        <div style={{ textAlign: 'left' }}>
                          <p style={{ fontSize: '0.7rem', color: 'var(--teal-secondary)', fontWeight: 700, marginBottom: '0.2rem' }}>{w.profiles?.name}</p>
                          <h3 style={{ fontWeight: 600, fontSize: '0.95rem' }}>{w.title}</h3>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                            {w.duration ? `${w.duration} min · ` : ''}{(w.exercises as any[])?.length ?? 0} exercises
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.25rem 0.5rem', borderRadius: '999px', textTransform: 'uppercase', ...tb }}>{w.type}</span>
                          {isExpanded ? <ChevronUp size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />}
                        </div>
                      </button>
                      {isExpanded && (
                        <div style={{ borderTop: '1px solid var(--border)', padding: '1rem 1.25rem' }}>
                          {(w.exercises as any[])?.length === 0 ? (
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No exercises logged.</p>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              {(w.exercises as any[]).map((ex: any) => (
                                <div key={ex.id} style={{ padding: '0.625rem 0.75rem', background: '#0a1518', borderRadius: '0.375rem' }}>
                                  <p style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>{ex.name}</p>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem' }}>
                                    {ex.sets && ex.reps && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{ex.sets}×{ex.reps}</span>}
                                    {ex.weight && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{ex.weight}kg</span>}
                                    {ex.duration && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{ex.duration}min</span>}
                                    {ex.distance && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{ex.distance}km</span>}
                                    {ex.notes && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>{ex.notes}</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {w.notes && <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>"{w.notes}"</p>}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── NOTES TAB ── */}
        {activeTab === 'notes' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', letterSpacing: '0.03em', marginBottom: '1rem' }}>NOTES ({notes.length})</h2>
              {notes.length === 0 ? <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No notes yet.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {notes.map(n => (
                    <div key={n.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--teal-secondary)' }}>{n.member?.name ?? 'General note'}</p>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => { setEditingNote(n.id); setEditText(n.note) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', minHeight: 0 }}>
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDeleteNote(n.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', display: 'flex', minHeight: 0 }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      {editingNote === n.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <textarea value={editText} onChange={e => setEditText(e.target.value)} style={{ ...inputBase, width: '100%', minHeight: '60px', resize: 'vertical' }} />
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => handleUpdateNote(n.id)} style={{ background: 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.375rem', padding: '0.4rem 0.875rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', minHeight: 0 }}>Save</button>
                            <button onClick={() => { setEditingNote(null); setEditText('') }} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '0.375rem', padding: '0.4rem 0.875rem', fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer', minHeight: 0 }}>Cancel</button>
                          </div>
                        </div>
                      ) : <p style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>{n.note}</p>}
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                        {new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.25rem' }}>
              <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.25rem', letterSpacing: '0.03em', marginBottom: '1rem' }}>ADD NOTE</h2>
              <form onSubmit={handleAddNote} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                <div>
                  <label style={labelBase}>Member (optional)</label>
                  <select value={notesMemberId} onChange={e => setNotesMemberId(e.target.value)} style={{ ...inputBase, width: '100%', cursor: 'pointer' }}>
                    <option value="">General</option>
                    {allMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelBase}>Note *</label>
                  <textarea value={noteText} onChange={e => setNoteText(e.target.value)} required style={{ ...inputBase, width: '100%', minHeight: '100px', resize: 'vertical' }} placeholder="Write a note…" />
                </div>
                <button type="submit" disabled={noteSaving} style={{ background: noteSaving ? '#0d1a1e' : 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.7rem', fontWeight: 700, fontSize: '0.875rem', cursor: noteSaving ? 'not-allowed' : 'pointer' }}>
                  {noteSaving ? 'Saving…' : 'Save Note'}
                </button>
              </form>
            </div>
          </div>
        )}

        </>)} {/* end tabLoading guard */}
      </main>

      {selectedMemberProfile && (
        <MemberProfileModal
          memberId={selectedMemberProfile.id}
          memberName={selectedMemberProfile.name}
          onClose={() => setSelectedMemberProfile(null)}
        />
      )}
    </div>
  )
}
