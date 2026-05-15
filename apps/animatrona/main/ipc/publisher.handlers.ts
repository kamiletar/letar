/**
 * IPC Handlers для публикации библиотеки (P2P Sharing)
 *
 * Каналы:
 * - publisher:getConfig — Получить конфигурацию публикации
 * - publisher:updateConfig — Обновить конфигурацию
 * - publisher:publish — Опубликовать библиотеку
 * - publisher:getPublished — Получить опубликованную библиотеку
 */

import type { PublisherConfig } from '../services/library-publisher'
import {
  clearLibrary,
  deleteAnimeContent,
  getAnimesForPublishing,
  getEpisodesNeedingMigration,
  getPublishedLibrary,
  loadPublisherConfig,
  migrateContentToIpfs,
  publishLibrary,
  regenerateAllEpisodeManifests,
  regenerateAnimeEpisodeManifests,
  updatePublisherConfig,
} from '../services/library-publisher'
import { broadcastToWindows, createHandler } from '../utils/ipc-handler-factory'

/**
 * Регистрация IPC handlers для публикации
 */
export function registerPublisherHandlers(): void {
  // Получить конфигурацию
  createHandler('publisher:getConfig', () => loadPublisherConfig())

  // Обновить конфигурацию
  createHandler('publisher:updateConfig', (updates: Partial<PublisherConfig>) => {
    const config = updatePublisherConfig(updates)
    broadcastToWindows('publisher:configUpdated', config)
    return config
  })

  // Опубликовать библиотеку
  createHandler('publisher:publish', async () => {
    const result = await publishLibrary({
      onProgress: (stage, current, total) => {
        broadcastToWindows('publisher:progress', { stage, current, total })
      },
    })
    broadcastToWindows('publisher:published', result)
    return result
  })

  // Получить количество мигрированных аниме для публикации
  createHandler('publisher:getAnimeCount', async () => {
    const animes = await getAnimesForPublishing()
    const episodeCount = animes.reduce((sum, a) => sum + a.episodes.length, 0)
    return { animeCount: animes.length, episodeCount }
  })

  // Получить опубликованную библиотеку
  createHandler('publisher:getPublished', () => getPublishedLibrary())

  // === Миграция контента в IPFS ===

  // Получить количество эпизодов для миграции
  createHandler('publisher:getMigrationCount', async () => {
    const episodes = await getEpisodesNeedingMigration()
    return { count: episodes.length }
  })

  // Мигрировать контент в IPFS
  createHandler('publisher:migrateToIpfs', async () => {
    const result = await migrateContentToIpfs({
      onProgress: (current, total, animeName, episodeNumber) => {
        broadcastToWindows('publisher:migrationProgress', { current, total, animeName, episodeNumber })
      },
    })
    broadcastToWindows('publisher:migrationComplete', result)
    return result
  })

  // === Регенерация манифестов ===

  // Регенерировать все EpisodeManifest (заменить локальные пути на CID'ы из БД)
  createHandler('publisher:regenerateManifests', async () => {
    const result = await regenerateAllEpisodeManifests({
      onProgress: (current, total, animeName, episodeNumber) => {
        broadcastToWindows('publisher:regenerateProgress', { current, total, animeName, episodeNumber })
      },
    })
    broadcastToWindows('publisher:regenerateComplete', result)
    return result
  })

  // Регенерировать EpisodeManifest + AnimeManifest + directoryCid для одного аниме
  createHandler('publisher:regenerateForAnime', async (animeId: string) => {
    return regenerateAnimeEpisodeManifests(animeId)
  })

  // === Удаление контента ===

  // Удалить контент конкретного аниме из IPFS (вызывать ПЕРЕД удалением из БД)
  createHandler('publisher:deleteAnimeContent', async (animeId: string) => {
    const result = await deleteAnimeContent(animeId)
    return result
  })

  // Очистить библиотеку (удалить все аниме из БД и IPFS)
  createHandler('publisher:clearLibrary', async () => {
    const result = await clearLibrary()
    broadcastToWindows('publisher:libraryCleared', result)
    return result
  })
}
