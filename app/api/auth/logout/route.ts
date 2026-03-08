import { NextResponse } from 'next/server'
import { getSessionToken, deleteSession, clearSessionCookie } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const token = await getSessionToken()
    if (token) {
      await deleteSession(token)
    }
    await clearSessionCookie()
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Logout error:', e)
    await clearSessionCookie()
    return NextResponse.json({ ok: true })
  }
}
