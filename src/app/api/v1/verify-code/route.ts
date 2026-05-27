import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase'
import { signJWT } from '@/lib/jwt'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_development_secret_key_1234567890'

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'fallback_development_secret_key_1234567890')) {
    console.error('CRITICAL: JWT_SECRET is unset or using fallback key in production!')
    return NextResponse.json(
      { error: 'Internal Configuration Error' },
      { status: 500 }
    )
  }
  try {
    const { code, email } = await request.json()

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Class code is required' },
        { status: 400 }
      )
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'A valid email address is required' },
        { status: 400 }
      )
    }

    const trimmedCode = code.trim().toUpperCase()
    const trimmedEmail = email.trim().toLowerCase()

    // Query classes using privileged backend server client
    const supabase = getSupabaseServer(true)

    // Query classes to find active (running) class code
    const { data: classData, error } = await supabase
      .from('classes')
      .select('id, class_code, status')
      .ilike('class_code', trimmedCode)
      .single()

    if (error || !classData) {
      if (error) {
        console.error('Supabase query error details:', error)
      }
      return NextResponse.json(
        { error: 'Invalid code. Check with your class coordinator.' },
        { status: 404 }
      )
    }

    if (classData.status !== 'running') {
      return NextResponse.json(
        { error: 'This class has not started or is already completed.' },
        { status: 400 }
      )
    }

    // Verify student whitelist enrollment
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('class_enrollments')
      .select('id')
      .eq('class_id', classData.id)
      .eq('student_email', trimmedEmail)
      .single()

    if (enrollmentError || !enrollment) {
      return NextResponse.json(
        { error: 'Your email is not whitelisted for this class. Contact the instructor.' },
        { status: 403 }
      )
    }

    // Sign the lightweight student JWT carrying class AND email identities
    const payload = {
      class_id: classData.id,
      class_code: classData.class_code,
      student_email: trimmedEmail,
      role: 'student',
    }

    const token = await signJWT(payload, JWT_SECRET)

    // Set cookie and respond
    const response = NextResponse.json({
      success: true,
      classCode: classData.class_code,
      redirectUrl: `/learn/${classData.class_code}/dashboard`,
    })

    const cookieName = `class_session_${classData.class_code}`

    response.cookies.set(cookieName, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    })

    // Set a non-httpOnly cookie for client UI to safely display and auto-fill student email
    response.cookies.set(`student_email_${classData.class_code}`, trimmedEmail, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })

    return response
  } catch (error: any) {
    console.error('Error verifying class code:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
