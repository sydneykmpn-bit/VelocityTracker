'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'
import { ChevronDown, ChevronUp, Trash2, Pencil } from 'lucide-react'

type Tab = 'members' | 'groups' | 'assign' | 'notes'

const inputBase: React.CSSProperties = {
  background: '#0d1a1e', border: '1px solid #1a2e34', borderRadius: '0.5rem',
  padding: '0.6rem 0.875rem', color: '#F2F2F2', fontSize: '0.875rem', outline: 'none',
}
const labelBase: React.CSSProperties = {
  display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)',
  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.375rem',
}

export default function CoachPage() {
  const router = useRouter()
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('members')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // My Members tab
  const [myMembers, setMyMembers] = useState<any[]>([])
  const [expandedMember, setExpandedMember] = useState<string | null>(null)
  const [memberWorkouts, setMemberWorkouts] = useState<Record<string, any[]>>({})

  // Groups tab
  const [myGroups, setMyGroups] = useState<any[]>([])
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
  const [groupMembers, setGroupMembers] = useState<Record<string, any[]>>({})
  const [allMembers, setAllMembers] = useState<any[]>([])
  const [addMemberId, setAddMemberId] = useState<Record<string, string>>({})
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupDesc, setNewGroupDesc] = useState('')
  const [groupSaving, setGroupSaving] = useState(false)

  // Assign Workout tab
  const [assignMemberId, setAssignMemberId] = useState('')
  const [planTitle, setPlanTitle] = useState('')
  const [planDesc, setPlanDesc] = useState('')
  const [planType, setPlanType] = useState('conditioning')
  const [planSaving, setPlanSaving] = useState(false)

  // Notes tab
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
    const { data: gmData } = await supabase
      .from('group_members')
      .select('member_id, profiles(id, name, email)')
      .in('group_id', groupIds)
    const seen = new Set<string>()
    const unique: any[] = []
    for (const gm of gmData ?? []) {
      if (!seen.has(gm.member_id)) {
        seen.add(gm.member_id)
        unique.push(gm.profiles)
      }
    }
    // Fetch workout counts
    const withCounts = await Promise.all(unique.map(async m => {
      const { count } = await supabase.from('workouts').select('*', { count: 'exact', head: true }).eq('user_id', m.id)
      const { data: last } = await supabase.from('workouts').select('date, created_at').eq('user_id', m.id).order('created_at', { ascending: false }).limit(1)
      return { ...m, workoutCount: count ?? 0, lastWorkout: last?.[0]?.date ?? last?.[0]?.created_at ?? null }
    }))
    setMyMembers(withCounts)
  }

  const loadMyGroups = async (coachId: string) => {
    const { data } = await supabase
      .from('groups')
      .select('*, group_members(count)')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false })
    setMyGroups(data ?? [])
  }

  const loadGroupMembers = async (groupId: string) => {
    const { data } = await supabase.from('group_members').select('*, profiles(name, email)').eq('group_id', groupId)
    setGroupMembers(prev => ({ ...prev, [groupId]: data ?? [] }))
  }

  const loadNotes = async (coachId: string) => {
    const { data } = await supabase
      .from('coach_notes')
      .select('*, member:profiles!coach_notes_member_id_fkey(name)')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false })
    setNotes(data ?? [])
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

      await Promise.all([
        loadMyMembers(user.id),
        loadMyGroups(user.id),
        loadNotes(user.id),
      ])
      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleMember = async (memberId: string) => {
    if (expandedMember === memberId) { setExpandedMember(null); return }
    setExpandedMember(memberId)
    if (!memberWorkouts[memberId]) {
      const { data } = await supabase.from('workouts').select('id, title, type, date, created_at').eq('user_id', memberId).order('created_at', { ascending: false }).limit(10)
      setMemberWorkouts(prev => ({ ...prev, [memberId]: data ?? [] }))
    }
  }

  const toggleGroup = async (groupId: string) => {
    if (expandedGroup === groupId) { setExpandedGroup(null); return }
    setExpandedGroup(groupId)
    if (!groupMembers[groupId]) await loadGroupMembers(groupId)
  }

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGroupName.trim() || !userId) return
    setGroupSaving(true)
    setError('')
    const { error: err } = await supabase.from('groups').insert({
      name: newGroupName.trim(), description: newGroupDesc.trim() || null, coach_id: userId,
    })
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

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!planTitle.trim() || !userId) return
    setPlanSaving(true); setError(''); setSuccess('')
    const { error: err } = await supabase.from('workout_plans').insert({
      coach_id: userId, member_id: assignMemberId || null,
      title: planTitle.trim(), description: planDesc.trim() || null, type: planType,
    })
    if (err) { setError(err.message) } else {
      setSuccess('Plan assigned!'); setPlanTitle(''); setPlanDesc(''); setAssignMemberId('')
    }
    setPlanSaving(false)
  }

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!noteText.trim() || !userId) return
    setNoteSaving(true); setError(''); setSuccess('')
    const { error: err } = await supabase.from('coach_notes').insert({
      coach_id: userId, member_id: notesMemberId || null, note: noteText.trim(),
    })
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

  const tabs: { value: Tab; label: string }[] = [
    { value: 'members', label: 'My Members' },
    { value: 'groups', label: 'Groups / Classes' },
    { value: 'assign', label: 'Assign Workout' },
    { value: 'notes', label: 'Notes' },
  ]

  const typeBadgeColor: Record<string, string> = {
    basketball: '#34bac2', conditioning: '#4ade80', both: '#c084fc',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      <Navbar />
      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: '2.5rem', letterSpacing: '0.03em', marginBottom: '1.5rem' }}>
          COACH DASHBOARD
        </h1>

        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', color: '#f87171', fontSize: '0.875rem' }}>{error}</div>}
        {success && <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', color: '#4ade80', fontSize: '0.875rem' }}>{success}</div>}

        {/* Tab Bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }}>
          {tabs.map(t => (
            <button key={t.value} onClick={() => { setActiveTab(t.value); setError(''); setSuccess('') }} style={{
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
                      <button
                        onClick={() => toggleMember(m.id)}
                        style={{ width: '100%', background: 'none', border: 'none', padding: '1.25rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#F2F2F2' }}
                      >
                        <div style={{ textAlign: 'left' }}>
                          <h3 style={{ fontWeight: 600, marginBottom: '0.2rem' }}>{m.name}</h3>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{m.email}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', color: 'var(--teal-secondary)', lineHeight: 1 }}>{m.workoutCount}</div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>workouts</div>
                          </div>
                          {m.lastWorkout && (
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Last</div>
                              <div style={{ fontSize: '0.75rem' }}>{new Date(m.lastWorkout).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                            </div>
                          )}
                          {isExpanded ? <ChevronUp size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div style={{ borderTop: '1px solid var(--border)', padding: '1rem 1.25rem' }}>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Recent workouts</p>
                          {wks.length === 0 ? (
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No workouts logged yet.</p>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              {wks.map(w => (
                                <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                  <span style={{ fontSize: '0.875rem' }}>{w.title}</span>
                                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.7rem', color: typeBadgeColor[w.type] ?? '#8A8A8A', textTransform: 'uppercase' }}>{w.type}</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                      {new Date(w.date ?? w.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem', alignItems: 'start' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', letterSpacing: '0.03em', marginBottom: '1rem' }}>
                MY GROUPS ({myGroups.length})
              </h2>
              {myGroups.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No groups yet. Create one →</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {myGroups.map(g => {
                    const isExpanded = expandedGroup === g.id
                    const gms = groupMembers[g.id] ?? []
                    return (
                      <div key={g.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', overflow: 'hidden' }}>
                        <button
                          onClick={() => toggleGroup(g.id)}
                          style={{ width: '100%', background: 'none', border: 'none', padding: '1rem 1.25rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#F2F2F2' }}
                        >
                          <div style={{ textAlign: 'left' }}>
                            <h3 style={{ fontWeight: 600, marginBottom: '0.15rem' }}>{g.name}</h3>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{(g.group_members as any[])?.[0]?.count ?? 0} members</p>
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
                                      <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{gm.profiles?.name}</span>
                                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>{gm.profiles?.email}</span>
                                    </div>
                                    <button onClick={() => handleRemoveFromGroup(g.id, gm.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', display: 'flex' }}>
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
                              <button onClick={() => handleAddToGroup(g.id)} style={{ background: 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.55rem 0.875rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}>Add</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Create Group */}
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

        {/* ── ASSIGN WORKOUT TAB ── */}
        {activeTab === 'assign' && (
          <div style={{ maxWidth: '500px' }}>
            <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', letterSpacing: '0.03em', marginBottom: '1rem' }}>ASSIGN WORKOUT PLAN</h2>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.5rem' }}>
              <form onSubmit={handleAssign} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={labelBase}>Member (optional — leave blank for all)</label>
                  <select value={assignMemberId} onChange={e => setAssignMemberId(e.target.value)} style={{ ...inputBase, width: '100%', cursor: 'pointer' }}>
                    <option value="">All members</option>
                    {allMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelBase}>Plan Title *</label>
                  <input type="text" value={planTitle} onChange={e => setPlanTitle(e.target.value)} required style={{ ...inputBase, width: '100%' }} placeholder="e.g. Week 1 Strength Block" />
                </div>
                <div>
                  <label style={labelBase}>Description</label>
                  <textarea value={planDesc} onChange={e => setPlanDesc(e.target.value)} style={{ ...inputBase, width: '100%', minHeight: '70px', resize: 'vertical' }} placeholder="Plan details…" />
                </div>
                <div>
                  <label style={labelBase}>Type</label>
                  <select value={planType} onChange={e => setPlanType(e.target.value)} style={{ ...inputBase, width: '100%', cursor: 'pointer' }}>
                    <option value="conditioning">Conditioning</option>
                    <option value="basketball">Basketball</option>
                    <option value="both">Both</option>
                  </select>
                </div>
                <button type="submit" disabled={planSaving} style={{ background: planSaving ? '#0d1a1e' : 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.75rem', fontWeight: 700, fontSize: '0.875rem', cursor: planSaving ? 'not-allowed' : 'pointer' }}>
                  {planSaving ? 'Assigning…' : 'Assign Plan'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── NOTES TAB ── */}
        {activeTab === 'notes' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', alignItems: 'start' }}>
            {/* Notes list */}
            <div>
              <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', letterSpacing: '0.03em', marginBottom: '1rem' }}>
                NOTES ({notes.length})
              </h2>
              {notes.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No notes yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {notes.map(n => (
                    <div key={n.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--teal-secondary)' }}>
                          {n.member?.name ?? 'General note'}
                        </p>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => { setEditingNote(n.id); setEditText(n.note) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}>
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDeleteNote(n.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', display: 'flex' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      {editingNote === n.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <textarea value={editText} onChange={e => setEditText(e.target.value)} style={{ ...inputBase, width: '100%', minHeight: '60px', resize: 'vertical' }} />
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => handleUpdateNote(n.id)} style={{ background: 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.375rem', padding: '0.4rem 0.875rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>Save</button>
                            <button onClick={() => { setEditingNote(null); setEditText('') }} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '0.375rem', padding: '0.4rem 0.875rem', fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <p style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>{n.note}</p>
                      )}
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                        {new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Note */}
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
      </main>
    </div>
  )
}
