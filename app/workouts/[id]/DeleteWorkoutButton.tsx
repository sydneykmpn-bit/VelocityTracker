'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function DeleteWorkoutButton({ workoutId }: { workoutId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!confirming) { setConfirming(true); return }
    setLoading(true)
    const supabase = createClient()
    await supabase.from('workouts').delete().eq('id', workoutId)
    router.push('/workouts')
    router.refresh()
  }

  return (
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
  )
}
