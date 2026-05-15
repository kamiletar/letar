/**
 * Library Generator — Генерация PublishedLibrary из данных БД
 *
 * Формирует структуру PublishedLibrary для публикации через IPNS.
 */

import type { PublishedAnime, PublishedEpisode, PublishedLibrary } from '../../shared/types/ipfs'
import { prisma } from '../utils/db'
import { createModuleLogger } from '../utils/logger'

const log = createModuleLogger('LibraryGenerator')

/**
 * Данные аниме из БД для публикации
 */
export interface AnimeData {
  id: string
  name: string
  originalName: string | null
  year: number | null
  /** CID постера (если загружен в IPFS) */
  posterCid: string | null
  /** CID корневой IPFS-директории аниме */
  directoryCid: string | null
  /** Количество IPFS блоков в директории */
  directoryBlocks: number | null
  /** Размер директории в байтах */
  directorySize: number | null
  episodes: EpisodeData[]
}

/**
 * Данные эпизода из БД для публикации
 */
export interface EpisodeData {
  id: string
  number: number
  name: string | null
  /** CID транскодированного видео */
  transcodedCid: string
  durationMs: number | null
  /** Размер видео в IPFS (байты) */
  ipfsSize: number | null
}

/**
 * Транслитерация и slug для имени аниме
 *
 * Используется для имён папок в IPFS-директории библиотеки.
 * Кириллица транслитерируется, спецсимволы заменяются на дефисы.
 */
export function slugify(name: string): string {
  const translitMap: Record<string, string> = {
    а: 'a',
    б: 'b',
    в: 'v',
    г: 'g',
    д: 'd',
    е: 'e',
    ё: 'yo',
    ж: 'zh',
    з: 'z',
    и: 'i',
    й: 'y',
    к: 'k',
    л: 'l',
    м: 'm',
    н: 'n',
    о: 'o',
    п: 'p',
    р: 'r',
    с: 's',
    т: 't',
    у: 'u',
    ф: 'f',
    х: 'kh',
    ц: 'ts',
    ч: 'ch',
    ш: 'sh',
    щ: 'shch',
    ъ: '',
    ы: 'y',
    ь: '',
    э: 'e',
    ю: 'yu',
    я: 'ya',
  }

  return name
    .toLowerCase()
    .split('')
    .map((c) => translitMap[c] ?? c)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

/**
 * Генерировать PublishedLibrary из данных БД
 *
 * После миграции в IPFS все CID уже есть в БД — не нужны маппинги.
 *
 * @param libraryName Название библиотеки
 * @param peerId PeerId владельца
 * @param animes Список аниме с эпизодами (уже с CID)
 */
export function generatePublishedLibrary(libraryName: string, peerId: string, animes: AnimeData[]): PublishedLibrary {
  const publishedAnimes: PublishedAnime[] = []

  for (const anime of animes) {
    // Эпизоды уже отфильтрованы — все имеют transcodedCid
    const episodes: PublishedEpisode[] = anime.episodes.map((ep) => ({
      number: ep.number,
      name: ep.name || undefined,
      cid: ep.transcodedCid,
      size: ep.ipfsSize ?? 0,
      duration: ep.durationMs ? Math.floor(ep.durationMs / 1000) : 0,
    }))

    // Пропускаем аниме без эпизодов
    if (episodes.length === 0) {
      continue
    }

    publishedAnimes.push({
      name: anime.name,
      originalName: anime.originalName || undefined,
      year: anime.year || undefined,
      posterCid: anime.posterCid || undefined,
      directoryCid: anime.directoryCid || undefined,
      directoryBlocks: anime.directoryBlocks || undefined,
      directorySize: anime.directorySize || undefined,
      episodes: episodes.sort((a, b) => a.number - b.number),
    })
  }

  return {
    version: 1,
    peerId,
    name: libraryName,
    updatedAt: new Date().toISOString(),
    animes: publishedAnimes.sort((a, b) => a.name.localeCompare(b.name)),
  }
}

/**
 * Получить аниме из БД для публикации
 *
 * Выбирает эпизоды у которых есть transcodedCid или manifestCid (контент в IPFS).
 */
export async function getAnimesForPublishing(): Promise<AnimeData[]> {
  const animes = await prisma.anime.findMany({
    where: {
      OR: [
        {
          episodes: {
            some: {
              OR: [{ transcodedCid: { not: null } }, { manifestCid: { not: null } }],
            },
          },
        },
        { directoryCid: { not: null } },
      ],
    },
    select: {
      id: true,
      name: true,
      originalName: true,
      year: true,
      directoryCid: true, // IPFS-директория аниме
      directoryBlocks: true,
      directorySize: true,
      poster: {
        select: { cid: true },
      },
      episodes: {
        where: {
          OR: [{ transcodedCid: { not: null } }, { manifestCid: { not: null } }],
        },
        select: {
          id: true,
          number: true,
          name: true,
          transcodedCid: true,
          manifestCid: true,
          durationMs: true,
          ipfsSize: true,
        },
        orderBy: { number: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  })

  // Логируем найденные аниме
  log.info('Найдено аниме для публикации', { count: animes.length })
  for (const anime of animes) {
    log.debug('Аниме для публикации', { name: anime.name, episodes: anime.episodes.length })
  }

  return animes.map((anime) => ({
    id: anime.id,
    name: anime.name,
    originalName: anime.originalName,
    year: anime.year,
    posterCid: anime.poster?.cid || null,
    directoryCid: anime.directoryCid,
    directoryBlocks: anime.directoryBlocks,
    directorySize: anime.directorySize,
    episodes: anime.episodes.map((ep) => ({
      id: ep.id,
      number: ep.number,
      name: ep.name,
      // Используем transcodedCid или manifestCid (для импортированного контента)
      transcodedCid: ep.transcodedCid || ep.manifestCid || '',
      durationMs: ep.durationMs,
      ipfsSize: ep.ipfsSize,
    })),
  }))
}
