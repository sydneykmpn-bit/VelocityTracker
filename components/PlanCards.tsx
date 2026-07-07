'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dumbbell, BicepsFlexed, ClipboardList, CheckCircle2, Calendar, SkipForward, XCircle } from 'lucide-react'
import BasketballIcon from '@/components/icons/BasketballIcon'

const inputBase: React.CSSProperties = {
  background: '#0d1a1e', border: '1px solid #1a2e34', borderRadius: '0.5rem',
  padding: '0.6rem 0.875rem', color: '#F2F2F2', fontSize: '1rem', outline: 'none', width: '100%',
}

export function typeBadge(type: string) {
  const map: Record<string, { bg: string; color: string; border: string; icon: typeof Dumbbell }> = {
    basketball: { bg: 'rgba(8,119,160,0.2)', color: '#34bac2', border: 'rgba(8,119,160,0.35)', icon: BasketballIcon },
    conditioning: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80', border: 'rgba(34,197,94,0.25)', icon: Dumbbell },
    both: { bg: 'rgba(168,85,247,0.15)', color: '#c084fc', border: 'rgba(168,85,247,0.25)', icon: BicepsFlexed },
  }
  return map[type] ?? map.conditioning
}

export function TodayPlanCard({ plan, onUpdate }: { plan: any; onUpdate: () => void }) {
  const supabase = createClient()
  const [expanded, setExpanded] = useState(false)
  const [showReschedule, setShowReschedule] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [justCompleted, setJustCompleted] = useState(false)
  const [showDurationInput, setShowDurationInput] = useState(false)
  const [durationMinutes, setDurationMinutes] = useState('')

  const handleComplete = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: newWorkout } = await supabase.from('workouts').insert({
      user_id: user.id,
      title: plan.title,
      type: plan.type,
      notes: `Auto-logged from assigned plan. ${plan.description || ''}`.trim(),
      duration: durationMinutes ? Number(durationMinutes) : null,
      date: new Date().toISOString(),
    }).select().single()

    if (newWorkout && (plan.workout_plan_exercises?.length ?? 0) > 0) {
      await supabase.from('exercises').insert(
        plan.workout_plan_exercises
          .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
          .map((ex: any) => ({
            workout_id: newWorkout.id,
            name: ex.name, sets: ex.sets, reps: ex.reps,
            weight: ex.weight, duration: ex.duration,
            distance: ex.distance, notes: ex.notes,
          }))
      )
    }

    await supabase.from('workout_plans').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      auto_logged_workout_id: newWorkout?.id ?? null,
    }).eq('id', plan.id)

    setJustCompleted(true)
    setTimeout(() => setJustCompleted(false), 3000)
    setShowDurationInput(false)
    setDurationMinutes('')
    onUpdate()
    setLoading(false)
  }
  const handleSkip = async () => {
    setLoading(true)
    await supabase.from('workout_plans').update({ status: 'skipped' }).eq('id', plan.id)
    onUpdate(); setLoading(false)
  }
  const handleReschedule = async () => {
    if (!newDate) return
    setLoading(true)
    await supabase.from('workout_plans').update({ status: 'pending', scheduled_date: newDate, rescheduled_date: newDate }).eq('id', plan.id)
    setShowReschedule(false); onUpdate(); setLoading(false)
  }

  const tb = typeBadge(plan.type)
  const exercises: any[] = plan.workout_plan_exercises ?? []

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem',
      padding: '1.25rem', marginBottom: '0.75rem', borderLeft: '3px solid var(--teal-primary)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--teal-secondary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <ClipboardList size={11} /> From Coach {plan.profiles?.name ?? 'Coach'}
          </p>
          <h3 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.25rem', letterSpacing: '0.03em' }}>{plan.title}</h3>
          {plan.description && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{plan.description}</p>}
        </div>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.25rem 0.5rem', borderRadius: '999px', textTransform: 'uppercase' as const, background: tb.bg, color: tb.color, border: `1px solid ${tb.border}`, whiteSpace: 'nowrap' }}>
          {plan.type}
        </span>
      </div>

      {exercises.length > 0 && (
        <button onClick={() => setExpanded(!expanded)} style={{ background: 'none', border: 'none', color: 'var(--teal-secondary)', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.75rem', padding: 0, minHeight: 0 }}>
          {expanded ? '▲' : '▼'} {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}
        </button>
      )}

      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '0.875rem' }}>
          {exercises.sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)).map((ex: any) => (
            <div key={ex.id} style={{ background: '#0a1518', borderRadius: '0.375rem', padding: '0.625rem 0.75rem' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>{ex.name}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.2rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {ex.sets && ex.reps && <span>{ex.sets}×{ex.reps} reps</span>}
                {ex.weight && <span>{ex.weight}kg</span>}
                {ex.duration && <span>{ex.duration}min</span>}
                {ex.distance && <span>{ex.distance}km</span>}
                {ex.notes && <span style={{ fontStyle: 'italic' }}>{ex.notes}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showReschedule && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} min={new Date().toISOString().split('T')[0]} style={{ ...inputBase, flex: 1 }} />
          <button onClick={handleReschedule} disabled={loading || !newDate} style={{ background: 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', minHeight: 0 }}>Confirm</button>
          <button onClick={() => setShowReschedule(false)} style={{ background: 'none', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.875rem', cursor: 'pointer', minHeight: 0 }}>Cancel</button>
        </div>
      )}

      {showDurationInput && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <input
            type="number" min="0" placeholder="Duration (minutes) — optional"
            value={durationMinutes} onChange={e => setDurationMinutes(e.target.value)}
            style={{ ...inputBase, flex: 1 }}
          />
          <button onClick={handleComplete} disabled={loading} style={{ background: 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', minHeight: 0 }}>Confirm</button>
          <button onClick={() => { setShowDurationInput(false); setDurationMinutes('') }} disabled={loading} style={{ background: 'none', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.875rem', cursor: 'pointer', minHeight: 0 }}>Cancel</button>
        </div>
      )}

      {justCompleted && (
        <div style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '0.5rem', padding: '0.75rem', fontSize: '0.875rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <CheckCircle2 size={15} /> Workout logged automatically to your workout history!
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button onClick={() => setShowDurationInput(v => !v)} disabled={loading} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', background: 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.65rem', fontSize: '0.875rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          <CheckCircle2 size={15} /> Mark Done
        </button>
        <button onClick={() => setShowReschedule(!showReschedule)} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.65rem 0.875rem', fontSize: '0.875rem', cursor: 'pointer' }}>
          <Calendar size={15} /> Move Day
        </button>
        <button onClick={handleSkip} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.65rem 0.875rem', fontSize: '0.875rem', cursor: 'pointer' }}>
          <SkipForward size={15} /> Skip
        </button>
      </div>
    </div>
  )
}

export function SkippedPlansSection({ plans, userId, supabase, onUpdate }: { plans: any[]; userId: string | null; supabase: any; onUpdate: () => void }) {
  const [reschedulingId, setReschedulingId] = useState<string | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [saving, setSaving] = useState(false)

  const handleConfirm = async (planId: string) => {
    if (!rescheduleDate || !userId) return
    setSaving(true)
    await supabase.from('workout_plans').update({
      status: 'pending',
      scheduled_date: rescheduleDate,
      rescheduled_date: rescheduleDate,
    }).eq('id', planId)
    setReschedulingId(null)
    setRescheduleDate('')
    setSaving(false)
    onUpdate()
  }

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.1rem', letterSpacing: '0.03em', marginBottom: '0.5rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <XCircle size={16} /> MISSED
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        {plans.map(p => (
          <div key={p.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.625rem 0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
              <div>
                <p style={{ fontSize: '0.8rem', fontWeight: 600 }}>{p.title}</p>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{p.scheduled_date}</p>
              </div>
              {reschedulingId !== p.id && (
                <button
                  onClick={() => { setReschedulingId(p.id); setRescheduleDate('') }}
                  style={{ background: 'rgba(8,119,160,0.15)', border: '1px solid rgba(8,119,160,0.35)', borderRadius: '0.375rem', padding: '0.3rem 0.5rem', color: 'var(--teal-secondary)', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', minHeight: 0, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <Calendar size={12} /> Reschedule
                </button>
              )}
            </div>
            {reschedulingId === p.id && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.625rem', flexWrap: 'wrap' }}>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={e => setRescheduleDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  style={{ flex: 1, minWidth: '130px', background: '#0d1a1e', border: '1px solid #1a2e34', borderRadius: '0.375rem', padding: '0.4rem 0.625rem', color: '#F2F2F2', fontSize: '0.875rem', outline: 'none' }}
                />
                <button
                  onClick={() => handleConfirm(p.id)}
                  disabled={!rescheduleDate || saving}
                  style={{ background: 'var(--teal-primary)', color: 'white', border: 'none', borderRadius: '0.375rem', padding: '0.4rem 0.75rem', fontSize: '0.8rem', fontWeight: 700, cursor: rescheduleDate ? 'pointer' : 'not-allowed', minHeight: 0 }}
                >
                  Confirm
                </button>
                <button
                  onClick={() => setReschedulingId(null)}
                  style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '0.375rem', padding: '0.4rem 0.625rem', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer', minHeight: 0 }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
