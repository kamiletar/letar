/**
 * Группировка аниме по франшизам
 *
 * Два алгоритма:
 * 1. Графовый BFS (если есть relations) — строит неориентированный граф
 *    сильных связей (SEQUEL/PREQUEL/SPIN_OFF...) и находит связные компоненты.
 *    Портировано из Desktop (group-anime-by-franchise.ts).
 * 2. Fallback по franchiseKey/cleanTitle — для API без relations.
 */

import type { AnimeListItem } from '@letar/animatrona-shared'

/** Группа франшизы */
export interface FranchiseGroup {
  /** Ключ группировки */
  key: string
  /** Название франшизы */
  name: string
  /** Постер (от первого аниме) */
  posterPath: string | null
  /** Аниме внутри франшизы (отсортированы по году) */
  items: AnimeListItem[]
  /** Можно ли раскрыть (> 1 тайтла) */
  expandable: boolean
  /** Суммарное количество эпизодов */
  totalEpisodes: number
  /** Суммарное количество просмотренных */
  totalWatched: number
}

/** Типы связей для графовой группировки (прямые нарративные связи) */
const STRONG_RELATION_KINDS = new Set([
  // Uppercase (Desktop)
  'SEQUEL',
  'PREQUEL',
  'SIDE_STORY',
  'PARENT_STORY',
  'SUMMARY',
  'FULL_STORY',
  'SPIN_OFF',
  'ADAPTATION',
  // Lowercase (Tracker API)
  'sequel',
  'prequel',
  'side_story',
  'parent_story',
  'summary',
  'full_story',
  'spin_off',
  'adaptation',
])

/**
 * Паттерны для очистки названия до базового (без номера сезона и т.д.)
 * Используется как fallback когда нет relations.
 */
const SEASON_PATTERNS = [
  /\s+Season\s+\d+/i,
  /\s+Season\s+(One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten)/i,
  /\s+\d+(st|nd|rd|th)\s+Season/i,
  /\s+Part\s+\d+/i,
  /\s+Part\s+(I{1,3}V?|V?I{0,3})\b/i,
  /\s+(I{2,3}V?|IV|VI{0,3})\s*$/,
  /\s+\d+\s*$/,
  /\s*:\s+.+$/,
  /\s+-\s+.+$/,
  /\s*\(\d{4}\)\s*$/,
  /\s+Cour\s+\d+/i,
]

/** Очистить название до базового для группировки */
function cleanTitle(name: string): string {
  let cleaned = name.trim()
  for (const pattern of SEASON_PATTERNS) {
    cleaned = cleaned.replace(pattern, '')
  }
  return cleaned.trim().toLowerCase()
}

/**
 * Сгруппировать аниме по франшизам.
 * Автоматически выбирает алгоритм:
 * - Графовый BFS если хотя бы одно аниме имеет relations
 * - Fallback по franchiseKey/cleanTitle иначе
 */
export function groupByFranchise(anime: AnimeListItem[]): FranchiseGroup[] {
  const hasRelations = anime.some((a) => a.relations && a.relations.length > 0)

  if (hasRelations) {
    return groupByGraph(anime)
  }
  return groupByFranchiseKey(anime)
}

/**
 * Графовый алгоритм группировки (портировано из Desktop)
 *
 * Строит неориентированный граф сильных связей между аниме,
 * находит связные компоненты через BFS.
 * Разбивает огромные Shikimori-франшизы на логичные подгруппы.
 */
function groupByGraph(anime: AnimeListItem[]): FranchiseGroup[] {
  // 1. Индексы для быстрого поиска
  const animeById = new Map<string, AnimeListItem>()
  for (const item of anime) {
    animeById.set(item.id, item)
  }

  // 2. Строим неориентированный граф смежности (только сильные связи между загруженными)
  const adj = new Map<string, Set<string>>()
  for (const item of anime) {
    if (!item.relations) continue
    for (const rel of item.relations) {
      if (!STRONG_RELATION_KINDS.has(rel.relationKind)) continue
      if (!rel.targetAnimeId) continue
      if (!animeById.has(rel.targetAnimeId)) continue

      // Добавляем рёбра в обе стороны
      let neighbors = adj.get(item.id)
      if (!neighbors) {
        neighbors = new Set()
        adj.set(item.id, neighbors)
      }
      neighbors.add(rel.targetAnimeId)

      let reverseNeighbors = adj.get(rel.targetAnimeId)
      if (!reverseNeighbors) {
        reverseNeighbors = new Set()
        adj.set(rel.targetAnimeId, reverseNeighbors)
      }
      reverseNeighbors.add(item.id)
    }
  }

  // 3. BFS для поиска связных компонент
  const visited = new Set<string>()
  const components: AnimeListItem[][] = []

  for (const item of anime) {
    if (visited.has(item.id)) continue

    const component: AnimeListItem[] = []
    const queue = [item.id]
    visited.add(item.id)

    while (queue.length > 0) {
      const currentId = queue.shift()!
      const current = animeById.get(currentId)
      if (current) component.push(current)

      const neighbors = adj.get(currentId)
      if (!neighbors) continue
      for (const neighborId of neighbors) {
        if (visited.has(neighborId)) continue
        visited.add(neighborId)
        queue.push(neighborId)
      }
    }

    components.push(component)
  }

  // 4. Формируем FranchiseGroup из компонент
  return buildGroups(components)
}

/**
 * Fallback: группировка по franchiseKey или очищенному названию
 */
function groupByFranchiseKey(anime: AnimeListItem[]): FranchiseGroup[] {
  const groups = new Map<string, AnimeListItem[]>()

  for (const item of anime) {
    const key = item.franchiseKey ?? `name:${cleanTitle(item.name)}`
    const existing = groups.get(key)
    if (existing) {
      existing.push(item)
    } else {
      groups.set(key, [item])
    }
  }

  return buildGroups([...groups.values()])
}

/**
 * Конвертировать компоненты (массивы аниме) в FranchiseGroup[]
 */
function buildGroups(components: AnimeListItem[][]): FranchiseGroup[] {
  const result: FranchiseGroup[] = []

  for (const items of components) {
    // Сортируем внутри группы по году
    items.sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999))

    const representative = items[0]
    const totalEpisodes = items.reduce((sum, i) => sum + i.episodeCount, 0)
    const totalWatched = items.reduce((sum, i) => sum + i.watchedEpisodes, 0)

    result.push({
      key: representative.franchiseKey ?? representative.id,
      name: representative.franchiseName ?? representative.name,
      posterPath: representative.posterPath,
      items,
      expandable: items.length > 1,
      totalEpisodes,
      totalWatched,
    })
  }

  // Сортировка: сначала с прогрессом (WATCHING), потом по имени
  result.sort((a, b) => {
    const aWatching = a.items.some((i) => i.watchStatus === 'WATCHING') ? 0 : 1
    const bWatching = b.items.some((i) => i.watchStatus === 'WATCHING') ? 0 : 1
    if (aWatching !== bWatching) return aWatching - bWatching
    return a.name.localeCompare(b.name)
  })

  return result
}
