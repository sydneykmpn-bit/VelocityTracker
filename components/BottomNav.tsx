'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LayoutDashboard, ShieldCheck, Users, Dumbbell, CalendarDays, GraduationCap, Trophy } from 'lucide-react'
import BasketballIcon from '@/components/icons/BasketballIcon'

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
  const [classesPendingCount, setClassesPendingCount] = useState(0)

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

      if (profile.role === 'admin' || profile.role === 'coach') {
        const [{ count: bballPending }, { count: scheduledPending }] = await Promise.all([
          supabase.from('bball_class_signups').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('class_attendees').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        ])
        setClassesPendingCount((bballPending || 0) + (scheduledPending || 0))
      }

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
        {(role === 'admin' || role === 'coach') && classesPendingCount > 0 && (
          <span style={{
            position: 'absolute', top: '4px', right: '18px',
            width: '16px', height: '16px', borderRadius: '50%',
            background: '#f59e0b', color: '#000',
            fontSize: '10px', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {classesPendingCount}
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
