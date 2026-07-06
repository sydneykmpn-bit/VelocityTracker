'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function DeleteWorkoutButton({ workoutId }: { workoutId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleDelete = async () => {
    if (!confirming) { setConfirming(true); return }
    setLoading(true)
    setError('')
    const supabase = createClient()

    const { error: exError } = await supabase.from('exercises').delete().eq('workout_id', workoutId)
    if (exError) {
      console.error('handleDelete: exercises delete failed', exError)
      setError(exError.message)
      setLoading(false)
      return
    }

    const { error: workoutError } = await supabase.from('workouts').delete().eq('id', workoutId)
    if (workoutError) {
      console.error('handleDelete: workouts delete failed', workoutError)
      setError(workoutError.message)
      setLoading(false)
      return
    }

    router.push('/workouts')
    router.refresh()
  }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.5rem' }}>
      <button
        onClick={handleDelete}
        disabled={loading}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          background: confirming ? 'rgba(239,68,68,0.15)' : 'transparent',
          color: confirming ? '#f87171' : 'var(--text-secondary)',
          border: `1px solid ${confirming ? 'rgba(239,68,68,0.4)' : 'var(--border)'}`,
          borderRadius: '0.5rem', padding: '0.75rem 1.25rem',
          cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.875rem',
          fontWeight: 500, transition: 'all 0.2s',
        }}
      >
        <Trash2 size={16} />
        {loading ? 'Deleting…' : confirming ? 'Confirm Delete' : 'Delete Workout'}
      </button>
      {error && (
        <p style={{ color: '#f87171', fontSize: '0.8rem' }}>{error}</p>
      )}
    </div>
  )
}
