'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { getLocalDateString } from '@/lib/utils'

type Tab = 'members' | 'groups' | 'leaderboard'
type Role = 'member' | 'coach' | 'admin'

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

const MEDALS: Record<number, string> = { 0: '🥇', 1: '🥈', 2: '🥉' }

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
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{profile?.email}</p>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem', fontSize: '0.7rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                {profile?.gender && <span>{profile.gender === 'male' ? '♂ Male' : profile.gender === 'female' ? '♀ Female' : profile.gender}</span>}
                {profile?.age && <span>Age {profile.age}</span>}
                {profile?.weight_kg && <span>{profile.weight_kg} {profile.weight_unit || 'kg'}</span>}
                <span style={{ textTransform: 'capitalize' }}>{profile?.role}</span>
                {profile?.created_at && <span>Since {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', flexShrink: 0, minHeight: 0 }}>✕</button>
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

export default function AdminPage() {
  const router = useRouter()
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<Tab>('members')
  const [loading, setLoading] = useState(true)

  // Members tab
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [pendingUsers, setPendingUsers] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])

  // Groups tab
  const [groups, setGroups] = useState<any[]>([])
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
  const [groupMembers, setGroupMembers] = useState<Record<string, any[]>>({})
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupDesc, setNewGroupDesc] = useState('')
  const [newGroupCoach, setNewGroupCoach] = useState('')
  const [addMemberId, setAddMemberId] = useState<Record<string, string>>({})
  const [groupSaving, setGroupSaving] = useState(false)

  // Leaderboard tab
  const [allPRs, setAllPRs] = useState<any[]>([])
  const [prFilter, setPrFilter] = useState('')
  const [prGenderFilter, setPrGenderFilter] = useState('all')

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedMemberProfile, setSelectedMemberProfile] = useState<{id: string; name: string} | null>(null)

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
      .select('*, profiles(name, email)')
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
      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    await supabase.from('group_members').insert({ group_id: groupId, member_id: memberId })
    await loadGroupMembers(groupId)
    setAddMemberId(prev => ({ ...prev, [groupId]: '' }))
    await loadGroups()
  }

  const handleRemoveFromGroup = async (groupId: string, gmId: string) => {
    await supabase.from('group_members').delete().eq('id', gmId)
    await loadGroupMembers(groupId)
    await loadGroups()
  }

  const toggleGroup = async (groupId: string) => {
    if (expandedGroup === groupId) { setExpandedGroup(null); return }
    setExpandedGroup(groupId)
    if (!groupMembers[groupId]) await loadGroupMembers(groupId)
  }

  const coaches = allUsers.filter(p => p.role === 'coach' || p.role === 'admin')
  const members = allUsers.filter(p => p.role === 'member')
  const filteredPRs = allPRs.filter(r => {
    const matchesSearch = !prFilter.trim() || (r.profiles as any)?.name?.toLowerCase().includes(prFilter.toLowerCase())
    const matchesGender = prGenderFilter === 'all' || (r.profiles as any)?.gender === prGenderFilter
    return matchesSearch && matchesGender
  })
  const adminCount = allUsers.filter(p => p.role === 'admin').length
  const recentUsers = allUsers.slice(0, 4)

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>
      </div>
    )
  }

  const tabs: { value: Tab; label: string }[] = [
    { value: 'members', label: 'Members' },
    { value: 'groups', label: 'Groups / Classes' },
    { value: 'leaderboard', label: 'Leaderboard' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      <Navbar />
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: '2.5rem', letterSpacing: '0.03em', marginBottom: '1.5rem' }}>
          ADMIN PANEL
        </h1>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
          {[
            { label: 'Pending Approvals', value: pendingUsers.length, color: pendingUsers.length > 0 ? '#f59e0b' : '#4ade80', tab: 'members' as Tab },
            { label: 'Active Members', value: members.length, color: 'var(--teal-secondary)', tab: 'members' as Tab },
            { label: 'Coaches', value: coaches.length, color: '#60a5fa', tab: 'groups' as Tab },
            { label: 'Groups', value: groups.length, color: '#c084fc', tab: 'groups' as Tab },
            { label: 'Public Records', value: allPRs.length, color: '#4ade80', tab: 'leaderboard' as Tab },
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

        <div className="admin-overview" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(260px, 0.8fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.25rem' }}>
            <p style={{ color: 'var(--teal-secondary)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>Control Center</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem' }}>
              <div>
                <p style={{ fontWeight: 700 }}>{pendingUsers.length} account{pendingUsers.length === 1 ? '' : 's'} awaiting action</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.5, marginTop: '0.25rem' }}>Approve new users before they enter the training flow.</p>
              </div>
              <div>
                <p style={{ fontWeight: 700 }}>{adminCount} admin{adminCount === 1 ? '' : 's'} with elevated access</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.5, marginTop: '0.25rem' }}>Review role changes carefully from the Members tab.</p>
              </div>
            </div>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.25rem' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>Recent Users</p>
            {recentUsers.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No approved users yet.</p>
            ) : recentUsers.map(user => (
              <div key={user.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.55rem', marginBottom: '0.55rem' }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: '0.82rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', textTransform: 'capitalize' }}>{user.role}</p>
                </div>
                <span style={roleBadgeStyle(user.role)}>{user.role}</span>
              </div>
            ))}
          </div>
        </div>

        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', color: '#f87171', fontSize: '0.875rem' }}>{error}</div>}
        {success && <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', color: '#4ade80', fontSize: '0.875rem' }}>{success}</div>}

        {/* Tab Bar */}
        <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }}>
          {tabs.map(t => (
            <button key={t.value} onClick={() => setActiveTab(t.value)} style={{
              background: 'none', border: 'none',
              borderBottom: activeTab === t.value ? '2px solid var(--teal-primary)' : '2px solid transparent',
              color: activeTab === t.value ? 'var(--teal-secondary)' : 'var(--text-secondary)',
              padding: '0.75rem 1.25rem', cursor: 'pointer', fontSize: '0.875rem',
              fontWeight: activeTab === t.value ? 700 : 400, marginBottom: '-1px', transition: 'all 0.15s',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── MEMBERS TAB ── */}
        {activeTab === 'members' && (
          <div key="tab-members">
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
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</p>
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
                          style={{ background: 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.4rem 0.875rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm(`Reject and remove ${u.name}?`)) return
                            await supabase.from('profiles').delete().eq('id', u.id)
                            setPendingUsers(prev => prev.filter(p => p.id !== u.id))
                          }}
                          style={{ background: 'none', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '0.5rem', padding: '0.4rem 0.875rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', color: '#ef4444' }}
                        >
                          ✕ Reject
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
                Active Members ({allUsers.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {allUsers.map(u => (
                  <div key={u.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                    <button
                      onClick={() => setSelectedMemberProfile({ id: u.id, name: u.name })}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}
                    >
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--teal-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0 }}>
                        {u.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>{u.name}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</p>
                      </div>
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                      <select
                        value={u.role}
                        onChange={async e => {
                          const newRole = e.target.value
                          await supabase.from('profiles').update({ role: newRole }).eq('id', u.id)
                          setAllUsers(prev => prev.map(p => p.id === u.id ? { ...p, role: newRole } : p))
                        }}
                        style={{ ...inputBase, padding: '0.25rem 0.5rem', fontSize: '0.75rem', cursor: 'pointer',
                          color: u.role === 'admin' ? '#c084fc' : u.role === 'coach' ? '#34bac2' : 'var(--text-secondary)' }}
                      >
                        <option value="member">member</option>
                        <option value="coach">coach</option>
                        <option value="admin">admin</option>
                      </select>
                      <button
                        onClick={async () => {
                          if (!confirm(`Remove ${u.name} from Velocity Tracker? This cannot be undone.`)) return
                          await supabase.from('profiles').delete().eq('id', u.id)
                          setAllUsers(prev => prev.filter(p => p.id !== u.id))
                        }}
                        style={{ width: '28px', height: '28px', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-raised)', border: '1px solid var(--border)', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem', flexShrink: 0 }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── GROUPS TAB ── */}
        {activeTab === 'groups' && (
          <div key="tab-groups" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', alignItems: 'start' }}>
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
                    const gms = groupMembers[g.id] ?? []
                    return (
                      <div key={g.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', overflow: 'hidden' }}>
                        <button
                          onClick={() => toggleGroup(g.id)}
                          style={{ width: '100%', background: 'none', border: 'none', padding: '1rem 1.25rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#F2F2F2' }}
                        >
                          <div style={{ textAlign: 'left' }}>
                            <h3 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.15rem' }}>{g.name}</h3>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              Coach: {g.coach?.name ?? 'Unassigned'} · {(g.group_members as any[])?.[0]?.count ?? 0} members
                            </p>
                          </div>
                          {isExpanded ? <ChevronUp size={16} style={{ color: 'var(--text-secondary)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-secondary)' }} />}
                        </button>

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
                                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>{gm.profiles?.email}</span>
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
          </div>
        )}

        {/* ── LEADERBOARD TAB ── */}
        {activeTab === 'leaderboard' && (
          <div key="tab-leaderboard">
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
              <input type="text" value={prFilter} onChange={e => setPrFilter(e.target.value)} placeholder="Search by member name…" style={{ ...inputBase, maxWidth: '260px' }} />
              {[{ key: 'all', label: 'All' }, { key: 'male', label: '♂ Men' }, { key: 'female', label: '♀ Women' }].map(g => (
                <button key={g.key} onClick={() => setPrGenderFilter(g.key)} style={{ padding: '0.4rem 0.875rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', background: prGenderFilter === g.key ? 'var(--surface)' : 'transparent', color: prGenderFilter === g.key ? 'var(--text-primary)' : 'var(--text-secondary)', border: `1px solid ${prGenderFilter === g.key ? 'var(--teal-primary)' : 'var(--border)'}`, transition: 'all 0.15s', minHeight: 36 }}>
                  {g.label}
                </button>
              ))}
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '1rem', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Rank', 'Name', 'Exercise', 'Value', 'Unit', 'Date'].map(h => (
                      <th key={h} style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredPRs.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No records yet.</td></tr>
                  ) : (
                    filteredPRs.map((r, idx) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.875rem 1rem' }}>
                          {MEDALS[idx] ? <span style={{ fontSize: '1.1rem' }}>{MEDALS[idx]}</span> : <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>#{idx + 1}</span>}
                        </td>
                        <td style={{ padding: '0.875rem 1rem', fontWeight: 600, fontSize: '0.875rem' }}>{r.profiles?.name ?? '—'}</td>
                        <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem' }}>{r.exercise_name ?? r.exercise}</td>
                        <td style={{ padding: '0.875rem 1rem', fontFamily: 'var(--font-bebas)', fontSize: '1.1rem', color: 'var(--teal-secondary)' }}>{r.value}</td>
                        <td style={{ padding: '0.875rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{r.unit}</td>
                        <td style={{ padding: '0.875rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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
      <style>{`
        @media (max-width: 760px) {
          .admin-overview { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
