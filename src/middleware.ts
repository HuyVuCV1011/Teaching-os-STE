import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyJWT } from '@/lib/jwt'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_development_secret_key_1234567890'

export async function middleware(request: NextRequest) {
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
      const payload = await verifyJWT(cookie.value, JWT_SECRET)
      if (payload && payload.class_code === classCode) {
        return NextResponse.next()
      } else {
        isExpired = true
      }
    }

    // Check if the user is an admin/teacher/operator via Supabase authorization cookies
    const sbToken = request.cookies.get('sb-access-token') || request.cookies.get('supabase-auth-token')
    if (sbToken) {
      try {
        const secret = process.env.SUPABASE_JWT_SECRET;
        let payload: any = null;

        if (secret) {
          payload = await verifyJWT(sbToken.value, secret);
        } else {
          // Fallback parsing for development if secret is not set yet
          const parts = sbToken.value.split('.')
          if (parts.length === 3) {
            payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
          }
        }

        if (payload) {
          const role = payload.app_metadata?.role || payload.role
          if (
            role === 'admin' ||
            role === 'teacher' ||
            role === 'super-admin' ||
            role === 'content-admin' ||
            role === 'class-operator'
          ) {
            return NextResponse.next()
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
    // Check if user has admin privileges
    const sbToken = request.cookies.get('sb-access-token') || request.cookies.get('supabase-auth-token')
    let isAdmin = false

    if (sbToken) {
      try {
        const secret = process.env.SUPABASE_JWT_SECRET;
        let payload: any = null;

        if (secret) {
          payload = await verifyJWT(sbToken.value, secret);
        } else {
          // Fallback parsing for development if secret is not set yet
          const parts = sbToken.value.split('.')
          if (parts.length === 3) {
            payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
          }
        }

        if (payload) {
          const role = payload.app_metadata?.role || payload.role
          if (
            role === 'admin' ||
            role === 'teacher' ||
            role === 'super-admin' ||
            role === 'content-admin' ||
            role === 'class-operator'
          ) {
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
      // Redirect to landing page
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/learn/:path*', '/admin/:path*'],
}
