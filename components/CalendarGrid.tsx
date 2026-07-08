'use client'

import { ReactNode, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getLocalDateString } from '@/lib/utils'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  return d
}

function dateStrOf(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export interface CalendarEntry {
  id: string
  date: string // YYYY-MM-DD
  [key: string]: any
}

export default function CalendarGrid({
  month,
  onMonthChange,
  entries,
  renderDayCellContent,
  selectedDate,
  onSelectDate,
  renderDetailPanel,
  headerExtra,
}: {
  month: Date
  onMonthChange: (newMonth: Date) => void
  entries: CalendarEntry[]
  renderDayCellContent: (dayEntries: CalendarEntry[], dateStr: string, isToday: boolean) => ReactNode
  selectedDate: string | null
  onSelectDate: (dateStr: string) => void
  renderDetailPanel: (selectedDate: string | null, selectedDateEntries: CalendarEntry[]) => ReactNode
  headerExtra?: ReactNode
}) {
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month')
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const today = getLocalDateString()

  // Each cell holds the actual date it represents (day-of-month labels alone aren't enough in
  // week mode, since a week row can span two different calendar months).
  const cells: ({ date: Date } | null)[] = []
  if (viewMode === 'month') {
    const firstDay = new Date(year, monthIndex, 1).getDay()
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
    for (let i = 0; i < firstDay; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(year, monthIndex, d) })
  } else {
    const weekStart = startOfWeek(month)
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      cells.push({ date: d })
    }
  }

  const selectedDateEntries = selectedDate ? entries.filter(e => e.date === selectedDate) : []

  const goPrev = () => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    if (viewMode === 'month') { onMonthChange(new Date(year, monthIndex - 1)); return }
    const d = new Date(month); d.setDate(d.getDate() - 7); onMonthChange(d)
  }
  const goNext = () => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    if (viewMode === 'month') { onMonthChange(new Date(year, monthIndex + 1)); return }
    const d = new Date(month); d.setDate(d.getDate() + 7); onMonthChange(d)
  }
  const changeViewMode = (mode: 'month' | 'week') => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    setViewMode(mode)
  }

  let headerTitle: string
  if (viewMode === 'month') {
    headerTitle = `${MONTH_NAMES[monthIndex]} ${year}`
  } else {
    const weekStart = startOfWeek(month)
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6)
    headerTitle = weekStart.getMonth() === weekEnd.getMonth()
      ? `${MONTH_ABBR[weekStart.getMonth()]} ${weekStart.getDate()}–${weekEnd.getDate()}, ${weekStart.getFullYear()}`
      : `${MONTH_ABBR[weekStart.getMonth()]} ${weekStart.getDate()} – ${MONTH_ABBR[weekEnd.getMonth()]} ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`
  }

  return (
    <div className="cal-grid-layout">
      {/* Calendar grid */}
      <div style={{ minWidth: 0 }}>
        {/* Month/Week nav */}
        <div className="cal-month-header">
          <button
            className="cal-nav-btn"
            onClick={goPrev}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '0.375rem', padding: '0.5rem 0.875rem', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', minHeight: 0 }}
          >
            <ChevronLeft size={18} />
          </button>
          <h2 className="cal-month-title">
            {headerTitle}
          </h2>
          <button
            className="cal-nav-btn"
            onClick={goNext}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '0.375rem', padding: '0.5rem 0.875rem', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', minHeight: 0 }}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* View mode toggle */}
        <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1rem' }}>
          {(['month', 'week'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => changeViewMode(mode)}
              style={{
                padding: '0.3rem 0.75rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700,
                textTransform: 'capitalize', cursor: 'pointer', minHeight: 0,
                background: viewMode === mode ? 'var(--teal-primary)' : 'var(--surface-raised)',
                color: viewMode === mode ? '#fff' : 'var(--text-secondary)',
                border: `1px solid ${viewMode === mode ? 'var(--teal-primary)' : 'var(--border)'}`,
              }}
            >
              {mode}
            </button>
          ))}
        </div>

        {headerExtra}

        {/* Day headers */}
        <div className="cal-day-headers">
          {DAY_NAMES.map(d => (
            <div key={d} className="cal-day-header-label" style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', padding: '0.375rem 0' }}>
              <span className="cal-day-full">{d}</span>
              <span className="cal-day-abbr">{d.charAt(0)}</span>
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="cal-day-grid">
          {cells.map((cell, i) => {
            if (!cell) return <div key={`e-${i}`} />
            const dateStr = dateStrOf(cell.date)
            const dayEntries = entries.filter(e => e.date === dateStr)
            const isToday = dateStr === today
            const isSelected = dateStr === selectedDate
            const isOutsideMonth = viewMode === 'week' && cell.date.getMonth() !== monthIndex
            return (
              <div
                key={dateStr}
                className="cal-day-cell"
                onClick={() => onSelectDate(dateStr)}
                style={{
                  borderRadius: '0.5rem', padding: '0.375rem', minHeight: viewMode === 'week' ? '100px' : '60px', cursor: 'pointer', transition: 'all 0.15s',
                  background: isSelected ? 'rgba(8,119,160,0.2)' : isToday ? 'rgba(8,119,160,0.1)' : 'var(--surface)',
                  border: `1px solid ${isSelected ? 'var(--teal-primary)' : isToday ? 'rgba(8,119,160,0.4)' : 'var(--border)'}`,
                  opacity: isOutsideMonth ? 0.6 : 1,
                }}
              >
                <p style={{ fontSize: '0.7rem', fontWeight: 600, textAlign: 'right', color: isToday ? 'var(--teal-secondary)' : 'var(--text-secondary)', marginBottom: '0.2rem' }}>{cell.date.getDate()}</p>
                {renderDayCellContent(dayEntries, dateStr, isToday)}
              </div>
            )
          })}
        </div>
      </div>

      {/* Detail panel */}
      <div style={{ minWidth: 0 }}>
        {renderDetailPanel(selectedDate, selectedDateEntries)}
      </div>

      <style>{`
        .cal-grid-layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }
        .cal-month-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1.25rem;
        }
        .cal-nav-btn { flex-shrink: 0; }
        .cal-month-title {
          font-family: var(--font-bebas);
          font-size: 1.75rem;
          letter-spacing: 0.03em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-align: center;
          flex: 1;
          min-width: 0;
        }
        .cal-day-headers, .cal-day-grid {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          box-sizing: border-box;
        }
        .cal-day-headers { gap: 2px; margin-bottom: 0.375rem; }
        .cal-day-grid { gap: 3px; }
        .cal-day-cell {
          box-sizing: border-box;
          min-height: 44px;
          overflow: hidden;
        }
        .cal-day-abbr { display: none; }
        @media (max-width: 480px) {
          .cal-month-title { font-size: 1.15rem; }
          .cal-day-header-label { font-size: 0.65rem; letter-spacing: 0; padding: 0.25rem 0 !important; }
          .cal-day-full { display: none; }
          .cal-day-abbr { display: inline; }
        }
        @media (min-width: 1024px) {
          .cal-grid-layout {
            grid-template-columns: minmax(0, 2fr) 280px;
          }
        }
      `}</style>
    </div>
  )
}
