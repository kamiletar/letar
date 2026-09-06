'use client'

/**
 * Опознание аниме по имени открытой папки (папочный режим плеера) и подгрузка постера Shikimori
 */

import { useEffect, useRef, useState } from 'react'

import { findConfidentAnimeMatch } from '@/lib/shikimori/folder-match'
import { generateSearchQueries, parseFolderName } from '@/lib/shikimori/parse-folder'
import { getShikimoriPosterUrl } from '@/lib/shikimori/poster-url'

interface UseFolderShikimoriMatchReturn {
  /** URL постера — только при однозначном совпадении имени папки с аниме на Shikimori */
  posterUrl: string | null
}

/**
 * Пытается опознать аниме по имени открытой папки и подтянуть постер с Shikimori.
 * Постер показывается только при единственном точном совпадении названия — при неоднозначности
 * или недоступности Shikimori (нет сети, VPN и т.п.) молча остаётся null и не мешает
 * воспроизведению папочного режима, который в остальном полностью локален.
 */
export function useFolderShikimoriMatch(folderPath: string | null): UseFolderShikimoriMatchReturn {
  const [posterUrl, setPosterUrl] = useState<string | null>(null)
  const requestTokenRef = useRef(0)

  useEffect(() => {
    setPosterUrl(null)

    if (!folderPath || !window.electronAPI) {
      return
    }

    const info = parseFolderName(folderPath)
    const [query] = generateSearchQueries(info)
    if (!query) {
      return
    }

    // Токен защищает от гонки: если пользователь открыл другую папку до ответа поиска,
    // устаревший результат не должен перезаписать посвежее (или пустое) состояние
    const token = ++requestTokenRef.current
    window.electronAPI.shikimori
      .search({ search: query, limit: 10 })
      .then((result) => {
        if (requestTokenRef.current !== token || !result.success || !result.data) {
          return
        }
        const match = findConfidentAnimeMatch(info.animeName, result.data)
        setPosterUrl(getShikimoriPosterUrl(match?.poster?.mainUrl))
      })
      .catch(() => {
        // Не блокируем воспроизведение — постер просто не появится
      })
  }, [folderPath])

  return { posterUrl }
}
