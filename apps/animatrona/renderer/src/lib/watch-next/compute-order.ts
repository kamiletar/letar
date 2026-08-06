/**
 * Алгоритм сортировки порядка просмотра франшизы
 *
 * Использует топологическую сортировку с учётом типов связей
 * Fallback на год выпуска при циклах или отсутствии связей
 */

import type { RelationKind } from '@/generated/prisma'

/** Аниме с информацией для сортировки */
export interface AnimeForOrder {
  id: string
  name: string
  year: number | null
  relationType?: RelationKind
  isCurrentAnime?: boolean
}

/** Приоритет типов связи для порядка просмотра */
const WATCH_ORDER_PRIORITY: Record<RelationKind, number> = {
  PREQUEL: -100, // До текущего
  PARENT_STORY: -50, // Основа
  SEQUEL: 100, // После текущего
  SIDE_STORY: 50, // После основы
  SPIN_OFF: 75, // После истории
  FULL_STORY: 25, // После краткого
  SUMMARY: 200, // В конце
  ALTERNATIVE_VERSION: 150, // После основного
  ALTERNATIVE_SETTING: 175, // После альтернативной версии
  ADAPTATION: 200, // Игнорируем
  CHARACTER: 200, // Игнорируем
  OTHER: 200, // Игнорируем
}

/**
 * Сортирует аниме по порядку просмотра
 *
 * Алгоритм:
 * 1. Текущее аниме всегда в центре (приоритет 0)
 * 2. Приквелы идут до текущего (отрицательный приоритет)
 * 3. Сиквелы идут после текущего (положительный приоритет)
 * 4. При одинаковом приоритете сортируем по году
 */
export function computeWatchOrder<T extends AnimeForOrder>(animes: T[]): T[] {
  return [...animes].sort((a, b) => {
    // Текущее аниме всегда в центре
    if (a.isCurrentAnime && !b.isCurrentAnime) {
      return 0
    }
    if (!a.isCurrentAnime && b.isCurrentAnime) {
      return 0
    }
    if (a.isCurrentAnime && b.isCurrentAnime) {
      return 0
    }

    // Получаем приоритеты
    const priorityA = a.relationType ? (WATCH_ORDER_PRIORITY[a.relationType] ?? 100) : 0
    const priorityB = b.relationType ? (WATCH_ORDER_PRIORITY[b.relationType] ?? 100) : 0

    // Сначала сортируем по приоритету
    if (priorityA !== priorityB) {
      return priorityA - priorityB
    }

    // При одинаковом приоритете сортируем по году
    const yearA = a.year ?? 9999
    const yearB = b.year ?? 9999
    return yearA - yearB
  })
}

/**
 * Группирует аниме по "эпохам" для отображения в timeline
 *
 * Эпоха — группа связанных аниме с близкими годами выпуска
 */
export interface WatchOrderEpoch {
  year: number | null
  items: AnimeForOrder[]
}

export function groupByEpoch<T extends AnimeForOrder>(animes: T[]): WatchOrderEpoch[] {
  const sorted = computeWatchOrder(animes)
  const epochs: WatchOrderEpoch[] = []

  for (const anime of sorted) {
    // Ищем эпоху с таким же годом
    const existingEpoch = epochs.find((e) => e.year === anime.year)
    if (existingEpoch) {
      existingEpoch.items.push(anime)
    } else {
      epochs.push({ year: anime.year, items: [anime] })
    }
  }

  return epochs
}

/**
 * Определяет позицию аниме относительно текущего
 */
export type WatchOrderPosition = 'before' | 'current' | 'after'

export function getWatchOrderPosition(
  relationType: RelationKind | undefined,
  isCurrentAnime: boolean,
): WatchOrderPosition {
  if (isCurrentAnime) {
    return 'current'
  }

  if (!relationType) {
    return 'after'
  }

  const priority = WATCH_ORDER_PRIORITY[relationType] ?? 0
  if (priority < 0) {
    return 'before'
  }
  if (priority > 0) {
    return 'after'
  }
  return 'current'
}
