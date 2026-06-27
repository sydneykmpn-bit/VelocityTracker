import { Suspense } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import WorkoutFormWrapper from './WorkoutFormWrapper'

export default async function NewWorkoutPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <Link href="/workouts" style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem', marginBottom: '1.5rem',
        }}>
          <ArrowLeft size={16} /> Back to Workouts
        </Link>
        <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: '2.5rem', letterSpacing: '0.03em', marginBottom: '2rem' }}>
          LOG WORKOUT
        </h1>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '1rem', padding: '2rem' }}>
          <Suspense fallback={<p style={{ color: 'var(--text-secondary)' }}>Loading…</p>}>
            <WorkoutFormWrapper />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
