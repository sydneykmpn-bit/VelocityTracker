'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, ChevronDown, ChevronUp, Search, Trash2, UserPlus, X } from 'lucide-react'
import { formatTimeLabel, PAYMENT_STATUS_LABELS } from '@/lib/utils'

type SystemKey = 'bball' | 'scheduled'

const CONFIG: Record<SystemKey, {
  classTable: string
  signupTable: string
  memberCol: string
  bookedStatuses: string[]
  waitlistStatus: string
  noShowStatus: string
  defaultStatus: string
  hasLocation: boolean
  backHref: string
  backLabel: string
}> = {
  bball: {
    classTable: 'bball_classes', signupTable: 'bball_class_signups', memberCol: 'user_id',
    bookedStatuses: ['booked'], waitlistStatus: 'waitlist', noShowStatus: 'no_show', defaultStatus: 'booked',
    hasLocation: false, backHref: '/classes', backLabel: 'Back to Classes',
  },
  scheduled: {
    classTable: 'scheduled_classes', signupTable: 'class_attendees', memberCol: 'member_id',
    bookedStatuses: ['scheduled', 'attended'], waitlistStatus: 'waitlist', noShowStatus: 'absent', defaultStatus: 'scheduled',
    hasLocation: true, backHref: '/calendar', backLabel: 'Back to Calendar',
  },
}

const inputBase: React.CSSProperties = {
  background: '#0d1a1e', border: '1px solid #1a2e34', borderRadius: '0.5rem',
  padding: '0.6rem 0.875rem', color: '#F2F2F2', fontSize: '0.875rem', outline: 'none', width: '100%',
}
const labelBase: React.CSSProperties = {
  display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)',
  textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '0.375rem',
}

type Tab = 'booked' | 'waitlist' | 'no_show'

export default function ClassRosterView({ system }: { system: SystemKey }) {
  const cfg = CONFIG[system]
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const date = searchParams.get('date') || ''
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [classRow, setClassRow] = useState<any>(null)
  const [rows, setRows] = useState<any[]>([])
  const [tab, setTab] = useState<Tab>('booked')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'time'>('time')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [amountMin, setAmountMin] = useState('')
  const [amountMax, setAmountMax] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [showAddAttendee, setShowAddAttendee] = useState(false)
  const [memberCandidates, setMemberCandidates] = useState<any[]>([])
  const [addSearch, setAddSearch] = useState('')
  const [addError, setAddError] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  const loadRows = useCallback(async () => {
    const { data, error: err } = await supabase
      .from(cfg.signupTable)
      .select('*, profiles(name, email)')
      .eq('class_id', id)
      .eq('occurrence_date', date)
    if (err) { setError(err.message); return }
    setRows(data || [])
  }, [supabase, cfg.signupTable, id, date])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (prof?.role !== 'admin' && prof?.role !== 'coach') { router.push('/dashboard'); return }

      const { data: cls } = await supabase.from(cfg.classTable).select('*').eq('id', id).single()
      if (!cls) { router.push(cfg.backHref); return }
      setClassRow(cls)

      await loadRows()
      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, date])

  useEffect(() => {
    if (!showAddAttendee) return
    supabase.from('profiles').select('id, name, email').eq('role', 'member').order('name')
      .then(({ data }) => setMemberCandidates(data || []))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddAttendee])

  if (loading || !classRow) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>
      </div>
    )
  }

  const bookedCount = rows.filter(r => cfg.bookedStatuses.includes(r.status)).length
  const waitlistCount = rows.filter(r => r.status === cfg.waitlistStatus).length
  const noShowCount = rows.filter(r => r.status === cfg.noShowStatus).length

  const bucketFor = (t: Tab) => t === 'booked'
    ? rows.filter(r => cfg.bookedStatuses.includes(r.status))
    : t === 'waitlist'
    ? rows.filter(r => r.status === cfg.waitlistStatus)
    : rows.filter(r => r.status === cfg.noShowStatus)

  const visibleRows = bucketFor(tab)
    .filter(r => !search.trim() || r.profiles?.name?.toLowerCase().includes(search.toLowerCase()))
    .filter(r => paymentFilter === 'all' || r.payment_status === paymentFilter)
    .filter(r => {
      const amt = Number(r.amount_paid) || 0
      if (amountMin.trim() && amt < Number(amountMin)) return false
      if (amountMax.trim() && amt > Number(amountMax)) return false
      return true
    })
    .sort((a, b) => sortBy === 'name'
      ? (a.profiles?.name || '').localeCompare(b.profiles?.name || '')
      : (a.created_at || '').localeCompare(b.created_at || '')
    )

  const updateRow = async (rowId: string, payload: any) => {
    setError('')
    const { error: err } = await supabase.from(cfg.signupTable).update(payload).eq('id', rowId)
    if (err) { setError(err.message); return }
    await loadRows()
  }

  const handleRemove = async (row: any) => {
    if (!confirm(`Remove ${row.profiles?.name || 'this attendee'} from this class?`)) return
    setError('')
    const { error: err } = await supabase.from(cfg.signupTable).delete().eq('id', row.id)
    if (err) { setError(err.message); return }
    await loadRows()
  }

  const handleAddAttendee = async (memberId: string) => {
    setAddLoading(true); setAddError('')
    const { data: existing } = await supabase
      .from(cfg.signupTable).select('id')
      .eq('class_id', id).eq('occurrence_date', date).eq(cfg.memberCol, memberId)
      .maybeSingle()
    if (!existing) {
      const { error: err } = await supabase.from(cfg.signupTable).insert({
        class_id: id, occurrence_date: date, [cfg.memberCol]: memberId,
      })
      if (err) { setAddError(err.message); setAddLoading(false); return }
    }
    setAddSearch('')
    setAddLoading(false)
    await loadRows()
  }

  const timeLabel = system === 'bball'
    ? `${formatTimeLabel(classRow.start_time)} – ${formatTimeLabel(classRow.end_time)}`
    : `${classRow.start_time?.slice(0, 5)}${classRow.end_time ? ` – ${classRow.end_time.slice(0, 5)}` : ''}`

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'booked', label: 'Booked', count: bookedCount },
    { key: 'waitlist', label: 'Waitlist', count: waitlistCount },
    { key: 'no_show', label: 'No Show', count: noShowCount },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      <main style={{ maxWidth: '760px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <Link href={cfg.backHref} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1.25rem', textDecoration: 'none' }}>
          <ArrowLeft size={15} /> {cfg.backLabel}
        </Link>

        <h1 className="font-display" style={{ fontFamily: 'var(--font-bebas)', fontSize: '2.25rem', letterSpacing: '0.03em', marginBottom: '0.25rem' }}>
          {classRow.title}
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} · {timeLabel}
          {cfg.hasLocation && classRow.location ? ` · ${classRow.location}` : ''}
        </p>

        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', color: '#f87171', fontSize: '0.875rem' }}>{error}</div>}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setExpandedId(null) }}
              style={{
                borderRadius: '999px', padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                border: `1px solid ${tab === t.key ? 'var(--teal-primary)' : 'var(--border)'}`,
                background: tab === t.key ? 'rgba(8,119,160,0.2)' : 'var(--surface)',
                color: tab === t.key ? 'var(--teal-secondary)' : 'var(--text-secondary)',
              }}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name…"
              style={{ ...inputBase, paddingLeft: '2rem' }}
            />
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} style={{ ...inputBase, width: 'auto', cursor: 'pointer' }}>
            <option value="time">Sort: Signup Time</option>
            <option value="name">Sort: Name</option>
          </select>
          <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)} style={{ ...inputBase, width: 'auto', cursor: 'pointer' }}>
            <option value="all">All Payment Statuses</option>
            {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input type="number" value={amountMin} onChange={e => setAmountMin(e.target.value)} placeholder="Min ₱" style={{ ...inputBase, width: '90px' }} />
          <input type="number" value={amountMax} onChange={e => setAmountMax(e.target.value)} placeholder="Max ₱" style={{ ...inputBase, width: '90px' }} />
        </div>

        {/* Add attendee */}
        <div style={{ marginBottom: '1.25rem' }}>
          <button
            onClick={() => { setShowAddAttendee(o => !o); setAddError('') }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.5rem 0.875rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--teal-secondary)', cursor: 'pointer' }}
          >
            {showAddAttendee ? <><X size={14} /> Cancel</> : <><UserPlus size={14} /> Add Attendee</>}
          </button>
          {showAddAttendee && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '0.875rem', marginTop: '0.75rem' }}>
              {addError && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.375rem', padding: '0.5rem 0.625rem', color: '#f87171', fontSize: '0.75rem', marginBottom: '0.5rem' }}>{addError}</div>}
              <input value={addSearch} onChange={e => setAddSearch(e.target.value)} placeholder="Type a name…" style={inputBase} autoFocus />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginTop: '0.625rem', maxHeight: '200px', overflowY: 'auto' }}>
                {memberCandidates
                  .filter(m => !rows.some(r => r[cfg.memberCol] === m.id && r.status !== cfg.noShowStatus))
                  .filter(m => m.name?.toLowerCase().includes(addSearch.toLowerCase()))
                  .map(m => (
                    <button
                      key={m.id} onClick={() => handleAddAttendee(m.id)} disabled={addLoading}
                      style={{ display: 'flex', justifyContent: 'space-between', width: '100%', textAlign: 'left', background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', cursor: addLoading ? 'not-allowed' : 'pointer', fontSize: '0.8rem', color: 'var(--text-primary)', minHeight: 0 }}
                    >
                      <span>{m.name}</span>
                      <span style={{ color: 'var(--teal-primary)', fontWeight: 700 }}>+ Add</span>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Roster */}
        {visibleRows.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No one here yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {visibleRows.map(row => {
              const expanded = expandedId === row.id
              return (
                <div key={row.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', overflow: 'hidden' }}>
                  <div
                    onClick={() => setExpandedId(expanded ? null : row.id)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.875rem 1rem', cursor: 'pointer' }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{row.profiles?.name || 'Unknown'}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                        {PAYMENT_STATUS_LABELS[row.payment_status] || 'Unpaid'}
                        {row.amount_paid != null ? ` · ₱${row.amount_paid}` : ''}
                        {row.created_at ? ` · Signed up ${new Date(row.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : ''}
                      </p>
                    </div>
                    {expanded ? <ChevronUp size={16} color="var(--text-secondary)" /> : <ChevronDown size={16} color="var(--text-secondary)" />}
                  </div>
                  {expanded && (
                    <div style={{ borderTop: '1px solid var(--border)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div>
                        <label style={labelBase}>Payment Status</label>
                        <select
                          defaultValue={row.payment_status}
                          onChange={e => updateRow(row.id, { payment_status: e.target.value })}
                          style={{ ...inputBase, cursor: 'pointer' }}
                        >
                          {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={labelBase}>Amount Paid</label>
                        <input
                          type="number" defaultValue={row.amount_paid ?? ''} placeholder="0.00"
                          onBlur={e => updateRow(row.id, { amount_paid: e.target.value === '' ? null : Number(e.target.value) })}
                          style={inputBase}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {row.status !== cfg.noShowStatus && (
                          <button
                            onClick={() => updateRow(row.id, { status: cfg.noShowStatus })}
                            style={{ flex: '1 1 auto', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', color: '#f87171', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', minHeight: 0 }}
                          >
                            Mark No Show
                          </button>
                        )}
                        {!cfg.bookedStatuses.includes(row.status) && (
                          <button
                            onClick={() => updateRow(row.id, { status: cfg.defaultStatus })}
                            style={{ flex: '1 1 auto', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', color: '#4ade80', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', minHeight: 0 }}
                          >
                            Move to Booked
                          </button>
                        )}
                        <button
                          onClick={() => handleRemove(row)}
                          style={{ background: 'none', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', color: '#f87171', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', minHeight: 0, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <Trash2 size={13} /> Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
