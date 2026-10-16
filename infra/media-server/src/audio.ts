import type { FastifyInstance, FastifyRequest } from 'fastify'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export const AUDIO_MAX_BYTES = 100 * 1024 ** 2
export const AUDIO_MAX_DURATION_SEC = 30 * 60
const UPLOAD_TTL = 24 * 60 * 60
const PLAY_TTL = 60
const identifier = /^[a-zA-Z0-9_-]{1,100}$/

export interface AudioJob {
  appId: string
  audioId: string
  sourcePath: string
}

export interface AudioOptions {
  dataPath: string
  publicUrl: string
  getSecret(appId: string): string | undefined
  enqueue(job: AudioJob): Promise<void>
}

interface UploadState {
  size: number
  offset: number
  expires: number
  queued?: boolean
}

export function audioDir(dataPath: string, appId: string, audioId: string) {
  if (!identifier.test(appId) || !identifier.test(audioId)) { throw new Error('Invalid audio identifier') }
  // Никогда не помещаем аудио под публичный alias /v/.
  return join(dataPath, 'private-audio', appId, audioId)
}

function signature(secret: string, value: string) {
  return createHmac('sha256', secret).update(value).digest('base64url')
}

function sign(secret: string, purpose: string, appId: string, audioId: string, expires: number, size = 0) {
  const value = `${purpose}:${appId}:${audioId}:${expires}:${size}`
  return `${expires}.${size}.${signature(secret, value)}`
}

function verify(secret: string | undefined, token: string, purpose: string, appId: string, audioId: string) {
  const parts = token.split('.')
  const expires = Number(parts[0])
  const size = Number(parts[1])
  if (
    !secret || parts.length !== 3 || !Number.isSafeInteger(expires) || expires <= Date.now() / 1000
    || !Number.isSafeInteger(size)
  ) { return null }
  const expected = sign(secret, purpose, appId, audioId, expires, size)
  const a = Buffer.from(token)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b) ? { expires, size } : null
}

async function exists(path: string) {
  return stat(path).then(() => true, () => false)
}

/** Закрытые аудиофайлы: серверный ключ выдаёт разрешения, браузер получает узкие временные токены. */
export function registerAudioRoutes(app: FastifyInstance, options: AudioOptions) {
  const locks = new Map<string, Promise<void>>()
  async function locked<T>(key: string, action: () => Promise<T>): Promise<T> {
    const previous = locks.get(key) ?? Promise.resolve()
    let release!: () => void
    const current = new Promise<void>((resolve) => {
      release = resolve
    })
    locks.set(key, current)
    await previous
    try {
      return await action()
    } finally {
      release()
      if (locks.get(key) === current) { locks.delete(key) }
    }
  }
  type Params = { appId: string; audioId: string }
  const params = (req: FastifyRequest) => req.params as Params
  const valid = (p: Params) => identifier.test(p.appId) && identifier.test(p.audioId)
  const dir = (p: Params) => audioDir(options.dataPath, p.appId, p.audioId)
  const serverAuth = (req: FastifyRequest) => {
    const { appId } = params(req)
    const secret = options.getSecret(appId)
    const actual = Buffer.from(String(req.headers['x-media-key'] ?? ''))
    const expected = Buffer.from(`${appId}:${secret}`)
    return !!secret && actual.length === expected.length && timingSafeEqual(actual, expected)
  }
  const uploadAuth = (req: FastifyRequest) => {
    const p = params(req)
    return verify(options.getSecret(p.appId), String(req.headers['x-upload-token'] ?? ''), 'upload', p.appId, p.audioId)
  }
  async function state(p: Params): Promise<UploadState | null> {
    try {
      return JSON.parse(await readFile(join(dir(p), 'upload.json'), 'utf8')) as UploadState
    } catch {
      return null
    }
  }
  const deleted = (p: Params) => exists(join(dir(p), 'deleted'))
  const prefix = '/api/v1/:appId/audio'

  app.post(`${prefix}/request-upload`, async (req, reply) => {
    if (!serverAuth(req)) { return reply.code(401).send() }
    const body = req.body as { audioId?: string; size?: number } | null
    if (
      !body || typeof body.audioId !== 'string' || !identifier.test(body.audioId) || !Number.isSafeInteger(body.size)
      || body.size! <= 0 || body.size! > AUDIO_MAX_BYTES
    ) {
      return reply.code(400).send({ error: 'Invalid audioId or size (maximum 100 MiB)' })
    }
    const { appId } = params(req)
    const expires = Math.floor(Date.now() / 1000) + UPLOAD_TTL
    return {
      uploadToken: sign(options.getSecret(appId)!, 'upload', appId, body.audioId, expires, body.size),
      tusUrl: `${options.publicUrl}/api/v1/${appId}/audio/tus`,
      expiresIn: UPLOAD_TTL,
    }
  })

  app.post(`${prefix}/tus`, async (req, reply) => {
    const appId = params(req).appId
    // Идентификатор передаётся отдельно, подпись связывает его с размером и приложением.
    const metadata = String(req.headers['upload-metadata'] ?? '').split(',')
    const idValue = metadata.find((value) => value.trim().startsWith('audioId '))?.trim().slice(8)
    const audioId = idValue
      ? Buffer.from(idValue, 'base64').toString('utf8')
      : String((req.query as Record<string, string>).audioId ?? '')
    const p = { appId, audioId }
    if (!valid(p)) { return reply.code(400).send() }
    const grant = verify(
      options.getSecret(appId),
      String(req.headers['x-upload-token'] ?? ''),
      'upload',
      appId,
      audioId,
    )
    if (!grant) { return reply.code(401).send() }
    if (String(grant.size) !== req.headers['upload-length']) { return reply.code(400).send() }
    return locked(dir(p), async () => {
      if (await exists(dir(p))) { return reply.code(409).send() }
      await mkdir(dir(p), { recursive: true })
      await writeFile(join(dir(p), 'source'), '')
      await writeFile(
        join(dir(p), 'upload.json'),
        JSON.stringify({ size: grant.size, offset: 0, expires: grant.expires }),
      )
      return reply.header('Location', `${options.publicUrl}/api/v1/${appId}/audio/tus/${audioId}`)
        .header('Tus-Resumable', '1.0.0').code(201).send()
    })
  })

  app.head(`${prefix}/tus/:audioId`, async (req, reply) => {
    const p = params(req)
    if (!valid(p) || !uploadAuth(req)) { return reply.code(401).send() }
    const upload = await state(p)
    if (!upload || await deleted(p)) { return reply.code(404).send() }
    // Если Redis был недоступен после последнего чанка, HEAD повторит постановку, а не потеряет файл.
    if (upload.offset === upload.size && !upload.queued) {
      await locked(dir(p), async () => {
        const latest = await state(p)
        if (!latest || latest.queued || await deleted(p)) { return }
        if (!await exists(join(dir(p), 'ready.json'))) {
          await options.enqueue({ ...p, sourcePath: join(dir(p), 'source') })
        }
        latest.queued = true
        await writeFile(join(dir(p), 'upload.json'), JSON.stringify(latest))
      })
    }
    return reply.header('Upload-Offset', upload.offset).header('Upload-Length', upload.size)
      .header('Tus-Resumable', '1.0.0').header('Cache-Control', 'no-store').send()
  })

  app.patch(`${prefix}/tus/:audioId`, async (req, reply) => {
    const p = params(req)
    if (!valid(p) || !uploadAuth(req)) { return reply.code(401).send() }
    return locked(dir(p), async () => {
      const upload = await state(p)
      if (!upload || await deleted(p)) { return reply.code(404).send() }
      if (upload.queued || String(upload.offset) !== req.headers['upload-offset']) { return reply.code(409).send() }
      // Чанк ограничен отдельно от общего bodyLimit; не буферизуем весь файл.
      const chunks: Buffer[] = []
      let size = 0
      const body = req.body as AsyncIterable<Buffer> | Buffer
      const iterable = Buffer.isBuffer(body) ? [body] : body
      for await (const chunk of iterable) {
        size += chunk.length
        if (size > 5 * 1024 ** 2 || upload.offset + size > upload.size) { return reply.code(413).send() }
        chunks.push(chunk)
      }
      if (!size) { return reply.code(400).send() }
      // Смещение — подтверждённые байты: после сбоя повтор перезаписывает тот же участок.
      const { open } = await import('node:fs/promises')
      const file = await open(join(dir(p), 'source'), 'r+')
      try {
        const buffer = Buffer.concat(chunks)
        let written = 0
        while (written < size) {
          const result = await file.write(buffer, written, size - written, upload.offset + written)
          if (!result.bytesWritten) { throw new Error('Audio write failed') }
          written += result.bytesWritten
        }
      } finally {
        await file.close()
      }
      upload.offset += size
      await writeFile(join(dir(p), 'upload.json'), JSON.stringify(upload))
      if (upload.offset === upload.size) {
        await options.enqueue({ ...p, sourcePath: join(dir(p), 'source') })
        upload.queued = true
        await writeFile(join(dir(p), 'upload.json'), JSON.stringify(upload))
      }
      return reply.header('Upload-Offset', upload.offset).header('Tus-Resumable', '1.0.0').code(204).send()
    })
  })

  app.get(`${prefix}/:audioId/status`, async (req, reply) => {
    const p = params(req)
    if (!valid(p) || !serverAuth(req)) { return reply.code(401).send() }
    if (await deleted(p)) { return reply.code(404).send() }
    const upload = await state(p)
    if (!upload) { return { status: 'pending' } }
    try {
      const ready = JSON.parse(await readFile(join(dir(p), 'ready.json'), 'utf8'))
      return { status: 'ready', durationSec: ready.durationSec }
    } catch { /* Результат появляется только после успешной обработки. */ }
    if (await exists(join(dir(p), 'error'))) { return { status: 'error' } }
    return { status: upload.queued ? 'processing' : 'uploading' }
  })

  app.post(`${prefix}/:audioId/playback`, async (req, reply) => {
    const p = params(req)
    if (!valid(p) || !serverAuth(req)) { return reply.code(401).send() }
    if (await deleted(p) || !await exists(join(dir(p), 'ready.json'))) { return reply.code(404).send() }
    const expires = Math.floor(Date.now() / 1000) + PLAY_TTL
    const token = sign(options.getSecret(p.appId)!, 'play', p.appId, p.audioId, expires)
    return {
      url: `${options.publicUrl}/api/v1/${p.appId}/audio/${p.audioId}/stream?token=${token}`,
      expiresIn: PLAY_TTL,
    }
  })

  app.get(`${prefix}/:audioId/stream`, async (req, reply) => {
    const p = params(req)
    if (
      !valid(p)
      || !verify(
        options.getSecret(p.appId),
        String((req.query as Record<string, string>).token ?? ''),
        'play',
        p.appId,
        p.audioId,
      )
    ) { return reply.code(401).send() }
    const path = join(dir(p), 'audio.m4a')
    if (await deleted(p) || !await exists(join(dir(p), 'ready.json')) || !await exists(path)) {
      return reply.code(404).send()
    }
    const { size } = await stat(path)
    reply.header('Content-Type', 'audio/mp4').header('Cache-Control', 'private, no-store').header(
      'Accept-Ranges',
      'bytes',
    )
    const range = req.headers.range
    if (!range) { return reply.header('Content-Length', size).send(createReadStream(path)) }
    const match = /^bytes=(\d*)-(\d*)$/.exec(range)
    let start = match?.[1] ? Number(match[1]) : 0
    let end = match?.[2] ? Number(match[2]) : size - 1
    if (match && !match[1] && match[2]) {
      start = Math.max(0, size - end)
      end = size - 1
    }
    end = Math.min(end, size - 1)
    if (
      !match || (!match[1] && !match[2]) || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end
      || start >= size
    ) {
      return reply.header('Content-Range', `bytes */${size}`).code(416).send()
    }
    return reply.code(206).header('Content-Range', `bytes ${start}-${end}/${size}`)
      .header('Content-Length', end - start + 1).send(createReadStream(path, { start, end }))
  })

  app.delete(`${prefix}/:audioId`, async (req, reply) => {
    const p = params(req)
    if (!valid(p) || !serverAuth(req)) { return reply.code(401).send() }
    return locked(dir(p), async () => {
      await mkdir(dir(p), { recursive: true })
      // Надгробие не удаляем: старый upload-токен не должен воскресить запись.
      await writeFile(join(dir(p), 'deleted'), '')
      for (const file of ['source', 'audio.m4a', 'ready.json']) { await rm(join(dir(p), file), { force: true }) }
      return reply.code(204).send()
    })
  })
}
