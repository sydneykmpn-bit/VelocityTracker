import { NextResponse, type NextRequest } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Safety margin only — takes effect on Vercel plans that support it (Pro/Enterprise can go higher);
// Hobby is capped lower than 60s regardless of this setting.
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
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

    await Promise.all([
      // Chain A: workouts -> exercises
      (async () => {
        const { data: workouts } = await adminClient.from('workouts').select('id').eq('user_id', userId)
        const workoutIds = (workouts ?? []).map(w => w.id)
        if (workoutIds.length > 0) {
          await adminClient.from('exercises').delete().in('workout_id', workoutIds)
        }
        await adminClient.from('workouts').delete().eq('user_id', userId)
      })(),

      // Chain B: workout_plans (as coach or member) -> workout_plan_exercises
      (async () => {
        const { data: plans } = await adminClient.from('workout_plans').select('id').or(`coach_id.eq.${userId},member_id.eq.${userId}`)
        const planIds = (plans ?? []).map(p => p.id)
        if (planIds.length > 0) {
          await adminClient.from('workout_plan_exercises').delete().in('plan_id', planIds)
        }
        await adminClient.from('workout_plans').delete().or(`coach_id.eq.${userId},member_id.eq.${userId}`)
      })(),

      // Chain C: programs (as coach) -> program_workouts -> program_workout_exercises, program_assignments
      (async () => {
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
      })(),

      // Chain D: workout_templates (created by this user) -> workout_plans.template_id -> null, workout_template_exercises
      (async () => {
        const { data: templates } = await adminClient.from('workout_templates').select('id').eq('created_by', userId)
        const templateIds = (templates ?? []).map(t => t.id)
        if (templateIds.length > 0) {
          await adminClient.from('workout_plans').update({ template_id: null }).in('template_id', templateIds)
          await adminClient.from('workout_template_exercises').delete().in('template_id', templateIds)
        }
        await adminClient.from('workout_templates').delete().eq('created_by', userId)
      })(),

      // Chain E: personal_records
      adminClient.from('personal_records').delete().eq('user_id', userId),

      // Chain E2: personal_records_archive
      adminClient.from('personal_records_archive').delete().eq('user_id', userId),

      // Chain F: body_measurements
      adminClient.from('body_measurements').delete().eq('user_id', userId),

      // Chain F2: app_settings.updated_by -> null
      adminClient.from('app_settings').update({ updated_by: null }).eq('updated_by', userId),

      // Chain F3: profiles.approved_by -> null (self-referential: other profiles this user approved)
      adminClient.from('profiles').update({ approved_by: null }).eq('approved_by', userId),

      // Chain G: leaderboard_reactions, leaderboard_comments, kudos
      (async () => {
        await adminClient.from('leaderboard_reactions').delete().eq('user_id', userId)
        await adminClient.from('leaderboard_comments').delete().eq('user_id', userId)
        await adminClient.from('kudos').delete().or(`from_user.eq.${userId},to_user.eq.${userId}`)
      })(),

      // Chain H: coach_notes (either side)
      adminClient.from('coach_notes').delete().or(`coach_id.eq.${userId},member_id.eq.${userId}`),

      // Chain I: group_members, class_attendees
      (async () => {
        await adminClient.from('group_members').delete().eq('member_id', userId)
        await adminClient.from('group_members').update({ assigned_coach_id: null }).eq('assigned_coach_id', userId)
        await adminClient.from('class_attendees').delete().eq('member_id', userId)
      })(),

      // Chain J: groups.coach_id -> null, scheduled_classes.coach_id/created_by -> null, bball_classes.created_by -> null
      (async () => {
        await adminClient.from('groups').update({ coach_id: null }).eq('coach_id', userId)
        await adminClient.from('scheduled_classes').update({ coach_id: null }).eq('coach_id', userId)
        await adminClient.from('scheduled_classes').update({ created_by: null }).eq('created_by', userId)
        await adminClient.from('bball_classes').update({ created_by: null }).eq('created_by', userId)
      })(),

      // Chain K: program_assignments as member, attendance_history
      (async () => {
        await adminClient.from('program_assignments').delete().eq('member_id', userId)
        await adminClient.from('attendance_history').delete().eq('member_id', userId)
        await adminClient.from('attendance_history').update({ recorded_by: null }).eq('recorded_by', userId)
      })(),
    ])

    // ── Profile + auth user ──
    await adminClient.from('profiles').delete().eq('id', userId)

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('delete-user failed:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
