import { NextResponse } from 'next/server'
import { env } from '@/lib/config/env'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ guestMode: env.isGuestMode })
}
