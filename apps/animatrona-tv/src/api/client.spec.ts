// globals: true в vitest.config.mts — describe, expect, it, vi доступны глобально
//
// client.ts — тонкая обёртка над createApiClient из @letar/animatrona-shared.
// Сама реализация методов API (getLibrary, getEpisode и т.д.) уже покрыта в самой
// библиотеке — здесь важно только, что обёртка (1) передаёт правильный getState,
// читающий именно useConnectionStore из '@/store/connection', и (2) реэкспортирует
// каждый метод фабрики без потерь.
import { createApiClient } from '@letar/animatrona-shared'

import { useConnectionStore } from '@/store/connection'

const fakeConnectionState = { connection: { serverUrl: 'http://192.168.1.100:3100' } }
const fakeApi = {
  getStatus: vi.fn(),
  getLibrary: vi.fn(),
  getAnimeDetails: vi.fn(),
  getLastWatched: vi.fn(),
  getEpisode: vi.fn(),
  getProgress: vi.fn(),
  saveProgress: vi.fn(),
  getPosterUrl: vi.fn(),
  getMediaUrl: vi.fn(),
  getVideoCidUrl: vi.fn(),
  getAudioCidUrl: vi.fn(),
  getEpisodeVideoUrl: vi.fn(),
  getIpfsUrl: vi.fn(),
  getSubtitleUrlFromCid: vi.fn(),
  getSubtitleVttUrl: vi.fn(),
}

vi.mock('@letar/animatrona-shared', () => ({
  createApiClient: vi.fn(() => fakeApi),
}))

vi.mock('@/store/connection', () => ({
  useConnectionStore: {
    getState: vi.fn(() => fakeConnectionState),
  },
}))

const mockedCreateApiClient = vi.mocked(createApiClient)
const mockedGetState = vi.mocked(useConnectionStore.getState)

describe('api/client (animatrona-tv)', () => {
  beforeEach(() => {
    // client.ts выполняет createApiClient() на верхнем уровне модуля при импорте —
    // без сброса реестра модулей второй и последующий динамический import переиспользовал
    // бы закешированный модуль, и createApiClient не вызвался бы повторно
    vi.resetModules()
  })

  it('вызывает createApiClient ровно один раз', async () => {
    await import('./client')

    expect(mockedCreateApiClient).toHaveBeenCalledTimes(1)
  })

  it('передаёт в createApiClient геттер, читающий useConnectionStore.getState()', async () => {
    await import('./client')

    const getState = mockedCreateApiClient.mock.calls[0]?.[0]
    expect(getState).toBeTypeOf('function')

    const result = getState?.()

    expect(mockedGetState).toHaveBeenCalled()
    expect(result).toBe(fakeConnectionState)
  })

  it('реэкспортирует все методы фабрики без потерь', async () => {
    const client = await import('./client')

    for (const key of Object.keys(fakeApi) as (keyof typeof fakeApi)[]) {
      expect(client[key]).toBe(fakeApi[key])
    }
  })
})
