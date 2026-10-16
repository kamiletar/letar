import { Worker } from 'bullmq'
import { sweepAudioUploads } from './audio-sweep.ts'
import { transcodeAudio } from './audio-transcode.ts'
import type { AudioJob } from './audio.ts'
import { config } from './config.ts'
import type { TranscodeJob } from './queue.ts'
import { ensureDir, processedDir, rawDir, removeDir, videoUrls } from './storage.ts'
import { transcodeToDir } from './transcode.ts'

async function transcode(job: TranscodeJob) {
  const { appId, videoId, sourcePath, webhookUrl } = job
  const outDir = processedDir(appId, videoId)
  await ensureDir(outDir)

  await transcodeToDir(sourcePath, outDir)

  // Удаляем сырой файл после успешного транскода
  await removeDir(rawDir(appId, videoId))

  // Webhook
  if (webhookUrl) {
    const urls = videoUrls(appId, videoId)
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'video.ready', videoId, appId, urls }),
    }).catch((err) => console.error('[webhook] failed:', err))
  }
}

const worker = new Worker<TranscodeJob>(
  'transcode',
  async (job) => {
    console.log(`[worker] start job ${job.id} — ${job.data.appId}/${job.data.videoId}`)
    await transcode(job.data)
    console.log(`[worker] done  job ${job.id} — ${job.data.appId}/${job.data.videoId}`)
  },
  {
    connection: { url: config.redisUrl },
    concurrency: config.workerConcurrency,
  },
)

worker.on('failed', (job, err) => {
  console.error(`[worker] job ${job?.id} failed:`, err.message)
})

console.log(`[worker] ready — concurrency=${config.workerConcurrency}`)

const audioWorker = new Worker<AudioJob>('audio', (job) => transcodeAudio(job.data, config.dataPath), {
  connection: { url: config.redisUrl },
  concurrency: config.workerConcurrency,
})
audioWorker.on('failed', (job, error) => console.error(`[audio] job ${job?.id} failed:`, error.message))
const sweepAudio = () => sweepAudioUploads(config.dataPath).catch((error) => console.error('[audio-sweep]', error))
setInterval(() => {
  void sweepAudio()
}, 3600 * 1000).unref()
void sweepAudio()
