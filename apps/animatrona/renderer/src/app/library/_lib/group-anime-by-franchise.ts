/**
 * Группировка аниме по связным компонентам (connected components)
 *
 * Вместо группировки по franchise.id строим неориентированный граф
 * из "сильных" связей между загруженными аниме и находим компоненты BFS.
 * Это разбивает огромные Shikimori-франшизы (Re:Zero + Isekai Quartet)
 * на логичные подгруппы по прямым связям.
 */

import type { AnimeRelationInfo, AnimeWithFranchise, FranchiseGroup } from './types'

/** Типы связей для группировки (прямые нарративные связи) */
const STRONG_RELATION_KINDS = new Set([
  'SEQUEL',
  'PREQUEL',
  'SIDE_STORY',
  'PARENT_STORY',
  'SUMMARY',
  'FULL_STORY',
  'SPIN_OFF',
  'ADAPTATION',
])

/**
 * Группирует аниме по связным компонентам в графе сильных связей.
 *
 * @param animes — отфильтрованные аниме для отображения
 * @param allLoadedShikimoriIds — shikimoriId ВСЕХ загруженных аниме (без фильтров),
 *                                нужно для корректного определения missingAnimes
 */
export function groupAnimeByFranchise(
  animes: AnimeWithFranchise[],
  allLoadedShikimoriIds: Set<number>
): {
  franchiseGroups: FranchiseGroup[]
  standAloneAnimes: AnimeWithFranchise[]
} {
  // 1. Индекс: animeId → anime (только отфильтрованные)
  const animeById = new Map<string, AnimeWithFranchise>()
  for (const anime of animes) {
    animeById.set(anime.id, anime)
  }

  // 2. Строим неориентированный граф смежности (только сильные связи между загруженными)
  const adj = new Map<string, Set<string>>()
  for (const anime of animes) {
    if (!anime.sourceRelations) {
      continue
    }
    for (const rel of anime.sourceRelations) {
      if (!STRONG_RELATION_KINDS.has(rel.relationKind)) {
        continue
      }
      if (!rel.targetAnimeId) {
        continue
      }
      if (!animeById.has(rel.targetAnimeId)) {
        continue
      }

      // Добавляем рёбра в обе стороны
      let neighbors = adj.get(anime.id)
      if (!neighbors) {
        neighbors = new Set()
        adj.set(anime.id, neighbors)
      }
      neighbors.add(rel.targetAnimeId)

      let reverseNeighbors = adj.get(rel.targetAnimeId)
      if (!reverseNeighbors) {
        reverseNeighbors = new Set()
        adj.set(rel.targetAnimeId, reverseNeighbors)
      }
      reverseNeighbors.add(anime.id)
    }
  }

  // 3. BFS для поиска связных компонент
  const visited = new Set<string>()
  const components: AnimeWithFranchise[][] = []

  for (const anime of animes) {
    if (visited.has(anime.id)) {
      continue
    }

    const component: AnimeWithFranchise[] = []
    const queue = [anime.id]
    visited.add(anime.id)

    while (queue.length > 0) {
      const currentId = queue.shift()!
      const current = animeById.get(currentId)
      if (current) {
        component.push(current)
      }

      const neighbors = adj.get(currentId)
      if (!neighbors) {
        continue
      }
      for (const neighborId of neighbors) {
        if (visited.has(neighborId)) {
          continue
        }
        visited.add(neighborId)
        queue.push(neighborId)
      }
    }

    components.push(component)
  }

  // 4. Формируем группы и standalone
  const franchiseGroups: FranchiseGroup[] = []
  const standAloneAnimes: AnimeWithFranchise[] = []

  for (const component of components) {
    if (component.length < 2) {
      standAloneAnimes.push(component[0])
      continue
    }

    // Название группы: самое раннее аниме по году (корневой тайтл франшизы)
    // НЕ используем franchise.name — это имя огромной Shikimori-франшизы
    const sorted = [...component].sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999))
    const representative = sorted[0]
    const franchiseInfo = {
      id: representative.franchise?.id ?? representative.id,
      name: representative.name,
    }

    // Собираем незагруженные аниме из сильных связей всех аниме компоненты
    const missingAnimes = collectMissingAnimes(component, allLoadedShikimoriIds)

    franchiseGroups.push({
      franchise: franchiseInfo,
      animes: component,
      missingAnimes,
    })
  }

  // 5. Сортируем группы по названию франшизы
  franchiseGroups.sort((a, b) => a.franchise.name.localeCompare(b.franchise.name))

  return { franchiseGroups, standAloneAnimes }
}

/**
 * Собирает незагруженные аниме из сильных связей всех аниме компоненты.
 * Дедуплицирует по targetShikimoriId.
 */
function collectMissingAnimes(
  component: AnimeWithFranchise[],
  allLoadedShikimoriIds: Set<number>
): AnimeRelationInfo[] {
  const seen = new Set<number>()
  const missing: AnimeRelationInfo[] = []

  for (const anime of component) {
    if (!anime.sourceRelations) {
      continue
    }
    for (const rel of anime.sourceRelations) {
      if (!STRONG_RELATION_KINDS.has(rel.relationKind)) {
        continue
      }
      if (rel.targetAnimeId != null) {
        continue
      } // загружено — не missing
      if (allLoadedShikimoriIds.has(rel.targetShikimoriId)) {
        continue
      } // есть в БД
      if (seen.has(rel.targetShikimoriId)) {
        continue
      } // дедупликация
      seen.add(rel.targetShikimoriId)
      missing.push(rel)
    }
  }

  return missing
}
