import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { verifyJWT } from '@/lib/jwt'

const ADMIN_ROLES = new Set([
  'admin',
  'teacher',
  'super-admin',
  'content-admin',
  'class-operator',
])

type MiddlewareTokenPayload = {
  class_code?: unknown
  role?: unknown
  app_metadata?: {
    role?: unknown
  }
}

function parseBase64UrlJsonPayload(token: string): MiddlewareTokenPayload | null {
  const parts = token.split('.')
  if (parts.length !== 3) {
    return null
  }

  const parsed = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
  return parsed && typeof parsed === 'object' ? parsed as MiddlewareTokenPayload : null
}

function getAdminRole(payload: MiddlewareTokenPayload): string | null {
  const role = payload.app_metadata?.role || payload.role
  return typeof role === 'string' ? role : null
}

function nextPrivateResponse(response = NextResponse.next()) {
  response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}

function copyResponseCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie)
  })
  target.headers.set('Cache-Control', 'private, no-store')
  return target
}

async function getSupabaseAdmin(request: NextRequest) {
  let response = NextResponse.next({ request })
  const hasSsrSessionCookie = request.cookies
    .getAll()
    .some(({ name }) => name.startsWith('sb-') && name.includes('auth-token'))

  if (!hasSsrSessionCookie) {
    return { isAdmin: false, response }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return { isAdmin: false, response }
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.app_metadata?.role
  return {
    isAdmin: typeof role === 'string' && ADMIN_ROLES.has(role),
    response,
  }
}

export async function middleware(request: NextRequest) {
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    console.error('CRITICAL: JWT_SECRET is unset')
    return new NextResponse('Internal Server Configuration Error', { status: 500 })
  }

  const { pathname } = request.nextUrl

  // 1. Gating for /learn/[classCode]/* (but NOT /learn itself)
  const learnMatch = pathname.match(/^\/learn\/([^/]+)(.*)/)
  if (learnMatch) {
    const classCode = learnMatch[1]

    // Skip the class code entry gateway itself
    if (classCode === 'page' || classCode === '' || classCode === 'favicon.ico') {
      return NextResponse.next()
    }

    // Check student lightweight session cookie
    const cookieName = `class_session_${classCode}`
    const cookie = request.cookies.get(cookieName)
    let isExpired = false

    if (cookie) {
      const payload = await verifyJWT(cookie.value, jwtSecret) as MiddlewareTokenPayload | null
      if (payload && payload.class_code === classCode) {
        return nextPrivateResponse()
      } else {
        isExpired = true
      }
    }

    const supabaseAdmin = await getSupabaseAdmin(request)
    if (supabaseAdmin.isAdmin) {
      return nextPrivateResponse(supabaseAdmin.response)
    }

    // Backward compatibility for legacy Supabase access-token cookies.
    const sbToken = request.cookies.get('sb-access-token') || request.cookies.get('supabase-auth-token')
    if (sbToken) {
      try {
        const secret = process.env.SUPABASE_JWT_SECRET;
        let payload: MiddlewareTokenPayload | null = null;

        if (secret) {
          payload = await verifyJWT(sbToken.value, secret) as MiddlewareTokenPayload | null;
        } else if (process.env.NODE_ENV !== 'production') {
          payload = parseBase64UrlJsonPayload(sbToken.value)
        }

        if (payload) {
          const role = getAdminRole(payload)
          if (role && ADMIN_ROLES.has(role)) {
            return nextPrivateResponse()
          }
        }
      } catch (e) {
        console.error('Error parsing supabase token in middleware:', e)
      }
    }

    // Redirect to class entry page
    const url = request.nextUrl.clone()
    url.pathname = '/learn'
    url.searchParams.set('redirect', pathname)
    if (isExpired) {
      url.searchParams.set('reason', 'expired')
    }
    return NextResponse.redirect(url)
  }

  // 2. Admin Route Protection for /admin/*
  if (pathname.startsWith('/admin')) {
    const supabaseAdmin = await getSupabaseAdmin(request)

    if (pathname === '/admin/login') {
      if (supabaseAdmin.isAdmin) {
        const url = request.nextUrl.clone()
        url.pathname = '/admin'
        url.search = ''
        return copyResponseCookies(supabaseAdmin.response, NextResponse.redirect(url))
      }
      return nextPrivateResponse(supabaseAdmin.response)
    }

    // Check if user has admin privileges
    const sbToken = request.cookies.get('sb-access-token') || request.cookies.get('supabase-auth-token')
    let isAdmin = supabaseAdmin.isAdmin

    if (sbToken) {
      try {
        const secret = process.env.SUPABASE_JWT_SECRET;
        let payload: MiddlewareTokenPayload | null = null;

        if (secret) {
          payload = await verifyJWT(sbToken.value, secret) as MiddlewareTokenPayload | null;
        } else if (process.env.NODE_ENV !== 'production') {
          payload = parseBase64UrlJsonPayload(sbToken.value)
        }

        if (payload) {
          const role = getAdminRole(payload)
          if (role && ADMIN_ROLES.has(role)) {
            isAdmin = true
          }
        }
      } catch (e) {
        console.error('Error verifying admin token in middleware:', e)
      }
    }

    // For development convenience, let local requests pass if standard dev overrides are set
    if (process.env.NODE_ENV === 'development' && process.env.BYPASS_ADMIN_AUTH === 'true') {
      isAdmin = true
    }

    if (!isAdmin) {
      // Redirect to the dedicated login page and preserve the requested path.
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      url.search = ''
      url.searchParams.set('next', pathname)
      return copyResponseCookies(supabaseAdmin.response, NextResponse.redirect(url))
    }

    return nextPrivateResponse(supabaseAdmin.response)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/learn/:path*', '/admin/:path*'],
}
