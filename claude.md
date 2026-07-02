# Velocity Tracker — CLAUDE.md

Gym workout tracker for Velocity Fitness PH.
Live: velocitytrackerph.vercel.app · Branch: `claude/velocity-fitness-workout-tracker-jgueaa`
Stack: Next.js (App Router) · TypeScript · Supabase (Auth+Postgres) · lucide-react · Vercel auto-deploy on push.
**Supabase ONLY. Never Prisma/LibSQL/Turso/src-dir.** Project ID: bgjxikbygykahgwpvlzc (ap-south-1).

## Structure
```
app/ → login, register, pending-approval, dashboard, workouts (list/[id]/[id]/edit/new),
       admin, coach, student, calendar, leaderboard, templates, profile, forgot-password,
       api/admin/delete-user
components/ → Navbar, ClassDetailModal, Skeleton, VLogo, PlanCards
lib/ → supabase/client.ts (browser), supabase/server.ts, types.ts, utils.ts, styles.ts
middleware.ts → route protection
```

## Design (CSS vars only — never hardcode hex)
```
--background #080e10 · --surface #0d1a1e · --surface-raised #111f24 · --border #1a2e34
--teal-primary #0877a0 · --teal-secondary #34bac2
--text-primary #F2F2F2 · --text-secondary #8A8A8A · --vel-text-dim #4a5a60 · --vel-success #22c55e
```
Classes: `.card-vel .card-interactive .btn-primary .btn-ghost .tag-basketball .tag-conditioning .tag-both .font-display .section-label .divider-orange .skeleton .scrollbar-hide`
Navbar background: #000000. Fonts: Bebas Neue (`--font-bebas`, display) + Inter.
Project uses inline styles referencing CSS vars, not Tailwind utility classes for layout.

## Auth flow
- Username-based login (NOT email). Supabase needs an email internally → synthesize `{username}@velocity.local`, never shown to user.
- **/register collects full profile in one form:** name, username, password, gender, age, city, contact number, injuries/medical info (captioned "visible only to you, your coaches, and admins") → creates profile with role=member, approved=false → redirects to /pending-approval
- /pending-approval: polls every 10s until admin approves → redirects to /dashboard
- /login errors: "User not found" (username doesn't exist) · "Username/Password invalid" (wrong password)
- All roles land on /dashboard after login, greeted "Hello, {name}". Role-specific panels are separate pages linked from navbar, not auto-redirected to.
- Roles: admin (/admin) · coach (/coach) · member (student panel /student if in a group)
- /profile is editable afterward — same fields as signup (name, age, city, contact number, gender, medical info) plus weight
- Full user deletion requires an API route using SUPABASE_SERVICE_ROLE_KEY (must delete from auth.users, not just profiles row)

## Auth pattern (all pages "use client", browser client only — never server-side Supabase in page components)
```tsx
const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) { router.push('/login'); return }
const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
```

## Tables (key columns)
```
profiles: name, email, username, role, gender, approved, age, city, contact_number, medical_info,
  profile_completed, weight_kg, last_seen, created_at
workouts: user_id, title, type, date, duration, notes
exercises: workout_id, name, sets, reps, weight, duration, distance, speed, notes
personal_records: user_id, exercise_name, value, unit, date, recorded_at, is_public, month_year
groups (coach_id) / group_members (is_student, assigned_coach_id)
scheduled_classes: title, type, group_id, coach_id, scheduled_date, start/end_time, location,
  is_recurring, recurrence_rule/days/end_date, parent_class_id, recurrence_series_id, created_by
class_attendees: class_id, member_id, status, rsvp_status
workout_plans: coach_id, member_id, title, description, type, scheduled_date,
  status(pending/completed/skipped/rescheduled), rescheduled_date, completed_at
workout_plan_exercises: plan_id, name, sets, reps, weight, duration, distance, notes, order_index
workout_templates (is_shared, is_visible_to_members) · workout_template_exercises
coach_notes: coach_id, member_id, note, pinned, visible_to_member
body_metrics · app_settings (id='global') · personal_records_archive · attendance_history
```
RLS: every policy uses `get_my_role()` (security definer function) to avoid infinite recursion.

## Critical rules
- Dates: ALWAYS `getLocalDateString()` from @/lib/utils (Asia/Manila timezone). NEVER `new Date().toISOString().split('T')[0]`.
- Re-fetch via a `loadData()` function after every mutation. Use `maybeSingle()` when a row may not exist.
- Modals: always centered (`alignItems:'center'`), overlay `rgba(0,0,0,0.85)`, max-width 540px, click-outside-to-close.
- Mobile: single column <768px, `px-4 md:px-6`, inputs font-size ≥16px (prevents iOS zoom), tap targets ≥44px, `overflow-x: hidden`, horizontal scroll rows use `scrollbarWidth: none`.
- **Prefer targeted edits (str_replace) over full-file rewrites** — only rewrite a full file if the change touches most of it already.
- Don't add npm packages, invent new color schemes, use `window.prompt()`, or split into new component files unless explicitly asked.
- Leaderboard: public leaderboard = only Back Squat, Deadlift, Overhead Press, Sprint. Normalize lbs→kg (×0.453592) before sorting; Sprint is lower=better. Monthly reset via Supabase Edge Function `hyper-action` on a cron job.
- Basketball workouts: inline drill form (category dropdown + drill-name autocomplete filtered by category + attempts/made fields). No location field. Workout type "both": per-exercise conditioning/basketball toggle.
- If a database change is needed, always give the SQL to run in Supabase SQL Editor first, separate from the code changes.
- Never use Prisma, LibSQL, or Turso — Supabase only.

## After every change
```bash
git add . && git commit -m "description" && git push origin claude/velocity-fitness-workout-tracker-jgueaa
```