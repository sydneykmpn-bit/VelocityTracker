import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/', '/login', '/register', '/forgot-password', '/pending-approval']

const ROLE_PROTECTED: Record<string, string[]> = {
  '/admin': ['admin'],
  '/coach': ['coach', 'admin'],
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) return NextResponse.next()

  if (PUBLIC_ROUTES.includes(pathname)) return NextResponse.next()

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    /\.(svg|png|jpg|jpeg|gif|webp|ico|css|js)$/.test(pathname)
  ) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    })

    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, approved')
      .eq('id', user.id)
      .single()

    if (!profile?.approved) {
      return NextResponse.redirect(new URL('/pending-approval', request.url))
    }

    const requiredRoles = Object.entries(ROLE_PROTECTED).find(([route]) =>
      pathname.startsWith(route)
    )?.[1]

    if (requiredRoles && !requiredRoles.includes(profile.role)) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return response
  } catch {
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
