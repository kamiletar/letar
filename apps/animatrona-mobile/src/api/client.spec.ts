// globals: true в vitest.config.mts — describe, expect, it, vi доступны глобально
//
// client.ts — не тонкая обёртка (в отличие от animatrona-tv): свой слой с адаптерами
// (getAdapter — кэширование по activeServerId), кэш-фоллбэком для оффлайн-режима
// (withCacheFallback + отдельные варианты в getLastWatched/saveProgress) и приоритетом
// скачанных файлов (useDownloadsStore) над серверным адаптером. Сами реализации адаптеров
// (adapters/desktop.ts, adapters/tracker.ts) — отдельная зона ответственности, здесь не
// тестируются; ServerAdapter полностью замокан.
import { isNetworkError } from '@letar/animatrona-shared'

import {
  getCachedAnimeDetails,
  getCachedLastWatched,
  getCachedLibrary,
  setCachedAnimeDetails,
  setCachedLastWatched,
  setCachedLibrary,
} from '@/services/cache'
import { useDownloadsStore } from '@/store/downloads'
import { useOfflineStore } from '@/store/offline'
import { useServersStore } from '@/store/servers'

import type { ServerConfig } from '@/types/server'
import { createAdapter } from './adapters'
import type { ServerAdapter } from './adapters'

vi.mock('@letar/animatrona-shared', () => ({
  isNetworkError: vi.fn(),
}))

vi.mock('@/services/cache', () => ({
  getCachedAnimeDetails: vi.fn(),
  getCachedLastWatched: vi.fn(),
  getCachedLibrary: vi.fn(),
  setCachedAnimeDetails: vi.fn(),
  setCachedLastWatched: vi.fn(),
  setCachedLibrary: vi.fn(),
}))

vi.mock('@/store/downloads', () => ({
  useDownloadsStore: { getState: vi.fn() },
}))

vi.mock('@/store/offline', () => ({
  useOfflineStore: { getState: vi.fn() },
}))

vi.mock('@/store/servers', () => ({
  useServersStore: { getState: vi.fn() },
}))

vi.mock('./adapters', () => ({
  createAdapter: vi.fn(),
}))

const mockedIsNetworkError = vi.mocked(isNetworkError)
const mockedCreateAdapter = vi.mocked(createAdapter)
const mockedServersGetState = vi.mocked(useServersStore.getState)
const mockedOfflineGetState = vi.mocked(useOfflineStore.getState)
const mockedDownloadsGetState = vi.mocked(useDownloadsStore.getState)

/** Хелпер: сервер desktop-типа с дефолтами для полей, не участвующих в конкретном тесте */
function server(overrides?: Partial<ServerConfig>): ServerConfig {
  return {
    id: 'srv-1',
    name: 'Desktop',
    type: 'desktop',
    url: 'http://192.168.1.100:3100',
    ...overrides,
  }
}

/** Хелпер: полностью замоканный ServerAdapter */
function fakeAdapter(): { [K in keyof ServerAdapter]: ReturnType<typeof vi.fn> } {
  return {
    getLibrary: vi.fn(),
    getAnimeDetails: vi.fn(),
    getPosterUrl: vi.fn(),
    getEpisodeVideoUrl: vi.fn(),
    getAudioCidUrl: vi.fn(),
    getProgress: vi.fn(),
    saveProgress: vi.fn(),
    getLastWatched: vi.fn(),
    checkStatus: vi.fn(),
    getIpfsUrl: vi.fn(),
    getSubtitleVttUrl: vi.fn(),
    getSubtitleUrlFromCid: vi.fn(),
    getMediaUrl: vi.fn(),
    fetchApi: vi.fn(),
    getApiBase: vi.fn(),
  }
}

/** Хелпер: настроить useServersStore.getState() на заданный список/активный сервер */
function stubServersState(activeServer: ServerConfig | null) {
  mockedServersGetState.mockReturnValue({
    servers: activeServer ? [activeServer] : [],
    activeServerId: activeServer?.id ?? null,
  } as unknown as ReturnType<typeof useServersStore.getState>)
}

const setServerReachable = vi.fn()
const setServerUnreachable = vi.fn()

/** Хелпер: настроить useDownloadsStore.getState().downloaded */
function stubDownloadsState(downloaded: Record<string, unknown>) {
  mockedDownloadsGetState.mockReturnValue({
    downloaded,
  } as unknown as ReturnType<typeof useDownloadsStore.getState>)
}

let client: typeof import('./client')
let adapter: ReturnType<typeof fakeAdapter>

beforeEach(async () => {
  vi.resetModules()

  adapter = fakeAdapter()
  mockedCreateAdapter.mockReturnValue(adapter as unknown as ServerAdapter)
  mockedIsNetworkError.mockReturnValue(false)
  stubServersState(server())
  mockedOfflineGetState.mockReturnValue({
    setServerReachable,
    setServerUnreachable,
  } as unknown as ReturnType<typeof useOfflineStore.getState>)
  stubDownloadsState({})

  // withCacheFallback вызывает setCache(data).catch(...) без await — по умолчанию vi.fn()
  // возвращает undefined, а не Promise, и .catch() на нём падает синхронно ДО return, из-за
  // чего успешный путь ошибочно уходит в catch-ветку withCacheFallback. Дефолт — resolved
  // Promise, как в реальной реализации services/cache.ts.
  vi.mocked(setCachedLibrary).mockResolvedValue(undefined)
  vi.mocked(setCachedAnimeDetails).mockResolvedValue(undefined)
  vi.mocked(setCachedLastWatched).mockResolvedValue(undefined)
  vi.mocked(getCachedLibrary).mockResolvedValue(null)
  vi.mocked(getCachedAnimeDetails).mockResolvedValue(null)
  vi.mocked(getCachedLastWatched).mockResolvedValue(null)

  client = await import('./client')
})

describe('getAdapter (кэширование по activeServerId)', () => {
  it('переиспользует адаптер при повторных вызовах с тем же активным сервером', async () => {
    adapter.checkStatus.mockResolvedValue(true)

    await client.getStatus()
    await client.getStatus()

    expect(mockedCreateAdapter).toHaveBeenCalledTimes(1)
  })

  it('пересоздаёт адаптер при смене активного сервера', async () => {
    adapter.checkStatus.mockResolvedValue(true)
    await client.getStatus()

    const otherAdapter = fakeAdapter()
    otherAdapter.checkStatus.mockResolvedValue(true)
    mockedCreateAdapter.mockReturnValue(otherAdapter as unknown as ServerAdapter)
    stubServersState(server({ id: 'srv-2' }))

    await client.getStatus()

    expect(mockedCreateAdapter).toHaveBeenCalledTimes(2)
    expect(adapter.checkStatus).toHaveBeenCalledTimes(1)
    expect(otherAdapter.checkStatus).toHaveBeenCalledTimes(1)
  })

  it('бросает, если нет активного сервера', async () => {
    stubServersState(null)

    await expect(client.getStatus()).rejects.toThrow('Нет подключения к серверу')
    expect(mockedCreateAdapter).not.toHaveBeenCalled()
  })
})

describe('withCacheFallback — на примере getLibrary без search', () => {
  it('успех: обновляет кэш и отмечает сервер доступным', async () => {
    const library = [{ id: 'a1' }]
    adapter.getLibrary.mockResolvedValue(library)

    const result = await client.getLibrary()

    expect(result).toBe(library)
    expect(setServerReachable).toHaveBeenCalledTimes(1)
    expect(setServerUnreachable).not.toHaveBeenCalled()
    await Promise.resolve() // setCache вызывается асинхронно, не дожидаясь
    expect(vi.mocked(setCachedLibrary)).toHaveBeenCalledWith('srv-1', library)
  })

  it('сетевая ошибка с кэшем: отмечает сервер недоступным и возвращает кэш', async () => {
    const cached = [{ id: 'cached' }]
    adapter.getLibrary.mockRejectedValue(new Error('Network request failed'))
    mockedIsNetworkError.mockReturnValue(true)
    vi.mocked(getCachedLibrary).mockResolvedValue(cached as unknown as Awaited<ReturnType<typeof getCachedLibrary>>)

    const result = await client.getLibrary()

    expect(result).toBe(cached)
    expect(setServerUnreachable).toHaveBeenCalledTimes(1)
    expect(setServerReachable).not.toHaveBeenCalled()
  })

  it('любая ошибка (не только сетевая) тоже пробует кэш', async () => {
    const cached = [{ id: 'cached' }]
    adapter.getLibrary.mockRejectedValue(new Error('HTTP 500'))
    mockedIsNetworkError.mockReturnValue(false)
    vi.mocked(getCachedLibrary).mockResolvedValue(cached as unknown as Awaited<ReturnType<typeof getCachedLibrary>>)

    const result = await client.getLibrary()

    expect(result).toBe(cached)
    expect(setServerUnreachable).not.toHaveBeenCalled()
  })

  it('ошибка без кэша пробрасывает исходную ошибку', async () => {
    const error = new Error('Network request failed')
    adapter.getLibrary.mockRejectedValue(error)
    mockedIsNetworkError.mockReturnValue(true)
    vi.mocked(getCachedLibrary).mockResolvedValue(null)

    await expect(client.getLibrary()).rejects.toBe(error)
    expect(setServerUnreachable).toHaveBeenCalledTimes(1)
  })
})

describe('getLibrary — options.search обходит кэш целиком', () => {
  it('не использует кэш-фоллбэк при заданном search', async () => {
    const library = [{ id: 'search-result' }]
    adapter.getLibrary.mockResolvedValue(library)

    const result = await client.getLibrary({ search: 'наруто' })

    expect(result).toBe(library)
    expect(adapter.getLibrary).toHaveBeenCalledWith({ search: 'наруто' })
    expect(setServerReachable).not.toHaveBeenCalled()
    expect(vi.mocked(getCachedLibrary)).not.toHaveBeenCalled()
    expect(vi.mocked(setCachedLibrary)).not.toHaveBeenCalled()
  })

  it('ошибка при search пробрасывается напрямую, без обращения к кэшу', async () => {
    const error = new Error('HTTP 500')
    adapter.getLibrary.mockRejectedValue(error)

    await expect(client.getLibrary({ search: 'наруто' })).rejects.toBe(error)
    expect(setServerUnreachable).not.toHaveBeenCalled()
    expect(vi.mocked(getCachedLibrary)).not.toHaveBeenCalled()
  })
})

describe('getAnimeDetails (с кэш-фоллбэком)', () => {
  it('успех: обновляет кэш деталей аниме', async () => {
    const details = { id: 'anime-1' }
    adapter.getAnimeDetails.mockResolvedValue(details)

    const result = await client.getAnimeDetails('anime-1')

    expect(result).toBe(details)
    expect(adapter.getAnimeDetails).toHaveBeenCalledWith('anime-1')
    expect(setServerReachable).toHaveBeenCalledTimes(1)
    await Promise.resolve()
    expect(vi.mocked(setCachedAnimeDetails)).toHaveBeenCalledWith('srv-1', 'anime-1', details)
  })

  it('сетевая ошибка возвращает кэш деталей аниме', async () => {
    const cached = { id: 'anime-1', cached: true }
    adapter.getAnimeDetails.mockRejectedValue(new Error('Network request failed'))
    mockedIsNetworkError.mockReturnValue(true)
    vi.mocked(getCachedAnimeDetails).mockResolvedValue(
      cached as unknown as Awaited<ReturnType<typeof getCachedAnimeDetails>>,
    )

    const result = await client.getAnimeDetails('anime-1')

    expect(result).toBe(cached)
    expect(setServerUnreachable).toHaveBeenCalledTimes(1)
  })
})

describe('getLastWatched (свой вариант кэш-фоллбэка)', () => {
  it('успех: отмечает сервер доступным и обновляет кэш', async () => {
    const data = { animeId: 'a1', episodeId: 'e1' }
    adapter.getLastWatched.mockResolvedValue(data)

    const result = await client.getLastWatched()

    expect(result).toBe(data)
    expect(setServerReachable).toHaveBeenCalledTimes(1)
    await Promise.resolve()
    expect(vi.mocked(setCachedLastWatched)).toHaveBeenCalledWith('srv-1', data)
  })

  it('успех с пустым результатом не трогает offline store и кэш', async () => {
    adapter.getLastWatched.mockResolvedValue(null)

    const result = await client.getLastWatched()

    expect(result).toBeNull()
    expect(setServerReachable).not.toHaveBeenCalled()
    expect(vi.mocked(setCachedLastWatched)).not.toHaveBeenCalled()
  })

  it('сетевая ошибка: отмечает недоступным и возвращает кэш', async () => {
    const cached = { animeId: 'cached', episodeId: 'e0' }
    adapter.getLastWatched.mockRejectedValue(new Error('Network request failed'))
    mockedIsNetworkError.mockReturnValue(true)
    vi.mocked(getCachedLastWatched).mockResolvedValue(
      cached as unknown as Awaited<ReturnType<typeof getCachedLastWatched>>,
    )

    const result = await client.getLastWatched()

    expect(result).toBe(cached)
    expect(setServerUnreachable).toHaveBeenCalledTimes(1)
  })

  it('не-сетевая ошибка возвращает null БЕЗ обращения к кэшу (в отличие от withCacheFallback)', async () => {
    adapter.getLastWatched.mockRejectedValue(new Error('HTTP 500'))
    mockedIsNetworkError.mockReturnValue(false)

    const result = await client.getLastWatched()

    expect(result).toBeNull()
    expect(setServerUnreachable).not.toHaveBeenCalled()
    expect(vi.mocked(getCachedLastWatched)).not.toHaveBeenCalled()
  })
})

describe('saveProgress — без кэш-фоллбэка', () => {
  it('успех отмечает сервер доступным', async () => {
    adapter.saveProgress.mockResolvedValue({ ok: true })

    const result = await client.saveProgress('ep-1', { currentTime: 42 })

    expect(result).toEqual({ ok: true })
    expect(setServerReachable).toHaveBeenCalledTimes(1)
  })

  it('сетевая ошибка отмечает сервер недоступным и пробрасывает ошибку', async () => {
    const error = new Error('Network request failed')
    adapter.saveProgress.mockRejectedValue(error)
    mockedIsNetworkError.mockReturnValue(true)

    await expect(client.saveProgress('ep-1', { currentTime: 42 })).rejects.toBe(error)
    expect(setServerUnreachable).toHaveBeenCalledTimes(1)
  })

  it('не-сетевая ошибка пробрасывается без изменения offline store', async () => {
    const error = new Error('HTTP 500')
    adapter.saveProgress.mockRejectedValue(error)
    mockedIsNetworkError.mockReturnValue(false)

    await expect(client.saveProgress('ep-1', { currentTime: 42 })).rejects.toBe(error)
    expect(setServerUnreachable).not.toHaveBeenCalled()
    expect(setServerReachable).not.toHaveBeenCalled()
  })
})

describe('getEpisodeVideoUrl — приоритет скачанного файла', () => {
  it('возвращает file:// путь, если эпизод скачан', () => {
    stubDownloadsState({ 'ep-1': { videoFilePath: '/local/video.mkv' } })

    const url = client.getEpisodeVideoUrl({ id: 'ep-1', videoCid: 'bafycid', videoPath: null })

    expect(url).toBe('file:///local/video.mkv')
    expect(adapter.getEpisodeVideoUrl).not.toHaveBeenCalled()
  })

  it('падает на адаптер, если эпизод не скачан', () => {
    adapter.getEpisodeVideoUrl.mockReturnValue('http://server/api/ipfs/bafycid')

    const url = client.getEpisodeVideoUrl({ id: 'ep-1', videoCid: 'bafycid', videoPath: null })

    expect(url).toBe('http://server/api/ipfs/bafycid')
    expect(adapter.getEpisodeVideoUrl).toHaveBeenCalledWith({ id: 'ep-1', videoCid: 'bafycid', videoPath: null })
  })

  it('без id эпизода сразу идёт к адаптеру, не трогая downloads store', () => {
    adapter.getEpisodeVideoUrl.mockReturnValue(null)

    client.getEpisodeVideoUrl({ videoCid: null, videoPath: '/local/file.mkv' })

    expect(mockedDownloadsGetState).not.toHaveBeenCalled()
  })
})

describe('getEpisodeAudioUrl — приоритет скачанного файла', () => {
  it('возвращает file:// путь для скачанной дорожки', () => {
    stubDownloadsState({ 'ep-1': { audioFilePaths: { track1: '/local/audio.aac' } } })

    const url = client.getEpisodeAudioUrl('ep-1', 'track1', 'bafyaudio')

    expect(url).toBe('file:///local/audio.aac')
    expect(adapter.getAudioCidUrl).not.toHaveBeenCalled()
  })

  it('падает на серверный IPFS CID, если дорожка не скачана', () => {
    adapter.getAudioCidUrl.mockReturnValue('http://server/api/ipfs/bafyaudio')

    const url = client.getEpisodeAudioUrl('ep-1', 'track1', 'bafyaudio')

    expect(url).toBe('http://server/api/ipfs/bafyaudio')
    expect(adapter.getAudioCidUrl).toHaveBeenCalledWith('bafyaudio')
  })

  it('без скачанного файла и без CID возвращает null', () => {
    const url = client.getEpisodeAudioUrl('ep-1', 'track1', null)

    expect(url).toBeNull()
    expect(adapter.getAudioCidUrl).not.toHaveBeenCalled()
  })
})

describe('getDownloadedSubtitlePaths', () => {
  it('возвращает пустой объект, если эпизод не скачан', () => {
    expect(client.getDownloadedSubtitlePaths('ep-1')).toEqual({})
  })

  it('преобразует пути скачанных субтитров в file:// URL', () => {
    stubDownloadsState({
      'ep-1': { subtitleFilePaths: { ru: '/local/sub-ru.ass', en: '/local/sub-en.ass' } },
    })

    expect(client.getDownloadedSubtitlePaths('ep-1')).toEqual({
      ru: 'file:///local/sub-ru.ass',
      en: 'file:///local/sub-en.ass',
    })
  })
})
