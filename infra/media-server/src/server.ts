import cors from '@fastify/cors'
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
import { consumeUploadToken, createUploadToken } from './tokens.ts'
import { registerTusRoutes } from './tus.ts'

const app = Fastify({ logger: true, bodyLimit: 20 * 1024 * 1024 * 1024 })

await app.register(cors, {
  origin: (origin, cb) => {
    // Разрешаем запросы от letar-приложений и локальной разработки
    const allowed = [/\.letar\.best$/, /svoichuzhie\.ru$/, /localhost/, /127\.0\.0\.1/]
    if (!origin || allowed.some((r) => r.test(origin))) {
      cb(null, true)
    } else {
      cb(new Error('Not allowed'), false)
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Content-Type',
    'X-Media-Key',
    'X-Upload-Token',
    'Upload-Length',
    'Upload-Offset',
    'Upload-Metadata',
    'Tus-Resumable',
  ],
  exposedHeaders: [
    'Content-Length',
    'Upload-Offset',
    'Upload-Length',
    'Location',
    'Tus-Resumable',
    'Tus-Version',
    'Tus-Max-Size',
    'Tus-Extension',
  ],
})

await app.register(multipart, { limits: { fileSize: 20 * 1024 * 1024 * 1024 } }) // 20 ГБ

// Парсер сырого тела для TUS PATCH (application/offset+octet-stream)
// Передаём поток как есть — не буферизуем в памяти
app.addContentTypeParser('application/offset+octet-stream', (_req, payload, done) => {
  done(null, payload)
})

// Auth hook — пропускаем /health и upload по токену
app.addHook('onRequest', async (req, reply) => {
  if (req.url === '/health') return

  const appId = (req.params as Record<string, string>).appId
  if (!appId) return

  // TUS роуты: /video/tus — авторизация внутри роут-хендлеров
  if (req.url.includes('/video/tus')) return

  // Прямой аплоад от браузера — проверяем одноразовый токен
  if (req.url.includes('/video/upload') && req.method === 'POST') {
    const uploadToken = req.headers['x-upload-token']
    if (uploadToken) {
      const payload = await consumeUploadToken(String(uploadToken))
      if (!payload || payload.appId !== appId) {
        return reply.code(401).send({ error: 'Invalid or expired upload token' })
      } // Сохраняем payload для использования в хендлере

      ;(req as unknown as Record<string, unknown>)._uploadPayload = payload
      return
    }
  }

  // Стандартная авторизация через X-Media-Key (сервер-сервер)
  const key = req.headers['x-media-key']
  if (!key || !validateApiKey(appId, String(key))) {
    return reply.code(401).send({ error: 'Unauthorized' })
  }
})

// Health
app.get('/health', async () => ({ ok: true }))

// POST /api/v1/:appId/video/request-upload — выдаёт одноразовый токен для браузера
// Вызывается с сервера приложения (требует X-Media-Key)
app.post<{ Params: { appId: string } }>('/api/v1/:appId/video/request-upload', async (req, reply) => {
  const { appId } = req.params
  const { videoId, webhookUrl } = req.body as { videoId: string; webhookUrl: string }
  if (!videoId || !webhookUrl) {
    return reply.code(400).send({ error: 'videoId and webhookUrl are required' })
  }
  const uploadToken = await createUploadToken(appId, videoId, webhookUrl)
  const uploadUrl = `${config.publicUrl}/api/v1/${appId}/video/upload`
  const tusUrl = `${config.publicUrl}/api/v1/${appId}/video/tus`
  return { uploadToken, uploadUrl, tusUrl, expiresIn: 900 }
})

// POST /api/v1/:appId/video/upload — принимает файл (X-Media-Key или X-Upload-Token)
app.post<{ Params: { appId: string } }>('/api/v1/:appId/video/upload', async (req, reply) => {
  const { appId } = req.params

  // Получаем webhookUrl — либо из токена (браузерный аплоад), либо из query
  const tokenPayload = (req as unknown as Record<string, unknown>)._uploadPayload as {
    videoId?: string
    webhookUrl?: string
  } | undefined
  const webhookUrl = tokenPayload?.webhookUrl ?? (req.query as Record<string, string>).webhookUrl

  const data = await req.file()
  if (!data) return reply.code(400).send({ error: 'No file' })

  const videoId = tokenPayload?.videoId ?? createId()
  const ext = extname(data.filename).slice(1) || 'mp4'
  const dir = rawDir(appId, videoId)
  await ensureDir(dir)
  await pipeline(data.file, createWriteStream(sourcePath(appId, videoId, ext)))

  const job = await transcodeQueue.add('transcode', {
    videoId,
    appId,
    sourcePath: sourcePath(appId, videoId, ext),
    webhookUrl,
  })

  return reply.code(202).send({ videoId, jobId: job.id })
})

// GET /api/v1/:appId/video/:videoId/status
app.get<{ Params: { appId: string; videoId: string } }>('/api/v1/:appId/video/:videoId/status', async (req, reply) => {
  const { appId, videoId } = req.params
  const jobs = await transcodeQueue.getJobs(['waiting', 'active', 'completed', 'failed'])
  const job = jobs.find((j) => j.data.videoId === videoId && j.data.appId === appId)
  if (!job) return reply.code(404).send({ error: 'Not found' })
  const status = await getJobStatus(job.id!)
  return { videoId, status }
})

// DELETE /api/v1/:appId/video/:videoId
app.delete<{ Params: { appId: string; videoId: string } }>('/api/v1/:appId/video/:videoId', async (req, reply) => {
  const { appId, videoId } = req.params
  await removeDir(rawDir(appId, videoId))
  await removeDir(processedDir(appId, videoId))
  const jobs = await transcodeQueue.getJobs(['waiting', 'active'])
  const job = jobs.find((j) => j.data.videoId === videoId && j.data.appId === appId)
  if (job) await job.remove()
  return reply.code(204).send()
})

// POST /api/v1/:appId/video/:videoId/poster
app.post<{ Params: { appId: string; videoId: string } }>('/api/v1/:appId/video/:videoId/poster', async (req, reply) => {
  const { appId, videoId } = req.params
  const { timestamp = '00:00:01' } = req.query as Record<string, string>
  const dir = processedDir(appId, videoId)
  const glob = new Bun.Glob('source.*')
  const files = [...glob.scanSync(rawDir(appId, videoId))]
  if (!files.length) return reply.code(404).send({ error: 'Source not found' })
  const src = `${rawDir(appId, videoId)}/${files[0]}`
  const out = `${dir}/poster.jpg`
  await ensureDir(dir)
  await spawnFfmpeg(['-i', src, '-ss', timestamp, '-frames:v', '1', '-y', out])
  return { poster: `${config.publicUrl}/v/${appId}/${videoId}/poster.jpg` }
})

registerTusRoutes(app)

await app.listen({ port: config.port, host: '0.0.0.0' })
