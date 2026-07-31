import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { classCode } = body

    if (
      typeof classCode !== 'string' ||
      !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(classCode)
    ) {
      return NextResponse.json({ error: 'A valid class code is required' }, { status: 400 })
    }

    const response = NextResponse.json({ success: true })
    const sessionCookieName = `class_session_${classCode.toUpperCase()}`
    const emailCookieName = `student_email_${classCode.toUpperCase()}`

    response.cookies.set(sessionCookieName, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })

    response.cookies.set(emailCookieName, '', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })

    return response
  } catch (err) {
    console.error('Logout error:', err)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
