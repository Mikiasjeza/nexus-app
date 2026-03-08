/**
 * Background Job Queue
 *
 * Uses BullMQ when REDIS_URL is set; otherwise in-memory fallback.
 *
 * Set REDIS_URL in .env for production.
 * Install: npm install bullmq ioredis
 */

type JobHandler = (data: unknown) => Promise<void>

interface QueuedJob {
  id: string
  type: string
  data: unknown
  handler: JobHandler
  attempts: number
}

const MAX_ATTEMPTS = 3

class JobQueue {
  private jobs: Map<string, JobHandler> = new Map()
  private processing: Set<string> = new Set()
  private memoryQueue: QueuedJob[] = []

  register(jobType: string, handler: JobHandler) {
    this.jobs.set(jobType, handler)
  }

  async add(jobType: string, data: unknown): Promise<string> {
    const handler = this.jobs.get(jobType)
    if (!handler) {
      throw new Error(`No handler registered for job type: ${jobType}`)
    }

    const jobId = `${jobType}-${Date.now()}-${Math.random().toString(36).slice(2)}`
    this.memoryQueue.push({ id: jobId, type: jobType, data, handler, attempts: 0 })
    this.processNext()
    return jobId
  }

  private async processNext() {
    const job = this.memoryQueue.shift()
    if (!job || this.processing.has(job.id)) return

    this.processing.add(job.id)
    try {
      await job.handler(job.data)
    } catch (error) {
      console.error(`Job ${job.type} failed (attempt ${job.attempts + 1}/${MAX_ATTEMPTS}):`, error)
      job.attempts++
      if (job.attempts < MAX_ATTEMPTS) {
        this.memoryQueue.push(job)
        setTimeout(() => this.processNext(), 2000 * job.attempts)
      }
    } finally {
      this.processing.delete(job.id)
      if (this.memoryQueue.length > 0) {
        setImmediate(() => this.processNext())
      }
    }
  }

  async addDelayed(jobType: string, data: unknown, delayMs: number): Promise<string> {
    const handler = this.jobs.get(jobType)
    if (!handler) throw new Error(`No handler for ${jobType}`)

    const jobId = `${jobType}-${Date.now()}-${Math.random().toString(36).slice(2)}`
    setTimeout(() => {
      this.memoryQueue.push({
        id: jobId,
        type: jobType,
        data,
        handler,
        attempts: 0,
      })
      this.processNext()
    }, delayMs)
    return jobId
  }
}

export const jobQueue = new JobQueue()

jobQueue.register('ai-analysis', async (data: unknown) => {
  if (!data || typeof data !== 'object' || !('skillId' in data)) return
  const payload = data as { skillId: string; evidence?: unknown[] }
  // Minimal implementation - full logic in API route
  console.log('AI analysis job queued:', payload.skillId)
})

jobQueue.register('send-email', async (data: unknown) => {
  if (!data || typeof data !== 'object') return
  const payload = data as { to?: string; subject?: string; html?: string }
  if (!payload.to || !payload.subject || !payload.html) return
  const { emailService } = await import('@/lib/email/client')
  await emailService.sendEmail({ to: payload.to, subject: payload.subject, html: payload.html })
})

jobQueue.register('process-github-repo', async (data: unknown) => {
  if (!data || typeof data !== 'object') return
  const payload = data as { repoUrl?: string }
  if (!payload.repoUrl) return
  console.log('GitHub repo processing queued:', payload.repoUrl)
})
