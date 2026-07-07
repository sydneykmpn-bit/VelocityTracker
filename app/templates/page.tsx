'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Handshake, Folder, Dumbbell, Volleyball, BicepsFlexed, ClipboardList, Star, Pencil, Check, X } from 'lucide-react'

const inputBase: React.CSSProperties = {
  width: '100%', background: '#0d1a1e', border: '1px solid #1a2e34', borderRadius: '0.5rem',
  padding: '0.6rem 0.875rem', color: '#F2F2F2', fontSize: '0.9rem', outline: 'none',
}
const labelBase: React.CSSProperties = {
  display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)',
  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.375rem',
}
const TYPE_BADGE: Record<string, { bg: string; color: string; border: string }> = {
  basketball: { bg: 'rgba(8,119,160,0.2)', color: '#34bac2', border: 'rgba(8,119,160,0.35)' },
  conditioning: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80', border: 'rgba(34,197,94,0.25)' },
  both: { bg: 'rgba(168,85,247,0.15)', color: '#c084fc', border: 'rgba(168,85,247,0.25)' },
}
function typeIconFor(t: string) {
  if (t === 'conditioning') return Dumbbell
  if (t === 'basketball') return Volleyball
  return BicepsFlexed
}

export default function TemplatesPage() {
  const router = useRouter()
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState('')
  const [loading, setLoading] = useState(true)
  const [sharedTemplates, setSharedTemplates] = useState<any[]>([])
  const [myTemplates, setMyTemplates] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'shared' | 'mine'>('shared')
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<any>({})
  const [editExercises, setEditExercises] = useState<any[]>([])
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  // Create template
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState({
    title: '', description: '', type: 'conditioning' as 'conditioning' | 'basketball' | 'both',
    is_shared: false, is_visible_to_members: false,
  })
  const [createExercises, setCreateExercises] = useState([
    { name: '', sets: '', reps: '', weight: '', duration: '', notes: '' }
  ])
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  async function loadTemplates(uid: string) {
    const { data: shared } = await supabase
      .from('workout_templates')
      .select('*, workout_template_exercises(*), profiles(id, name, role)')
      .eq('is_shared', true)
      .eq('is_default', false)
      .order('updated_at', { ascending: false })
    setSharedTemplates(shared || [])

    const { data: mine } = await supabase
      .from('workout_templates')
      .select('*, workout_template_exercises(*)')
      .eq('created_by', uid)
      .eq('is_default', false)
      .order('created_at', { ascending: false })
    setMyTemplates(mine || [])
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      setUserRole(prof?.role || 'member')
      await loadTemplates(user.id)
      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCreateTemplate = async () => {
    if (!createForm.title.trim()) { setCreateError('Template name is required.'); return }
    if (!userId) return
    setCreating(true); setCreateError('')
    const { data: tmpl, error: err } = await supabase.from('workout_templates').insert({
      created_by: userId,
      title: createForm.title.trim(),
      description: createForm.description || null,
      type: createForm.type,
      is_shared: createForm.is_shared && (userRole === 'coach' || userRole === 'admin'),
      is_default: false,
      is_visible_to_members: createForm.is_visible_to_members,
      updated_at: new Date().toISOString(),
    }).select().single()
    if (err) { setCreateError(err.message); setCreating(false); return }
    if (tmpl) {
      const valid = createExercises.filter(e => e.name.trim())
      if (valid.length > 0) {
        await supabase.from('workout_template_exercises').insert(
          valid.map((ex, i) => ({
            template_id: tmpl.id, name: ex.name,
            sets: ex.sets ? Number(ex.sets) : null, reps: ex.reps ? Number(ex.reps) : null,
            weight: ex.weight ? Number(ex.weight) : null, duration: ex.duration ? Number(ex.duration) : null,
            notes: ex.notes || null, order_index: i,
          }))
        )
      }
    }
    setShowCreateForm(false)
    setCreateForm({ title: '', description: '', type: 'conditioning', is_shared: false, is_visible_to_members: false })
    setCreateExercises([{ name: '', sets: '', reps: '', weight: '', duration: '', notes: '' }])
    setCreating(false)
    setActiveTab('mine')
    setSuccess('Template created!')
    setTimeout(() => setSuccess(''), 2500)
    await loadTemplates(userId)
  }

  const handleCopyTemplate = async (template: any) => {
    if (!userId) return
    const { data: copy } = await supabase.from('workout_templates').insert({
      created_by: userId,
      title: `${template.title} (My Copy)`,
      description: template.description,
      type: template.type,
      is_shared: false,
      is_default: false,
      is_visible_to_members: false,
    }).select().single()
    if (copy && template.workout_template_exercises?.length > 0) {
      await supabase.from('workout_template_exercises').insert(
        template.workout_template_exercises
          .sort((a: any, b: any) => a.order_index - b.order_index)
          .map((ex: any, i: number) => ({
            template_id: copy.id,
            name: ex.name, sets: ex.sets, reps: ex.reps,
            weight: ex.weight, duration: ex.duration, distance: ex.distance,
            notes: ex.notes, order_index: i,
          }))
      )
    }
    setSuccess('Template copied to My Templates!')
    setTimeout(() => setSuccess(''), 2500)
    await loadTemplates(userId)
    setActiveTab('mine')
  }

  const handleDeleteTemplate = async (templateId: string) => {
    if (!userId) return
    if (!confirm('Delete this template? This cannot be undone.')) return
    await supabase.from('workout_template_exercises').delete().eq('template_id', templateId)
    await supabase.from('workout_templates').delete().eq('id', templateId)
    await loadTemplates(userId)
  }

  const startEdit = async (template: any) => {
    setEditingTemplate(template.id)
    setEditForm({
      title: template.title,
      description: template.description || '',
      type: template.type,
      is_shared: template.is_shared || false,
      is_visible_to_members: template.is_visible_to_members || false,
    })
    setEditExercises(
      (template.workout_template_exercises || [])
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map((ex: any) => ({
          id: ex.id,
          name: ex.name,
          sets: ex.sets?.toString() || '',
          reps: ex.reps?.toString() || '',
          weight: ex.weight?.toString() || '',
          duration: ex.duration?.toString() || '',
          notes: ex.notes || '',
        }))
    )
  }

  const handleSaveEdit = async () => {
    if (!editingTemplate || !userId) return
    setError(''); setSuccess('')
    await supabase.from('workout_templates').update({
      title: editForm.title,
      description: editForm.description || null,
      type: editForm.type,
      is_shared: editForm.is_shared,
      is_visible_to_members: editForm.is_visible_to_members,
      updated_at: new Date().toISOString(),
    }).eq('id', editingTemplate)

    await supabase.from('workout_template_exercises').delete().eq('template_id', editingTemplate)
    const exs = editExercises.filter(e => e.name.trim()).map((ex, i) => ({
      template_id: editingTemplate,
      name: ex.name,
      sets: ex.sets ? Number(ex.sets) : null,
      reps: ex.reps ? Number(ex.reps) : null,
      weight: ex.weight ? Number(ex.weight) : null,
      duration: ex.duration ? Number(ex.duration) : null,
      notes: ex.notes || null,
      order_index: i,
    }))
    if (exs.length > 0) await supabase.from('workout_template_exercises').insert(exs)
    setEditingTemplate(null)
    setSuccess('Template saved!')
    setTimeout(() => setSuccess(''), 2000)
    await loadTemplates(userId)
  }

  const updateEx = (idx: number, field: string, val: string) => {
    const next = [...editExercises]
    next[idx] = { ...next[idx], [field]: val }
    setEditExercises(next)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>
      </div>
    )
  }

  const tabs = [
    { key: 'shared' as const, icon: Handshake, label: 'Shared by Coaches', count: sharedTemplates.length },
    { key: 'mine' as const, icon: Folder, label: 'My Templates', count: myTemplates.length },
  ]
  const currentList = activeTab === 'shared' ? sharedTemplates : myTemplates

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <div>
            <p style={{ color: 'var(--teal-secondary)', fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Library</p>
            <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: 'clamp(2.25rem, 6vw, 3.5rem)', letterSpacing: '0.03em' }}>WORKOUT TEMPLATES</h1>
          </div>
          <button
            onClick={() => { setShowCreateForm(true); setActiveTab('mine'); setCreateError('') }}
            style={{ background: 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.75rem 1.25rem', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            + Create Template
          </button>
        </div>

        {success && <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', color: '#4ade80', fontSize: '0.875rem' }}>{success}</div>}
        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', color: '#f87171', fontSize: '0.875rem' }}>{error}</div>}

        {/* Create Template form */}
        {showCreateForm && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--teal-primary)', borderRadius: '1rem', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.25rem', letterSpacing: '0.03em' }}>CREATE TEMPLATE</h3>
              <button aria-label="Close" onClick={() => setShowCreateForm(false)} style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', minHeight: 0 }}><X size={16} /></button>
            </div>
            {createError && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', padding: '0.625rem 0.875rem', marginBottom: '0.875rem', color: '#f87171', fontSize: '0.875rem' }}>{createError}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div>
                <label style={labelBase}>Template Name *</label>
                <input type="text" value={createForm.title} onChange={e => setCreateForm({ ...createForm, title: e.target.value })} placeholder="e.g. Monday Push Day" style={inputBase} />
              </div>
              <div>
                <label style={labelBase}>Workout Type</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {(['conditioning', 'basketball', 'both'] as const).map(t => {
                    const TypeIcon = typeIconFor(t)
                    return (
                      <button key={t} type="button" onClick={() => setCreateForm({ ...createForm, type: t })} style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                        padding: '0.4rem 0.875rem', borderRadius: '0.375rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize', minHeight: 0,
                        background: createForm.type === t ? 'rgba(8,119,160,0.2)' : 'var(--surface-raised)',
                        border: `1px solid ${createForm.type === t ? 'var(--teal-primary)' : 'var(--border)'}`,
                        color: createForm.type === t ? 'var(--teal-secondary)' : 'var(--text-secondary)',
                      }}><TypeIcon size={12} /> {t === 'both' ? 'Both' : t.charAt(0).toUpperCase() + t.slice(1)}</button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label style={labelBase}>Description (optional)</label>
                <textarea value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} placeholder="Brief description…" rows={2} style={{ ...inputBase, resize: 'vertical', minHeight: '60px' }} />
              </div>
              <div>
                <label style={{ ...labelBase, marginBottom: '0.5rem' }}>Exercises</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {createExercises.map((ex, idx) => (
                    <div key={idx} style={{ background: '#0a1518', border: '1px solid #1a2e34', borderRadius: '0.5rem', padding: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--teal-secondary)', fontWeight: 700 }}>EX {idx + 1}</span>
                        {createExercises.length > 1 && (
                          <button type="button" onClick={() => setCreateExercises(createExercises.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', minHeight: 0 }} aria-label="Remove exercise">
                            <Plus size={12} style={{ transform: 'rotate(45deg)' }} />
                          </button>
                        )}
                      </div>
                      <input type="text" value={ex.name} onChange={e => { const n = [...createExercises]; n[idx] = { ...n[idx], name: e.target.value }; setCreateExercises(n) }} placeholder="Exercise name" style={{ ...inputBase, marginBottom: '0.375rem' }} />
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.375rem' }}>
                        {(['sets', 'reps', 'weight'] as const).map(f => (
                          <input key={f} type="number" value={(ex as any)[f] || ''} onChange={e => { const n = [...createExercises]; n[idx] = { ...n[idx], [f]: e.target.value }; setCreateExercises(n) }} placeholder={f === 'weight' ? 'kg' : f.charAt(0).toUpperCase() + f.slice(1)} style={inputBase} min="0" />
                        ))}
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={() => setCreateExercises([...createExercises, { name: '', sets: '', reps: '', weight: '', duration: '', notes: '' }])} style={{ background: 'transparent', border: '1px dashed #1a2e34', borderRadius: '0.375rem', padding: '0.4rem', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', minHeight: 0 }}>
                    <Plus size={12} /> Add Exercise
                  </button>
                </div>
              </div>
              {(userRole === 'coach' || userRole === 'admin') && (
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={createForm.is_shared} onChange={e => setCreateForm({ ...createForm, is_shared: e.target.checked })} style={{ width: '14px', height: '14px' }} />
                    Share with coaches
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={createForm.is_visible_to_members} onChange={e => setCreateForm({ ...createForm, is_visible_to_members: e.target.checked })} style={{ width: '14px', height: '14px' }} />
                    Visible to members
                  </label>
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" onClick={handleCreateTemplate} disabled={creating || !createForm.title.trim()} style={{ flex: 1, background: createForm.title.trim() ? 'var(--teal-primary)' : '#0d1a1e', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.75rem', fontWeight: 700, fontSize: '0.875rem', cursor: createForm.title.trim() ? 'pointer' : 'not-allowed' }}>
                  {creating ? 'Creating…' : 'Create Template'}
                </button>
                <button type="button" onClick={() => setShowCreateForm(false)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontSize: '0.875rem', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              background: 'none', border: 'none', flexShrink: 0, whiteSpace: 'nowrap',
              borderBottom: activeTab === t.key ? '2px solid var(--teal-primary)' : '2px solid transparent',
              color: activeTab === t.key ? 'var(--teal-secondary)' : 'var(--text-secondary)',
              padding: '0.75rem 1.25rem', cursor: 'pointer', fontSize: '0.875rem',
              fontWeight: activeTab === t.key ? 700 : 400, marginBottom: '-1px',
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            }}>
              <t.icon size={14} />
              {t.label} <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>({t.count})</span>
            </button>
          ))}
        </div>

        {currentList.length === 0 ? (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '1rem', padding: '3rem', textAlign: 'center' }}>
            <ClipboardList size={24} style={{ color: 'var(--text-secondary)', margin: '0 auto 0.5rem' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              {activeTab === 'mine' ? 'No personal templates yet. Make a template to get started.' : 'No templates in this category yet.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {currentList.map(t => {
              const tb = TYPE_BADGE[t.type] ?? TYPE_BADGE.both
              const isExpanded = expandedTemplate === t.id
              const isEditing = editingTemplate === t.id
              const canEdit = t.created_by === userId || userRole === 'admin'

              return (
                <div key={t.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', overflow: 'hidden' }}>
                  {/* Card header */}
                  <div style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                          <h3 style={{ fontWeight: 700, fontSize: '0.95rem' }}>{t.title}</h3>
                          <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '999px', textTransform: 'uppercase', ...tb }}>{t.type}</span>
                          {t.is_default && <span style={{ fontSize: '0.6rem', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', padding: '0.1rem 0.4rem', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}><Star size={10} />Default</span>}
                          {t.is_shared && !t.is_default && <span style={{ fontSize: '0.6rem', background: 'rgba(8,119,160,0.15)', color: '#34bac2', border: '1px solid rgba(8,119,160,0.3)', padding: '0.1rem 0.4rem', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}><Handshake size={10} />Shared</span>}
                        </div>
                        {t.description && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{t.description}</p>}
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{t.workout_template_exercises?.length || 0} exercises</p>
                        {activeTab === 'shared' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--teal-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, flexShrink: 0 }}>
                              {(t.profiles as any)?.name?.charAt(0)?.toUpperCase() || 'C'}
                            </div>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0 }}>
                              Shared by <span style={{ color: 'var(--teal-secondary)' }}>{(t.profiles as any)?.name || 'Coach'}</span>
                              {(t.updated_at || t.created_at) && (
                                <span style={{ color: 'var(--text-secondary)' }}> · {new Date(t.updated_at || t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              )}
                            </p>
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0, flexWrap: 'wrap' }}>
                        <button
                          onClick={() => setExpandedTemplate(isExpanded ? null : t.id)}
                          style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '0.375rem', padding: '0.3rem 0.625rem', color: 'var(--text-secondary)', fontSize: '0.75rem', cursor: 'pointer', minHeight: 0 }}
                        >
                          {isExpanded ? '▲ Hide' : '▼ Exercises'}
                        </button>
                        <button
                          onClick={() => router.push(`/workouts/new?template=${t.id}`)}
                          style={{ background: 'rgba(8,119,160,0.15)', border: '1px solid rgba(8,119,160,0.35)', borderRadius: '0.375rem', padding: '0.3rem 0.625rem', color: 'var(--teal-secondary)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', minHeight: 0 }}
                        >
                          Use →
                        </button>
                        <button
                          onClick={() => handleCopyTemplate(t)}
                          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '0.375rem', padding: '0.3rem 0.625rem', color: 'var(--text-secondary)', fontSize: '0.75rem', cursor: 'pointer', minHeight: 0 }}
                        >
                          Copy
                        </button>
                        {canEdit && (
                          <>
                            <button
                              onClick={() => isEditing ? setEditingTemplate(null) : startEdit(t)}
                              style={{ background: isEditing ? 'rgba(8,119,160,0.2)' : 'none', border: `1px solid ${isEditing ? 'var(--teal-primary)' : 'var(--border)'}`, borderRadius: '0.375rem', padding: '0.3rem 0.625rem', color: isEditing ? 'var(--teal-secondary)' : 'var(--text-secondary)', fontSize: '0.75rem', cursor: 'pointer', minHeight: 0, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                            >
                              <Pencil size={12} /> Edit
                            </button>
                            {!t.is_default && (
                              <button
                                onClick={() => handleDeleteTemplate(t.id)}
                                style={{ background: 'none', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.375rem', padding: '0.3rem 0.5rem', color: '#f87171', fontSize: '0.75rem', cursor: 'pointer', minHeight: 0 }}
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </>
                        )}
                        {activeTab === 'mine' && (userRole === 'coach' || userRole === 'admin') && t.created_by === userId && (
                          <>
                            <button
                              onClick={async () => {
                                await supabase.from('workout_templates').update({ is_shared: !t.is_shared, updated_at: new Date().toISOString() }).eq('id', t.id)
                                if (userId) loadTemplates(userId)
                              }}
                              style={{ background: 'none', border: `1px solid ${t.is_shared ? 'var(--teal-primary)' : 'var(--border)'}`, borderRadius: '0.375rem', padding: '0.3rem 0.625rem', color: t.is_shared ? 'var(--teal-secondary)' : 'var(--text-secondary)', fontSize: '0.7rem', cursor: 'pointer', minHeight: 0, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                            >
                              {t.is_shared && <Check size={11} />} {t.is_shared ? 'Shared w/ Coaches' : 'Share w/ Coaches'}
                            </button>
                            <button
                              onClick={async () => {
                                await supabase.from('workout_templates').update({ is_visible_to_members: !t.is_visible_to_members, updated_at: new Date().toISOString() }).eq('id', t.id)
                                if (userId) loadTemplates(userId)
                              }}
                              style={{ background: 'none', border: `1px solid ${t.is_visible_to_members ? '#4ade80' : 'var(--border)'}`, borderRadius: '0.375rem', padding: '0.3rem 0.625rem', color: t.is_visible_to_members ? '#4ade80' : 'var(--text-secondary)', fontSize: '0.7rem', cursor: 'pointer', minHeight: 0, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                            >
                              {t.is_visible_to_members && <Check size={11} />} {t.is_visible_to_members ? 'Visible to Members' : 'Share w/ Members'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Exercise list (collapsed) */}
                    {isExpanded && !isEditing && (
                      <div style={{ marginTop: '0.875rem', paddingTop: '0.875rem', borderTop: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                          {(t.workout_template_exercises || [])
                            .sort((a: any, b: any) => a.order_index - b.order_index)
                            .map((ex: any, i: number) => (
                              <div key={ex.id || i} style={{ background: '#0a1518', borderRadius: '0.375rem', padding: '0.625rem 0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{ex.name}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', flexShrink: 0 }}>
                                  {ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : ''}
                                  {ex.weight ? ` · ${ex.weight}kg` : ''}
                                  {ex.duration ? ` · ${ex.duration}min` : ''}
                                </span>
                              </div>
                            ))}
                          {(t.workout_template_exercises?.length || 0) === 0 && (
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No exercises defined.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Inline edit form */}
                    {isEditing && (
                      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.875rem', background: '#0a1518', borderRadius: '0 0 0.5rem 0.5rem', padding: '1rem', margin: '0.875rem -1.25rem -1rem' }}>
                        <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--teal-secondary)' }}>EDIT TEMPLATE</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                          <div>
                            <label style={labelBase}>Title</label>
                            <input type="text" value={editForm.title || ''} onChange={e => setEditForm((p: any) => ({ ...p, title: e.target.value }))} style={inputBase} />
                          </div>
                          <div>
                            <label style={labelBase}>Type</label>
                            <div style={{ display: 'flex', gap: '0.375rem' }}>
                              {(['conditioning', 'basketball', 'both'] as const).map(tp => {
                                const TypeIcon = typeIconFor(tp)
                                return (
                                  <button key={tp} type="button" onClick={() => setEditForm((p: any) => ({ ...p, type: tp }))} style={{
                                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    padding: '0.4rem 0.25rem', borderRadius: '0.375rem', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize', minHeight: 0,
                                    background: editForm.type === tp ? 'rgba(8,119,160,0.2)' : 'var(--surface)',
                                    border: `1px solid ${editForm.type === tp ? 'var(--teal-primary)' : 'var(--border)'}`,
                                    color: editForm.type === tp ? 'var(--teal-secondary)' : 'var(--text-secondary)',
                                  }}><TypeIcon size={12} /></button>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                        <div>
                          <label style={labelBase}>Description</label>
                          <textarea value={editForm.description || ''} onChange={e => setEditForm((p: any) => ({ ...p, description: e.target.value }))} style={{ ...inputBase, minHeight: '50px', resize: 'vertical' }} />
                        </div>
                        {(userRole === 'coach' || userRole === 'admin') && (
                          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                              <input type="checkbox" checked={editForm.is_shared || false} onChange={e => setEditForm((p: any) => ({ ...p, is_shared: e.target.checked }))} style={{ width: '14px', height: '14px' }} />
                              Share with coaches
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                              <input type="checkbox" checked={editForm.is_visible_to_members || false} onChange={e => setEditForm((p: any) => ({ ...p, is_visible_to_members: e.target.checked }))} style={{ width: '14px', height: '14px' }} />
                              Visible to members
                            </label>
                          </div>
                        )}
                        <div>
                          <label style={{ ...labelBase, marginBottom: '0.375rem' }}>Exercises</label>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                            {editExercises.map((ex, idx) => (
                              <div key={idx} style={{ background: '#0d1a1e', border: '1px solid #1a2e34', borderRadius: '0.375rem', padding: '0.625rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                                  <span style={{ fontSize: '0.65rem', color: 'var(--teal-secondary)', fontWeight: 700 }}>EX {idx + 1}</span>
                                  {editExercises.length > 1 && (
                                    <button type="button" onClick={() => setEditExercises(editExercises.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', minHeight: 0 }}>
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                </div>
                                <input type="text" value={ex.name} onChange={e => updateEx(idx, 'name', e.target.value)} placeholder="Exercise name" style={{ ...inputBase, marginBottom: '0.375rem' }} />
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.375rem' }}>
                                  {(['sets', 'reps', 'weight'] as const).map(f => (
                                    <input key={f} type="number" value={ex[f] || ''} onChange={e => updateEx(idx, f, e.target.value)} placeholder={f === 'weight' ? 'kg' : f.charAt(0).toUpperCase() + f.slice(1)} style={inputBase} min="0" />
                                  ))}
                                </div>
                              </div>
                            ))}
                            <button type="button" onClick={() => setEditExercises([...editExercises, { name: '', sets: '', reps: '', weight: '', duration: '', notes: '' }])} style={{ background: 'transparent', border: '1px dashed #1a2e34', borderRadius: '0.375rem', padding: '0.4rem', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', minHeight: 0 }}>
                              <Plus size={12} /> Add Exercise
                            </button>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button type="button" onClick={handleSaveEdit} style={{ flex: 1, background: 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.375rem', padding: '0.625rem', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', minHeight: 0 }}>Save Changes</button>
                          <button type="button" onClick={() => setEditingTemplate(null)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '0.375rem', padding: '0.625rem 0.875rem', color: 'var(--text-secondary)', fontSize: '0.875rem', cursor: 'pointer', minHeight: 0 }}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
