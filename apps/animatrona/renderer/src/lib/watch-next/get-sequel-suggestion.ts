'use server'

/**
 * Логика поиска рекомендации "Что смотреть дальше"
 *
 * Приоритет: SEQUEL > SIDE_STORY > SPIN_OFF
 * Возвращает связанное аниме с его данными
 */

import type { Anime, RelationKind } from '@/generated/prisma'
import { prisma } from '@/lib/db'
import { toPlayableUrl } from '@/lib/media-url'

/** Данные о рекомендованном сиквеле */
export interface SequelSuggestion {
  /** ID аниме в библиотеке (null если не загружено) */
  animeId: string | null
  /** ID на Shikimori */
  shikimoriId: number
  /** Название аниме */
  name: string
  /** Путь к постеру (если есть в библиотеке) */
  posterPath: string | null
  /** Год выпуска */
  year: number | null
  /** Тип связи */
  relationType: RelationKind
  /** Локализованный тип связи */
  relationLabel: string
  /** Описание почему рекомендуем */
  reason: string
  /** Загружено ли аниме в библиотеку */
  isInLibrary: boolean
  /** Статус просмотра (если в библиотеке) */
  watchStatus: Anime['watchStatus'] | null
  /** Количество эпизодов */
  episodeCount: number | null
  /** Количество загруженных эпизодов */
  loadedEpisodeCount: number
  /** ID первого эпизода (для кнопки "Смотреть") */
  firstEpisodeId: string | null
}

/** Приоритет типов связи (меньше = выше приоритет) */
const RELATION_PRIORITY: Record<RelationKind, number> = {
  SEQUEL: 0, // Продолжение — высший приоритет
  SIDE_STORY: 1, // Побочная история
  SPIN_OFF: 2, // Спин-офф
  PARENT_STORY: 3, // Родительская история
  FULL_STORY: 4, // Полная версия
  ALTERNATIVE_VERSION: 5, // Альтернативная версия
  ALTERNATIVE_SETTING: 6, // Альтернативный сеттинг
  SUMMARY: 10, // Краткое содержание — низкий приоритет
  PREQUEL: 100, // Предыстория — игнорируем
  ADAPTATION: 100, // Адаптация — игнорируем
  CHARACTER: 100, // Общие персонажи — игнорируем
  OTHER: 100, // Другое — игнорируем
}

/** Локализованные названия типов связи */
const RELATION_LABELS: Record<RelationKind, string> = {
  SEQUEL: 'Продолжение',
  PREQUEL: 'Предыстория',
  SIDE_STORY: 'Побочная история',
  PARENT_STORY: 'Основная история',
  SUMMARY: 'Краткое содержание',
  FULL_STORY: 'Полная версия',
  SPIN_OFF: 'Спин-офф',
  ADAPTATION: 'Адаптация',
  CHARACTER: 'Общие персонажи',
  ALTERNATIVE_VERSION: 'Альтернативная версия',
  ALTERNATIVE_SETTING: 'Альтернативный сеттинг',
  OTHER: 'Другое',
}

/** Причины для рекомендации */
const RELATION_REASONS: Record<RelationKind, string> = {
  SEQUEL: 'Продолжение истории',
  SIDE_STORY: 'Побочная история из той же вселенной',
  SPIN_OFF: 'Спин-офф с другими персонажами',
  PARENT_STORY: 'Основная история',
  FULL_STORY: 'Полная версия',
  ALTERNATIVE_VERSION: 'Альтернативная версия',
  ALTERNATIVE_SETTING: 'Альтернативный сеттинг',
  SUMMARY: 'Краткое содержание сезона',
  PREQUEL: 'Предыстория',
  ADAPTATION: 'Адаптация',
  CHARACTER: 'Общие персонажи',
  OTHER: 'Связанное аниме',
}

/**
 * Получает рекомендацию сиквела/продолжения для завершённого аниме
 */
export async function getSequelSuggestion(animeId: string): Promise<SequelSuggestion | null> {
  const db = prisma

  // Получаем связи от текущего аниме
  // Приоритет: SEQUEL > SIDE_STORY > SPIN_OFF
  const relations = await db.animeRelation.findMany({
    where: {
      sourceAnimeId: animeId,
      relationKind: {
        in: ['SEQUEL', 'SIDE_STORY', 'SPIN_OFF', 'PARENT_STORY', 'FULL_STORY'],
      },
    },
    include: {
      targetAnime: {
        include: {
          poster: true,
          episodes: {
            orderBy: { number: 'asc' },
            take: 1,
            select: { id: true },
          },
          _count: {
            select: { episodes: true },
          },
        },
      },
    },
    orderBy: {
      relationKind: 'asc',
    },
  })

  if (relations.length === 0) {
    return null
  }

  // Сортируем по приоритету и выбираем лучший вариант
  const sorted = relations.sort((a, b) => {
    const priorityA = RELATION_PRIORITY[a.relationKind] ?? 100
    const priorityB = RELATION_PRIORITY[b.relationKind] ?? 100
    return priorityA - priorityB
  })

  // Ищем первый с подходящим приоритетом (< 10, чтобы исключить SUMMARY и игнорируемые)
  const best = sorted.find((r) => {
    const priority = RELATION_PRIORITY[r.relationKind] ?? 100
    return priority < 10
  })

  if (!best) {
    return null
  }

  const targetAnime = best.targetAnime
  const isInLibrary = !!targetAnime

  return {
    animeId: targetAnime?.id ?? null,
    shikimoriId: best.targetShikimoriId,
    name: targetAnime?.name ?? `Аниме #${best.targetShikimoriId}`,
    posterPath: toPlayableUrl({ cid: targetAnime?.poster?.cid ?? targetAnime?.posterCid }) ?? null,
    year: targetAnime?.year ?? null,
    relationType: best.relationKind,
    relationLabel: RELATION_LABELS[best.relationKind],
    reason: RELATION_REASONS[best.relationKind],
    isInLibrary,
    watchStatus: targetAnime?.watchStatus ?? null,
    episodeCount: targetAnime?.episodeCount ?? null,
    loadedEpisodeCount: targetAnime?._count?.episodes ?? 0,
    firstEpisodeId: targetAnime?.episodes?.[0]?.id ?? null,
  }
}

/**
 * Получает рекомендацию "Что смотреть дальше" для Sidebar
 *
 * Ищет завершённые аниме с незначатыми сиквелами
 */
export async function getWatchNextSuggestion(): Promise<{
  completedAnime: { id: string; name: string }
  suggestion: SequelSuggestion
} | null> {
  const db = prisma

  // Находим завершённые аниме (от новых к старым)
  const completedAnimes = await db.anime.findMany({
    where: {
      watchStatus: 'COMPLETED',
    },
    orderBy: {
      updatedAt: 'desc',
    },
    take: 20, // Проверяем последние 20 завершённых
    select: {
      id: true,
      name: true,
    },
  })

  // Для каждого завершённого аниме ищем незначатый сиквел
  for (const anime of completedAnimes) {
    const suggestion = await getSequelSuggestion(anime.id)

    // Нашли сиквел в библиотеке, который ещё не начат
    if (suggestion && suggestion.isInLibrary && suggestion.watchStatus === 'NOT_STARTED' && suggestion.firstEpisodeId) {
      return {
        completedAnime: { id: anime.id, name: anime.name },
        suggestion,
      }
    }
  }

  return null
}

/**
 * Получает все связи аниме для построения timeline франшизы
 */
export async function getFranchiseRelations(animeId: string): Promise<
  Array<{
    anime: {
      id: string
      name: string
      year: number | null
      posterPath: string | null
      watchStatus: Anime['watchStatus']
      episodeCount: number
    }
    relationType: RelationKind
    relationLabel: string
    isCurrentAnime: boolean
  }>
> {
  const db = prisma

  // Получаем текущее аниме
  const currentAnime = await db.anime.findUnique({
    where: { id: animeId },
    include: {
      poster: true,
      _count: { select: { episodes: true } },
    },
  })

  if (!currentAnime) {
    return []
  }

  // Получаем все исходящие связи
  const outgoingRelations = await db.animeRelation.findMany({
    where: {
      sourceAnimeId: animeId,
      targetAnimeId: { not: null },
    },
    include: {
      targetAnime: {
        include: {
          poster: true,
          _count: { select: { episodes: true } },
        },
      },
    },
  })

  // Получаем все входящие связи
  const incomingRelations = await db.animeRelation.findMany({
    where: {
      targetAnimeId: animeId,
    },
    include: {
      sourceAnime: {
        include: {
          poster: true,
          _count: { select: { episodes: true } },
        },
      },
    },
  })

  const result: Array<{
    anime: {
      id: string
      name: string
      year: number | null
      posterPath: string | null
      watchStatus: Anime['watchStatus']
      episodeCount: number
    }
    relationType: RelationKind
    relationLabel: string
    isCurrentAnime: boolean
  }> = []

  // Добавляем текущее аниме
  result.push({
    anime: {
      id: currentAnime.id,
      name: currentAnime.name,
      year: currentAnime.year,
      posterPath: toPlayableUrl({ cid: currentAnime.poster?.cid ?? currentAnime.posterCid }) ?? null,
      watchStatus: currentAnime.watchStatus,
      episodeCount: currentAnime._count.episodes,
    },
    relationType: 'PARENT_STORY' as RelationKind, // Placeholder
    relationLabel: 'Текущее',
    isCurrentAnime: true,
  })

  // Добавляем исходящие (куда ведёт текущее аниме)
  for (const rel of outgoingRelations) {
    if (!rel.targetAnime) {
      continue
    }
    result.push({
      anime: {
        id: rel.targetAnime.id,
        name: rel.targetAnime.name,
        year: rel.targetAnime.year,
        posterPath: toPlayableUrl({ cid: rel.targetAnime.poster?.cid ?? rel.targetAnime.posterCid }) ?? null,
        watchStatus: rel.targetAnime.watchStatus,
        episodeCount: rel.targetAnime._count.episodes,
      },
      relationType: rel.relationKind,
      relationLabel: RELATION_LABELS[rel.relationKind],
      isCurrentAnime: false,
    })
  }

  // Добавляем входящие (откуда пришло текущее аниме) с инверсией типа связи
  for (const rel of incomingRelations) {
    // Инвертируем тип: если A -> B это SEQUEL, то B -> A это PREQUEL
    let invertedKind: RelationKind = rel.relationKind
    if (rel.relationKind === 'SEQUEL') {
      invertedKind = 'PREQUEL'
    } else if (rel.relationKind === 'PREQUEL') {
      invertedKind = 'SEQUEL'
    }

    result.push({
      anime: {
        id: rel.sourceAnime.id,
        name: rel.sourceAnime.name,
        year: rel.sourceAnime.year,
        posterPath: toPlayableUrl({ cid: rel.sourceAnime.poster?.cid ?? rel.sourceAnime.posterCid }) ?? null,
        watchStatus: rel.sourceAnime.watchStatus,
        episodeCount: rel.sourceAnime._count.episodes,
      },
      relationType: invertedKind,
      relationLabel: RELATION_LABELS[invertedKind],
      isCurrentAnime: false,
    })
  }

  // Убираем дубликаты по id
  const seen = new Set<string>()
  const deduplicated = result.filter((item) => {
    if (seen.has(item.anime.id)) {
      return false
    }
    seen.add(item.anime.id)
    return true
  })

  // Сортируем по году
  return deduplicated.sort((a, b) => {
    // Текущее аниме имеет особый приоритет — не сортируем его
    if (a.isCurrentAnime) {
      return 0
    }
    if (b.isCurrentAnime) {
      return 0
    }
    // Сортировка по году
    const yearA = a.anime.year ?? 9999
    const yearB = b.anime.year ?? 9999
    return yearA - yearB
  })
}
