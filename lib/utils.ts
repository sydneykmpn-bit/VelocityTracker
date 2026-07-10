// Type badge style utility — used everywhere instead of repeated inline logic
export function getTypeBadgeStyle(type: string): { background: string; color: string; border: string } {
  switch (type) {
    case 'basketball':
      return { background: 'rgba(8,119,160,0.2)', color: '#34bac2', border: 'rgba(8,119,160,0.35)' }
    case 'both':
      return { background: 'rgba(168,85,247,0.15)', color: '#c084fc', border: 'rgba(168,85,247,0.25)' }
    default: // conditioning
      return { background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: 'rgba(34,197,94,0.25)' }
  }
}

export function getTypeBadgeClass(type: string): string {
  switch (type) {
    case 'basketball': return 'tag-basketball'
    case 'both': return 'tag-both'
    default: return 'tag-conditioning'
  }
}

// Format duration nicely
export function formatDuration(minutes?: number | null): string {
  if (!minutes) return ''
  if (minutes < 60) return `${minutes}min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

// Format a date nicely
export function formatDate(dateStr: string, options?: Intl.DateTimeFormatOptions): string {
  return new Date(dateStr).toLocaleDateString('en-US', options || {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

// Debounce utility
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

// Get current month in YYYY-MM format (timezone-aware)
export function getCurrentMonthYear(): string {
  return getLocalDateString().slice(0, 7)
}

// Get today's date string in YYYY-MM-DD format using local timezone (default: Asia/Manila / PST +8)
export function getLocalDateString(timeZone = 'Asia/Manila'): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date())
}

// Get today's display date string (e.g. "Monday, June 29, 2026") using local timezone
export function getLocalDisplayDate(timeZone = 'Asia/Manila'): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone,
  }).format(new Date())
}

const LBS_TO_KG = 0.453592

export const LOWER_IS_BETTER = ['Sprint 40m', 'Sprint 20m', 'Agility T-Test']

export function normalizeToKg(value: number, unit: string): number {
  if (unit === 'lbs') return value * LBS_TO_KG
  return value
}

// Convert a stored weight value+unit to a viewer's preferred kg/lbs for display. Non-weight units
// (reps, seconds, etc.) pass through unchanged. Shared by any screen that shows another person's
// (or its own historical) weight entries in the viewer's preferred_weight_unit.
export function convertWeightForDisplay(value: number, storedUnit: string, preferredUnit: 'kg' | 'lbs'): { value: number; unit: string } {
  if (storedUnit !== 'kg' && storedUnit !== 'lbs') return { value, unit: storedUnit }
  if (storedUnit === preferredUnit) return { value, unit: storedUnit }
  const converted = storedUnit === 'kg' ? value * 2.20462 : value / 2.20462
  return { value: Math.round(converted * 10) / 10, unit: preferredUnit }
}

export function sortRecords(records: any[]): any[] {
  return [...records].sort((a, b) => {
    const aIsLower = LOWER_IS_BETTER.includes(a.exercise_name)
    const aNorm = normalizeToKg(a.value, a.unit)
    const bNorm = normalizeToKg(b.value, b.unit)
    if (aIsLower) return aNorm - bNorm
    return bNorm - aNorm
  })
}

// Convert a Date object to YYYY-MM-DD using Asia/Manila timezone
export function formatLocalDate(date: Date, timeZone = 'Asia/Manila'): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(date)
}

// Convert a Date object to YYYY-MM-DD using the browser's local timezone (no forced zone)
export function formatDateYMD(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Parse a YYYY-MM-DD string into a local Date (midnight local time, no timezone shifting)
export function parseLocalDateStr(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
export const DAY_LABELS: Record<string, string> = {
  sunday: 'Sunday', monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
  thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday',
}

export function dayNameFromDate(dateStr: string): string {
  return DAY_NAMES[parseLocalDateStr(dateStr).getDay()]
}

// Date (YYYY-MM-DD) of the given weekday (0=Sun..6=Sat) within the current calendar week,
// used to scope athlete_program_completions to one specific week's occurrence of a program day.
export function getCurrentWeekOccurrenceDate(dayOfWeek: number, timeZone = 'Asia/Manila'): string {
  const today = parseLocalDateStr(getLocalDateString(timeZone))
  const diff = dayOfWeek - today.getDay()
  const occurrence = new Date(today)
  occurrence.setDate(today.getDate() + diff)
  return formatDateYMD(occurrence)
}

// A program is "done" for the current week only once every one of its days has a matching
// athlete_program_completions row for that day's occurrence date this week. This is the single
// source of truth for the Pending/Done split on both the student and coach Programs views — there
// is no separate manually-set "done" field, so the tabs/badges can never drift from what the
// per-day Mark Done buttons actually show.
export function isProgramDoneThisWeek(
  days: { id: string; day_of_week: number }[],
  completions: { program_day_id: string; occurrence_date: string }[]
): boolean {
  if (days.length === 0) return false
  return days.every(d =>
    completions.some(c => c.program_day_id === d.id && c.occurrence_date === getCurrentWeekOccurrenceDate(d.day_of_week))
  )
}

// Format a 24h "HH:MM" time string as "H:MM AM/PM"
export function formatTimeLabel(t: string): string {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

export interface BballClassRow {
  id: string
  title: string
  description: string | null
  day_of_week: string
  start_time: string
  end_time: string
  gender_restriction: string
  max_slots: number
  is_recurring: boolean
  specific_date: string | null
  recurrence_end_date: string | null
  series_id?: string | null
}

// Occurrence date strings (YYYY-MM-DD) for a bball_classes row within [rangeStart, rangeEnd] inclusive.
// Recurring classes emit one date per matching weekday in range, capped at recurrence_end_date if
// set (matching how scheduled_classes.recurrence_end_date already works elsewhere in this app).
// One-time classes (legacy is_recurring=false rows) emit their specific_date if it falls in range.
// excludedDates (from bball_class_exceptions) lets a single occurrence be cancelled without
// deleting the underlying recurring row or affecting any other occurrence of the same series.
export function bballOccurrencesInRange(cls: BballClassRow, rangeStart: string, rangeEnd: string, excludedDates?: string[]): string[] {
  const excluded = excludedDates && excludedDates.length > 0 ? new Set(excludedDates) : null
  if (!cls.is_recurring) {
    if (!cls.specific_date || cls.specific_date < rangeStart || cls.specific_date > rangeEnd) return []
    return excluded?.has(cls.specific_date) ? [] : [cls.specific_date]
  }
  const dayIdx = DAY_NAMES.indexOf(cls.day_of_week as any)
  if (dayIdx < 0) return []
  const effectiveRangeEnd = cls.recurrence_end_date && cls.recurrence_end_date < rangeEnd ? cls.recurrence_end_date : rangeEnd
  if (effectiveRangeEnd < rangeStart) return []
  const dates: string[] = []
  const cur = parseLocalDateStr(rangeStart)
  const end = parseLocalDateStr(effectiveRangeEnd)
  while (cur <= end) {
    if (cur.getDay() === dayIdx) {
      const d = formatDateYMD(cur)
      if (!excluded?.has(d)) dates.push(d)
    }
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: 'Unpaid', paid_online: 'Paid - Online', paid_cash: 'Paid - Cash',
}

// Insert a bball_class_signups row and report back whether the DB trigger (check_bball_class_capacity)
// auto-waitlisted it. Centralizes the insert so every join entry point (classes list, calendar,
// coach calendar, the detail modal) reads back the same resulting status instead of pattern-matching
// a "class is full" error string, which is now dead — the trigger no longer rejects full classes.
export async function joinBballClass(
  supabase: any, classId: string, userId: string, occurrenceDate: string
): Promise<{ status?: 'pending' | 'booked' | 'waitlist'; error?: string }> {
  const { data, error } = await supabase
    .from('bball_class_signups')
    .insert({ class_id: classId, user_id: userId, occurrence_date: occurrenceDate })
    .select('status')
    .single()
  if (error) return { error: error.message }
  return { status: data?.status }
}

// Expand a scheduled_classes recurring series into its instance dates within [startDate, endDate]
// exclusive of startDate itself (matching the parent row's own date). rule is one of
// 'daily'|'weekly'|'biweekly'|'monthly'; days is a list of lowercase day names, only consulted for
// weekly/biweekly (empty = every day). Shared by app/calendar/page.tsx (viewing existing series) and
// app/admin/page.tsx (creating new ones).
export function generateRecurringDates(
  startDate: string,
  endDate: string,
  rule: string,
  days: string[]
): string[] {
  if (!endDate || !startDate) return []
  const dates: string[] = []
  const start = parseLocalDateStr(startDate)
  const end = parseLocalDateStr(endDate)
  if (end <= start) return []
  const current = parseLocalDateStr(startDate)
  current.setDate(current.getDate() + 1)
  const normalizedDays = days.map(d => d.toLowerCase().trim())
  while (current <= end) {
    const dayName = DAY_NAMES[current.getDay()]
    const dateStr = formatDateYMD(current)
    const msDiff = current.getTime() - start.getTime()
    const daysDiff = Math.floor(msDiff / (24 * 60 * 60 * 1000))
    const weeksDiff = Math.floor(daysDiff / 7)
    let include = false
    switch (rule) {
      case 'daily':
        include = true
        break
      case 'weekly':
        include = normalizedDays.length === 0 || normalizedDays.includes(dayName)
        break
      case 'biweekly':
        include = weeksDiff % 2 === 0 && (normalizedDays.length === 0 || normalizedDays.includes(dayName))
        break
      case 'monthly':
        include = current.getDate() === start.getDate()
        break
    }
    if (include) dates.push(dateStr)
    current.setDate(current.getDate() + 1)
  }
  return dates
}

// Workout streak calculation (weekly)
export function calculateStreak(workoutDates: string[]): number {
  if (!workoutDates.length) return 0
  const weeks = new Set(
    workoutDates.map(d => {
      const date = new Date(d)
      const startOfWeek = new Date(date)
      startOfWeek.setDate(date.getDate() - date.getDay())
      return startOfWeek.toISOString().split('T')[0]
    })
  )
  const weekArr = Array.from(weeks).sort().reverse()
  let streak = 0
  const now = new Date()
  const thisWeekStart = new Date(now)
  thisWeekStart.setDate(now.getDate() - now.getDay())

  for (let i = 0; i < weekArr.length; i++) {
    const weekStart = new Date(weekArr[i])
    const expectedWeekStart = new Date(thisWeekStart)
    expectedWeekStart.setDate(thisWeekStart.getDate() - i * 7)
    if (Math.abs(weekStart.getTime() - expectedWeekStart.getTime()) < 7 * 24 * 60 * 60 * 1000) {
      streak++
    } else break
  }
  return streak
}

// Week activity dots (Sun–Sat)
export function getWeekActivity(workoutDates: string[]): boolean[] {
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(startOfWeek)
    day.setDate(startOfWeek.getDate() + i)
    const dayStr = formatLocalDate(day)
    return workoutDates.some(d => d.startsWith(dayStr))
  })
}

// Activity status for members
export function getActivityStatus(lastWorkoutDate: string | null): 'active' | 'warning' | 'inactive' {
  if (!lastWorkoutDate) return 'inactive'
  const daysSince = Math.floor(
    (Date.now() - new Date(lastWorkoutDate).getTime()) / (1000 * 60 * 60 * 24)
  )
  if (daysSince <= 7) return 'active'
  if (daysSince <= 14) return 'warning'
  return 'inactive'
}

export const ACTIVITY_COLORS = {
  active: '#4ade80',
  warning: '#f59e0b',
  inactive: '#ef4444',
}

// Strength standards — bodyweight multipliers per level, per exercise, per gender
export const STRENGTH_STANDARDS: Record<string, { male: number[]; female: number[] }> = {
  'Back Squat': { male: [0.75, 1.25, 1.5, 2.0, 2.5], female: [0.5, 0.75, 1.25, 1.5, 2.0] },
  'Deadlift': { male: [1.0, 1.5, 2.0, 2.5, 3.0], female: [0.5, 1.0, 1.25, 1.75, 2.25] },
  'Bench Press': { male: [0.5, 0.75, 1.25, 1.75, 2.0], female: [0.35, 0.5, 0.75, 1.0, 1.25] },
  'Overhead Press': { male: [0.35, 0.55, 0.8, 1.05, 1.3], female: [0.25, 0.35, 0.5, 0.65, 0.85] },
}

export const STRENGTH_LEVELS = ['Beginner', 'Novice', 'Intermediate', 'Advanced', 'Elite']

export interface StrengthLevelResult {
  level: string
  levelIndex: number // -1 = below Beginner
  thresholds: number[] // kg thresholds for each of the 5 levels
  nextLevel: string | null
  nextTargetKg: number | null
}

// Compute strength level + progress from a PR (kg) and bodyweight (kg)
export function getStrengthLevel(
  exercise: string,
  prKg: number,
  bodyweightKg: number,
  gender?: string
): StrengthLevelResult | null {
  const standard = STRENGTH_STANDARDS[exercise]
  if (!standard || !bodyweightKg) return null
  const multipliers = gender === 'female' ? standard.female : standard.male
  const thresholds = multipliers.map(m => m * bodyweightKg)
  let levelIndex = -1
  for (let i = 0; i < thresholds.length; i++) {
    if (prKg >= thresholds[i]) levelIndex = i
  }
  const level = levelIndex >= 0 ? STRENGTH_LEVELS[levelIndex] : 'Untrained'
  const nextLevel = levelIndex + 1 < STRENGTH_LEVELS.length ? STRENGTH_LEVELS[levelIndex + 1] : null
  const nextTargetKg = nextLevel ? thresholds[levelIndex + 1] : null
  return { level, levelIndex, thresholds, nextLevel, nextTargetKg }
}
