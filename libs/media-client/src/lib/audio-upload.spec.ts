import { afterEach, describe, expect, it, vi } from 'vitest'
import { uploadAudioFile } from '../browser'

afterEach(() => vi.unstubAllGlobals())
describe('докачка аудио в браузере', () => {
  const file = new File([new Uint8Array(5 * 1024 ** 2)], 'voice.wav')
  const head = (offset: number) =>
    new Response(null, { headers: { 'Upload-Offset': String(offset), 'Upload-Length': String(file.size) } })
  it('после обрыва начинает с подтверждённого HEAD, не передаёт файл заново', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(head(2 * 1024 ** 2))
      .mockResolvedValueOnce(new Response(null, { status: 204, headers: { 'Upload-Offset': String(4 * 1024 ** 2) } }))
      .mockRejectedValueOnce(new Error('offline'))
    vi.stubGlobal('fetch', fetchMock)
    const options = {
      file,
      audioId: 'one',
      tusUrl: 'https://media.example.test/tus',
      uploadToken: 'token',
      onProgress: vi.fn(),
    }
    await expect(uploadAudioFile(options)).rejects.toThrow('offline')
    expect(fetchMock.mock.calls[1]?.[1].headers['Upload-Offset']).toBe(String(2 * 1024 ** 2))
    fetchMock.mockReset().mockResolvedValueOnce(head(4 * 1024 ** 2))
      .mockResolvedValueOnce(new Response(null, { status: 204, headers: { 'Upload-Offset': String(file.size) } }))
    await uploadAudioFile(options)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1]?.[1].body.size).toBe(1024 ** 2)
    expect(options.onProgress).toHaveBeenLastCalledWith(100)
  })

  it('создаёт отсутствующую загрузку и отклоняет размер другого файла', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response(null, { status: 201 }))
      .mockResolvedValueOnce(new Response(null, { headers: { 'Upload-Offset': '0', 'Upload-Length': '10' } }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(
      uploadAudioFile({
        file,
        audioId: 'one',
        tusUrl: 'https://media.example.test/tus',
        uploadToken: 't',
        onProgress: vi.fn(),
      }),
    ).rejects.toThrow('неверное смещение')
    expect(fetchMock.mock.calls[1]?.[1].method).toBe('POST')
    expect(fetchMock.mock.calls[1]?.[1].headers['Upload-Length']).toBe(String(file.size))
  })
})
