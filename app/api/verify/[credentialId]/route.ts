import { NextResponse } from 'next/server'
import { publicCredential } from '@/lib/assessments/verify'
import { clientKey, handle, limit } from '@/lib/assessments/http'

export const dynamic = 'force-dynamic'

/** Public credential check: anyone with the id can confirm it. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ credentialId: string }> }
) {
  return handle('Verify credential', async () => {
    limit(`verify:${clientKey(request)}`, 60)
    const { credentialId } = await params
    const credential = await publicCredential(credentialId)
    if (!credential)
      return NextResponse.json({ error: 'No credential with that id.' }, { status: 404 })
    return NextResponse.json(credential, { headers: { 'Cache-Control': 'no-store' } })
  })
}
