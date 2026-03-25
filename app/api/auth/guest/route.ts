import { NextResponse } from 'next/server'
import {
  getSessionToken,
  deleteSession,
  clearSessionCookie,
  setGuestPreviewCookie,
} from '@/lib/auth/session'
import { guestUser } from '@/lib/mock/guest'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const token = await getSessionToken()
    if (token) {
      await deleteSession(token)
    }
    await clearSessionCookie()
    await setGuestPreviewCookie()

    return NextResponse.json({ user: guestUser })
  } catch (e) {
    console.error('Guest login error:', e)
    return NextResponse.json(
      { error: 'Unable to start guest preview' },
      { status: 500 }
    )
  }
}
