import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const version = {
    version: process.env.npm_package_version || '1.0.0',
    build: process.env.NEXT_PUBLIC_BUILD_ID || new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  }

  return NextResponse.json(version)
}
