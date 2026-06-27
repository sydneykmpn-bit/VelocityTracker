'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'

const inputBase: React.CSSProperties = {
  width: '100%',
  background: '#0d1a1e',
  border: '1px solid #1a2e34',
  borderRadius: '0.5rem',
  padding: '0.6rem 0.875rem',
  color: '#F2F2F2',
  fontSize: '0.875rem',
  outline: 'none',
}

const labelBase: React.CSSProperties = {
  display: 'block',
  fontSize: '0.7rem',
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: '0.375rem',
}

export default function CoachPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [selectedMember, setSelectedMember] = useState('')
  const [planTitle, setPlanTitle] = useState('')
  const [planDesc, setPlanDesc] = useState('')
  const [planType, setPlanType] = useState('conditioning')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(true)

  const loadPlans = async (supabase: ReturnType<typeof createClient>, coachId: string) => {
    const { data } = await supabase
      .from('workout_plans')
      .select('*, profiles!workout_plans_member_id_fkey(name)')
      .eq('coach_id', coachId)
    setPlans(data ?? [])
  }

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (prof?.role !== 'coach') { router.push('/dashboard'); return }
      setProfile(prof)

      const { data: memberData } = await supabase
        .from('profiles')
        .select('id, name, email, workouts(count)')
        .eq('role', 'member')
      setMembers(memberData ?? [])

      await loadPlans(supabase, user.id)
      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!planTitle.trim()) { setError('Plan title is required'); return }
    setSaving(true)
    setError('')
    setSuccess('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error: err } = await supabase.from('workout_plans').insert({
      coach_id: user.id,
      member_id: selectedMember || null,
      title: planTitle.trim(),
      description: planDesc.trim() || null,
      type: planType,
    })

    if (err) { setError(err.message); setSaving(false); return }
    setSuccess('Plan assigned successfully!')
    setPlanTitle(''); setPlanDesc(''); setSelectedMember('')
    await loadPlans(supabase, user.id)
    setSaving(false)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      <Navbar userName={profile?.name ?? 'Coach'} userRole="coach" />
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: '2.5rem', letterSpacing: '0.03em', marginBottom: '2rem' }}>
          COACH DASHBOARD
        </h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>

          {/* Members */}
          <div>
            <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', letterSpacing: '0.03em', marginBottom: '1rem' }}>
              MEMBERS ({members.length})
            </h2>
            {members.length === 0 ? (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '2rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No members registered yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {members.map((m) => (
                  <div key={m.id} style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: '0.75rem', padding: '1.25rem',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <h3 style={{ fontWeight: 600, marginBottom: '0.2rem' }}>{m.name}</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{m.email}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.75rem', color: 'var(--teal-secondary)', lineHeight: 1 }}>
                        {(m.workouts as any[])?.[0]?.count ?? 0}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>workouts</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assign Plan + Plan List */}
          <div>
            <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', letterSpacing: '0.03em', marginBottom: '1rem' }}>
              ASSIGN PLAN
            </h2>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '1.5rem' }}>
              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', color: '#f87171', fontSize: '0.875rem' }}>
                  {error}
                </div>
              )}
              {success && (
                <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', color: '#4ade80', fontSize: '0.875rem' }}>
                  {success}
                </div>
              )}
              <form onSubmit={handleAssign} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={labelBase}>Member (optional)</label>
                  <select value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)} style={{ ...inputBase, cursor: 'pointer' }}>
                    <option value="">All members</option>
                    {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelBase}>Plan Title *</label>
                  <input type="text" value={planTitle} onChange={(e) => setPlanTitle(e.target.value)} required style={inputBase} placeholder="e.g. Week 1 Strength Block" />
                </div>
                <div>
                  <label style={labelBase}>Description</label>
                  <textarea value={planDesc} onChange={(e) => setPlanDesc(e.target.value)} style={{ ...inputBase, minHeight: '70px', resize: 'vertical' }} placeholder="Plan details…" />
                </div>
                <div>
                  <label style={labelBase}>Type</label>
                  <select value={planType} onChange={(e) => setPlanType(e.target.value)} style={{ ...inputBase, cursor: 'pointer' }}>
                    <option value="conditioning">Conditioning</option>
                    <option value="basketball">Basketball</option>
                    <option value="both">Both</option>
                  </select>
                </div>
                <button type="submit" disabled={saving} style={{
                  background: saving ? '#0d1a1e' : 'var(--teal-primary)', color: 'white',
                  border: 'none', borderRadius: '0.5rem', padding: '0.75rem',
                  fontWeight: 700, fontSize: '0.875rem', cursor: saving ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s',
                }}>
                  {saving ? 'Assigning…' : 'Assign Plan'}
                </button>
              </form>
            </div>

            <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.25rem', letterSpacing: '0.03em', marginBottom: '0.75rem' }}>
              ASSIGNED PLANS
            </h2>
            {plans.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No plans assigned yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {plans.map((plan) => (
                  <div key={plan.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                      <h3 style={{ fontWeight: 600, fontSize: '0.875rem' }}>{plan.title}</h3>
                      <span style={{
                        fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: '999px',
                        background: 'rgba(8,119,160,0.15)', color: 'var(--teal-secondary)',
                        fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
                      }}>
                        {plan.type}
                      </span>
                    </div>
                    {plan.profiles?.name && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--teal-secondary)' }}>→ {plan.profiles.name}</p>
                    )}
                    {plan.description && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{plan.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
