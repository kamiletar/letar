import { Worker } from 'bullmq'
import { config } from './config.ts'
import { spawnFfmpeg } from './ffmpeg.ts'
import type { TranscodeJob } from './queue.ts'
import { ensureDir, outputPath, processedDir, rawDir, removeDir, videoUrls } from './storage.ts'

async function transcode(job: TranscodeJob) {
  const { appId, videoId, sourcePath, webhookUrl } = job
  const outDir = processedDir(appId, videoId)
  await ensureDir(outDir)

  // 320p
  await spawnFfmpeg([
    '-i',
    sourcePath,
    '-vf',
    'scale=-2:320',
    '-c:v',
    'libx264',
    '-preset',
    'medium',
    '-crf',
    '26',
    '-c:a',
    'aac',
    '-b:a',
    '64k',
    '-movflags',
    '+faststart',
    '-y',
    outputPath(appId, videoId, '320p.mp4'),
  ])

  // 720p
  await spawnFfmpeg([
    '-i',
    sourcePath,
    '-vf',
    'scale=-2:720',
    '-c:v',
    'libx264',
    '-preset',
    'medium',
    '-crf',
    '23',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-movflags',
    '+faststart',
    '-y',
    outputPath(appId, videoId, '720p.mp4'),
  ])

  // 1080p
  await spawnFfmpeg([
    '-i',
    sourcePath,
    '-vf',
    'scale=-2:1080',
    '-c:v',
    'libx264',
    '-preset',
    'medium',
    '-crf',
    '22',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-movflags',
    '+faststart',
    '-y',
    outputPath(appId, videoId, '1080p.mp4'),
  ])

  // Постер (1 кадр на 1 секунде)
  await spawnFfmpeg([
    '-i',
    sourcePath,
    '-ss',
    '00:00:01',
    '-frames:v',
    '1',
    '-y',
    outputPath(appId, videoId, 'poster.jpg'),
  ])

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
  }
)

worker.on('failed', (job, err) => {
  console.error(`[worker] job ${job?.id} failed:`, err.message)
})

console.log(`[worker] ready — concurrency=${config.workerConcurrency}`)
