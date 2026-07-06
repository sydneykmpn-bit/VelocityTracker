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
  const [isStudent, setIsStudent] = useState(false)

  useEffect(() => {
    const cachedRole = sessionStorage.getItem('vel_role')
    const cachedIsStudent = sessionStorage.getItem('vel_is_student')
    if (cachedRole) setRole(cachedRole)
    if (cachedIsStudent !== null) setIsStudent(cachedIsStudent === 'true')
    if (cachedRole) return

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (!profile?.role) return

      setRole(profile.role)
      sessionStorage.setItem('vel_role', profile.role)

      if (profile.role === 'member') {
        const [membershipResult, workoutPlansResult, programAssignmentsResult] = await Promise.all([
          supabase.from('group_members').select('id').eq('member_id', user.id).limit(1),
          supabase.from('workout_plans').select('id').eq('member_id', user.id).limit(1),
          supabase.from('program_assignments').select('id').eq('member_id', user.id).limit(1),
        ])
        const studentStatus = (
          (membershipResult.data?.length || 0) > 0 ||
          (workoutPlansResult.data?.length || 0) > 0 ||
          (programAssignmentsResult.data?.length || 0) > 0
        )
        setIsStudent(studentStatus)
        sessionStorage.setItem('vel_is_student', String(studentStatus))
      }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'))

  const showStudentTabs = role === 'member' && isStudent

  const second = showStudentTabs
    ? { href: '/student', label: 'Student', icon: GraduationCap }
    : (SECOND_TAB[role] ?? SECOND_TAB.member)
  const SecondIcon = second.icon

  const fourth = showStudentTabs
    ? { href: '/workouts', label: 'Workouts', icon: Dumbbell }
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
