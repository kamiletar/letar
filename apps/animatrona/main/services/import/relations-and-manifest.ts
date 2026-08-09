/**
 * Финальные шаги импорта аниме: синхронизация связей/франшизы с Shikimori,
 * обновление навигации между эпизодами, публикация AnimeManifest (directoryCid).
 *
 * Выделено из import-service.ts — эти функции не используют состояние ImportService.
 */

import type { ImportQueueEntry } from '../../../shared/types/import-queue'
import { createModuleLogger } from '../../utils/logger'
import { updateAnimeManifest } from '../anime-manifest-generator'
import { getAnimeWithRelated } from '../shikimori/client'
import * as db from './import-db'

const log = createModuleLogger('ImportService')

export async function syncRelations(animeId: string, selectedAnime: ImportQueueEntry['selectedAnime']): Promise<void> {
  const shikimoriId = parseInt(selectedAnime.id, 10)
  if (!shikimoriId) {
    return
  }

  try {
    const animeWithRelated = await getAnimeWithRelated(shikimoriId)
    if (!animeWithRelated?.related?.length) {
      return
    }

    // Маппинг связей (как в franchise.handlers.ts)
    const RELATION_KIND_MAP: Record<string, string> = {
      sequel: 'SEQUEL',
      prequel: 'PREQUEL',
      side_story: 'SIDE_STORY',
      summary: 'SUMMARY',
      parent_story: 'PARENT_STORY',
      alternative_version: 'ALTERNATIVE_VERSION',
      alternative_setting: 'ALTERNATIVE_SETTING',
      spin_off: 'SPIN_OFF',
      full_story: 'FULL_STORY',
      other: 'OTHER',
    }

    const relatedAnimes: Array<{ shikimoriId: number; relationKind: string; name: string }> = []
    for (const related of animeWithRelated.related) {
      if (!related.anime || related.anime.kind === 'music') {
        continue
      }
      relatedAnimes.push({
        shikimoriId: parseInt(related.anime.id, 10),
        relationKind: RELATION_KIND_MAP[related.relationKind] || 'OTHER',
        name: related.anime.russian || related.anime.name,
      })
    }

    if (relatedAnimes.length === 0) {
      return
    }

    await db.syncAnimeRelations(
      animeId,
      relatedAnimes.map((r) => ({ targetShikimoriId: r.shikimoriId, relationKind: r.relationKind })),
    )

    // Франшиза
    const allIds = [shikimoriId, ...relatedAnimes.map((r) => r.shikimoriId)]
    const rootShikimoriId = Math.min(...allIds)
    try {
      const franchise = await db.upsertFranchise(rootShikimoriId, animeWithRelated.russian || animeWithRelated.name)
      await db.updateAnime(animeId, { franchiseId: franchise.id })
    } catch (franchiseError) {
      log.warn('Не удалось создать франшизу', { error: String(franchiseError) })
    }
  } catch (error) {
    log.warn('Ошибка синхронизации связей', { error: String(error) })
  }
}

export async function updateEpisodeNavigation(animeId: string): Promise<void> {
  try {
    const episodes = await db.findManyEpisodes(animeId)
    const episodesWithManifest = episodes.filter(
      (ep): ep is typeof ep & { manifestCid: string } => ep.manifestCid !== null,
    )

    if (episodesWithManifest.length < 2) {
      return
    }

    // Вызываем batch-операцию через manifest-generator напрямую
    // TODO: реализовать updateNavigationBatch в manifest-generator
    log.info(`updateEpisodeNavigation: ${episodesWithManifest.length} эпизодов`)
  } catch (error) {
    log.warn('Ошибка обновления навигации', { error: String(error) })
  }
}

export async function generateAndPublishAnimeManifest(
  animeId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateAnimeManifest(animeId)
    log.info('AnimeManifest опубликован')
    return { success: true }
  } catch (error) {
    const errorMessage = String(error)
    log.warn('Ошибка генерации AnimeManifest — directoryCid не обновлён, импорт продолжится без него', {
      animeId,
      error: errorMessage,
    })
    return { success: false, error: errorMessage }
  }
}
