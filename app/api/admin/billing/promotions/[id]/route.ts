import { NextResponse } from 'next/server'
import { z } from 'zod'
import { AssessmentError } from '@/lib/assessments/errors'
import { handle, readJson, requireReviewer } from '@/lib/assessments/http'
import { updatePromotion } from '@/lib/billing/admin'

export const dynamic = 'force-dynamic'

const isoDate = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid date')
  .nullable()

const patchSchema = z
  .object({
    active: z.boolean().optional(),
    startsAt: isoDate.optional(),
    endsAt: isoDate.optional(),
    maxRedemptions: z.number().int().min(0).max(100_000).nullable().optional(),
  })
  .strict()

/** Turn a promotion on or off, set its dates and cap. Audit-logged. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle('Update promotion', async () => {
    const actor = await requireReviewer()
    const { id } = await params
    const parsed = patchSchema.safeParse(await readJson(request, 2_000))
    if (!parsed.success) throw new AssessmentError('Invalid promotion settings')
    const { startsAt, endsAt } = parsed.data
    if (startsAt && endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) {
      throw new AssessmentError('The end date must be after the start date.')
    }
    const updated = await updatePromotion(id, parsed.data, actor)
    return NextResponse.json({ id: updated.id, active: updated.active })
  })
}
