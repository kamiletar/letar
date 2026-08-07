import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { usePlayerState } from './usePlayerState'

import type { AudioTrackInfo } from '../types'

function makeTrack(overrides: Partial<AudioTrackInfo>): AudioTrackInfo {
  return {
    id: 'track-1',
    label: 'Track',
    ...overrides,
  } as AudioTrackInfo
}

describe('usePlayerState', () => {
  it('начальное состояние соответствует значениям по умолчанию', () => {
    const { result } = renderHook(() => usePlayerState({}))

    expect(result.current.state).toEqual({
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 1,
      isMuted: false,
      isFullscreen: false,
      isLoading: true,
      showControlsOverlay: true,
    })
    expect(result.current.playbackSpeed).toBe(1)
    expect(result.current.subtitleFormat).toBeNull()
    expect(result.current.usesSeparateAudio).toBe(false)
    expect(result.current.currentAudioTrack).toBeNull()
  })

  it('сеттеры обновляют соответствующее поле state', () => {
    const { result } = renderHook(() => usePlayerState({}))

    act(() => {
      result.current.setIsPlaying(true)
      result.current.setCurrentTime(42)
      result.current.setDuration(100)
      result.current.setVolume(0.5)
      result.current.setIsMuted(true)
      result.current.setIsFullscreen(true)
      result.current.setIsLoading(false)
      result.current.setShowControlsOverlay(false)
    })

    expect(result.current.state).toEqual({
      isPlaying: true,
      currentTime: 42,
      duration: 100,
      volume: 0.5,
      isMuted: true,
      isFullscreen: true,
      isLoading: false,
      showControlsOverlay: false,
    })
  })

  it('setPlaybackSpeed изменяет playbackSpeed', () => {
    const { result } = renderHook(() => usePlayerState({}))
    act(() => {
      result.current.setPlaybackSpeed(2)
    })
    expect(result.current.playbackSpeed).toBe(2)
  })

  it('subtitleFormat === null без subtitlePath', () => {
    const { result } = renderHook(() => usePlayerState({}))
    expect(result.current.subtitleFormat).toBeNull()
  })

  it('subtitleFormat определяется по расширению .srt как "native"', () => {
    const { result } = renderHook(() => usePlayerState({ subtitlePath: '/subs/episode.srt' }))
    expect(result.current.subtitleFormat).toBe('native')
  })

  it('subtitleFormat определяется по расширению .vtt как "native"', () => {
    const { result } = renderHook(() => usePlayerState({ subtitlePath: '/subs/episode.vtt' }))
    expect(result.current.subtitleFormat).toBe('native')
  })

  it('subtitleFormat определяется по расширению .ass как "ass"', () => {
    const { result } = renderHook(() => usePlayerState({ subtitlePath: '/subs/episode.ass' }))
    expect(result.current.subtitleFormat).toBe('ass')
  })

  it('subtitleFormatOverride имеет приоритет над расширением URL', () => {
    const { result } = renderHook(() =>
      usePlayerState({ subtitlePath: '/subs/episode.srt', subtitleFormatOverride: 'ass' })
    )
    expect(result.current.subtitleFormat).toBe('ass')
  })

  it('subtitleFormat === null для неизвестного расширения', () => {
    const { result } = renderHook(() => usePlayerState({ subtitlePath: '/subs/episode.unknown' }))
    expect(result.current.subtitleFormat).toBeNull()
  })

  it('usesSeparateAudio === false без audioTracks', () => {
    const { result } = renderHook(() => usePlayerState({}))
    expect(result.current.usesSeparateAudio).toBe(false)
  })

  it('usesSeparateAudio === false, если ни у одной дорожки нет transcodedCid', () => {
    const { result } = renderHook(() =>
      usePlayerState({ audioTracks: [makeTrack({ id: 'a' }), makeTrack({ id: 'b' })] })
    )
    expect(result.current.usesSeparateAudio).toBe(false)
  })

  it('usesSeparateAudio === true, если хотя бы у одной дорожки есть transcodedCid', () => {
    const { result } = renderHook(() =>
      usePlayerState({
        audioTracks: [makeTrack({ id: 'a' }), makeTrack({ id: 'b', transcodedCid: 'cid-b' })],
      })
    )
    expect(result.current.usesSeparateAudio).toBe(true)
  })

  it('usesSeparateAudioRef.current синхронизирован с usesSeparateAudio', () => {
    const { result } = renderHook(() =>
      usePlayerState({ audioTracks: [makeTrack({ id: 'a', transcodedCid: 'cid-a' })] })
    )
    expect(result.current.usesSeparateAudioRef.current).toBe(true)
  })

  it('currentAudioTrack === null без audioTracks', () => {
    const { result } = renderHook(() => usePlayerState({}))
    expect(result.current.currentAudioTrack).toBeNull()
  })

  it('currentAudioTrack выбирает дорожку по currentAudioTrackId, если у неё есть transcodedCid', () => {
    const trackA = makeTrack({ id: 'a', transcodedCid: 'cid-a' })
    const trackB = makeTrack({ id: 'b', transcodedCid: 'cid-b' })
    const { result } = renderHook(() => usePlayerState({ audioTracks: [trackA, trackB], currentAudioTrackId: 'b' }))
    expect(result.current.currentAudioTrack).toEqual(trackB)
  })

  it('currentAudioTrack игнорирует currentAudioTrackId без transcodedCid и падает на первую готовую', () => {
    const trackA = makeTrack({ id: 'a' }) // без transcodedCid
    const trackB = makeTrack({ id: 'b', transcodedCid: 'cid-b' })
    const { result } = renderHook(() => usePlayerState({ audioTracks: [trackA, trackB], currentAudioTrackId: 'a' }))
    expect(result.current.currentAudioTrack).toEqual(trackB)
  })

  it('currentAudioTrack === null, если ни у одной дорожки нет transcodedCid', () => {
    const { result } = renderHook(() =>
      usePlayerState({ audioTracks: [makeTrack({ id: 'a' }), makeTrack({ id: 'b' })] })
    )
    expect(result.current.currentAudioTrack).toBeNull()
  })
})
