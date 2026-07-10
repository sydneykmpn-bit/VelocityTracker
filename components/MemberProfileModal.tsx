'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Mars, Venus, X, AlertTriangle, Target, Users, Timer } from 'lucide-react'
import { getLocalDateString } from '@/lib/utils'

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

  const tb = TYPE_BADGE[workout.type] ?? TYPE_BADGE.both

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

export default function MemberProfileModal({ memberId, memberName, onClose }: { memberId: string; memberName: string; onClose: () => void }) {
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [allWorkouts, setAllWorkouts] = useState<any[]>([])
  const [prs, setPRs] = useState<any[]>([])
  const [stats, setStats] = useState({ total: 0, thisMonth: 0, totalPRs: 0 })
  const [loadingModal, setLoadingModal] = useState(true)
  const [activeModalTab, setActiveModalTab] = useState<'overview' | 'workouts' | 'prs'>('overview')
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
            {allWorkouts.length > 0 && (() => {
              const counts = allWorkouts.reduce((acc, w) => { acc[w.type] = (acc[w.type] || 0) + 1; return acc }, {} as Record<string, number>)
              return (
                <div style={{ display: 'flex', gap: '0.5rem', padding: '0.625rem 1rem', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
                  {Object.entries(counts).map(([type, count]) => (
                    <span key={type} style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '999px', ...(TYPE_BADGE[type] ?? TYPE_BADGE.both) }}>
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
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '999px', textTransform: 'uppercase', ...(TYPE_BADGE[w.type] ?? TYPE_BADGE.both) }}>{w.type}</span>
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
