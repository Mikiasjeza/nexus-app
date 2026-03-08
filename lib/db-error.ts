import { NextResponse } from 'next/server'

const DB_NOT_CONFIGURED =
  'Database not configured. Set DATABASE_URL in .env and run: npx prisma migrate dev'

/**
 * If the error is a Prisma/database connection error, return a 503 response.
 * Otherwise return null so the caller can handle the error.
 */
export function dbErrorResponse(error: unknown): NextResponse | null {
  if (error == null) return null
  const msg = error instanceof Error ? error.message : String(error)
  const code = error && typeof error === 'object' && 'code' in error ? (error as { code: string }).code : ''
  if (
    !msg.includes('DATABASE_URL') &&
    code !== 'P1001' &&
    code !== 'P1002' &&
    code !== 'P1017'
  ) {
    return null
  }
  return NextResponse.json(
    { error: DB_NOT_CONFIGURED },
    { status: 503 }
  )
}
