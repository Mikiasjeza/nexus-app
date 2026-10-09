/**
 * Evidence Upload API
 *
 * POST /api/skills/[id]/evidence
 *
 * Uploads evidence (file or URL) for a skill. Requires auth. Creates Evidence record in DB.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth/session'
import { storageService } from '@/lib/storage/upload'
import { rateLimit } from '@/lib/utils/rateLimit'
import { dbErrorResponse } from '@/lib/db-error'
import { MAX_UPLOAD_BYTES, validateUpload } from '@/lib/storage/validate-upload'

// Room for the multipart envelope and the other form fields around the file.
const MAX_REQUEST_BYTES = MAX_UPLOAD_BYTES + 64 * 1024

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const rl = rateLimit(`evidence:${userId}`, { maxRequests: 20, windowMs: 60000 })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many uploads. Try again later.' }, { status: 429 })
    }

    const { id: skillId } = await params
    const skill = await prisma.skill.findFirst({
      where: { id: skillId, userId },
      include: { evidence: true },
    })
    if (!skill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
    }

    // Reject oversized bodies before buffering them.
    const contentLength = Number(request.headers.get('content-length') ?? 0)
    if (contentLength > MAX_REQUEST_BYTES) {
      return NextResponse.json(
        { error: `File too large. Max size: ${MAX_UPLOAD_BYTES / 1024 / 1024}MB` },
        { status: 413 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const type = (formData.get('type') as string) || 'file'
    const description = (formData.get('description') as string) || null
    const url = (formData.get('url') as string) || null

    if (!file && !url) {
      return NextResponse.json({ error: 'File or URL required' }, { status: 400 })
    }

    let evidenceData: {
      skillId: string
      type: string
      url?: string
      fileUrl?: string
      fileName?: string
      fileSize?: number
      mimeType?: string
      description?: string
    }

    if (file && file.size > 0) {
      if (file.size > MAX_UPLOAD_BYTES) {
        return NextResponse.json(
          { error: `File too large. Max size: ${MAX_UPLOAD_BYTES / 1024 / 1024}MB` },
          { status: 413 }
        )
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      // The browser's declared type is ignored: the stored type comes from
      // the extension, and only once the file's bytes match it.
      const check = validateUpload(file.name, buffer)
      if (!check.ok) {
        return NextResponse.json({ error: check.error }, { status: 400 })
      }
      const mime = check.mimeType

      let uploadResult
      try {
        uploadResult = await storageService.uploadFile(buffer, file.name, mime, `skills/${skillId}`)
      } catch (storageErr) {
        console.error('Storage upload error:', storageErr)
        return NextResponse.json(
          {
            error: 'File storage not configured. Set AWS credentials or use URL-based evidence.',
          },
          { status: 503 }
        )
      }

      evidenceData = {
        skillId,
        type: type || 'file',
        fileUrl: uploadResult.url,
        fileName: file.name,
        fileSize: file.size,
        mimeType: mime,
        description: description || undefined,
      }
    } else {
      if (!url || !url.startsWith('http')) {
        return NextResponse.json(
          { error: 'Valid URL required (must start with http)' },
          { status: 400 }
        )
      }
      evidenceData = {
        skillId,
        type: type || 'link',
        url: url.trim(),
        description: description || undefined,
      }
    }

    const evidence = await prisma.evidence.create({
      data: evidenceData,
    })

    const newCount = skill.evidence.length + 1
    await prisma.skillHistory.create({
      data: {
        skillId,
        userId,
        changes: [
          {
            field: 'evidence',
            oldValue: skill.evidence.length,
            newValue: newCount,
          },
        ],
      },
    })
    await prisma.activity.create({
      data: {
        userId,
        type: 'evidence_added',
        skillId,
        skillName: skill.name,
        message: `Added evidence to ${skill.name}`,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: evidence.id,
        type: evidence.type,
        url: evidence.url ?? evidence.fileUrl,
        description: evidence.description,
      },
    })
  } catch (e) {
    console.error('Evidence upload error:', e)
    const dbErr = dbErrorResponse(e)
    if (dbErr) return dbErr
    return NextResponse.json(
      {
        error: 'Upload failed',
        message: e instanceof Error ? e.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
