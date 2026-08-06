// globals: true в vitest.config.ts — describe, expect, it, vi доступны глобально
//
// createApiClient использует глобальный fetch — мокаем через vi.stubGlobal,
// на реальную сеть не завязываемся (см. задачу).
import type { ConnectionData } from '../store/connection'
import { createApiClient, type GetConnectionStore } from './client'
import type { SubtitleTrack } from './types'

/** Хелпер: store с заданным (или отсутствующим) подключением */
function storeWith(connection: ConnectionData | null): GetConnectionStore {
  return () => ({ connection })
}

/** Хелпер: сконструировать Response-подобный объект для мока fetch */
function jsonResponse(body: unknown, init?: { ok?: boolean; status?: number }) {
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
  }
}

const connection: ConnectionData = { serverUrl: 'http://192.168.1.100:3100' }

/** Хелпер: собрать SubtitleTrack с дефолтами для полей, не участвующих в конкретном тесте */
function subtitleTrack(overrides: Partial<SubtitleTrack>): SubtitleTrack {
  return {
    id: 'sub-1',
    language: 'ru',
    title: null,
    name: null,
    dubGroup: null,
    format: 'vtt',
    isDefault: false,
    fileCid: null,
    fontCids: [],
    ...overrides,
  }
}

describe('createApiClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('getServerUrl / getApiBase (через сетевые методы)', () => {
    it('getServerUrl возвращает пустую строку без подключения', () => {
      const client = createApiClient(storeWith(null))
      expect(client.getServerUrl()).toBe('')
    })

    it('getServerUrl возвращает serverUrl из store при подключении', () => {
      const client = createApiClient(storeWith(connection))
      expect(client.getServerUrl()).toBe('http://192.168.1.100:3100')
    })

    it('запрос без подключения падает с "Нет подключения к серверу"', async () => {
      const client = createApiClient(storeWith(null))
      await expect(client.getStatus()).rejects.toThrow('Нет подключения к серверу')
    })
  })

  describe('fetchApi (внутренняя логика запросов)', () => {
    it('успешный запрос возвращает распарсенный JSON', async () => {
      const client = createApiClient(storeWith(connection))
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ status: 'ok' }) as unknown as Response)

      const result = await client.getStatus()

      expect(result).toEqual({ status: 'ok' })
      expect(fetch).toHaveBeenCalledWith(
        'http://192.168.1.100:3100/api/status',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Accept: 'application/json',
          }),
        }),
      )
    })

    it('не-ok ответ бросает ошибку с HTTP статусом и телом', async () => {
      const client = createApiClient(storeWith(connection))
      vi.mocked(fetch).mockResolvedValueOnce(
        jsonResponse('Not Found', { ok: false, status: 404 }) as unknown as Response,
      )

      await expect(client.getStatus()).rejects.toThrow('HTTP 404: Not Found')
    })

    it('падение чтения текста ошибки не ломает обработку — используется fallback', async () => {
      const client = createApiClient(storeWith(connection))
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.reject(new Error('boom')),
      } as unknown as Response)

      await expect(client.getStatus()).rejects.toThrow('HTTP 500: Unknown error')
    })

    it('сетевая ошибка fetch переводится в "Нет соединения с сервером"', async () => {
      const client = createApiClient(storeWith(connection))
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network request failed'))

      await expect(client.getStatus()).rejects.toThrow('Нет соединения с сервером')
    })

    it('произвольная ошибка Error пробрасывается как есть', async () => {
      const client = createApiClient(storeWith(connection))
      vi.mocked(fetch).mockRejectedValueOnce(new Error('что-то странное'))

      await expect(client.getStatus()).rejects.toThrow('что-то странное')
    })

    it('не-Error значение превращается в "Неизвестная ошибка"', async () => {
      const client = createApiClient(storeWith(connection))
      vi.mocked(fetch).mockRejectedValueOnce('строка вместо ошибки')

      await expect(client.getStatus()).rejects.toThrow('Неизвестная ошибка')
    })

    it('saveProgress отправляет POST с JSON-телом', async () => {
      const client = createApiClient(storeWith(connection))
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ currentTime: 42 }) as unknown as Response)

      await client.saveProgress('ep-1', { currentTime: 42, completed: false })

      expect(fetch).toHaveBeenCalledWith(
        'http://192.168.1.100:3100/api/progress/ep-1',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ currentTime: 42, completed: false }),
        }),
      )
    })
  })

  describe('getLastWatched', () => {
    it('возвращает null, если запрос упал (нет последнего просмотра)', async () => {
      const client = createApiClient(storeWith(connection))
      vi.mocked(fetch).mockRejectedValueOnce(new Error('404'))

      await expect(client.getLastWatched()).resolves.toBeNull()
    })

    it('возвращает данные при успешном запросе', async () => {
      const client = createApiClient(storeWith(connection))
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ animeId: 'a1' }) as unknown as Response)

      await expect(client.getLastWatched()).resolves.toEqual({ animeId: 'a1' })
    })
  })

  describe('getEpisode', () => {
    it('находит эпизод по id внутри деталей аниме', async () => {
      const client = createApiClient(storeWith(connection))
      vi.mocked(fetch).mockResolvedValueOnce(
        jsonResponse({
          id: 'anime-1',
          episodes: [{ id: 'ep-1' }, { id: 'ep-2' }],
        }) as unknown as Response,
      )

      const episode = await client.getEpisode('anime-1', 'ep-2')

      expect(episode).toEqual({ id: 'ep-2' })
    })

    it('возвращает null, если эпизод не найден', async () => {
      const client = createApiClient(storeWith(connection))
      vi.mocked(fetch).mockResolvedValueOnce(
        jsonResponse({ id: 'anime-1', episodes: [{ id: 'ep-1' }] }) as unknown as Response,
      )

      const episode = await client.getEpisode('anime-1', 'ep-999')

      expect(episode).toBeNull()
    })
  })

  describe('URL-хелперы без подключения', () => {
    it('getPosterUrl/getMediaUrl/getVideoCidUrl/getAudioCidUrl возвращают "" без serverUrl', () => {
      const client = createApiClient(storeWith(null))
      expect(client.getPosterUrl('anime-1')).toBe('')
      expect(client.getMediaUrl('/path/to/file.mkv')).toBe('')
      expect(client.getVideoCidUrl('bafycid')).toBe('')
      expect(client.getAudioCidUrl('bafycid')).toBe('')
    })

    it('getIpfsUrl выводит предупреждение и возвращает "" без serverUrl', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const client = createApiClient(storeWith(null))

      expect(client.getIpfsUrl('bafycid')).toBe('')
      expect(warnSpy).toHaveBeenCalledWith('[getIpfsUrl] No connection!')
    })
  })

  describe('URL-хелперы с подключением', () => {
    const client = createApiClient(storeWith(connection))

    it('getPosterUrl строит URL постера', () => {
      expect(client.getPosterUrl('anime-1')).toBe('http://192.168.1.100:3100/api/poster/anime-1')
    })

    it('getMediaUrl кодирует путь к файлу', () => {
      expect(client.getMediaUrl('/some path/ep 1.mkv')).toBe(
        'http://192.168.1.100:3100/api/media?path=%2Fsome%20path%2Fep%201.mkv',
      )
    })

    it('getVideoCidUrl и getAudioCidUrl строят одинаковый IPFS-URL', () => {
      expect(client.getVideoCidUrl('bafycid')).toBe('http://192.168.1.100:3100/api/ipfs/bafycid')
      expect(client.getAudioCidUrl('bafycid')).toBe('http://192.168.1.100:3100/api/ipfs/bafycid')
    })

    it('getIpfsUrl строит IPFS-URL', () => {
      expect(client.getIpfsUrl('bafycid')).toBe('http://192.168.1.100:3100/api/ipfs/bafycid')
    })
  })

  describe('getEpisodeVideoUrl', () => {
    const client = createApiClient(storeWith(connection))

    it('приоритет у videoCid перед videoPath', () => {
      const url = client.getEpisodeVideoUrl({ videoCid: 'bafycid', videoPath: '/local/file.mkv' })
      expect(url).toBe('http://192.168.1.100:3100/api/ipfs/bafycid')
    })

    it('падает на videoPath, если videoCid отсутствует', () => {
      const url = client.getEpisodeVideoUrl({ videoCid: null, videoPath: '/local/file.mkv' })
      expect(url).toBe('http://192.168.1.100:3100/api/media?path=%2Flocal%2Ffile.mkv')
    })

    it('возвращает null, если нет ни videoCid, ни videoPath', () => {
      expect(client.getEpisodeVideoUrl({ videoCid: null, videoPath: null })).toBeNull()
    })
  })

  describe('субтитры', () => {
    const client = createApiClient(storeWith(connection))

    it('getSubtitleUrlFromCid возвращает null и предупреждает без fileCid', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const track = subtitleTrack({ fileCid: null })

      expect(client.getSubtitleUrlFromCid(track)).toBeNull()
      expect(warnSpy).toHaveBeenCalledWith('[getSubtitleUrlFromCid] No fileCid!')
    })

    it('getSubtitleUrlFromCid строит IPFS-URL при наличии fileCid', () => {
      const track = subtitleTrack({ fileCid: 'bafysub' })
      expect(client.getSubtitleUrlFromCid(track)).toBe('http://192.168.1.100:3100/api/ipfs/bafysub')
    })

    it('getSubtitleVttUrl возвращает null без fileCid', () => {
      const track = subtitleTrack({ fileCid: null, format: 'srt' })
      expect(client.getSubtitleVttUrl(track)).toBeNull()
    })

    it('getSubtitleVttUrl строит URL с параметром format', () => {
      const track = subtitleTrack({ fileCid: 'bafysub', format: 'srt' })
      expect(client.getSubtitleVttUrl(track)).toBe(
        'http://192.168.1.100:3100/api/subtitles/cid/bafysub?format=srt',
      )
    })

    it('getSubtitleVttUrl возвращает null без подключения, даже если fileCid есть', () => {
      const disconnectedClient = createApiClient(storeWith(null))
      const track = subtitleTrack({ fileCid: 'bafysub', format: 'srt' })
      expect(disconnectedClient.getSubtitleVttUrl(track)).toBeNull()
    })
  })
})
