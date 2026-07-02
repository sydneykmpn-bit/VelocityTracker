import { NextResponse, type NextRequest } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const { userId } = await request.json()
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
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

  // ── Workouts + exercises ──
  const { data: workouts } = await adminClient.from('workouts').select('id').eq('user_id', userId)
  const workoutIds = (workouts ?? []).map(w => w.id)
  if (workoutIds.length > 0) {
    await adminClient.from('exercises').delete().in('workout_id', workoutIds)
  }
  await adminClient.from('workouts').delete().eq('user_id', userId)

  // ── Workout plans (as coach or member) + their exercises ──
  const { data: plans } = await adminClient.from('workout_plans').select('id').or(`coach_id.eq.${userId},member_id.eq.${userId}`)
  const planIds = (plans ?? []).map(p => p.id)
  if (planIds.length > 0) {
    await adminClient.from('workout_plan_exercises').delete().in('plan_id', planIds)
  }
  await adminClient.from('workout_plans').delete().or(`coach_id.eq.${userId},member_id.eq.${userId}`)

  // ── Personal records + body measurements ──
  await adminClient.from('personal_records').delete().eq('user_id', userId)
  await adminClient.from('body_measurements').delete().eq('user_id', userId)

  // ── Leaderboard social ──
  await adminClient.from('leaderboard_reactions').delete().eq('user_id', userId)
  await adminClient.from('leaderboard_comments').delete().eq('user_id', userId)
  await adminClient.from('kudos').delete().or(`from_user.eq.${userId},to_user.eq.${userId}`)

  // ── Programs (as coach) + nested workouts/exercises/assignments ──
  const { data: programs } = await adminClient.from('programs').select('id').eq('coach_id', userId)
  const programIds = (programs ?? []).map(p => p.id)
  if (programIds.length > 0) {
    const { data: programWorkouts } = await adminClient.from('program_workouts').select('id').in('program_id', programIds)
    const programWorkoutIds = (programWorkouts ?? []).map(w => w.id)
    if (programWorkoutIds.length > 0) {
      await adminClient.from('program_workout_exercises').delete().in('program_workout_id', programWorkoutIds)
    }
    await adminClient.from('program_workouts').delete().in('program_id', programIds)
    await adminClient.from('program_assignments').delete().in('program_id', programIds)
    await adminClient.from('programs').delete().eq('coach_id', userId)
  }
  // Also remove this user's own program assignments (as a member)
  await adminClient.from('program_assignments').delete().eq('member_id', userId)

  // ── Coach notes (either side) ──
  await adminClient.from('coach_notes').delete().or(`coach_id.eq.${userId},member_id.eq.${userId}`)

  // ── Groups / classes ──
  await adminClient.from('group_members').delete().eq('member_id', userId)
  await adminClient.from('class_attendees').delete().eq('member_id', userId)
  await adminClient.from('groups').update({ coach_id: null }).eq('coach_id', userId)
  await adminClient.from('scheduled_classes').update({ coach_id: null }).eq('coach_id', userId)
  await adminClient.from('scheduled_classes').update({ created_by: null }).eq('created_by', userId)

  // ── Workout templates (created by this user) ──
  const { data: templates } = await adminClient.from('workout_templates').select('id').eq('created_by', userId)
  const templateIds = (templates ?? []).map(t => t.id)
  if (templateIds.length > 0) {
    await adminClient.from('workout_template_exercises').delete().in('template_id', templateIds)
  }
  await adminClient.from('workout_templates').delete().eq('created_by', userId)

  // ── Attendance history ──
  await adminClient.from('attendance_history').delete().eq('member_id', userId)

  // ── Profile + auth user ──
  await adminClient.from('profiles').delete().eq('id', userId)

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
