/**
 * IPC handlers для работы с франшизами
 *
 * Синхронизация связей между аниме из Shikimori API
 */

import type { ShikimoriRelationKind } from '../services/shikimori'
import { getAnimeWithRelated } from '../services/shikimori'
import {
  clearFranchiseCache,
  getFranchiseGraph,
  getFranchiseName,
  getRootShikimoriId,
} from '../services/shikimori/franchise-api'
import { createHandler } from '../utils/ipc-handler-factory'

/** Маппинг типов связей Shikimori -> наши enum'ы */
const RELATION_KIND_MAP: Record<ShikimoriRelationKind, string> = {
  sequel: 'SEQUEL',
  prequel: 'PREQUEL',
  side_story: 'SIDE_STORY',
  parent_story: 'PARENT_STORY',
  summary: 'SUMMARY',
  full_story: 'FULL_STORY',
  spin_off: 'SPIN_OFF',
  adaptation: 'ADAPTATION',
  character: 'CHARACTER',
  alternative_version: 'ALTERNATIVE_VERSION',
  alternative_setting: 'ALTERNATIVE_SETTING',
  other: 'OTHER',
}

/** Данные о связанном аниме для сохранения в БД */
export interface RelatedAnimeData {
  shikimoriId: number
  relationKind: string
  name: string | null
  posterUrl: string | null
  year: number | null
  kind: string | null
}

/**
 * Регистрирует IPC handlers для работы с франшизами
 */
export function registerFranchiseHandlers(): void {
  // Получить связанные аниме из Shikimori по ID
  createHandler('franchise:fetchRelated', async (shikimoriId: number) => {
    const animeWithRelated = await getAnimeWithRelated(shikimoriId)
    if (!animeWithRelated) {
      throw new Error('Аниме не найдено на Shikimori')
    }

    // Преобразуем данные из Shikimori в формат для БД
    const relatedAnimes: RelatedAnimeData[] = []

    for (const related of animeWithRelated.related) {
      // Пропускаем манга и музыкальные видео
      if (!related.anime || related.anime.kind === 'music') {
        continue
      }

      const relationKind = RELATION_KIND_MAP[related.relationKind] || 'OTHER'

      relatedAnimes.push({
        shikimoriId: parseInt(related.anime.id, 10),
        relationKind,
        name: related.anime.russian || related.anime.name,
        posterUrl: related.anime.poster?.mainUrl || null,
        year: related.anime.airedOn?.year || null,
        kind: related.anime.kind || null,
      })
    }

    return {
      sourceAnime: {
        shikimoriId: parseInt(animeWithRelated.id, 10),
        name: animeWithRelated.russian || animeWithRelated.name,
        franchise: animeWithRelated.franchise,
      },
      relatedAnimes,
    }
  })

  // Получить граф франшизы из REST API Shikimori
  createHandler('franchise:fetchGraph', async (shikimoriId: number) => {
    const graph = await getFranchiseGraph(shikimoriId)
    if (!graph) {
      return { graph: null, message: 'Аниме не имеет франшизы' }
    }

    return {
      graph,
      rootShikimoriId: getRootShikimoriId(graph),
      franchiseName: getFranchiseName(graph),
    }
  })

  // Очистить кэш графов франшиз
  createHandler('franchise:clearCache', () => clearFranchiseCache())
}
