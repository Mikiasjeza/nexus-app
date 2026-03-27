import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getLaunchReadinessIssues } from '@/lib/config/env'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    let db: 'up' | 'down' = 'up'
    let dbLatencyMs = 0
    const start = Date.now()
    try {
      await prisma.$queryRaw`SELECT 1`
      dbLatencyMs = Date.now() - start
    } catch {
      db = 'down'
      dbLatencyMs = Date.now() - start
    }

    const readinessIssues = getLaunchReadinessIssues()

    // Basic health check
    const health = {
      status: db === 'up' && readinessIssues.length === 0 ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        database: db,
        dbLatencyMs,
        configuration: readinessIssues.length === 0 ? 'ready' : 'issues',
        readinessIssues,
      },
    }

    return NextResponse.json(
      health,
      { status: db === 'up' && readinessIssues.length === 0 ? 200 : 503 }
    )
  } catch {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      },
      { status: 500 }
    )
  }
}
