/**
 * Дедупликация AudioTrack / SubtitleTrack
 *
 * Удаляет дубли дорожек, появившиеся до добавления dedup-логики:
 * - Аудио с CID: группировка по (episodeId, transcodedCid) → MIN(id)
 * - Аудио без CID: группировка по (episodeId, streamIndex, dubGroup) → MIN(id)
 * - Субтитры с CID: группировка по (episodeId, fileCid) → MIN(id)
 * - Субтитры без CID: группировка по (episodeId, streamIndex, dubGroup) → MIN(id)
 *
 * После удаления subtitle tracks чистятся осиротевшие шрифты.
 *
 * NB: unique constraint в schema не добавляем — streamIndex не уникален
 * для разных озвучек. Дедуп — явная операция по кнопке в Settings.
 */

import { prisma } from '../utils/db'
import { createModuleLogger } from '../utils/logger'

const log = createModuleLogger('TrackDedup')

/** Результат дедупликации */
export interface DedupResult {
  /** Удалено аудио-дорожек */
  audioRemoved: number
  /** Удалено субтитровых дорожек */
  subtitlesRemoved: number
  /** Удалено осиротевших шрифтов */
  fontsRemoved: number
}

/**
 * Выполнить дедупликацию всех дорожек в БД.
 *
 * Возвращает количество удалённых записей по каждому типу.
 */
export async function deduplicateTracks(): Promise<DedupResult> {
  log.info('Начало дедупликации дорожек')

  // Считаем до
  const beforeAudio = await prisma.audioTrack.count()
  const beforeSubs = await prisma.subtitleTrack.count()
  const beforeFonts = await prisma.subtitleFont.count()

  // --- Audio с CID: дубликаты по (episodeId, transcodedCid) ---
  await prisma.$executeRawUnsafe(`
    DELETE FROM "AudioTrack" WHERE id NOT IN (
      SELECT MIN(id) FROM "AudioTrack"
      WHERE transcodedCid IS NOT NULL
      GROUP BY episodeId, transcodedCid
    ) AND transcodedCid IS NOT NULL
  `)

  // --- Audio без CID: по (episodeId, streamIndex, dubGroup) ---
  await prisma.$executeRawUnsafe(`
    DELETE FROM "AudioTrack" WHERE id NOT IN (
      SELECT MIN(id) FROM "AudioTrack"
      WHERE transcodedCid IS NULL
      GROUP BY episodeId, streamIndex, COALESCE(dubGroup, '')
    ) AND transcodedCid IS NULL
  `)

  // --- Subtitles с CID: по (episodeId, fileCid) ---
  await prisma.$executeRawUnsafe(`
    DELETE FROM "SubtitleTrack" WHERE id NOT IN (
      SELECT MIN(id) FROM "SubtitleTrack"
      WHERE fileCid IS NOT NULL
      GROUP BY episodeId, fileCid
    ) AND fileCid IS NOT NULL
  `)

  // --- Subtitles без CID: по (episodeId, streamIndex, dubGroup) ---
  await prisma.$executeRawUnsafe(`
    DELETE FROM "SubtitleTrack" WHERE id NOT IN (
      SELECT MIN(id) FROM "SubtitleTrack"
      WHERE fileCid IS NULL
      GROUP BY episodeId, streamIndex, COALESCE(dubGroup, '')
    ) AND fileCid IS NULL
  `)

  // --- Осиротевшие шрифты (subtitleTrack удалён) ---
  await prisma.$executeRawUnsafe(`
    DELETE FROM "SubtitleFont" WHERE subtitleTrackId NOT IN (
      SELECT id FROM "SubtitleTrack"
    )
  `)

  // Считаем после
  const afterAudio = await prisma.audioTrack.count()
  const afterSubs = await prisma.subtitleTrack.count()
  const afterFonts = await prisma.subtitleFont.count()

  const result: DedupResult = {
    audioRemoved: beforeAudio - afterAudio,
    subtitlesRemoved: beforeSubs - afterSubs,
    fontsRemoved: beforeFonts - afterFonts,
  }

  log.info('Дедупликация завершена', {
    ...result,
    before: { audio: beforeAudio, subs: beforeSubs, fonts: beforeFonts },
    after: { audio: afterAudio, subs: afterSubs, fonts: afterFonts },
  })

  return result
}
