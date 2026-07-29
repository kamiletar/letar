/**
 * IPC хендлеры для библиотеки
 *
 * Управление путями и структурой библиотеки
 */

import { syncAnimeEpisodes } from '../services/anime-importer'
import {
  ensureAnimeDirectory,
  ensureEpisodeDirectory,
  getDefaultLibraryPath,
  type OutputPathOptions,
  resolveOutputPath,
} from '../services/output-path-resolver'
import { prisma } from '../utils/db'
import { createHandler } from '../utils/ipc-handler-factory'

/**
 * Регистрирует IPC хендлеры для библиотеки
 */
export function registerLibraryHandlers(): void {
  // Получить путь к библиотеке по умолчанию
  createHandler('library:getDefaultPath', () => getDefaultLibraryPath())

  // Получить путь к папке эпизода
  createHandler('library:resolveOutputPath', (options: OutputPathOptions) => resolveOutputPath(options))

  // Создать структуру папок для эпизода
  createHandler('library:ensureEpisodeDirectory', (options: OutputPathOptions) => ensureEpisodeDirectory(options))

  // Создать папку для аниме
  createHandler('library:ensureAnimeDirectory', (libraryPath: string, animeName: string) =>
    ensureAnimeDirectory(libraryPath, animeName)
  )

  // Проверить, есть ли аниме с таким shikimoriId в библиотеке
  createHandler('library:checkAnimeExists', async (shikimoriId: number) => {
    const anime = await prisma.anime.findUnique({
      where: { shikimoriId },
      select: { id: true, name: true, episodeCount: true, needsReupload: true },
    })
    return anime
      ? {
          exists: true,
          animeId: anime.id,
          animeName: anime.name,
          episodeCount: anime.episodeCount,
          needsReupload: anime.needsReupload,
        }
      : { exists: false }
  })

  // Синхронизировать эпизоды из IPFS (для онгоингов и retry)
  createHandler('library:syncEpisodes', async (animeId: string) => {
    const anime = await prisma.anime.findUnique({
      where: { id: animeId },
      select: { directoryCid: true, name: true },
    })
    if (!anime?.directoryCid) {
      return { success: false, error: 'У аниме нет directoryCid — синхронизация невозможна' }
    }
    const result = await syncAnimeEpisodes(animeId, anime.directoryCid)
    return { success: true, data: result }
  })
}
