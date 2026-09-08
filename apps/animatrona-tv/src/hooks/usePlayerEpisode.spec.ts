/**
 * @vitest-environment jsdom
 */
// globals: true в vitest.config.mts — describe, expect, it, vi, beforeEach доступны глобально
//
// getAnimeDetails мокается на уровне модуля '@/api/client' — сам клиент (createApiClient из
// @letar/animatrona-shared) уже покрыт в libs/animatrona-shared/src/api/client.spec.ts, здесь
// важна только логика выбора дефолтных дорожек и обработка ошибок внутри самого хука.
import type { AnimeDetails, AudioTrack, Episode, SubtitleTrack } from '@letar/animatrona-shared'
import { act, renderHook, waitFor } from '@testing-library/react'

import { getAnimeDetails } from '@/api/client'

import { usePlayerEpisode } from './usePlayerEpisode'

vi.mock('@/api/client', () => ({
  getAnimeDetails: vi.fn(),
}))

const mockedGetAnimeDetails = vi.mocked(getAnimeDetails)

/** Хелпер: собрать AudioTrack с дефолтами для полей, не участвующих в конкретном тесте */
function audioTrack(overrides: Partial<AudioTrack>): AudioTrack {
  return {
    id: 'audio-1',
    language: 'ru',
    title: null,
    name: null,
    dubGroup: null,
    codec: 'aac',
    channels: '2.0',
    isDefault: false,
    audioCid: null,
    ...overrides,
  }
}

/** Хелпер: собрать SubtitleTrack с дефолтами для полей, не участвующих в конкретном тесте */
function subtitleTrack(overrides: Partial<SubtitleTrack>): SubtitleTrack {
  return {
    id: 'sub-1',
    language: 'ru',
    title: null,
    name: null,
    dubGroup: null,
    format: 'ass',
    isDefault: false,
    fileCid: null,
    fontCids: [],
    ...overrides,
  }
}

/** Хелпер: собрать Episode с дефолтами для полей, не участвующих в конкретном тесте */
function episode(overrides: Partial<Episode>): Episode {
  return {
    id: 'ep-1',
    number: 1,
    name: null,
    durationMs: null,
    seasonNumber: 1,
    seasonName: null,
    videoPath: null,
    videoCid: null,
    progress: null,
    audioTracks: [],
    subtitleTracks: [],
    chapters: [],
    ...overrides,
  }
}

/** Хелпер: собрать AnimeDetails с одним эпизодом */
function animeWithEpisode(ep: Episode): AnimeDetails {
  return {
    id: 'anime-1',
    name: 'Тестовое аниме',
    originalName: null,
    year: null,
    status: 'ongoing',
    episodeCount: 1,
    description: null,
    rating: null,
    posterPath: null,
    watchStatus: 'WATCHING',
    genres: [],
    seasons: [],
    episodes: [ep],
  }
}

describe('usePlayerEpisode', () => {
  it('изначально isLoading=true, anime/episode ещё не загружены', () => {
    mockedGetAnimeDetails.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => usePlayerEpisode('anime-1', 'ep-1'))

    expect(result.current.isLoading).toBe(true)
    expect(result.current.anime).toBeNull()
    expect(result.current.episode).toBeNull()
  })

  it('после успешной загрузки выставляет anime и episode', async () => {
    const ep = episode({ id: 'ep-1' })
    mockedGetAnimeDetails.mockResolvedValue(animeWithEpisode(ep))

    const { result } = renderHook(() => usePlayerEpisode('anime-1', 'ep-1'))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.anime?.id).toBe('anime-1')
    expect(result.current.episode?.id).toBe('ep-1')
    expect(result.current.error).toBeNull()
  })

  it('выбирает аудиодорожку с isDefault=true, даже если она не первая', async () => {
    const first = audioTrack({ id: 'audio-1', isDefault: false })
    const defaultTrack = audioTrack({ id: 'audio-2', isDefault: true })
    const ep = episode({ audioTracks: [first, defaultTrack] })
    mockedGetAnimeDetails.mockResolvedValue(animeWithEpisode(ep))

    const { result } = renderHook(() => usePlayerEpisode('anime-1', 'ep-1'))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.selectedAudio?.id).toBe('audio-2')
  })

  it('без явного дефолта берёт первую аудиодорожку', async () => {
    const first = audioTrack({ id: 'audio-1', isDefault: false })
    const second = audioTrack({ id: 'audio-2', isDefault: false })
    const ep = episode({ audioTracks: [first, second] })
    mockedGetAnimeDetails.mockResolvedValue(animeWithEpisode(ep))

    const { result } = renderHook(() => usePlayerEpisode('anime-1', 'ep-1'))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.selectedAudio?.id).toBe('audio-1')
  })

  it('без аудиодорожек вообще selectedAudio остаётся null', async () => {
    const ep = episode({ audioTracks: [] })
    mockedGetAnimeDetails.mockResolvedValue(animeWithEpisode(ep))

    const { result } = renderHook(() => usePlayerEpisode('anime-1', 'ep-1'))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.selectedAudio).toBeNull()
  })

  it('выбирает субтитры с isDefault=true', async () => {
    const sub = subtitleTrack({ id: 'sub-1', isDefault: true })
    const ep = episode({ subtitleTracks: [sub] })
    mockedGetAnimeDetails.mockResolvedValue(animeWithEpisode(ep))

    const { result } = renderHook(() => usePlayerEpisode('anime-1', 'ep-1'))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.selectedSubtitle?.id).toBe('sub-1')
  })

  it('без дефолтных субтитров (в отличие от аудио) selectedSubtitle остаётся null', async () => {
    const sub = subtitleTrack({ id: 'sub-1', isDefault: false })
    const ep = episode({ subtitleTracks: [sub] })
    mockedGetAnimeDetails.mockResolvedValue(animeWithEpisode(ep))

    const { result } = renderHook(() => usePlayerEpisode('anime-1', 'ep-1'))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.selectedSubtitle).toBeNull()
  })

  it('устанавливает ошибку, если эпизод не найден в списке', async () => {
    const ep = episode({ id: 'другой-эпизод' })
    mockedGetAnimeDetails.mockResolvedValue(animeWithEpisode(ep))

    const { result } = renderHook(() => usePlayerEpisode('anime-1', 'ep-1'))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).toBe('Эпизод не найден')
    expect(result.current.episode).toBeNull()
  })

  it('пробрасывает сообщение ошибки из API в error', async () => {
    mockedGetAnimeDetails.mockRejectedValue(new Error('Сервер недоступен'))

    const { result } = renderHook(() => usePlayerEpisode('anime-1', 'ep-1'))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).toBe('Сервер недоступен')
  })

  it('не-Error-исключение даёт дефолтное сообщение об ошибке', async () => {
    mockedGetAnimeDetails.mockRejectedValue('не Error объект')

    const { result } = renderHook(() => usePlayerEpisode('anime-1', 'ep-1'))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).toBe('Ошибка загрузки')
  })

  it('перезапрашивает данные при смене episodeId', async () => {
    const ep1 = episode({ id: 'ep-1' })
    const ep2 = episode({ id: 'ep-2' })
    mockedGetAnimeDetails.mockResolvedValue({
      ...animeWithEpisode(ep1),
      episodes: [ep1, ep2],
    })

    const { result, rerender } = renderHook(
      ({ episodeId }: { episodeId: string }) => usePlayerEpisode('anime-1', episodeId),
      { initialProps: { episodeId: 'ep-1' } },
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.episode?.id).toBe('ep-1')

    act(() => {
      rerender({ episodeId: 'ep-2' })
    })

    await waitFor(() => expect(result.current.episode?.id).toBe('ep-2'))
    expect(mockedGetAnimeDetails).toHaveBeenCalledTimes(2)
  })

  it('setError позволяет вручную очистить/установить ошибку из плеера', async () => {
    const ep = episode({ id: 'ep-1' })
    mockedGetAnimeDetails.mockResolvedValue(animeWithEpisode(ep))

    const { result } = renderHook(() => usePlayerEpisode('anime-1', 'ep-1'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    act(() => {
      result.current.setError('Ошибка воспроизведения')
    })
    expect(result.current.error).toBe('Ошибка воспроизведения')

    act(() => {
      result.current.setError(null)
    })
    expect(result.current.error).toBeNull()
  })
})
