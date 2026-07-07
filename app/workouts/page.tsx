'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Dumbbell, Pencil, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { WorkoutCardSkeleton } from '@/components/Skeleton'

type Filter = 'all' | 'conditioning' | 'basketball' | 'both'

const PAGE_SIZE = 20

function typeBadge(type: string) {
  const map: Record<string, { bg: string; color: string; border: string; icon: string }> = {
    basketball: { bg: 'rgba(8,119,160,0.2)', color: '#34bac2', border: 'rgba(8,119,160,0.35)', icon: '🏀' },
    conditioning: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80', border: 'rgba(34,197,94,0.25)', icon: '🏋️' },
    both: { bg: 'rgba(168,85,247,0.15)', color: '#c084fc', border: 'rgba(168,85,247,0.25)', icon: '💪' },
  }
  return map[type] ?? map.both
}

const tabs: { label: string; value: Filter }[] = [
  { label: 'All', value: 'all' },
  { label: '🏋️ Conditioning', value: 'conditioning' },
  { label: '🏀 Basketball', value: 'basketball' },
  { label: '💪 Both', value: 'both' },
]

export default function WorkoutsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState<any>(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [workouts, setWorkouts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [dateRange, setDateRange] = useState({ from: '', to: '' })
  const [showDateFilter, setShowDateFilter] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // Load user once on mount
  useEffect(() => {
    async function loadUser() {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) { router.push('/login'); return }
      setUser(u)
      setProfileLoaded(true)
    }
    loadUser()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadWorkouts = useCallback(async () => {
    if (!user) return
    setLoading(true)
    let q = supabase
      .from('workouts')
      .select('id, title, type, date, created_at, duration, exercises(count)', { count: 'exact' })
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    if (filter !== 'all') q = q.eq('type', filter)
    if (dateRange.from) q = q.gte('date', dateRange.from + 'T00:00:00')
    if (dateRange.to) q = q.lte('date', dateRange.to + 'T23:59:59')
    const { data, count } = await q
    setWorkouts(data ?? [])
    setTotalCount(count ?? 0)
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filter, page, dateRange])

  useEffect(() => {
    if (!profileLoaded || !user) return
    loadWorkouts()
  }, [profileLoaded, user, loadWorkouts])

  // Reset page when filters change
  const handleFilterChange = (f: Filter) => { setFilter(f); setPage(0) }
  const handleDateChange = (field: 'from' | 'to', val: string) => {
    setDateRange(prev => ({ ...prev, [field]: val }))
    setPage(0)
  }
  const clearDateFilter = () => { setDateRange({ from: '', to: '' }); setPage(0) }

  const handleDeleteWorkout = async (workoutId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Delete this workout? This cannot be undone.')) return
    setDeleteError('')
    const supabase = createClient()

    const { error: exError } = await supabase.from('exercises').delete().eq('workout_id', workoutId)
    if (exError) {
      console.error('handleDeleteWorkout: exercises delete failed', exError)
      setDeleteError(exError.message)
      return
    }

    const { error: workoutError } = await supabase.from('workouts').delete().eq('id', workoutId)
    if (workoutError) {
      console.error('handleDeleteWorkout: workouts delete failed', workoutError)
      setDeleteError(workoutError.message)
      return
    }

    loadWorkouts()
  }

  const hasDateFilter = dateRange.from || dateRange.to
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: '2.5rem', letterSpacing: '0.03em' }}>WORKOUTS</h1>
          <Link href="/workouts/new" aria-label="Log new workout" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            background: 'var(--teal-primary)', color: 'white',
            padding: '0.75rem 1.25rem', borderRadius: '0.5rem',
            textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem', minHeight: 44,
          }}>
            <Plus size={16} /> Log Workout
          </Link>
        </div>

        {/* Filter tabs */}
        <div style={{
          display: 'flex', gap: '0.5rem', overflowX: 'auto',
          WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none',
          flexWrap: 'nowrap', marginBottom: '0.75rem', paddingBottom: '4px',
        }}>
          {tabs.map((t) => (
            <button key={t.value} onClick={() => handleFilterChange(t.value)} style={{
              background: filter === t.value ? 'var(--teal-primary)' : 'var(--surface)',
              color: filter === t.value ? 'white' : 'var(--text-secondary)',
              border: `1px solid ${filter === t.value ? 'var(--teal-primary)' : 'var(--border)'}`,
              borderRadius: '0.5rem', padding: '0.5rem 1rem',
              cursor: 'pointer', fontSize: '0.875rem', whiteSpace: 'nowrap', flexShrink: 0,
              fontWeight: filter === t.value ? 700 : 400, transition: 'all 0.2s', minHeight: 40,
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Date range filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <button
            aria-label="Toggle date filter"
            onClick={() => setShowDateFilter(!showDateFilter)}
            style={{
              background: 'none', border: `1px solid ${hasDateFilter ? 'var(--teal-primary)' : 'var(--border)'}`,
              borderRadius: '0.375rem', padding: '0.35rem 0.75rem',
              color: hasDateFilter ? 'var(--teal-secondary)' : 'var(--text-secondary)',
              fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem', minHeight: 36,
            }}
          >
            📅 {hasDateFilter ? 'Date filtered' : 'Filter by date'}
          </button>
          {hasDateFilter && (
            <button onClick={clearDateFilter} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer', minHeight: 0 }}>
              Clear ✕
            </button>
          )}
          {totalCount > 0 && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
              {totalCount} workout{totalCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {showDateFilter && (
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '140px' }}>
              <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>From</label>
              <input type="date" value={dateRange.from}
                onChange={e => handleDateChange('from', e.target.value)}
                style={{ width: '100%', background: '#0d1a1e', border: '1px solid #1a2e34', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', color: '#F2F2F2', fontSize: '0.9rem', outline: 'none' }} />
            </div>
            <div style={{ flex: 1, minWidth: '140px' }}>
              <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>To</label>
              <input type="date" value={dateRange.to}
                onChange={e => handleDateChange('to', e.target.value)}
                style={{ width: '100%', background: '#0d1a1e', border: '1px solid #1a2e34', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', color: '#F2F2F2', fontSize: '0.9rem', outline: 'none' }} />
            </div>
          </div>
        )}

        {deleteError && (
          <p style={{ color: '#f87171', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{deleteError}</p>
        )}

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <WorkoutCardSkeleton /><WorkoutCardSkeleton /><WorkoutCardSkeleton />
          </div>
        ) : workouts.length === 0 ? (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '4rem', textAlign: 'center' }}>
            <Dumbbell size={40} style={{ color: 'var(--text-secondary)', margin: '0 auto 1rem' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>No workouts found.</p>
            <Link href="/workouts/new" style={{ color: 'var(--teal-secondary)', textDecoration: 'none', fontWeight: 600, minHeight: 0, display: 'inline' }}>
              + Log workout
            </Link>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {workouts.map((w) => {
                const badge = typeBadge(w.type)
                return (
                  <div
                    key={w.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.75rem',
                      padding: '0.875rem 1rem',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--teal-primary)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)' }}
                  >
                    {/* Clickable area — takes user to workout detail */}
                    <Link
                      href={`/workouts/${w.id}`}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.875rem',
                        flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit',
                      }}
                    >
                      <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{badge.icon}</span>
                      <div style={{ minWidth: 0 }}>
                        <h3 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {w.title}
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {new Date(w.date ?? w.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          {w.duration ? ` · ${w.duration} min` : ''}
                          {(w.exercises as any[])?.[0]?.count ? ` · ${(w.exercises as any[])[0].count} exercises` : ''}
                        </p>
                      </div>
                    </Link>

                    {/* Right side: badge + action buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                      {/* Type badge */}
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 700, padding: '0.25rem 0.625rem',
                        borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.07em',
                        background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`,
                        whiteSpace: 'nowrap',
                      }}>
                        {w.type}
                      </span>

                      {/* Edit */}
                      <Link
                        href={`/workouts/${w.id}/edit`}
                        aria-label="Edit workout"
                        onClick={e => e.stopPropagation()}
                        style={{
                          background: 'none', border: '1px solid var(--border)', borderRadius: '0.375rem',
                          padding: '0.35rem', color: 'var(--text-secondary)', display: 'flex',
                          alignItems: 'center', textDecoration: 'none', minHeight: 32, minWidth: 32,
                          justifyContent: 'center',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--teal-primary)'; (e.currentTarget as HTMLAnchorElement).style.color = 'var(--teal-secondary)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-secondary)' }}
                      >
                        <Pencil size={13} />
                      </Link>

                      {/* Delete */}
                      <button
                        onClick={e => handleDeleteWorkout(w.id, e)}
                        aria-label="Delete workout"
                        style={{
                          background: 'none', border: '1px solid var(--border)', borderRadius: '0.375rem',
                          padding: '0.35rem', color: 'var(--text-secondary)', display: 'flex',
                          alignItems: 'center', cursor: 'pointer', minHeight: 32, minWidth: 32,
                          justifyContent: 'center',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#ef4444'; (e.currentTarget as HTMLButtonElement).style.color = '#ef4444' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {totalCount > PAGE_SIZE && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem' }}>
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.5rem 1rem', color: 'var(--text-secondary)', fontSize: '0.875rem', cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.4 : 1, minHeight: 40 }}
                >
                  ← Previous
                </button>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={(page + 1) * PAGE_SIZE >= totalCount}
                  style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.5rem 1rem', color: 'var(--text-secondary)', fontSize: '0.875rem', cursor: (page + 1) * PAGE_SIZE >= totalCount ? 'not-allowed' : 'pointer', opacity: (page + 1) * PAGE_SIZE >= totalCount ? 0.4 : 1, minHeight: 40 }}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
