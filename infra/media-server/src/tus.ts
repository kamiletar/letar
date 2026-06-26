import type { FastifyInstance } from 'fastify'
import Redis from 'ioredis'
import { createWriteStream } from 'node:fs'
import { open } from 'node:fs/promises'
import { Transform } from 'node:stream'
import type { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { config } from './config.ts'
import { transcodeQueue } from './queue.ts'
import { ensureDir, rawDir, sourcePath } from './storage.ts'
import { consumeUploadToken } from './tokens.ts'

interface TusState {
  appId: string
  videoId: string
  webhookUrl: string
  offset: number
  length: number
  filePath: string
}

const redis = new Redis(config.redisUrl)
const TUS_TTL = 24 * 60 * 60 // 24 часа

function tusKey(appId: string, videoId: string) {
  return `tus_state:${appId}:${videoId}`
}

async function getTusState(appId: string, videoId: string): Promise<TusState | null> {
  const raw = await redis.get(tusKey(appId, videoId))
  if (!raw) return null
  return JSON.parse(raw) as TusState
}

async function saveTusState(state: TusState): Promise<void> {
  await redis.setex(tusKey(state.appId, state.videoId), TUS_TTL, JSON.stringify(state))
}

async function deleteTusState(appId: string, videoId: string): Promise<void> {
  await redis.del(tusKey(appId, videoId))
}

/** Разбирает Upload-Metadata: "filename dGVzdC5tcDQ=,filetype dmlkZW8vbXA0" */
function parseMetadata(header: string | undefined): Record<string, string> {
  if (!header) return {}
  const result: Record<string, string> = {}
  for (const part of header.split(',')) {
    const trimmed = part.trim()
    const spaceIdx = trimmed.indexOf(' ')
    if (spaceIdx === -1) {
      result[trimmed] = ''
    } else {
      const key = trimmed.slice(0, spaceIdx)
      const b64 = trimmed.slice(spaceIdx + 1)
      result[key] = Buffer.from(b64, 'base64').toString('utf-8')
    }
  }
  return result
}

function parseExt(filename: string, filetype: string): string {
  if (filename) {
    const dot = filename.lastIndexOf('.')
    if (dot >= 0) {
      const ext = filename.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '')
      if (ext) return ext
    }
  }
  if (filetype?.startsWith('video/')) {
    const sub = filetype.split('/')[1] ?? ''
    const map: Record<string, string> = { quicktime: 'mov', 'x-matroska': 'mkv', 'x-msvideo': 'avi' }
    return map[sub] ?? sub
  }
  return 'mp4'
}

export function registerTusRoutes(app: FastifyInstance): void {
  // OPTIONS preflight
  app.options<{ Params: { appId: string } }>(
    '/api/v1/:appId/video/tus',
    async (_req, reply) => {
      reply.header('Tus-Resumable', '1.0.0')
      reply.header('Tus-Version', '1.0.0')
      reply.header('Tus-Max-Size', String(20 * 1024 * 1024 * 1024))
      reply.header('Tus-Extension', 'creation,termination')
      return reply.code(204).send()
    },
  )

  // POST — создаём TUS загрузку (потребляем X-Upload-Token)
  app.post<{ Params: { appId: string } }>(
    '/api/v1/:appId/video/tus',
    async (req, reply) => {
      const { appId } = req.params
      const uploadToken = req.headers['x-upload-token'] as string | undefined
      if (!uploadToken) return reply.code(401).send({ error: 'X-Upload-Token required' })

      const tokenPayload = await consumeUploadToken(uploadToken)
      if (!tokenPayload || tokenPayload.appId !== appId) {
        return reply.code(401).send({ error: 'Invalid or expired upload token' })
      }

      const uploadLengthHeader = req.headers['upload-length'] as string | undefined
      const uploadLength = uploadLengthHeader ? parseInt(uploadLengthHeader, 10) : NaN
      if (isNaN(uploadLength) || uploadLength <= 0) {
        return reply.code(400).send({ error: 'Invalid Upload-Length' })
      }

      const metadata = parseMetadata(req.headers['upload-metadata'] as string | undefined)
      const ext = parseExt(metadata.filename ?? '', metadata.filetype ?? '')
      const { videoId, webhookUrl } = tokenPayload

      const dir = rawDir(appId, videoId)
      await ensureDir(dir)

      // Создаём разреженный файл нужного размера
      const fPath = sourcePath(appId, videoId, ext)
      const fh = await open(fPath, 'w')
      await fh.truncate(uploadLength)
      await fh.close()

      await saveTusState({ appId, videoId, webhookUrl, offset: 0, length: uploadLength, filePath: fPath })

      const location = `${config.publicUrl}/api/v1/${appId}/video/tus/${videoId}`
      reply.header('Location', location)
      reply.header('Tus-Resumable', '1.0.0')
      return reply.code(201).send()
    },
  )

  // HEAD — возвращаем текущий offset
  app.head<{ Params: { appId: string; videoId: string } }>(
    '/api/v1/:appId/video/tus/:videoId',
    async (req, reply) => {
      const { appId, videoId } = req.params
      const state = await getTusState(appId, videoId)
      if (!state) return reply.code(404).send()

      reply.header('Upload-Offset', String(state.offset))
      reply.header('Upload-Length', String(state.length))
      reply.header('Tus-Resumable', '1.0.0')
      reply.header('Cache-Control', 'no-store')
      return reply.code(200).send()
    },
  )

  // PATCH — записываем чанк
  app.patch<{ Params: { appId: string; videoId: string } }>(
    '/api/v1/:appId/video/tus/:videoId',
    async (req, reply) => {
      const { appId, videoId } = req.params
      const state = await getTusState(appId, videoId)
      if (!state) return reply.code(404).send({ error: 'Upload not found' })

      const uploadOffset = parseInt(req.headers['upload-offset'] as string, 10)
      if (isNaN(uploadOffset) || uploadOffset !== state.offset) {
        return reply.code(409).send({ error: `Offset mismatch: expected ${state.offset}, got ${uploadOffset}` })
      }

      // Пишем поток напрямую в файл, считаем байты
      let bytesWritten = 0
      const counter = new Transform({
        transform(chunk: Buffer, _enc, cb) {
          bytesWritten += chunk.length
          cb(null, chunk)
        },
      })
      const ws = createWriteStream(state.filePath, { flags: 'r+', start: state.offset })
      await pipeline(req.body as unknown as Readable, counter, ws)

      const newOffset = state.offset + bytesWritten
      state.offset = newOffset
      await saveTusState(state)

      // Загрузка завершена → ставим задачу транскодирования
      if (newOffset >= state.length) {
        await transcodeQueue.add('transcode', {
          videoId,
          appId,
          sourcePath: state.filePath,
          webhookUrl: state.webhookUrl,
        })
        await deleteTusState(appId, videoId)
      }

      reply.header('Upload-Offset', String(newOffset))
      reply.header('Tus-Resumable', '1.0.0')
      return reply.code(204).send()
    },
  )

  // DELETE — отмена загрузки
  app.delete<{ Params: { appId: string; videoId: string } }>(
    '/api/v1/:appId/video/tus/:videoId',
    async (req, reply) => {
      const { appId, videoId } = req.params
      const state = await getTusState(appId, videoId)
      if (state) await deleteTusState(appId, videoId)
      reply.header('Tus-Resumable', '1.0.0')
      return reply.code(204).send()
    },
  )
}
