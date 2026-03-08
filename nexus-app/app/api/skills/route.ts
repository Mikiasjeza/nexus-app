import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth/session'
import { mapSkill } from '@/lib/skills-mapper'
import { dbErrorResponse } from '@/lib/db-error'
import { env } from '@/lib/config/env'
import { guestSkills } from '@/lib/mock/guest'

export async function GET() {
  try {
    if (env.isGuestMode) {
      return NextResponse.json(guestSkills)
    }

    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const skills = await prisma.skill.findMany({
      where: { userId },
      include: { evidence: true, history: { orderBy: { timestamp: 'desc' } } },
      orderBy: [{ order: 'asc' }, { updatedAt: 'desc' }],
    })
    return NextResponse.json(skills.map(mapSkill))
  } catch (e) {
    console.error('Skills list error:', e)
    return NextResponse.json(
      { error: 'Failed to load skills' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      level,
      category,
      progress = 0,
      notes,
      description,
      tags = [],
      verified = false,
      visibility = 'public',
      status = 'published',
      evidence = [],
    } = body

    if (!name || !level || !category) {
      return NextResponse.json(
        { error: 'Name, level, and category are required' },
        { status: 400 }
      )
    }

    const count = await prisma.skill.count({ where: { userId } })
    const duplicate = await prisma.skill.findFirst({
      where: {
        userId,
        name: { equals: String(name).trim(), mode: 'insensitive' },
      },
    })
    if (duplicate) {
      return NextResponse.json(
        { error: 'A skill with this name already exists' },
        { status: 409 }
      )
    }

    const skill = await prisma.skill.create({
      data: {
        userId,
        name: String(name).trim(),
        level: String(level),
        category: String(category),
        progress: Number(progress) || 0,
        notes: notes != null ? String(notes) : null,
        description: description != null ? String(description) : null,
        tags: Array.isArray(tags) ? tags : [],
        verified: Boolean(verified),
        order: count,
        visibility: visibility === 'private' ? 'private' : 'public',
        status: status === 'draft' ? 'draft' : 'published',
      },
      include: { evidence: true, history: true },
    })

    await prisma.skillHistory.create({
      data: {
        skillId: skill.id,
        userId,
        changes: [{ field: 'created', oldValue: null, newValue: 'skill created' }],
      },
    })

    await prisma.activity.create({
      data: {
        userId,
        type: 'skill_added',
        skillId: skill.id,
        skillName: skill.name,
        message: `Added ${skill.name} skill`,
      },
    })

    const withHistory = await prisma.skill.findUnique({
      where: { id: skill.id },
      include: { evidence: true, history: { orderBy: { timestamp: 'desc' } } },
    })
    return NextResponse.json(mapSkill(withHistory!))
  } catch (e) {
    console.error('Skill create error:', e)
    const dbErr = dbErrorResponse(e)
    if (dbErr) return dbErr
    return NextResponse.json(
      { error: 'Failed to create skill' },
      { status: 500 }
    )
  }
}
