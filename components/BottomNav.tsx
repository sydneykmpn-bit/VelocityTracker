'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LayoutDashboard, ShieldCheck, Users, Dumbbell, CalendarDays, GraduationCap, Trophy } from 'lucide-react'
import BasketballIcon from '@/components/icons/BasketballIcon'
import { getLocalDateString, bballOccurrencesInRange, generateRecurringDates } from '@/lib/utils'

const SECOND_TAB: Record<string, { href: string; label: string; icon: typeof Users }> = {
  admin: { href: '/admin', label: 'Admin', icon: ShieldCheck },
  coach: { href: '/coach', label: 'Coach', icon: Users },
  member: { href: '/leaderboard', label: 'Board', icon: Trophy },
}

export default function BottomNav() {
  const pathname = usePathname()
  const supabase = createClient()
  const [role, setRole] = useState('member')
  const [isAthlete, setIsAthlete] = useState(false)
  const [classesTodayCount, setClassesTodayCount] = useState(0)

  useEffect(() => {
    const cachedRole = sessionStorage.getItem('vel_role')
    const cachedIsAthlete = sessionStorage.getItem('vel_is_athlete')
    if (cachedRole) setRole(cachedRole)
    if (cachedIsAthlete !== null) setIsAthlete(cachedIsAthlete === 'true')
  }, [])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (!profile?.role) return

      setRole(profile.role)
      sessionStorage.setItem('vel_role', profile.role)

      const today = getLocalDateString()
      const [{ data: bballClasses }, { data: bballExceptions }, { data: scheduledClasses }] = await Promise.all([
        supabase.from('bball_classes').select('*'),
        supabase.from('bball_class_exceptions').select('class_id, excluded_date'),
        supabase.from('scheduled_classes').select('id, scheduled_date, is_recurring, recurrence_rule, recurrence_days'),
      ])
      const exceptionsByClass: Record<string, string[]> = {}
      for (const exc of bballExceptions || []) {
        (exceptionsByClass[exc.class_id] ??= []).push(exc.excluded_date)
      }
      const bballTodayCount = (bballClasses || []).filter((c: any) =>
        bballOccurrencesInRange(c, today, today, exceptionsByClass[c.id]).length > 0
      ).length
      const scheduledTodayCount = (scheduledClasses || []).filter((c: any) => {
        if (c.scheduled_date === today) return true
        if (c.is_recurring) {
          return generateRecurringDates(c.scheduled_date, today, c.recurrence_rule, c.recurrence_days || []).includes(today)
        }
        return false
      }).length
      setClassesTodayCount(bballTodayCount + scheduledTodayCount)

      if (profile.role === 'member' || profile.role === 'admin' || profile.role === 'coach') {
        const [membershipResult, workoutPlansResult, programAssignmentsResult, coachAthletesResult] = await Promise.all([
          supabase.from('group_members').select('id').eq('member_id', user.id).limit(1),
          supabase.from('workout_plans').select('id').eq('member_id', user.id).in('status', ['pending', 'rescheduled']).limit(1),
          supabase.from('program_assignments').select('id').eq('member_id', user.id).limit(1),
          supabase.from('coach_students').select('id').eq('member_id', user.id).limit(1),
        ])
        const athleteStatus = (
          (membershipResult.data?.length || 0) > 0 ||
          (workoutPlansResult.data?.length || 0) > 0 ||
          (programAssignmentsResult.data?.length || 0) > 0 ||
          (coachAthletesResult.data?.length || 0) > 0
        )
        setIsAthlete(athleteStatus)
        sessionStorage.setItem('vel_is_athlete', String(athleteStatus))
      }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'))

  const showAthleteTabs = role === 'member' && isAthlete

  const second = showAthleteTabs
    ? { href: '/student', label: 'Athlete', icon: GraduationCap }
    : (SECOND_TAB[role] ?? SECOND_TAB.member)
  const SecondIcon = second.icon

  return (
    <nav className="bottom-nav" aria-label="Primary">
      <Link href="/dashboard" className={isActive('/dashboard') ? 'bottom-nav-item active' : 'bottom-nav-item'}>
        <LayoutDashboard size={22} />
        <span>Home</span>
      </Link>
      <Link href={second.href} className={isActive(second.href) ? 'bottom-nav-item active' : 'bottom-nav-item'}>
        <SecondIcon size={22} />
        <span>{second.label}</span>
      </Link>
      <Link href="/classes" className={isActive('/classes') ? 'bottom-nav-item active' : 'bottom-nav-item'} style={{ position: 'relative' }}>
        <BasketballIcon size={22} />
        <span>Classes</span>
        {classesTodayCount > 0 && (
          <span style={{
            position: 'absolute', top: '4px', right: '18px',
            width: '16px', height: '16px', borderRadius: '50%',
            background: '#f59e0b', color: '#000',
            fontSize: '10px', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {classesTodayCount}
          </span>
        )}
      </Link>
      <Link href="/workouts" className={isActive('/workouts') ? 'bottom-nav-item active' : 'bottom-nav-item'}>
        <Dumbbell size={22} />
        <span>Workouts</span>
      </Link>
      <Link href="/calendar" className={isActive('/calendar') ? 'bottom-nav-item active' : 'bottom-nav-item'}>
        <CalendarDays size={22} />
        <span>Calendar</span>
      </Link>
    </nav>
  )
}
