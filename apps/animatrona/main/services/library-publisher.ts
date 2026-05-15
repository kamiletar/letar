/**
 * Library Publisher — Публикация библиотеки в IPFS/IPNS
 *
 * Оркестратор: импортирует логику из подмодулей и координирует публикацию.
 * Реэкспортирует все публичные функции для обратной совместимости.
 */

import { createModuleLogger } from '../utils/logger'
import { getIpnsService } from './ipfs'
import { getKuboService } from './kubo'
import {
  generatePublishedLibrary as _generatePublishedLibrary,
  getAnimesForPublishing as _getAnimesForPublishing,
  slugify as _slugify,
} from './library-generator'
import {
  loadPublisherConfig as _loadPublisherConfig,
  updatePublisherConfig as _updatePublisherConfig,
} from './publisher-config'

const log = createModuleLogger('LibraryPublisher')

/**
 * Результат публикации
 */
export interface PublishResult {
  /** CID опубликованной библиотеки */
  cid: string
  /** IPNS имя */
  ipnsName: string
  /** Когда опубликовано */
  publishedAt: string
  /** Количество аниме */
  animeCount: number
  /** Количество эпизодов */
  episodeCount: number
}

/**
 * Опубликовать библиотеку в IPFS/IPNS
 *
 * После миграции в IPFS весь контент уже имеет CID — просто генерируем манифест.
 *
 * @param options Опции публикации
 */
export async function publishLibrary(options?: {
  /** Callback прогресса */
  onProgress?: (stage: string, current: number, total: number) => void
}): Promise<PublishResult> {
  const config = _loadPublisherConfig()
  const kuboService = getKuboService()
  const ipnsService = getIpnsService()

  if (!kuboService.isRunning()) {
    throw new Error('IPFS нода не запущена')
  }

  const peerId = kuboService.getPeerId()
  if (!peerId) {
    throw new Error('PeerId не доступен')
  }

  const onProgress = options?.onProgress

  // Шаг 1: Получаем аниме с CID из БД
  onProgress?.('loading', 1, 1)
  const animes = await _getAnimesForPublishing()

  if (animes.length === 0) {
    throw new Error('Нет аниме для публикации. Импортируйте контент через очередь кодирования.')
  }

  // Шаг 2: Генерируем PublishedLibrary
  onProgress?.('generating', 1, 1)
  const library = _generatePublishedLibrary(config.libraryName, peerId, animes)

  // Шаг 3: Строим IPFS-директорию библиотеки
  // Структура: /library.json + /animes/<slug>/ → directoryCid
  onProgress?.('publishing', 1, 2)

  const { createDirectoryFromCids } = await import('./ipfs/unified-ipfs-service')
  const libraryJson = JSON.stringify(library, null, 2)

  const rootEntries: import('./ipfs/unified-ipfs-service').DirEntry[] = [
    {
      name: 'library.json',
      type: 'file',
      content: Buffer.from(libraryJson, 'utf-8'),
    },
  ]

  // Добавляем animes/ — ссылки на directoryCid каждого аниме
  const animesWithDir = animes.filter((a) => a.directoryCid)
  if (animesWithDir.length > 0) {
    const animeDirEntries: import('./ipfs/unified-ipfs-service').DirEntry[] = []
    const usedSlugs = new Set<string>()

    for (const anime of animesWithDir) {
      let slug = _slugify(anime.name)
      // Дедупликация slug'ов
      if (usedSlugs.has(slug)) {
        let counter = 2
        while (usedSlugs.has(`${slug}-${counter}`)) {
          counter++
        }
        slug = `${slug}-${counter}`
      }
      usedSlugs.add(slug)

      // Ссылка на существующую IPFS-директорию аниме (без копирования данных)
      animeDirEntries.push({
        name: slug,
        type: 'file', // files.cp скопирует директорию как есть
        cid: anime.directoryCid!,
      })
    }

    rootEntries.push({
      name: 'animes',
      type: 'directory',
      children: animeDirEntries,
    })
  }

  const libraryCid = await createDirectoryFromCids(rootEntries)

  // Шаг 4: Публикуем через IPNS
  onProgress?.('publishing', 2, 2)

  const ipnsResult = await ipnsService.publish(libraryCid)

  // Обновляем конфигурацию
  const now = new Date().toISOString()
  _updatePublisherConfig({
    lastPublishedCid: libraryCid,
    lastPublishedAt: now,
  })

  const episodeCount = library.animes.reduce((sum, a) => sum + a.episodes.length, 0)
  log.info('Библиотека опубликована', { animeCount: library.animes.length, episodeCount })

  return {
    cid: libraryCid,
    ipnsName: ipnsResult.name,
    publishedAt: now,
    animeCount: library.animes.length,
    episodeCount,
  }
}

/**
 * Получить последнюю опубликованную библиотеку
 */
export async function getPublishedLibrary(): Promise<import('../../shared/types/ipfs').PublishedLibrary | null> {
  const config = _loadPublisherConfig()

  if (!config.lastPublishedCid) {
    return null
  }

  try {
    const { cat } = await import('./ipfs')
    const content = await cat(config.lastPublishedCid)
    return JSON.parse(content.toString('utf-8')) as import('../../shared/types/ipfs').PublishedLibrary
  } catch (error) {
    log.error('Ошибка получения опубликованной библиотеки', {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

// === Реэкспорт из подмодулей для обратной совместимости ===

// publisher-config.ts
export {
  DEFAULT_CONFIG,
  loadPublisherConfig,
  PUBLISHER_CONFIG_FILE,
  savePublisherConfig,
  updatePublisherConfig,
} from './publisher-config'
export type { PublisherConfig } from './publisher-config'

// library-generator.ts
export { generatePublishedLibrary, getAnimesForPublishing, slugify } from './library-generator'
export type { AnimeData, EpisodeData } from './library-generator'

// content-migration.ts
export { getEpisodesNeedingMigration, migrateContentToIpfs } from './content-migration'
export type { MigrationResult } from './content-migration'

// content-deletion.ts
export { clearLibrary, deleteAnimeContent } from './content-deletion'
export type { DeleteAnimeContentResult } from './content-deletion'

// episode-manifest-regen.ts
export { regenerateAllEpisodeManifests, regenerateAnimeEpisodeManifests } from './episode-manifest-regen'
export type { RegenerateManifestsResult } from './episode-manifest-regen'
