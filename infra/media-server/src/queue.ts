import { type ConnectionOptions, Queue } from 'bullmq'
import { config } from './config.ts'

export interface TranscodeJob {
  videoId: string
  appId: string
  sourcePath: string
  webhookUrl?: string
}

export type JobStatus = 'queued' | 'processing' | 'ready' | 'error' | 'unknown'

const connection: ConnectionOptions = { url: config.redisUrl }

export const transcodeQueue = new Queue<TranscodeJob>('transcode', { connection })

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const job = await transcodeQueue.getJob(jobId)
  if (!job) { return 'unknown' }
  const state = await job.getState()
  switch (state) {
    case 'waiting':
    case 'delayed':
      return 'queued'
    case 'active':
      return 'processing'
    case 'completed':
      return 'ready'
    case 'failed':
      return 'error'
    default:
      return 'unknown'
  }
}
