'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LayoutDashboard, ShieldCheck, Users, Dumbbell, Plus, Trophy, CalendarDays, GraduationCap } from 'lucide-react'

const SECOND_TAB: Record<string, { href: string; label: string; icon: typeof Users }> = {
  admin: { href: '/admin', label: 'Admin', icon: ShieldCheck },
  coach: { href: '/coach', label: 'Coach', icon: Users },
  member: { href: '/workouts', label: 'Workouts', icon: Dumbbell },
}

export default function BottomNav() {
  const pathname = usePathname()
  const supabase = createClient()
  const [role, setRole] = useState('member')
  const [isAthlete, setIsAthlete] = useState(false)

  useEffect(() => {
    const cachedRole = sessionStorage.getItem('vel_role')
    const cachedIsAthlete = sessionStorage.getItem('vel_is_athlete')
    if (cachedRole) setRole(cachedRole)
    if (cachedIsAthlete !== null) setIsAthlete(cachedIsAthlete === 'true')
    if (cachedRole) return

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (!profile?.role) return

      setRole(profile.role)
      sessionStorage.setItem('vel_role', profile.role)

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

  const fourth = showAthleteTabs
    ? { href: '/workouts', label: 'Workouts', icon: Dumbbell }
    : role === 'admin'
    ? (isAthlete
        ? { href: '/student', label: 'Athlete', icon: GraduationCap }
        : { href: '/workouts', label: 'Workouts', icon: Dumbbell })
    : { href: '/leaderboard', label: 'Board', icon: Trophy }
  const FourthIcon = fourth.icon

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
      <Link href="/workouts/new" aria-label="Log workout" className={isActive('/workouts/new') ? 'bottom-nav-item active' : 'bottom-nav-item'}>
        <span className="bottom-nav-log">
          <Plus size={26} strokeWidth={2.5} />
        </span>
        <span>Log</span>
      </Link>
      <Link href={fourth.href} className={isActive(fourth.href) ? 'bottom-nav-item active' : 'bottom-nav-item'}>
        <FourthIcon size={22} />
        <span>{fourth.label}</span>
      </Link>
      <Link href="/calendar" className={isActive('/calendar') ? 'bottom-nav-item active' : 'bottom-nav-item'}>
        <CalendarDays size={22} />
        <span>Calendar</span>
      </Link>
    </nav>
  )
}
