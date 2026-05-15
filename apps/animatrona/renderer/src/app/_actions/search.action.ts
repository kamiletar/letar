'use server'

/**
 * Server Action для поиска аниме
 *
 * v0.28.9: Клиентский поиск через Fuse.js
 * - getSearchableAnime() загружает все данные для кэширования
 * - Поиск выполняется in-memory через SearchProvider + useSearch()
 */

import { prisma } from '@/lib/db'
import { toPlayableUrl } from '@/lib/media-url'
import { hasCyrillic, stemText } from '@/lib/stemmer'

/** Результат поиска для Quick Search */
export interface SearchResult {
  id: string
  name: string
  originalName: string | null
  posterPath: string | null
  year: number | null
}

/**
 * Данные аниме для клиентского поиска Fuse.js
 * Загружаются один раз и кэшируются через TanStack Query
 */
export interface SearchableAnime {
  id: string
  /** Русское/английское название */
  name: string
  /** Японское название (鋼の錬金術師) */
  originalName: string | null
  /** Английское название */
  nameEn: string | null
  /** Альтернативные названия */
  synonyms: string[]
  /** Год выпуска */
  year: number | null
  /** Путь к постеру */
  posterPath: string | null
  /** Стеммированное русское название (для поиска) */
  nameStemmed: string | null
  /** Стеммированные синонимы (для поиска) */
  synonymsStemmed: string[]
}

/**
 * Загружает все аниме для клиентского поиска
 * Данные кэшируются через TanStack Query (staleTime: 5 минут)
 *
 * Включает стеммированные версии русских названий для морфологического поиска
 */
export async function getSearchableAnime(): Promise<SearchableAnime[]> {
  const anime = await prisma.anime.findMany({
    select: {
      id: true,
      name: true,
      originalName: true,
      nameEn: true,
      synonyms: true,
      year: true,
      poster: { select: { cid: true } },
    },
    orderBy: { name: 'asc' },
  })

  return anime.map((a) => {
    // Парсим синонимы из JSON (если хранится как строка)
    let synonymsArray: string[] = []
    if (a.synonyms) {
      try {
        synonymsArray = typeof a.synonyms === 'string' ? JSON.parse(a.synonyms) : a.synonyms
      } catch {
        synonymsArray = []
      }
    }

    return {
      id: a.id,
      name: a.name,
      originalName: a.originalName,
      nameEn: a.nameEn,
      synonyms: synonymsArray,
      year: a.year,
      posterPath: toPlayableUrl({ cid: a.poster?.cid }) ?? null,
      // Стемминг для русских названий
      nameStemmed: hasCyrillic(a.name) ? stemText(a.name) : null,
      synonymsStemmed: synonymsArray.filter(hasCyrillic).map(stemText),
    }
  })
}
