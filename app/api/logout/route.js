import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const res = NextResponse.json({ success: true, message: 'Logged out' })
    res.cookies.set('payload_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
    })
    return res
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, message: 'Logout error' }, { status: 500 })
  }
}