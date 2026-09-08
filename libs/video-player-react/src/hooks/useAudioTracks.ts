/**
 * useAudioTracks — выбор аудиодорожки из уже загруженного файла (Shaka Player, режим `src=`).
 *
 * В отличие от DASH/HLS-манифестов, для прямого `src=` (наш случай — локальные MKV/MP4 без
 * стриминг-манифеста) Shaka проксирует нативные `HTMLMediaElement.audioTracks` браузера как
 * variant-треки: `getVariantTracks()` отдаёт по одному варианту на каждую пару видео×аудио.
 *
 * ⚠️ В режиме `src=` Shaka **не** заполняет числовые `audioId`/`videoId` варианта (оба остаются
 * `null`) — реальный стабильный идентификатор нативной браузерной дорожки лежит в
 * `originalAudioId`/`originalVideoId` (строка, зеркалит `AudioTrack.id`/`VideoTrack.id`).
 * Подтверждено эмпирически (2026-09-08): `getVariantTracks()` в `src=`-режиме отдаёт
 * `{audioId: null, originalAudioId: "2", ...}`. В манифестном режиме (DASH/HLS) Shaka заполняет
 * оба поля, поэтому ключевание на `originalAudioId` работает единообразно в обоих режимах.
 *
 * ⚠️ Требует, чтобы Chromium/Electron вообще экспонировали `HTMLMediaElement.audioTracks` —
 * это выключенная по умолчанию экспериментальная фича Blink (флаг
 * `--enable-blink-features=AudioVideoTracks`, включён в `main/background.ts`). Без флага
 * `video.audioTracks === undefined`, и `getVariantTracks()` отдаёт не «пустой список», а один
 * вариант без aудио-идентификаторов вовсе.
 */

import { useCallback, useEffect, useState } from 'react'

import type { MutableRefObject } from 'react'
import type { ShakaPlayerInstance, ShakaTrack } from './useShakaPlayer'

export interface AudioTrackOption {
  /** `originalAudioId` варианта — стабильный идентификатор аудиопотока в рамках текущей загрузки */
  audioId: string
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
  selectAudioTrack: (audioId: string) => void
}

function collectAudioTracks(tracks: ShakaTrack[]): AudioTrackOption[] {
  const byAudioId = new Map<string, ShakaTrack>()
  for (const track of tracks) {
    if (track.originalAudioId === null) {
      continue
    }
    // Один и тот же audioId может встречаться в нескольких вариантах (разные видеокачества) —
    // берём активный, если он есть, иначе первый попавшийся
    const existing = byAudioId.get(track.originalAudioId)
    if (!existing || track.active) {
      byAudioId.set(track.originalAudioId, track)
    }
  }
  return [...byAudioId.values()]
    .sort((a, b) => (a.originalAudioId as string).localeCompare(b.originalAudioId as string))
    .map((t) => ({
      audioId: t.originalAudioId as string,
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
    (audioId: string) => {
      const player = playerRef.current
      if (!player) {
        return
      }
      const tracks = player.getVariantTracks()
      // Предпочитаем вариант с уже активной видеодорожкой — не переключаем качество видео заодно
      const activeVideoId = tracks.find((t) => t.active)?.originalVideoId
      const match = tracks.find((t) =>
        t.originalAudioId === audioId
        && (activeVideoId === undefined || activeVideoId === null || t.originalVideoId === activeVideoId)
      )
        ?? tracks.find((t) => t.originalAudioId === audioId)
      if (match) {
        player.selectVariantTrack(match, true)
        refresh()
      }
    },
    [playerRef, refresh],
  )

  return { audioTracks, selectAudioTrack }
}
