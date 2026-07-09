You are a coding assistant for the Velocity Tracker app — a gym management and workout tracking system for Velocity Fitness PH.

Live URL: velocitytrackerph.vercel.app
GitHub Repo: https://github.com/sydneykmpn-bit/VelocityTracker
Branch: claude/velocity-fitness-workout-tracker-jgueaa

Tech Stack:

	•	Next.js 15, TypeScript, Tailwind CSS v4, App Router
	•	Supabase (PostgreSQL + Auth) — NO Prisma
	•	Fonts: Bebas Neue (headings/display), Inter (body)
	•	Icons: lucide-react (no emoji anywhere in the UI — use lucide icons for everything decorative)
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

Three Roles + Athlete status:

	•	admin — full access everywhere, including any coach's data
	•	coach — manages ONLY their own groups/programs/plans/notes (RLS-enforced ownership, not just role — see Key Rules)
	•	member — default on register; becomes an "athlete" (isStudent) if in any group, assigned any plan/program, or added via coach_students. Athlete status grants /student ("Athlete Panel") access and swaps the mobile bottom nav's role tab accordingly

Auth model:

	•	Username-based login, not email. Each account gets a synthetic email {username}@velocity.local (login reconstructs this directly from the entered username — changing a username must update auth.users.email + profiles.email together, see /api/user/change-username).
	•	check_username_exists RPC checks availability pre-auth.
	•	New accounts need admin approval (profiles.approved) before reaching their dashboard — unapproved users sit on /pending-approval (polls every 10s).
	•	First login may route through /profile/setup (profiles.profile_completed).

Database Tables:

Core:
	•	profiles (id, name, email, username, role, gender, age, weight_kg, weight_unit, preferred_weight_unit, city, contact_number, medical_info, goals, profile_completed, approved, approved_by, created_at)
	•	workouts (id, user_id, title, type, notes, duration, date, created_at)
	•	exercises (id, workout_id, name, sets, reps, weight, duration, distance, notes, set_details jsonb) — set_details is nullable, populated only when a workout is logged in "Advanced Mode" (per-set reps/weight); sets/reps/weight always stay populated as a computed summary (max-weight set) even in advanced mode, so existing PR/analytics code keeps working unchanged
	•	workout_plans (id, coach_id, member_id, title, description, type, scheduled_date, status['pending'|'completed'|'skipped'|'rescheduled'], rescheduled_date, completed_at, auto_logged_workout_id, template_id, created_at) — 'rescheduled' is treated as equally "active/upcoming" as 'pending' everywhere (auto-skip, filters, action buttons)
	•	workout_plan_exercises (id, plan_id, name, sets, reps, weight, duration, distance, notes, order_index)
	•	personal_records (id, user_id, exercise_name, value, unit, date, recorded_at, is_public, month_year) + personal_records_archive (same shape, archived rows past their month — original_id references the source row; archival is is_public=false on the source, never a delete, so "My PRs" always keeps full history)
	•	groups (id, name, description, coach_id, created_at), group_members (id, group_id, member_id, assigned_coach_id, joined_at)
	•	coach_notes (id, coach_id, member_id, note, visible_to_member, created_at, updated_at)
	•	coach_students (coach_id, member_id) — explicit coach-adds-athlete link; AUTHORITATIVE source for "my athletes" (loadMyMembers) and athlete-panel access, independent of groups/plans/programs. Any first-time assignment (add to group, assign plan, assign program) upserts here automatically — don't re-derive "is my athlete" from historical group/plan/program rows, that was the bug that made athlete removal not stick
	•	scheduled_classes (id, title, description, type, group_id, coach_id, scheduled_date, start_time, end_time, location, is_recurring, recurrence_rule, recurrence_days, recurrence_end_date, gender_restriction, parent_class_id, created_by, created_at) — creation/edit/delete is ADMIN-ONLY now (coaches lost this entirely, view-only for them); class_attendees (id, class_id, member_id, status, occurrence_date) — occurrence_date scopes attendance to one specific date of a recurring series, required on every query/insert or RSVPs leak across all occurrences
	•	bball_classes (id, title, description, day_of_week['sunday'..'saturday' lowercase], start_time, end_time, gender_restriction, max_slots, recurrence_end_date, created_by, created_at) + bball_class_signups (id, class_id, user_id, occurrence_date, created_at) — separate, admin-only-creatable basketball class system (distinct from scheduled_classes). Weekly recurring, optionally capped by recurrence_end_date. Capacity enforced server-side by trigger check_bball_class_capacity (raises on insert past max_slots — client catches this as "class just filled up"). Gender rule: 'other' bypasses any men/women restriction. Shared UI in components/BballClassModal.tsx used by /classes, /calendar, and admin's Classes tab. Occurrence-date expansion logic lives in lib/utils.ts's bballOccurrencesInRange()

Additional feature tables (ask before assuming exact columns):
	•	body_measurements — weight/body-fat/circumference over time; feeds /analytics "body" tab AND Athlete Panel's Body Metrics tab (same table — body_metrics is an old, now-unused duplicate table, don't write to it)
	•	athlete_programs (id, coach_id, member_id, created_at) + athlete_program_exercises (id, athlete_program_id, day_of_week[0=Sun..6=Sat], name, exercise_type, sets, reps, weight, notes, created_at) — one flat per-athlete exercise table per coach (no weeks/workout titles); deleting an athlete_programs row cascades its exercises. Shared UI in components/AthleteProgramTable.tsx (coach: editable, cell edits commit on blur/select-change directly to Supabase; student: read-only), both with Search/Type/Day filters. Superseded the old programs/program_workouts/program_workout_exercises/program_assignments model — those tables still exist in the DB but nothing reads/writes them anymore
	•	programs, program_workouts, program_workout_exercises, program_assignments — legacy multi-week program tables, no longer used by any page (see athlete_programs above)
	•	workout_templates, workout_template_exercises — reusable templates (shared/personal/default), used on /templates and via "Load from Template" in Log Workout + Assign Plan
	•	attendance_history — distinct from class_attendees
	•	leaderboard_reactions — Discord-style toggle reactions (emoji count only, no reactor identity shown); leaderboard_comments — own-comment delete only
	•	kudos — dead table, feature removed from UI, don't build against it

Pages (keep in sync with the repo):

	•	/, /login, /register (server component + server-side createClient — see exception below), /forgot-password, /pending-approval, /profile/setup, /profile (includes change password + change username + goals + preferred weight unit)
	•	/dashboard — role-aware (member/coach/admin see different widgets); order for members: header → missed plans → coach note → upcoming this week → today's plan → this week stats
	•	/workouts, /workouts/new, /workouts/[id], /workouts/[id]/edit
	•	/leaderboard — public board (current month only, older PRs auto-archive on load via RPC) + My PRs (full history)
	•	/analytics — PR trends, volume, body measurements (no Standards tab — removed)
	•	/templates
	•	/student ("Athlete Panel") — Assigned Plans, My PRs, Body Metrics, Programs (read-only flat exercise table per assigning coach, via athlete_programs)
	•	/coach — My Athletes, Groups, Assign Plan, Assigned Plans, Programs (per-athlete flat exercise table, one athlete_programs row per athlete), Workout Calendar, Notes — all scoped to the coach's own data only
	•	/admin — Members, Coaches, Groups, Classes (bball_classes CRUD), Settings — full access to everyone's data
	•	/calendar — shared month/week-toggle calendar (components/CalendarGrid.tsx), shows plans/scheduled_classes/bball_classes for whoever's viewing; no class-creation UI here (admin creates from /admin or /classes)
	•	/classes — browsable weekly bball_classes slots, join/leave, admin can create/edit inline

API routes (server-side, service-role client for privileged ops):

	•	/api/admin/create-user, /api/admin/delete-user (full cascade across every table + FK, admin-only), /api/admin/reset-password (admin-only)
	•	/api/user/change-username (self-service, updates auth email + profiles together)

Key Rules for all code:

	•	Default: "use client" + createClient from @/lib/supabase/client. Never import the server-side client into a client page component. Exception: /register (server component, pre-render redirect). API routes use @/lib/supabase/server + service-role client, always verify caller role first.
	•	middleware.ts gates /admin and /coach by role; unapproved users → /pending-approval. Page-level auth checks still apply as defense in depth: const { data: { user } } = await supabase.auth.getUser(); if (!user) router.push("/login")
	•	Coach-owned data (groups, group_members, athlete_programs, athlete_program_exercises, workout_plans, workout_plan_exercises) is RLS-scoped to coach_id = auth.uid() (admin bypasses everywhere) — a coach cannot see or touch another coach's data. Any new coach-facing feature on these tables must follow this ownership pattern, not just a role check.
	•	Every Postgres function needing SECURITY DEFINER must be reviewed for what it actually exposes (we've found views/functions that leaked all-user data this way) — never grant it without checking.
	•	When embedding the same joined table twice via two different foreign keys in one Supabase .select(), alias each one explicitly (e.g. member:profiles!fk_name(...), coach:profiles!fk_name(...)) — PostgREST errors ("table name specified more than once") without aliasing, and every consumer of that query's result must be updated to match the new key names.
	•	Always capture and surface { error } on every mutation (insert/update/delete) with a visible error state — silent failures disguised as success has been the single most common bug class in this app.
	•	Re-fetch data after every mutation using a loadData() function. Use CSS variables for colors, font-display for headings. Mobile: 375px min width, 44px tap targets, 16px min input font-size (iOS zoom).
	•	After any schema, page, or route change, append a one-line entry under Recent Changes below.

When I ask for code changes:

	•	Always provide complete file rewrites, not partial snippets
	•	Always include the git add . && git commit -m "..." && git push origin claude/velocity-fitness-workout-tracker-jgueaa command at the end
	•	If a database change is needed, provide the SQL to run in Supabase SQL Editor first, then the code
	•	Never use Prisma, LibSQL, or Turso — Supabase only
	•	Never commit build artifacts (.next/) or stray shell output

Recent Changes:

	•	(add new one-line entries here going forward — keep each to one line describing current behavior, not the bug/history that led to it)
	•	Programs tab (coach + student) rebuilt on athlete_programs/athlete_program_exercises: one flat, directly-editable per-athlete exercise table (Day/Name/Type/Sets/Reps/Weight/Notes) via components/AthleteProgramTable.tsx, replacing the old multi-week program builder; coach adds/removes athletes and rows inline with cell edits committing on blur/select-change, student view is read-only with the same Search/Type/Day filters.
	•	Waitlist/no-show/payment tracking added for both bball_classes (bball_class_signups.status) and scheduled_classes (class_attendees.status; 'absent' doubles as its no-show state; scheduled_classes gains nullable max_slots), both signup tables gain payment_status (unpaid/paid_online/paid_cash) + amount_paid + guest_name (member_id/user_id now nullable — a row has exactly one of member id or guest_name, enforced by a check constraint, for walk-ins with no account). Self-joins now land in 'pending' and need coach/admin approval; admin/coach-added attendees (existing member or guest, via the roster page's Add Attendee toggle) skip straight to booked/scheduled. Capacity triggers (check_bball_class_capacity, check_scheduled_class_capacity — see supabase_class_waitlist_payment_tracking.sql, supabase_class_guest_attendees.sql, supabase_class_pending_approval.sql) fire on insert or update and auto-waitlist any transition into booked/scheduled once the class is full, whether that's a fresh admin-add or an Approve action. Members never see other attendees' names/payment info, see "{spots left}" instead of a headcount, and see their own payment/pending/waitlist status; the Join button becomes "Cancel Request"/"Leave" depending on status (lib/utils.ts's joinBballClass() centralizes the bball insert+status readback). Admin/coach clicking any class (bball or scheduled) navigates to a dedicated roster page (components/ClassRosterView.tsx, routed at app/classes/[id]/page.tsx and app/calendar/classes/[id]/page.tsx via a ?date= query param) instead of opening a modal — Pending/Booked/Waitlist/No Show tabs with search + payment-status filter, an inline per-row payment editor with an explicit Save button, Approve/Reject on pending rows, and mark-no-show/move-to-booked/remove on the rest.
	•	Admin panel's Coaches and Classes tabs were removed (app/admin/page.tsx) — coach accounts are managed from the Members tab's role filter/dropdown, and bball_classes creation/edit lives solely in app/classes/page.tsx's admin-only "+ Add Class" button (components/BballClassModal.tsx's BballClassFormModal).