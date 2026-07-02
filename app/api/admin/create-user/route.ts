import { NextResponse, type NextRequest } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const { name, username, password, role, gender } = await request.json()
  if (!name || !username || !password || !role) {
    return NextResponse.json({ error: 'name, username, password, and role are required' }, { status: 400 })
  }
  const cleanUsername = String(username).toLowerCase().trim()
  if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
    return NextResponse.json({ error: 'Username must be 3–20 characters, letters/numbers/underscores only.' }, { status: 400 })
  }

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (callerProfile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceRoleKey || !supabaseUrl) {
    return NextResponse.json({ error: 'Server misconfigured: missing service role key' }, { status: 500 })
  }

  const adminClient = createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: existing } = await adminClient
    .from('profiles')
    .select('id')
    .ilike('username', cleanUsername)
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ error: 'This username is already taken.' }, { status: 409 })
  }

  const email = `${cleanUsername}@velocity.local`
  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role, gender: gender || null, username: cleanUsername },
  })
  if (createError || !created.user) {
    return NextResponse.json({ error: createError?.message ?? 'Failed to create user' }, { status: 500 })
  }

  const { error: profileError } = await adminClient
    .from('profiles')
    .upsert({
      id: created.user.id,
      name,
      email,
      username: cleanUsername,
      role,
      gender: gender || null,
      approved: true,
      profile_completed: true,
    }, { onConflict: 'id' })

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, userId: created.user.id })
}
