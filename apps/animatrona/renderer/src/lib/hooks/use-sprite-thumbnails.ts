'use client'

/**
 * Хук для загрузки sprite thumbnails из IPFS манифеста
 *
 * Загружает VTT со спрайт-координатами и строит URL спрайт-изображения
 * для hover preview на таймлайне плеера.
 */

import { parseSpriteCues, type SpriteCue } from '@letar/video-player-react'
import { useQuery } from '@tanstack/react-query'

import { toPlayableUrl } from '@/lib/media-url'

interface SpriteThumbnailsResult {
  /** Распарсенные VTT cues */
  cues: SpriteCue[]
  /** URL спрайт-изображения */
  spriteUrl: string
}

/**
 * Загружает sprite thumbnails из IPFS манифеста через IPC
 *
 * Возвращает распарсенные cues и URL спрайта для передачи в VideoPlayer.
 */
export function useSpriteThumbnails(manifestCid: string | null | undefined) {
  return useQuery<SpriteThumbnailsResult | null>({
    queryKey: ['spriteThumbnails', manifestCid],
    queryFn: async () => {
      const result = await window.electronAPI!.manifest.getThumbnails(manifestCid!)
      if (!result.success || !result.data) {
        return null
      }

      const { vttCid, spriteCid } = result.data

      // Загружаем VTT текст через IPFS gateway
      const vttUrl = toPlayableUrl({ cid: vttCid })
      if (!vttUrl) {
        return null
      }

      const response = await fetch(vttUrl)
      if (!response.ok) {
        return null
      }

      const vttText = await response.text()
      const cues = parseSpriteCues(vttText)
      if (cues.length === 0) {
        return null
      }

      const spriteUrl = toPlayableUrl({ cid: spriteCid })
      if (!spriteUrl) {
        return null
      }

      return { cues, spriteUrl }
    },
    enabled: !!manifestCid,
    staleTime: 10 * 60 * 1000, // 10 минут — спрайты не меняются
  })
}
