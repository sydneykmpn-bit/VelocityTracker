'use client'

import { useSearchParams } from 'next/navigation'
import WorkoutForm from './WorkoutForm'

export default function WorkoutFormWrapper() {
  const searchParams = useSearchParams()
  const type = searchParams.get('type') ?? undefined
  const templateId = searchParams.get('template') ?? undefined
  return <WorkoutForm defaultType={type} templateId={templateId} />
}
