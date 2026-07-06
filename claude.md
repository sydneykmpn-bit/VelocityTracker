You are a coding assistant for the Velocity Tracker app — a gym management and workout tracking system for Velocity Fitness PH.

Live URL: velocitytrackerph.vercel.app
GitHub Repo: https://github.com/sydneykmpn-bit/VelocityTracker
Branch: claude/velocity-fitness-workout-tracker-jgueaa

Tech Stack:

	•	Next.js 15, TypeScript, Tailwind CSS v4, App Router
	•	Supabase (PostgreSQL + Auth) — NO Prisma
	•	Fonts: Bebas Neue (headings/display), Inter (body)
	•	Icons: lucide-react
	•	Deployed on Vercel

Supabase Project ID: bgjxikbygykahgwpvlzc
Supabase URL: https://bgjxikbygykahgwpvlzc.supabase.co

Design System:

	•	Background: #000000
	•	Surface: #111111 / #1C1C1C
	•	Border: #272727
	•	Primary teal: #0877a0 (on dark)
	•	Secondary teal: #34bac2 (hover/light)
	•	Text primary: #F2F2F2
	•	Text secondary: #8A8A8A
	•	CSS classes: .btn-primary, .btn-ghost, .card-vel, .card-interactive, .font-display, .tag-basketball, .tag-conditioning, .section-label, .divider-orange

Three Roles:

	•	admin — full access, manages all users, groups, can do everything
	•	coach — manages members, assigns workout plans/programs, schedules classes, writes notes
	•	member — default role on register, sees own workouts, PRs, today's plan, leaderboard

Auth model (important — changed from email-based to username-based):

	•	Users register/log in with a username, not an email. Internally each account gets a synthetic email of the form {username}@velocity.local.
	•	Login looks up the username via the check_username_exists RPC before attempting sign-in.
	•	New accounts are NOT active immediately — profiles.approved starts false. Unapproved users are redirected to /pending-approval, which polls every 10s and redirects to the right dashboard once an admin approves them.
	•	First-time users may also be routed through /profile/setup to fill in gender/age/weight/etc. before reaching their dashboard (profiles.profile_completed).

Database Tables:

Core (documented in detail — keep this section accurate):
	•	profiles (id, name, email, username, role, gender, age, weight_kg, weight_unit, preferred_weight_unit, city, contact_number, medical_info, profile_completed, approved, created_at)
	•	workouts (id, user_id, title, type, notes, duration, date, created_at)
	•	exercises (id, workout_id, name, sets, reps, weight, duration, distance, notes)
	•	workout_plans (id, coach_id, member_id, title, description, type, scheduled_date, status, rescheduled_date, completed_at, auto_logged_workout_id, template_id, created_at)
	•	workout_plan_exercises (id, plan_id, name, sets, reps, weight, duration, distance, notes, order_index)
	•	personal_records (id, user_id, exercise_name, value, unit, date, recorded_at, is_public, month_year)
	•	groups (id, name, description, coach_id, created_at)
	•	group_members (id, group_id, member_id, joined_at)
	•	coach_notes (id, coach_id, member_id, note, created_at, updated_at)
	•	scheduled_classes (id, title, description, type, group_id, coach_id, scheduled_date, start_time, end_time, location, is_recurring, recurrence_rule, recurrence_days, recurrence_end_date, parent_class_id, created_by, created_at)
	•	class_attendees (id, class_id, member_id, status)

Additional feature tables (exist and are in active use — ask before making schema assumptions about these, details not fully spec'd here):
	•	body_measurements — weight/body-fat/circumference tracking over time, feeds /analytics "body" tab
	•	programs, program_workouts, program_workout_exercises, program_assignments — multi-week structured programs (deload weeks, etc.), separate from workout_plans
	•	workout_templates, workout_template_exercises — reusable workout templates, shared or personal, used on /templates
	•	leaderboard_reactions, leaderboard_comments, kudos — social features on the leaderboard
	•	attendance_history — class attendance tracking, distinct from class_attendees

Pages (kept in sync with the repo — update this list whenever a page is added/removed):

	•	/ — landing page
	•	/login — username-based login with role-based redirect
	•	/register — registers as member (server component + server-side createClient — see exception below)
	•	/forgot-password — tells users to DM @velocityfitness.ph
	•	/pending-approval — holding page for unapproved accounts, polls for approval and redirects
	•	/profile/setup — first-time profile completion form
	•	/dashboard — member dashboard (today's plans, upcoming, workouts, PRs, today's classes)
	•	/workouts — workout history with filters
	•	/workouts/new — log new workout
	•	/workouts/[id] — workout detail
	•	/workouts/[id]/edit — edit past workout
	•	/leaderboard — public PRs with featured exercise filters + gender filter
	•	/analytics — PR trends, volume, body measurements, strength standards (tabbed)
	•	/templates — shared and personal workout templates
	•	/coach — coach dashboard (members, groups, assign plans/programs, notes, workout calendar)
	•	/admin — admin panel (members, groups, workouts, leaderboard, create/delete users)
	•	/calendar — training calendar for all users, admin/coach can schedule classes

API routes (server-side only — see exception below):

	•	/api/admin/create-user — admin-only, creates auth user + profile via service-role client
	•	/api/admin/delete-user — admin-only, cascades deletion of a user's data across all tables, then deletes the auth user

Key Rules for all code:

	•	Default: all pages must have "use client" at the top, and use createClient from @/lib/supabase/client (browser client). Never import the server-side Supabase client into a client page component.
	•	Established exception: /register is a server component (async, no "use client") using createClient from @/lib/supabase/server to redirect already-logged-in users before rendering the client form. Follow this exact pattern if a new page needs a pre-render auth redirect — don't invent a different server-client usage elsewhere.
	•	API routes under app/api/** are server-only by nature: use createClient from @/lib/supabase/server to identify/authorize the caller, and a separate service-role client (@supabase/supabase-js createClient with SUPABASE_SERVICE_ROLE_KEY, never exposed to the browser) for privileged operations. Always verify the caller's role from profiles before using the service-role client.
	•	middleware.ts handles route-level auth, approval, and role gating for whole route trees (currently /admin and /coach require specific roles; unauthenticated users are redirected to /login; unapproved users to /pending-approval). Page-level auth checks (below) still apply for anything middleware doesn't cover, and as defense in depth.
	•	Auth check pattern (in page components): const { data: { user } } = await supabase.auth.getUser(); if (!user) router.push("/login");
	•	Role check: const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
	•	Re-fetch data after every mutation using a loadData() function
	•	Use CSS variables for all colors — never hardcode hex values
	•	Use font-display class for all headings
	•	All RLS policies use get_my_role() function to avoid infinite recursion
	•	Mobile responsive: 375px minimum width, px-4 md:px-6, tap targets min 44px
	•	Inputs must be font-size: 16px minimum to prevent iOS zoom
	•	After any schema, page, or route change, append a one-line entry under 'Recent Changes' below (don't rewrite the whole doc unless asked) so this file doesn't drift from the real repo

When I ask for code changes:

	•	Always provide complete file rewrites, not partial snippets
	•	Always include the git add . && git commit -m "..." && git push origin claude/velocity-fitness-workout-tracker-jgueaa command at the end
	•	If a database change is needed, provide the SQL to run in Supabase SQL Editor first, then the code
	•	Never use Prisma, LibSQL, or Turso — Supabase only
	•	Never commit build artifacts (.next/) or stray shell output — if a Windows/PowerShell cleanup command needs to run, give it as a separate instruction to run yourself, not chained into a git command

Recent Changes:

	•	Profile page (/profile): added a "Change Password" section — verifies current password via signInWithPassword, then calls supabase.auth.updateUser({ password }) to set the new one
	•	profiles gained preferred_weight_unit (text, default 'kg') — a separate toggle in /profile, distinct from weight_unit (body weight). Phase 1: stored/displayed only, not yet read by any weight-rendering component (PRs, exercise logs, plan exercises)
	•	Student Panel (/student): removed Class Schedule and Progress tabs (and their now-dead upcomingClasses/groupIds/workoutHistory state+queries); Assigned Plans tab now shows Missed above Upcoming/Pending with a Date ↑/↓ sort toggle, and pending plan cards collapse to a compact row on mobile (accordion, one expanded at a time)
	•	Dashboard (/dashboard): reordered sections to Header → Coach Note → Missed plans → Upcoming This Week → Today's Plan → This Week stats → rest unchanged
	•	components/ClassDetailModal.tsx: member "Mark Done" now shows an Undo action once a plan is completed (previously had none), matching the auto-log/undo pattern used in dashboard, student, and coach pages