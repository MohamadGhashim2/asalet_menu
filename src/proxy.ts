import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export default async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()

  if (url.pathname.startsWith('/admin')) {
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  if (!url.pathname.startsWith('/asalaadmin26')) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const safeOptions = { ...options }
            if (safeOptions.sameSite === 'none') {
              safeOptions.sameSite = 'lax' // Override insecure sameSite
            }
            request.cookies.set({
              name,
              value,
              ...safeOptions,
            })
          })
          
          supabaseResponse = NextResponse.next({
            request,
          })
          
          cookiesToSet.forEach(({ name, value, options }) => {
            const safeOptions = { ...options }
            if (safeOptions.sameSite === 'none') {
              safeOptions.sameSite = 'lax' // Override insecure sameSite
            }
            supabaseResponse.cookies.set({
              name,
              value,
              ...safeOptions,
            })
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_LOGIN_EMAIL

  if (url.pathname === '/asalaadmin26/login') {
    if (user && user.email === adminEmail) {
      url.pathname = '/asalaadmin26'
      return NextResponse.redirect(url)
    }
  } else {
    if (!user || user.email !== adminEmail) {
      // Automatically sign out if the user is wrong
      if (user) {
        // This creates a response that deletes cookies for auth, but the easiest way is to redirect to signout or login
        url.pathname = '/auth/signout'
        // We don't have a GET signout endpoint, so we just redirect to login which drops them
      }
      url.pathname = '/asalaadmin26/login'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
