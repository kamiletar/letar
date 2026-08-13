import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMediaClient } from './feature'

describe('createMediaClient', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  it('isConfigured() — false без baseUrl/apiKey', () => {
    const client = createMediaClient({ appId: 'demo', baseUrl: '', apiKey: '' })
    expect(client.isConfigured()).toBe(false)
  })

  it('isConfigured() — true при заданных baseUrl и apiKey', () => {
    const client = createMediaClient({ appId: 'demo', baseUrl: 'https://media.letar.best', apiKey: 'key' })
    expect(client.isConfigured()).toBe(true)
  })

  it('requestUploadToken() — запрашивает /api/v1/:appId/video/request-upload с X-Media-Key', async () => {
    const client = createMediaClient({ appId: 'demo', baseUrl: 'https://media.letar.best', apiKey: 'secret' })
    const payload = { uploadToken: 't', uploadUrl: 'u', tusUrl: 'tus', expiresIn: 3600 }
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve(payload) })

    const result = await client.requestUploadToken('video-1', 'https://demo.example/webhook')

    expect(result).toEqual(payload)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://media.letar.best/api/v1/demo/video/request-upload',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-Media-Key': 'secret' }),
      }),
    )
  })

  it('requestUploadToken() — бросает ошибку при non-ok ответе', async () => {
    const client = createMediaClient({ appId: 'demo', baseUrl: 'https://media.letar.best', apiKey: 'secret' })
    fetchMock.mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve('boom') })

    await expect(client.requestUploadToken('video-1', 'https://demo.example/webhook')).rejects.toThrow(
      'media server token error: 500 boom',
    )
  })

  it('getTranscodeStatus() — запрашивает /api/v1/:appId/video/status/:jobId', async () => {
    const client = createMediaClient({ appId: 'demo', baseUrl: 'https://media.letar.best', apiKey: 'secret' })
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({ status: 'ready', progress: 100 }) })

    const result = await client.getTranscodeStatus('job-1')

    expect(result).toEqual({ status: 'ready', progress: 100 })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://media.letar.best/api/v1/demo/video/status/job-1',
      expect.objectContaining({ headers: expect.objectContaining({ 'X-Media-Key': 'secret' }) }),
    )
  })
})
