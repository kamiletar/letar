/**
 * Создание глав (chapters) для эпизодов через IPFS
 * Портировано из renderer — window.electronAPI заменён на прямой вызов сервиса
 */

import type { Chapter, DemuxResult } from '../../../shared/types'
import type { ChaptersDocument, EpisodeManifest, ManifestChapter } from '../../../shared/types/manifest'
import { prisma } from '../../utils/db'
import { createModuleLogger } from '../../utils/logger'
import { addBytes, cat } from '../ipfs/unixfs-service'
import { detectChapterType, isChapterSkippable } from './helpers'

const log = createModuleLogger('ChapterCreator')

/**
 * Создаёт главы из результата demux и записывает в IPFS манифест
 *
 * @param episodeId — ID эпизода
 * @param demuxResult — Результат demux с метаданными
 * @returns true если главы содержат значимые типы (OP/ED/RECAP/PREVIEW)
 */
export async function createChapters(episodeId: string, demuxResult: DemuxResult): Promise<boolean> {
  if (!demuxResult.metadata?.chapters || demuxResult.metadata.chapters.length === 0) {
    return false
  }

  log.info(`Создаём ${demuxResult.metadata.chapters.length} глав для эпизода`, { episodeId })

  let hasSkippableChapter = false

  const chapters = demuxResult.metadata.chapters.map((chapter: Chapter) => {
    const type = detectChapterType(chapter.title)
    if (isChapterSkippable(chapter.title)) {
      hasSkippableChapter = true
    }
    return {
      startMs: Math.round(chapter.start * 1000),
      endMs: Math.round(chapter.end * 1000),
      title: chapter.title || null,
      type,
      skippable: isChapterSkippable(chapter.title),
    }
  })

  // Записываем главы в IPFS манифест напрямую (без IPC)
  try {
    await updateChaptersInManifest(episodeId, chapters)
    log.info(`Главы сохранены в IPFS, hasSkippable=${hasSkippableChapter}`, { episodeId })
  } catch (error) {
    log.error('Ошибка записи глав', { episodeId, error: String(error) })
    return false
  }

  return hasSkippableChapter
}

/**
 * Обновляет главы в IPFS манифесте эпизода
 * Портировано из manifest.handlers.ts → 'manifest:updateChapters'
 */
export async function updateChaptersInManifest(episodeId: string, chapters: ManifestChapter[]): Promise<void> {
  // Получаем текущий manifestCid
  const episode = await prisma.episode.findUnique({
    where: { id: episodeId },
    select: { manifestCid: true },
  })

  if (!episode?.manifestCid) {
    // Манифест ещё не создан — главы будут добавлены при генерации манифеста
    log.info('Манифест ещё не создан, пропускаем обновление глав', { episodeId })
    return
  }

  // 1. Создаём ChaptersDocument
  const chaptersDoc: ChaptersDocument = { version: 1, chapters }
  const chaptersJson = JSON.stringify(chaptersDoc)
  const chaptersCid = await addBytes(Buffer.from(chaptersJson, 'utf-8'))

  // 2. Читаем текущий манифест
  let manifestBuf: Buffer
  try {
    manifestBuf = await cat(episode.manifestCid)
  } catch (err) {
    log.warn('Не удалось прочитать манифест из IPFS для обновления глав', { episodeId, error: String(err) })
    return
  }

  let manifest: EpisodeManifest
  try {
    manifest = JSON.parse(manifestBuf.toString('utf-8'))
  } catch (err) {
    log.warn('Повреждённый JSON манифеста', { episodeId, error: String(err) })
    return
  }

  // 3. Обновляем манифест: ссылка на ChaptersDocument, очищаем инлайн
  manifest.chaptersCid = chaptersCid
  manifest.chapters = []

  // 4. Загружаем обновлённый манифест в IPFS
  const manifestJson = JSON.stringify(manifest, null, 2)
  const newManifestCid = await addBytes(Buffer.from(manifestJson, 'utf-8'))

  // 5. Обновляем CID в БД
  await prisma.episode.update({
    where: { id: episodeId },
    data: { manifestCid: newManifestCid },
  })
}
