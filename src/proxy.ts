import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export default async function middleware(request: NextRequest) {
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

  const url = request.nextUrl.clone()

  if (url.pathname.startsWith('/admin')) {
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  if (url.pathname.startsWith('/asalaadmin26')) {
    if (url.pathname === '/asalaadmin26/login') {
      if (user) {
        url.pathname = '/asalaadmin26'
        return NextResponse.redirect(url)
      }
    } else {
      if (!user) {
        url.pathname = '/asalaadmin26/login'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
