'use client'

import { ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getLocalDateString } from '@/lib/utils'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

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
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const firstDay = new Date(year, monthIndex, 1).getDay()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const today = getLocalDateString()

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const selectedDateEntries = selectedDate ? entries.filter(e => e.date === selectedDate) : []

  return (
    <div className="cal-grid-layout">
      {/* Calendar grid */}
      <div style={{ minWidth: 0 }}>
        {/* Month nav */}
        <div className="cal-month-header">
          <button
            className="cal-nav-btn"
            onClick={() => onMonthChange(new Date(year, monthIndex - 1))}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '0.375rem', padding: '0.5rem 0.875rem', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', minHeight: 0 }}
          >
            <ChevronLeft size={18} />
          </button>
          <h2 className="cal-month-title">
            {MONTH_NAMES[monthIndex]} {year}
          </h2>
          <button
            className="cal-nav-btn"
            onClick={() => onMonthChange(new Date(year, monthIndex + 1))}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '0.375rem', padding: '0.5rem 0.875rem', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', minHeight: 0 }}
          >
            <ChevronRight size={18} />
          </button>
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
          {cells.map((day, i) => {
            if (!day) return <div key={`e-${i}`} />
            const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const dayEntries = entries.filter(e => e.date === dateStr)
            const isToday = dateStr === today
            const isSelected = dateStr === selectedDate
            return (
              <div
                key={dateStr}
                className="cal-day-cell"
                onClick={() => onSelectDate(dateStr)}
                style={{
                  borderRadius: '0.5rem', padding: '0.375rem', minHeight: '60px', cursor: 'pointer', transition: 'all 0.15s',
                  background: isSelected ? 'rgba(8,119,160,0.2)' : isToday ? 'rgba(8,119,160,0.1)' : 'var(--surface)',
                  border: `1px solid ${isSelected ? 'var(--teal-primary)' : isToday ? 'rgba(8,119,160,0.4)' : 'var(--border)'}`,
                }}
              >
                <p style={{ fontSize: '0.7rem', fontWeight: 600, textAlign: 'right', color: isToday ? 'var(--teal-secondary)' : 'var(--text-secondary)', marginBottom: '0.2rem' }}>{day}</p>
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
