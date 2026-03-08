import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth/session'
import { mapSkill } from '@/lib/skills-mapper'

async function getSkillForUser(skillId: string, userId: string) {
  return prisma.skill.findFirst({
    where: { id: skillId, userId },
    include: { evidence: true, history: { orderBy: { timestamp: 'desc' } } },
  })
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const { id } = await params
    const skill = await getSkillForUser(id, userId)
    if (!skill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
    }
    return NextResponse.json(mapSkill(skill))
  } catch (e) {
    console.error('Skill get error:', e)
    return NextResponse.json(
      { error: 'Failed to load skill' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const { id } = await params
    const existing = await getSkillForUser(id, userId)
    if (!existing) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
    }

    const body = await request.json()
    const allowed = [
      'name',
      'level',
      'category',
      'progress',
      'notes',
      'description',
      'tags',
      'verified',
      'order',
      'visibility',
      'status',
    ] as const
    const updates: Record<string, unknown> = {}
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key]
    }
    if (Object.keys(updates).length === 0) {
      const withRelations = await prisma.skill.findUnique({
        where: { id },
        include: { evidence: true, history: { orderBy: { timestamp: 'desc' } } },
      })
      return NextResponse.json(mapSkill(withRelations!))
    }

    const changes: { field: string; oldValue: unknown; newValue: unknown }[] = []
    if (updates.level !== undefined && updates.level !== existing.level) {
      changes.push({
        field: 'level',
        oldValue: existing.level,
        newValue: updates.level,
      })
    }
    if (
      updates.progress !== undefined &&
      Number(updates.progress) !== existing.progress
    ) {
      changes.push({
        field: 'progress',
        oldValue: existing.progress,
        newValue: updates.progress,
      })
    }
    if (updates.verified !== undefined && updates.verified !== existing.verified) {
      changes.push({
        field: 'verified',
        oldValue: existing.verified,
        newValue: updates.verified,
      })
    }

    const skill = await prisma.skill.update({
      where: { id },
      data: updates,
      include: { evidence: true, history: { orderBy: { timestamp: 'desc' } } },
    })

    if (changes.length > 0) {
      await prisma.skillHistory.create({
        data: {
          skillId: id,
          userId,
          changes: changes as Prisma.InputJsonValue,
        },
      })
    }

    const activityType =
      updates.level !== undefined && updates.level !== existing.level
        ? 'level_up'
        : 'skill_updated'
    const message =
      activityType === 'level_up'
        ? `Leveled up ${skill.name} to ${skill.level}`
        : `Updated ${skill.name}`
    await prisma.activity.create({
      data: {
        userId,
        type: activityType,
        skillId: id,
        skillName: skill.name,
        message,
      },
    })

    return NextResponse.json(mapSkill(skill))
  } catch (e) {
    console.error('Skill update error:', e)
    return NextResponse.json(
      { error: 'Failed to update skill' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const { id } = await params
    const skill = await getSkillForUser(id, userId)
    if (!skill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
    }
    await prisma.skill.delete({ where: { id } })
    await prisma.activity.create({
      data: {
        userId,
        type: 'skill_deleted',
        skillId: id,
        skillName: skill.name,
        message: `Deleted ${skill.name} skill`,
      },
    })
    return new NextResponse(null, { status: 204 })
  } catch (e) {
    console.error('Skill delete error:', e)
    return NextResponse.json(
      { error: 'Failed to delete skill' },
      { status: 500 }
    )
  }
}
