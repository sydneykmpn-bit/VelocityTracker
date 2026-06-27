import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import RegisterForm from './RegisterForm'

export default async function RegisterPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return <RegisterForm />
}
