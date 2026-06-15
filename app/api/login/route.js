/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from 'next/server'

export async function POST(request) {
  const { email, password } = await request.json()

  if (!email || !password) {
    return NextResponse.json(
      { success: false, message: 'Email and password are required' },
      { status: 400 }
    )
  }

  try {
    const base = process.env.NEXT_PUBLIC_SERVER_URL || 'https://endpoint.surgecoffee.ae'

    const loginResp = await fetch(`${base}/api/admins/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const loginData = await loginResp.json().catch(() => null)

    if (!loginResp.ok || !loginData?.token) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      )
    }

    const allowedRoles = ['shop-manager', 'admin', 'super-admin']
    if (!loginData.user || !allowedRoles.includes(loginData.user.role)) {
      return NextResponse.json(
        { success: false, message: 'Access denied. Only shop managers and admins can login here.' },
        { status: 403 }
      )
    }

    const res = NextResponse.json({ success: true, user: loginData.user })

    res.cookies.set('payload_token', loginData.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24,
      path: '/',
    })

    return res

  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Invalid email or password' },
      { status: 401 }
    )
  }
}