import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAudioClient } from './audio'

afterEach(() => vi.unstubAllGlobals())
describe('клиент аудио', () => {
  it('не объявляет пустое тело JSON при прослушивании и удалении', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ url: 'test', expiresIn: 60 })))
    vi.stubGlobal('fetch', fetchMock)
    const client = createAudioClient({ appId: 'demo', baseUrl: 'https://media.example.test', apiKey: 'key' })
    await client.getPlayback('one')
    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://media.example.test/api/v1/demo/audio/one/playback',
      expect.objectContaining({ method: 'POST', headers: { 'X-Media-Key': 'key' }, body: undefined }),
    )
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    await expect(client.deleteAudio('one')).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://media.example.test/api/v1/demo/audio/one',
      expect.objectContaining({ method: 'DELETE', headers: { 'X-Media-Key': 'key' } }),
    )
  })

  it('передаёт размер и id, закрывает кэш и сообщает сетевой отказ', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ uploadToken: 't', tusUrl: 'url', expiresIn: 86400 })),
    )
    vi.stubGlobal('fetch', fetchMock)
    const client = createAudioClient({ appId: 'demo', baseUrl: 'https://media.example.test', apiKey: 'key' })
    await client.requestUpload('one', 1024)
    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://media.example.test/api/v1/demo/audio/request-upload',
      expect.objectContaining({ body: JSON.stringify({ audioId: 'one', size: 1024 }), cache: 'no-store' }),
    )
    fetchMock.mockResolvedValue(new Response(null, { status: 503 }))
    await expect(client.getStatus('one')).rejects.toThrow('503')
  })
})
