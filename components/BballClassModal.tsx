'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Users, Pencil } from 'lucide-react'
import { DAY_NAMES, DAY_LABELS, formatTimeLabel, dayNameFromDate, BballClassRow } from '@/lib/utils'

const inputBase: React.CSSProperties = {
  background: '#0d1a1e', border: '1px solid #1a2e34', borderRadius: '0.5rem',
  padding: '0.6rem 0.875rem', color: '#F2F2F2', fontSize: '1rem', outline: 'none', width: '100%',
}
const labelBase: React.CSSProperties = {
  display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)',
  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.375rem',
}

export const genderBadgeStyle: Record<string, { bg: string; color: string; border: string; label: string }> = {
  men: { bg: 'rgba(96,165,250,0.15)', color: '#60a5fa', border: 'rgba(96,165,250,0.3)', label: 'Men Only' },
  women: { bg: 'rgba(244,114,182,0.15)', color: '#f472b6', border: 'rgba(244,114,182,0.3)', label: 'Women Only' },
}

export interface BballOccurrence {
  cls: BballClassRow
  date: string
  count: number
  joined: boolean
}

export function BballClassDetailModal({
  occ, myUserId, myGender, isAdmin, onClose, onJoinLeave, onEdit,
}: {
  occ: BballOccurrence
  myUserId: string
  myGender: string | null
  isAdmin: boolean
  onClose: () => void
  onJoinLeave: () => void
  onEdit: (cls: BballClassRow) => void
}) {
  const supabase = createClient()
  const [attendees, setAttendees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const loadAttendees = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('bball_class_signups')
      .select('id, user_id, profiles(name)')
      .eq('class_id', occ.cls.id)
      .eq('occurrence_date', occ.date)
    if (err) setError(err.message)
    setAttendees(data || [])
    setLoading(false)
  }, [supabase, occ.cls.id, occ.date])

  useEffect(() => { loadAttendees() }, [loadAttendees])

  const badge = genderBadgeStyle[occ.cls.gender_restriction]
  const full = occ.count >= occ.cls.max_slots
  const alreadyJoined = attendees.some(a => a.user_id === myUserId)

  const handleJoin = async () => {
    setError('')
    const restriction = occ.cls.gender_restriction
    if (restriction === 'men' && myGender !== 'male') { setError('This class is for men only.'); return }
    if (restriction === 'women' && myGender !== 'female') { setError('This class is for women only.'); return }
    setBusy(true)
    const { error: err } = await supabase.from('bball_class_signups').insert({
      class_id: occ.cls.id, user_id: myUserId, occurrence_date: occ.date,
    })
    if (err) {
      setError(err.message.toLowerCase().includes('full') ? 'This class just filled up.' : err.message)
      setBusy(false)
      return
    }
    await loadAttendees()
    onJoinLeave()
    setBusy(false)
  }

  const handleLeave = async () => {
    setBusy(true); setError('')
    const { error: err } = await supabase.from('bball_class_signups')
      .delete().eq('class_id', occ.cls.id).eq('user_id', myUserId).eq('occurrence_date', occ.date)
    if (err) { setError(err.message); setBusy(false); return }
    await loadAttendees()
    onJoinLeave()
    setBusy(false)
  }

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '1rem', background: 'var(--surface)', border: '1px solid var(--border)', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', letterSpacing: '0.03em' }}>{occ.cls.title}</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              {occ.cls.is_recurring ? DAY_LABELS[occ.cls.day_of_week] : new Date(occ.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              {' · '}{formatTimeLabel(occ.cls.start_time)} – {formatTimeLabel(occ.cls.end_time)}
              {!occ.cls.is_recurring && <span style={{ marginLeft: '0.4rem', color: 'var(--text-secondary)' }}>· One-time</span>}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
            {isAdmin && (
              <button onClick={() => onEdit(occ.cls)} title="Edit class" style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', minHeight: 0 }}><Pencil size={14} /></button>
            )}
            <button onClick={onClose} style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', minHeight: 0 }}><X size={16} /></button>
          </div>
        </div>

        {badge && (
          <span style={{ display: 'inline-block', fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem', background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
            {badge.label}
          </span>
        )}

        {occ.cls.description && (
          <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '1rem', lineHeight: 1.5 }}>{occ.cls.description}</p>
        )}

        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', padding: '0.625rem 0.75rem', marginBottom: '0.75rem', color: '#f87171', fontSize: '0.8rem' }}>{error}</div>}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Users size={12} /> {attendees.length} / {occ.cls.max_slots} spots filled
          </p>
          {alreadyJoined ? (
            <button onClick={handleLeave} disabled={busy} style={{ background: 'none', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#ef4444', cursor: busy ? 'not-allowed' : 'pointer' }}>
              {busy ? 'Leaving…' : 'Leave'}
            </button>
          ) : full ? (
            <button disabled style={{ background: 'var(--border)', border: 'none', borderRadius: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', cursor: 'not-allowed' }}>
              Class Full
            </button>
          ) : (
            <button onClick={handleJoin} disabled={busy} style={{ background: 'var(--teal-primary)', border: 'none', borderRadius: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: 'white', cursor: busy ? 'not-allowed' : 'pointer' }}>
              {busy ? 'Joining…' : 'Join'}
            </button>
          )}
        </div>

        <div>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Attendees</p>
          {loading ? (
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Loading…</p>
          ) : attendees.length === 0 ? (
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No one has joined yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {attendees.map(a => (
                <div key={a.id} style={{ background: 'var(--surface-raised)', borderRadius: '0.5rem', padding: '0.6rem 0.875rem', fontSize: '0.875rem' }}>
                  {(a.profiles as any)?.name || 'Unknown'}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function BballClassFormModal({
  editing, onClose, onSaved,
}: {
  editing: BballClassRow | null
  onClose: () => void
  onSaved: () => void
}) {
  const supabase = createClient()
  const isEdit = !!editing
  const [form, setForm] = useState(() => editing ? {
    title: editing.title, description: editing.description || '',
    is_recurring: editing.is_recurring, days: [editing.day_of_week] as string[],
    specific_date: editing.specific_date || '',
    start_time: editing.start_time?.slice(0, 5) || '18:00', end_time: editing.end_time?.slice(0, 5) || '19:00',
    gender_restriction: editing.gender_restriction, max_slots: editing.max_slots,
  } : {
    title: '', description: '', is_recurring: true, days: ['monday'] as string[], specific_date: '',
    start_time: '18:00', end_time: '19:00', gender_restriction: 'mixed', max_slots: 10,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const toggleDay = (day: string) => {
    setForm(prev => ({
      ...prev,
      days: isEdit ? [day] : (prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day]),
    }))
  }

  const canSubmit = form.title.trim().length > 0 && (form.is_recurring ? form.days.length > 0 : !!form.specific_date)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSaving(true); setError('')
    const base = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      start_time: form.start_time,
      end_time: form.end_time,
      gender_restriction: form.gender_restriction,
      max_slots: Number(form.max_slots) || 1,
      is_recurring: form.is_recurring,
    }
    if (isEdit) {
      const payload = form.is_recurring
        ? { ...base, day_of_week: form.days[0], specific_date: null }
        : { ...base, day_of_week: dayNameFromDate(form.specific_date), specific_date: form.specific_date }
      const { error: err } = await supabase.from('bball_classes').update(payload).eq('id', editing!.id)
      if (err) { setError(err.message); setSaving(false); return }
    } else if (form.is_recurring) {
      const rows = form.days.map(day => ({ ...base, day_of_week: day, specific_date: null }))
      const { error: err } = await supabase.from('bball_classes').insert(rows)
      if (err) { setError(err.message); setSaving(false); return }
    } else {
      const { error: err } = await supabase.from('bball_classes').insert({
        ...base, day_of_week: dayNameFromDate(form.specific_date), specific_date: form.specific_date,
      })
      if (err) { setError(err.message); setSaving(false); return }
    }
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '440px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '1rem', background: 'var(--surface)', border: '1px solid var(--border)', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', letterSpacing: '0.03em' }}>{isEdit ? 'EDIT CLASS' : 'ADD CLASS'}</h2>
          <button onClick={onClose} style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', flexShrink: 0, minHeight: 0 }}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', padding: '0.75rem', color: '#f87171', fontSize: '0.875rem' }}>{error}</div>}
          <div>
            <label style={labelBase}>Title</label>
            <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required style={inputBase} placeholder="e.g. Open Run" />
          </div>
          <div>
            <label style={labelBase}>Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} style={{ ...inputBase, resize: 'vertical', fontFamily: 'inherit' }} placeholder="Optional details" />
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.is_recurring} onChange={e => setForm({ ...form, is_recurring: e.target.checked })} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
              <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Recurring class</span>
            </label>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              {form.is_recurring ? 'Repeats every week on the selected day(s).' : 'Happens once, on a specific date.'}
            </p>
          </div>

          {form.is_recurring ? (
            <div>
              <label style={labelBase}>{isEdit ? 'Day of Week' : 'Days of Week'}</label>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {DAY_NAMES.map(d => (
                  <button
                    key={d} type="button" onClick={() => toggleDay(d)}
                    style={{
                      borderRadius: '999px', padding: '0.4rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                      border: `1px solid ${form.days.includes(d) ? 'var(--teal-primary)' : '#1a2e34'}`,
                      background: form.days.includes(d) ? 'rgba(8,119,160,0.2)' : 'transparent',
                      color: form.days.includes(d) ? 'var(--teal-secondary)' : 'var(--text-secondary)',
                    }}
                  >
                    {DAY_LABELS[d].slice(0, 3)}
                  </button>
                ))}
              </div>
              {form.days.length === 0 && <p style={{ fontSize: '0.7rem', color: '#f87171', marginTop: '0.375rem' }}>Select at least one day.</p>}
            </div>
          ) : (
            <div>
              <label style={labelBase}>Date</label>
              <input type="date" value={form.specific_date} onChange={e => setForm({ ...form, specific_date: e.target.value })} required style={inputBase} />
            </div>
          )}

          <div>
            <label style={labelBase}>Gender Restriction</label>
            <select value={form.gender_restriction} onChange={e => setForm({ ...form, gender_restriction: e.target.value })} style={{ ...inputBase, cursor: 'pointer' }}>
              <option value="mixed">Mixed</option>
              <option value="men">Men Only</option>
              <option value="women">Women Only</option>
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={labelBase}>Start Time</label>
              <input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} required style={inputBase} />
            </div>
            <div>
              <label style={labelBase}>End Time</label>
              <input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} required style={inputBase} />
            </div>
          </div>
          <div>
            <label style={labelBase}>Max Slots</label>
            <input type="number" min={1} value={form.max_slots} onChange={e => setForm({ ...form, max_slots: Number(e.target.value) })} required style={inputBase} />
          </div>
          <button type="submit" disabled={saving || !canSubmit} style={{
            background: saving || !canSubmit ? '#0d1a1e' : 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.5rem',
            padding: '0.875rem', fontWeight: 700, fontSize: '0.875rem', cursor: saving || !canSubmit ? 'not-allowed' : 'pointer', marginTop: '0.25rem',
          }}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : !form.is_recurring ? 'Create Class' : form.days.length > 1 ? `Create Class (${form.days.length} days)` : 'Create Class'}
          </button>
        </form>
      </div>
    </div>
  )
}
