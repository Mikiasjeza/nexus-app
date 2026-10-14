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
import { verifySkill, type VerifySkillOutcome } from '@/lib/ai/verify-skill'
import type { EvidenceInput } from '@/lib/ai/verification'

// Room for the multipart envelope and the other form fields around the file.
const MAX_REQUEST_BYTES = MAX_UPLOAD_BYTES + 64 * 1024

// Upload plus AI assessment can exceed the platform default.
export const maxDuration = 60

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

/** Verification result as returned to the uploader. Upload succeeds either way. */
function describeVerification(outcome: VerifySkillOutcome | { status: 'failed' }) {
  switch (outcome.status) {
    case 'assessed':
      return {
        status: 'assessed',
        verified: outcome.verified,
        confidenceScore: outcome.confidenceScore,
        explanation: outcome.explanation,
        suggestedLevel: outcome.suggestedLevel,
        improvements: outcome.improvements,
      }
    case 'quota_exceeded':
      return {
        status: 'skipped',
        message: `Evidence saved. Your ${outcome.plan} plan's ${outcome.limit} AI checks this month are used up, so it wasn't checked yet.`,
      }
    case 'failed':
      return {
        status: 'skipped',
        message: 'Evidence saved, but the AI check failed. Try again from the verification page.',
      }
    default:
      return { status: 'skipped', message: 'Evidence saved.' }
  }
}

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
    // The verification page uploads first and then runs one AI check covering
    // the file and the typed evidence, so it asks this route not to check too.
    const deferVerification = formData.get('verify') === 'false'

    if (!file && !url) {
      return NextResponse.json({ error: 'File or URL required' }, { status: 400 })
    }

    const submittedEvidence: EvidenceInput[] = []
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
      // Text files are read by the AI directly; binaries are described by name and type.
      if (mime.startsWith('text/') || mime === 'application/json') {
        submittedEvidence.push({
          type: 'code',
          content: buffer.toString('utf8'),
          metadata: { fileName: file.name, mimeType: mime },
        })
      }

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
      if (!url || !isHttpUrl(url.trim())) {
        return NextResponse.json(
          { error: 'Valid URL required (must start with http:// or https://)' },
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

    const data = {
      id: evidence.id,
      type: evidence.type,
      url: evidence.url ?? evidence.fileUrl,
      description: evidence.description,
    }
    if (deferVerification) {
      return NextResponse.json({ success: true, data, verification: null })
    }

    // Every submission is checked by the AI. A failed check never loses the upload.
    let outcome: VerifySkillOutcome | { status: 'failed' }
    try {
      outcome = await verifySkill({
        userId,
        skillId,
        submittedEvidence,
        evidenceId: evidence.id,
      })
    } catch (verifyErr) {
      console.error('Evidence verification error:', verifyErr)
      outcome = { status: 'failed' }
    }

    return NextResponse.json({
      success: true,
      data,
      verification: describeVerification(outcome),
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
