import { NextResponse, type NextRequest } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { newUsername } = await request.json()
    if (!newUsername) {
      return NextResponse.json({ error: 'newUsername is required' }, { status: 400 })
    }

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const cleanUsername = String(newUsername).toLowerCase().trim()
    if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      return NextResponse.json({ error: 'Username must be 3–20 characters, letters/numbers/underscores only.' }, { status: 400 })
    }

    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', cleanUsername)
      .neq('id', user.id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'This username is already taken.' }, { status: 409 })
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json({ error: 'Server misconfigured: missing service role key' }, { status: 500 })
    }

    const adminClient = createSupabaseClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const newEmail = `${cleanUsername}@velocity.local`

    const { error: authError } = await adminClient.auth.admin.updateUserById(user.id, {
      email: newEmail,
      email_confirm: true,
    })
    if (authError) {
      console.error('change-username failed (auth update):', authError)
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    const { error: profileError } = await adminClient
      .from('profiles')
      .update({ username: cleanUsername, email: newEmail })
      .eq('id', user.id)
    if (profileError) {
      console.error('change-username failed (profile update):', profileError)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, username: cleanUsername })
  } catch (error) {
    console.error('change-username failed:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
