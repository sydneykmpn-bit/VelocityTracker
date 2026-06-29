'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import VLogo from '@/components/VLogo'

export default function PendingApprovalPage() {
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const interval = setInterval(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('approved, role')
        .eq('id', user.id)
        .single()

      if (profile?.approved) {
        clearInterval(interval)
        if (profile.role === 'admin') router.push('/admin')
        else if (profile.role === 'coach') router.push('/coach')
        else router.push('/dashboard')
      }
    }, 10000)

    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <VLogo />
      </div>

      <div style={{ width: '100%', maxWidth: '440px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '1rem', padding: '2rem', textAlign: 'center' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', background: 'rgba(8,119,160,0.15)', border: '2px solid var(--teal-primary)' }}>
          <span style={{ fontSize: '1.75rem' }}>⏳</span>
        </div>

        <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: '2rem', letterSpacing: '0.03em', marginBottom: '0.75rem' }}>
          AWAITING APPROVAL
        </h1>

        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: '1rem' }}>
          Your account has been created and is pending approval by a Velocity Fitness PH admin.
          You&apos;ll be automatically redirected once your account is approved.
        </p>

        <div style={{ background: 'rgba(8,119,160,0.1)', border: '1px solid rgba(8,119,160,0.2)', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem', fontSize: '0.875rem', color: 'var(--teal-secondary)' }}>
          📱 Contact your coach or message us on Instagram{' '}
          <strong>@velocityfitnessph</strong> to speed up approval.
        </div>

        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          This page checks for approval automatically every 10 seconds.
        </p>

        <button
          onClick={handleSignOut}
          style={{ width: '100%', background: 'none', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '0.875rem', fontSize: '0.875rem', color: 'var(--text-secondary)', cursor: 'pointer' }}
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
