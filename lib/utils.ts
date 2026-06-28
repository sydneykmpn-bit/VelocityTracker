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
