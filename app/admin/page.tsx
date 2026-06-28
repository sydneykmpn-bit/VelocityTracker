'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react'

type Tab = 'members' | 'groups' | 'workouts' | 'leaderboard'
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

export default function AdminPage() {
  const router = useRouter()
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<Tab>('members')
  const [loading, setLoading] = useState(true)

  // Members tab
  const [profiles, setProfiles] = useState<any[]>([])
  const [updatingRole, setUpdatingRole] = useState<string | null>(null)

  // Groups tab
  const [groups, setGroups] = useState<any[]>([])
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
  const [groupMembers, setGroupMembers] = useState<Record<string, any[]>>({})
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupDesc, setNewGroupDesc] = useState('')
  const [newGroupCoach, setNewGroupCoach] = useState('')
  const [addMemberId, setAddMemberId] = useState<Record<string, string>>({})
  const [groupSaving, setGroupSaving] = useState(false)

  // Workouts tab
  const [allWorkouts, setAllWorkouts] = useState<any[]>([])

  // Leaderboard tab
  const [allPRs, setAllPRs] = useState<any[]>([])
  const [prFilter, setPrFilter] = useState('')

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadProfiles = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    setProfiles(data ?? [])
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

      await Promise.all([
        loadProfiles(),
        loadGroups(),
        supabase.from('workouts').select('*, profiles(name)').order('created_at', { ascending: false }).then(({ data }) => setAllWorkouts(data ?? [])),
        supabase.from('personal_records').select('*, profiles(name)').order('value', { ascending: false }).then(({ data }) => setAllPRs(data ?? [])),
      ])
      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRoleChange = async (userId: string, newRole: Role) => {
    setUpdatingRole(userId)
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    await loadProfiles()
    setUpdatingRole(null)
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

  const coaches = profiles.filter(p => p.role === 'coach' || p.role === 'admin')
  const members = profiles.filter(p => p.role === 'member')
  const filteredPRs = prFilter.trim() ? allPRs.filter(r => (r.exercise_name ?? r.exercise ?? '').toLowerCase().includes(prFilter.toLowerCase())) : allPRs

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
    { value: 'workouts', label: 'Workouts Overview' },
    { value: 'leaderboard', label: 'Leaderboard' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      <Navbar />
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: '2.5rem', letterSpacing: '0.03em', marginBottom: '1.5rem' }}>
          ADMIN PANEL
        </h1>

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
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>{profiles.length} users total</p>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '1rem', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Name', 'Email', 'Role', 'Joined'].map(h => (
                      <th key={h} style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {profiles.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.875rem 1rem', fontWeight: 600, fontSize: '0.875rem' }}>{p.name}</td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{p.email}</td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={roleBadgeStyle(p.role)}>{p.role}</span>
                          <select
                            value={p.role}
                            onChange={e => handleRoleChange(p.id, e.target.value as Role)}
                            disabled={updatingRole === p.id}
                            style={{ ...inputBase, padding: '0.3rem 0.5rem', fontSize: '0.75rem', cursor: 'pointer' }}
                          >
                            <option value="member">member</option>
                            <option value="coach">coach</option>
                            <option value="admin">admin</option>
                          </select>
                        </div>
                      </td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── GROUPS TAB ── */}
        {activeTab === 'groups' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', alignItems: 'start' }}>
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

        {/* ── WORKOUTS OVERVIEW TAB ── */}
        {activeTab === 'workouts' && (
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>{allWorkouts.length} workouts total (read-only)</p>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '1rem', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['User', 'Title', 'Type', 'Date'].map(h => (
                      <th key={h} style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allWorkouts.length === 0 ? (
                    <tr><td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No workouts yet.</td></tr>
                  ) : (
                    allWorkouts.map(w => (
                      <tr key={w.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', fontWeight: 600 }}>{w.profiles?.name ?? '—'}</td>
                        <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem' }}>{w.title}</td>
                        <td style={{ padding: '0.875rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{w.type}</td>
                        <td style={{ padding: '0.875rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {new Date(w.date ?? w.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── LEADERBOARD TAB ── */}
        {activeTab === 'leaderboard' && (
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <input type="text" value={prFilter} onChange={e => setPrFilter(e.target.value)} placeholder="Filter by exercise…" style={{ ...inputBase, width: '100%', maxWidth: '300px' }} />
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
    </div>
  )
}
