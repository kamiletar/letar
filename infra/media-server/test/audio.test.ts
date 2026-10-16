import { afterEach, describe, expect, it } from 'bun:test'
import Fastify from 'fastify'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { registerAudioRoutes } from '../src/audio.ts'

const cleanups: (() => Promise<unknown>)[] = []
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) { await cleanup() }
})

async function setup(failEnqueueOnce = false) {
  const dataPath = await mkdtemp(join(tmpdir(), 'media-audio-'))
  const app = Fastify()
  cleanups.push(() => app.close(), () => rm(dataPath, { recursive: true, force: true }))
  const jobs: unknown[] = []
  app.addContentTypeParser(
    'application/offset+octet-stream',
    { parseAs: 'buffer' },
    (_req, body, done) => done(null, body),
  )
  registerAudioRoutes(app, {
    dataPath,
    publicUrl: 'https://media.example.test',
    getSecret: (id) => id === 'test' ? 'secret' : undefined,
    enqueue: async (job) => {
      if (failEnqueueOnce) {
        failEnqueueOnce = false
        throw new Error('Queue unavailable')
      }
      jobs.push(job)
    },
  })
  const grant = await app.inject({
    method: 'POST',
    url: '/api/v1/test/audio/request-upload',
    headers: { 'x-media-key': 'test:secret' },
    payload: { audioId: 'recording1', size: 8 },
  })
  return { app, jobs, dataPath, grant: grant.json() as { uploadToken: string; tusUrl: string } }
}

describe('закрытое аудио', () => {
  it('повторяет постановку после сбоя очереди на последнем чанке', async () => {
    const { app, grant, jobs } = await setup(true)
    const headers = { 'x-upload-token': grant.uploadToken }
    await app.inject({
      method: 'POST',
      url: '/api/v1/test/audio/tus?audioId=recording1',
      headers: { ...headers, 'upload-length': '8' },
    })
    expect(
      (await app.inject({
        method: 'PATCH',
        url: '/api/v1/test/audio/tus/recording1',
        headers: { ...headers, 'content-type': 'application/offset+octet-stream', 'upload-offset': '0' },
        payload: '12345678',
      })).statusCode,
    ).toBe(500)
    const head = await app.inject({ method: 'HEAD', url: '/api/v1/test/audio/tus/recording1', headers })
    expect(head.statusCode).toBe(200)
    expect(head.headers['upload-offset']).toBe('8')
    expect(jobs).toHaveLength(1)
  })
  it('не выдаёт загрузку без серверного ключа или с некорректным размером', async () => {
    const { app } = await setup()
    for (
      const payload of [{ audioId: '../outside', size: 8 }, { audioId: 'a', size: 0 }, {
        audioId: 'a',
        size: 101 * 1024 ** 2,
      }]
    ) {
      expect(
        (await app.inject({
          method: 'POST',
          url: '/api/v1/test/audio/request-upload',
          headers: { 'x-media-key': 'test:secret' },
          payload,
        })).statusCode,
      ).toBe(400)
    }
    expect(
      (await app.inject({
        method: 'POST',
        url: '/api/v1/test/audio/request-upload',
        payload: { audioId: 'a', size: 8 },
      })).statusCode,
    ).toBe(401)
  })

  it('проверяет токен каждого чанка, offset и размер; докачивает без повторной постановки', async () => {
    const { app, grant, jobs } = await setup()
    const headers = { 'x-upload-token': grant.uploadToken, 'tus-resumable': '1.0.0' }
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/test/audio/tus?audioId=recording1',
      headers: { ...headers, 'upload-length': '8' },
    })
    expect(created.statusCode).toBe(201)
    const url = new URL(created.headers.location!).pathname
    expect((await app.inject({ method: 'HEAD', url })).statusCode).toBe(401)
    const patch = (offset: string, payload: string) =>
      app.inject({
        method: 'PATCH',
        url,
        headers: { ...headers, 'content-type': 'application/offset+octet-stream', 'upload-offset': offset },
        payload,
      })
    expect((await patch('0', '1234')).statusCode).toBe(204)
    expect((await app.inject({ method: 'HEAD', url, headers })).headers['upload-offset']).toBe('4')
    expect((await patch('0', '5678')).statusCode).toBe(409)
    expect((await patch('4', '56789')).statusCode).toBe(413)
    expect((await patch('4', '5678')).statusCode).toBe(204)
    expect(await readFile(join((jobs[0] as { sourcePath: string }).sourcePath), 'utf8')).toBe('12345678')
    expect((await patch('8', '')).statusCode).toBe(409)
    expect(jobs).toHaveLength(1)
  })

  it('не позволяет повторным POST обнулить существующую запись', async () => {
    const { app, grant } = await setup()
    const request = {
      method: 'POST' as const,
      url: '/api/v1/test/audio/tus?audioId=recording1',
      headers: { 'x-upload-token': grant.uploadToken, 'upload-length': '8' },
    }
    expect((await app.inject(request)).statusCode).toBe(201)
    expect((await app.inject(request)).statusCode).toBe(409)
  })

  it('выдаёт только временное прослушивание, поддерживает Range и отзывает после удаления', async () => {
    const { app, dataPath, grant } = await setup()
    await app.inject({
      method: 'POST',
      url: '/api/v1/test/audio/tus?audioId=recording1',
      headers: { 'x-upload-token': grant.uploadToken, 'upload-length': '8' },
    })
    const dir = join(dataPath, 'private-audio', 'test', 'recording1')
    await writeFile(join(dir, 'audio.m4a'), 'abcdefgh')
    await writeFile(join(dir, 'ready.json'), JSON.stringify({ durationSec: 1 }))
    const play = await app.inject({
      method: 'POST',
      url: '/api/v1/test/audio/recording1/playback',
      headers: { 'x-media-key': 'test:secret' },
    })
    expect(play.statusCode).toBe(200)
    const url = new URL(play.json().url).pathname + new URL(play.json().url).search
    const res = await app.inject({ method: 'GET', url, headers: { range: 'bytes=2-4' } })
    expect(res.statusCode).toBe(206)
    expect(res.body).toBe('cde')
    expect(res.headers['content-range']).toBe('bytes 2-4/8')
    expect((await app.inject({ method: 'GET', url: url.replace(/token=.*/, 'token=bad') })).statusCode).toBe(401)
    expect((await app.inject({ method: 'GET', url, headers: { range: 'bytes=20-30' } })).statusCode).toBe(416)
    expect(
      (await app.inject({
        method: 'DELETE',
        url: '/api/v1/test/audio/recording1',
        headers: { 'x-media-key': 'test:secret' },
      })).statusCode,
    ).toBe(204)
    expect((await app.inject({ method: 'GET', url })).statusCode).toBe(404)
  })
})
