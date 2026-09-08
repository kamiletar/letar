/**
 * useAudioTracks — выбор аудиодорожки из уже загруженного файла (Shaka Player, режим `src=`).
 *
 * В отличие от DASH/HLS-манифестов, для прямого `src=` (наш случай — локальные MKV/MP4 без
 * стриминг-манифеста) Shaka проксирует нативные `HTMLMediaElement.audioTracks` браузера как
 * variant-треки: `getVariantTracks()` отдаёт по одному варианту на каждую пару видео×аудио.
 * У файла с одной видеодорожкой и N аудиодорожками получаем N вариантов с одинаковым `videoId`
 * и разным `audioId` — хук схлопывает их в список уникальных аудиодорожек.
 *
 * ⚠️ Не проверено эмпирически на всех кодеках/контейнерах: если Chromium/Electron не отдают
 * несколько `audioTracks` для конкретного файла (например аудио сведено в один поток на этапе
 * подготовки), `getVariantTracks()` вернёт один вариант — хук в этом случае отдаёт список из
 * одной дорожки, без ошибки.
 */

import { useCallback, useEffect, useState } from 'react'

import type { MutableRefObject } from 'react'
import type { ShakaPlayerInstance, ShakaTrack } from './useShakaPlayer'

export interface AudioTrackOption {
  /** `audioId` варианта — стабильный идентификатор аудиопотока в рамках текущей загрузки */
  audioId: number
  language: string
  label: string
  active: boolean
}

export interface UseAudioTracksOptions {
  playerRef: MutableRefObject<ShakaPlayerInstance | null>
  isVideoReady: boolean
}

export interface UseAudioTracksReturn {
  /** Пусто, если у файла одна аудиодорожка (или Shaka не отдала несколько вариантов) */
  audioTracks: AudioTrackOption[]
  selectAudioTrack: (audioId: number) => void
}

function collectAudioTracks(tracks: ShakaTrack[]): AudioTrackOption[] {
  const byAudioId = new Map<number, ShakaTrack>()
  for (const track of tracks) {
    if (track.audioId === null) {
      continue
    }
    // Один и тот же audioId может встречаться в нескольких вариантах (разные видеокачества) —
    // берём активный, если он есть, иначе первый попавшийся
    const existing = byAudioId.get(track.audioId)
    if (!existing || track.active) {
      byAudioId.set(track.audioId, track)
    }
  }
  return [...byAudioId.values()]
    .sort((a, b) => (a.audioId as number) - (b.audioId as number))
    .map((t) => ({
      audioId: t.audioId as number,
      language: t.language || 'und',
      label: t.label || '',
      active: t.active,
    }))
}

export function useAudioTracks({ playerRef, isVideoReady }: UseAudioTracksOptions): UseAudioTracksReturn {
  const [audioTracks, setAudioTracks] = useState<AudioTrackOption[]>([])

  const refresh = useCallback(() => {
    const player = playerRef.current
    if (!player) {
      setAudioTracks([])
      return
    }
    setAudioTracks(collectAudioTracks(player.getVariantTracks()))
  }, [playerRef])

  useEffect(() => {
    if (!isVideoReady) {
      // oxlint-disable-next-line react/set-state-in-effect
      setAudioTracks([])
      return
    }
    refresh()

    const player = playerRef.current
    if (!player) {
      return
    }
    // Shaka в режиме `src=` может дособрать список нативных audioTracks уже ПОСЛЕ готовности
    // видео (событие браузера `addtrack` на `HTMLMediaElement.audioTracks`) — 'trackschanged'
    // сигнализирует об этом
    player.addEventListener('trackschanged', refresh)
    return () => {
      player.removeEventListener('trackschanged', refresh)
    }
  }, [isVideoReady, playerRef, refresh])

  const selectAudioTrack = useCallback(
    (audioId: number) => {
      const player = playerRef.current
      if (!player) {
        return
      }
      const tracks = player.getVariantTracks()
      // Предпочитаем вариант с уже активной видеодорожкой — не переключаем качество видео заодно
      const activeVideoId = tracks.find((t) => t.active)?.videoId
      const match =
        tracks.find((t) => t.audioId === audioId && (activeVideoId === undefined || t.videoId === activeVideoId))
          ?? tracks.find((t) => t.audioId === audioId)
      if (match) {
        player.selectVariantTrack(match, true)
        refresh()
      }
    },
    [playerRef, refresh],
  )

  return { audioTracks, selectAudioTrack }
}
