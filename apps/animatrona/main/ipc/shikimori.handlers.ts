/**
 * IPC handlers для Shikimori API
 */

import type { ShikimoriSearchOptions } from '../services/shikimori'
import {
  downloadPoster,
  getAnimeDetails,
  getAnimeExtended,
  getAnimeWithRelated,
  searchAnime,
} from '../services/shikimori'
import { createHandler } from '../utils/ipc-handler-factory'

/**
 * Регистрирует IPC handlers для Shikimori API
 */
export function registerShikimoriHandlers(): void {
  // Поиск аниме
  createHandler('shikimori:search', (options: ShikimoriSearchOptions) => searchAnime(options))

  // Получить детали аниме по ID
  createHandler('shikimori:getDetails', async (shikimoriId: number) => {
    const details = await getAnimeDetails(shikimoriId)
    if (!details) {
      throw new Error('Аниме не найдено')
    }
    return details
  })

  // Скачать постер
  createHandler(
    'shikimori:downloadPoster',
    (posterUrl: string, animeId: string, options?: { fileName?: string; savePath?: string }) =>
      downloadPoster(posterUrl, animeId, options),
  )

  // Получить аниме со связанными
  createHandler('shikimori:getWithRelated', async (shikimoriId: number) => {
    const result = await getAnimeWithRelated(shikimoriId)
    if (!result) {
      throw new Error('Аниме не найдено')
    }
    return result
  })

  // Получить расширенные метаданные аниме
  createHandler('shikimori:getExtended', async (shikimoriId: number) => {
    const result = await getAnimeExtended(shikimoriId)
    if (!result) {
      throw new Error('Аниме не найдено')
    }
    return result
  })
}
