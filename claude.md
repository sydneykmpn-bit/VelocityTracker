# Velocity Tracker — Claude Code Instructions

## Project Identity
- **App:** Velocity Fitness PH — gym workout tracker
- **Live URL:** https://velocitytrackerph.vercel.app
- **Repo branch:** `claude/velocity-fitness-workout-tracker-jgueaa`
- **Stack:** Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · Supabase (Auth + PostgreSQL) · Lucide React

## File Structure
```
app/
  page.tsx              → redirects to /login
  layout.tsx            → fonts: Bebas Neue (--font-bebas) + Inter
  globals.css           → all CSS variables + utility classes
  login/                → LoginForm.tsx + page.tsx
  register/             → RegisterForm.tsx + page.tsx
  pending-approval/     → waiting room for unapproved accounts
  dashboard/            → unified dashboard (all roles)
  workouts/             → list, [id], [id]/edit, new/
  admin/                → admin panel (admin role only)
  coach/                → coach panel (coach role only)
  student/              → student panel (member in a group)
  calendar/             → monthly training calendar
  leaderboard/          → public PRs + My PRs
  templates/            → workout template library
  profile/              → user profile edit
  forgot-password/      → contact @velocityfitness.ph
components/
  Navbar.tsx            → role-aware nav with avatar dropdown
  ClassDetailModal.tsx  → class detail + RSVP + attendance
  Skeleton.tsx          → loading skeletons
  VLogo.tsx             → Velocity Fitness PH logo
lib/
  supabase/client.ts    → browser Supabase client
  supabase/server.ts    → server Supabase client
  types.ts              → Profile, Workout, Exercise, WorkoutPlan, etc.
  utils.ts              → getLocalDateString(), getLocalDisplayDate(), sortRecords(), calculateStreak()
  styles.ts             → shared style constants
middleware.ts           → route protection (redirects unapproved to /pending-approval)
```

## Design System — NEVER hardcode colors
```
--background: #080e10       Dark page background
--surface: #0d1a1e          Card/panel background
--surface-raised: #111f24   Elevated surface
--border: #1a2e34           Default border
--teal-primary: #0877a0     Primary CTA, active states
--teal-secondary: #34bac2   Accent text, icons, highlights
--text-primary: #F2F2F2     Main text
--text-secondary: #8A8A8A   Muted text
--vel-text-dim: #4a5a60     Very muted
--vel-success: #22c55e      Success green
```

Always use CSS variables. Never use hex values directly in JSX/TSX.

## CSS Utility Classes (use these, don't reinvent)
```
.card-vel          → dark card with border + border-radius
.btn-primary       → teal filled button
.btn-ghost         → transparent button with border
.tag-basketball    → blue pill badge
.tag-conditioning  → green pill badge
.tag-both          → purple pill badge
.font-display      → Bebas Neue font
.section-label     → teal uppercase tracking label
.skeleton          → loading skeleton animation
.scrollbar-hide    → hide scrollbar
```

## Inline Style Pattern (this project uses inline styles)
```tsx
// Cards
style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.25rem' }}

// Type badges (use typeBadge() helper in dashboard, or tag-* classes)
function typeBadge(type: string) {
  const map = {
    basketball: { bg: 'rgba(8,119,160,0.2)', color: '#34bac2', border: 'rgba(8,119,160,0.35)', icon: '🏀' },
    conditioning: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80', border: 'rgba(34,197,94,0.25)', icon: '🏋️' },
    both: { bg: 'rgba(168,85,247,0.15)', color: '#c084fc', border: 'rgba(168,85,247,0.25)', icon: '💪' },
  }
  return map[type] ?? map.both
}
```

## Auth & Roles
```
Three roles: admin · coach · member
All pages: "use client" — use createClient() from @/lib/supabase/client
Auth check pattern:
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { router.push('/login'); return }

Role check:
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

After login: ALL roles go to /dashboard
Admin Panel: /admin (admin only)
Coach Panel: /coach (coach only)
Student Panel: /student (member in a group)

New signups → /pending-approval (admin must approve before login works)
profiles.approved = false → blocked from logging in
```

## Database Tables
```
profiles          id, name, email, role, gender, age, weight_kg, weight_unit, approved, last_seen
workouts          id, user_id, title, type, date, duration, notes
exercises         id, workout_id, name, sets, reps, weight, duration, distance, speed, notes
personal_records  id, user_id, exercise_name, value, unit, date, recorded_at, is_public, month_year
groups            id, name, description, coach_id
group_members     id, group_id, member_id, is_student, assigned_coach_id
scheduled_classes id, title, type, group_id, coach_id, scheduled_date, start_time, end_time,
                  location, is_recurring, recurrence_rule, recurrence_days, recurrence_end_date,
                  parent_class_id, recurrence_series_id, created_by
class_attendees   id, class_id, member_id, status, rsvp_status
workout_plans     id, coach_id, member_id, title, description, type, scheduled_date, status,
                  rescheduled_date, completed_at, auto_logged_workout_id, template_id
workout_plan_exercises  id, plan_id, name, sets, reps, weight, duration, distance, notes, order_index
workout_templates id, created_by, title, description, type, is_shared, is_default, is_visible_to_members
workout_template_exercises  id, template_id, name, sets, reps, weight, duration, distance, notes, order_index
coach_notes       id, coach_id, member_id, note, pinned, visible_to_member, created_at, updated_at
body_metrics      id, user_id, weight_kg, weight_unit, recorded_at, notes
app_settings      id='global', require_approval, instagram_handle, public_pr_exercises
personal_records_archive  archived past month PRs
attendance_history  id, member_id, class_id, class_title, class_date, status, recorded_by
```

## Supabase Query Patterns
```tsx
// Always create client at component level, not inside useEffect
const supabase = createClient()

// Re-fetch after mutations using a loadData() function pattern
const loadData = async () => { ... }
useEffect(() => { loadData() }, [dependency])

// Date: always use getLocalDateString() for Philippine timezone
import { getLocalDateString, getLocalDisplayDate } from '@/lib/utils'
const today = getLocalDateString() // "2026-06-29"

// Never use: new Date().toISOString().split('T')[0]  ← UTC, wrong timezone
```

## Key RLS Functions
```sql
get_my_role()   → returns current user's role (used in all policies to avoid recursion)
```

## Supabase Project
```
Project ID: bgjxikbygykahgwpvlzc
URL: https://bgjxikbygykahgwpvlzc.supabase.co
Region: ap-south-1 (Mumbai)
Edge Function: hyper-action → resets leaderboard (cron: 0 0 1 * *)
```

## Public PR Leaderboard Rules
```
Only 4 exercises allowed on PUBLIC leaderboard: Back Squat, Deadlift, Overhead Press, Sprint 40m
My PRs tab: any exercise
Sorting: normalized to kg equivalent (1 lbs = 0.453592 kg)
Sprint 40m: lower value = better rank
Monthly reset: archives to personal_records_archive, clears active records
```

## Component Patterns

### Loading state
```tsx
if (loading) return (
  <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
    <Navbar />
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div className="skeleton" style={{ height: 120, marginBottom: '1rem' }} />
      <div className="skeleton" style={{ height: 80 }} />
    </div>
  </div>
)
```

### Modal overlay (always centered)
```tsx
<div onClick={e => { if (e.target === e.currentTarget) onClose() }}
  style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.85)',
    backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', padding: '1rem' }}>
  <div style={{ width: '100%', maxWidth: '540px', maxHeight: '85vh', overflowY: 'auto',
    borderRadius: '1rem', background: 'var(--surface)', border: '1px solid var(--border)' }}>
    ...
  </div>
</div>
```

### Page wrapper
```tsx
<div style={{ minHeight: '100vh', background: 'var(--background)' }}>
  <Navbar />
  <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
    ...
  </main>
</div>
```

### Tab navigation
```tsx
<div style={{ display: 'flex', overflowX: 'auto', WebkitOverflowScrolling: 'touch',
  scrollbarWidth: 'none', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }}>
  {tabs.map(t => (
    <button key={t.value} onClick={() => setActiveTab(t.value)} style={{
      background: 'none', border: 'none', padding: '0.875rem 1.25rem',
      color: activeTab === t.value ? 'var(--teal-secondary)' : 'var(--text-secondary)',
      borderBottom: `2px solid ${activeTab === t.value ? 'var(--teal-primary)' : 'transparent'}`,
      fontWeight: activeTab === t.value ? 700 : 400, cursor: 'pointer',
      whiteSpace: 'nowrap', fontSize: '0.875rem', minHeight: 0,
    }}>
      {t.label}
    </button>
  ))}
</div>
```

## Mobile Rules
```
- All grids: start single column, expand at md (768px)
- Portrait mode: max-width: 100vw, overflow-x: hidden
- Input font-size: 1rem minimum (prevents iOS zoom)
- All buttons: min-height: 44px (touch targets)
- Floating action button: fixed bottom-right, mobile only, hidden md+
- Horizontal scroll sections: WebkitOverflowScrolling: touch, scrollbarWidth: none
```

## What NOT to Do
```
❌ Don't use Prisma or LibSQL — Supabase only
❌ Don't hardcode hex colors — use CSS variables
❌ Don't create new color schemes or change the dark teal theme
❌ Don't add new npm packages without checking if one already exists
❌ Don't use server components for data fetching — all pages are "use client"
❌ Don't use new Date().toISOString().split('T')[0] for "today" — use getLocalDateString()
❌ Don't use window.prompt() — use inline date pickers
❌ Don't use onMouseEnter/Leave for critical state — use CSS transitions
❌ Don't forget "use client" at top of every page file
❌ Don't create separate component files unless explicitly asked
```

## After Every Change
```bash
git add .
git commit -m "description of what changed"
git push origin claude/velocity-fitness-workout-tracker-jgueaa
```
Vercel auto-deploys on every push.

## Common Tasks — Shorthand

**Add a new page:**
1. Create `app/[route]/page.tsx` with `"use client"` at top
2. Auth check + role check at top of useEffect
3. Use standard page wrapper + Navbar
4. Add route to middleware.ts PUBLIC_ROUTES if public

**Add a new tab to existing panel:**
1. Add to the Tab type union
2. Add to tabs array with label
3. Add `{activeTab === 'newtab' && <div key="newtab-tab">...</div>}` to content
4. Fetch data in useEffect or on tab switch

**Add a new database query:**
1. Check RLS policies — coach/admin queries need get_my_role() policies
2. Use maybeSingle() instead of single() when record might not exist
3. Always handle null/undefined with `|| []` or `|| null`

**Fix a Supabase RLS error:**
Run in Supabase SQL Editor — check existing policies before adding new ones to avoid conflicts.
