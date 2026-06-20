import multipart from '@fastify/multipart'
import { createId } from '@paralleldrive/cuid2'
import Fastify from 'fastify'
import { createWriteStream } from 'node:fs'
import { extname } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { config, validateApiKey } from './config.ts'
import { spawnFfmpeg } from './ffmpeg.ts'
import { getJobStatus, transcodeQueue } from './queue.ts'
import { ensureDir, processedDir, rawDir, removeDir, sourcePath } from './storage.ts'

const app = Fastify({ logger: true })

await app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024 * 1024 } }) // 5 GB

// Auth hook
app.addHook('onRequest', async (req, reply) => {
  const appId = (req.params as Record<string, string>).appId
  if (!appId) return
  const key = req.headers['x-media-key']
  if (!key || !validateApiKey(appId, String(key))) {
    return reply.code(401).send({ error: 'Unauthorized' })
  }
})

// Health
app.get('/health', async () => ({ ok: true }))

// POST /api/v1/:appId/video/upload
app.post<{ Params: { appId: string }; Body: { webhookUrl?: string } }>(
  '/api/v1/:appId/video/upload',
  async (req, reply) => {
    const { appId } = req.params
    const data = await req.file()
    if (!data) return reply.code(400).send({ error: 'No file' })

    const videoId = createId()
    const ext = extname(data.filename).slice(1) || 'mp4'
    const dir = rawDir(appId, videoId)
    await ensureDir(dir)
    await pipeline(data.file, createWriteStream(sourcePath(appId, videoId, ext)))

    const webhookUrl = (req.query as Record<string, string>).webhookUrl
    const job = await transcodeQueue.add('transcode', {
      videoId,
      appId,
      sourcePath: sourcePath(appId, videoId, ext),
      webhookUrl,
    })

    return reply.code(202).send({ videoId, jobId: job.id })
  },
)

// GET /api/v1/:appId/video/:videoId/status
app.get<{ Params: { appId: string; videoId: string } }>(
  '/api/v1/:appId/video/:videoId/status',
  async (req, reply) => {
    const { appId, videoId } = req.params
    // jobId не хранится отдельно — ищем по паттерну в очереди
    const jobs = await transcodeQueue.getJobs(['waiting', 'active', 'completed', 'failed'])
    const job = jobs.find((j) => j.data.videoId === videoId && j.data.appId === appId)
    if (!job) return reply.code(404).send({ error: 'Not found' })
    const status = await getJobStatus(job.id!)
    return { videoId, status }
  },
)

// DELETE /api/v1/:appId/video/:videoId
app.delete<{ Params: { appId: string; videoId: string } }>(
  '/api/v1/:appId/video/:videoId',
  async (req, reply) => {
    const { appId, videoId } = req.params
    await removeDir(rawDir(appId, videoId))
    await removeDir(processedDir(appId, videoId))
    // Удаляем job из очереди если есть
    const jobs = await transcodeQueue.getJobs(['waiting', 'active'])
    const job = jobs.find((j) => j.data.videoId === videoId && j.data.appId === appId)
    if (job) await job.remove()
    return reply.code(204).send()
  },
)

// POST /api/v1/:appId/video/:videoId/poster
app.post<{ Params: { appId: string; videoId: string } }>(
  '/api/v1/:appId/video/:videoId/poster',
  async (req, reply) => {
    const { appId, videoId } = req.params
    const { timestamp = '00:00:01' } = req.query as Record<string, string>
    const dir = processedDir(appId, videoId)
    // Найти source файл
    const glob = new Bun.Glob('source.*')
    const files = [...glob.scanSync(rawDir(appId, videoId))]
    if (!files.length) return reply.code(404).send({ error: 'Source not found' })
    const src = `${rawDir(appId, videoId)}/${files[0]}`
    const out = `${dir}/poster.jpg`
    await ensureDir(dir)
    await spawnFfmpeg(['-i', src, '-ss', timestamp, '-frames:v', '1', '-y', out])
    return { poster: `https://media.letar.best/v/${appId}/${videoId}/poster.jpg` }
  },
)

await app.listen({ port: config.port, host: '0.0.0.0' })
