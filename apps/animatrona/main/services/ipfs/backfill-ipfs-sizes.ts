/**
 * Backfill ipfsSize — заполнение размеров для существующих файлов в IPFS
 *
 * Вызывается при регенерации манифестов (кнопка "Перегенерировать манифесты").
 * Для каждого файла с CID, но без ipfsSize, вызывает stat() и сохраняет размер в БД.
 */

import { prisma } from '../../utils/db'
import { createModuleLogger } from '../../utils/logger'
import { stat } from './unified-ipfs-service'

const log = createModuleLogger('BackfillIpfsSizes')

/**
 * Заполнить ipfsSize для всех медиафайлов аниме, у которых есть CID но нет ipfsSize
 */
export async function backfillIpfsSizes(animeId: string): Promise<void> {
  let updated = 0

  // Эпизоды (видео)
  const episodes = await prisma.episode.findMany({
    where: { animeId, transcodedCid: { not: null }, ipfsSize: null },
    select: { id: true, transcodedCid: true },
  })
  for (const ep of episodes) {
    try {
      const s = await stat(ep.transcodedCid!)
      await prisma.episode.update({ where: { id: ep.id }, data: { ipfsSize: s.size } })
      updated++
    } catch {
      /* файл может быть недоступен */
    }
  }

  // Аудиодорожки
  const audioTracks = await prisma.audioTrack.findMany({
    where: { episode: { animeId }, transcodedCid: { not: null }, ipfsSize: null },
    select: { id: true, transcodedCid: true },
  })
  for (const track of audioTracks) {
    try {
      const s = await stat(track.transcodedCid!)
      await prisma.audioTrack.update({ where: { id: track.id }, data: { ipfsSize: s.size } })
      updated++
    } catch {
      /* файл может быть недоступен */
    }
  }

  // Субтитры
  const subTracks = await prisma.subtitleTrack.findMany({
    where: { episode: { animeId }, fileCid: { not: null }, ipfsSize: null },
    select: { id: true, fileCid: true },
  })
  for (const track of subTracks) {
    try {
      const s = await stat(track.fileCid!)
      await prisma.subtitleTrack.update({ where: { id: track.id }, data: { ipfsSize: s.size } })
      updated++
    } catch {
      /* файл может быть недоступен */
    }
  }

  // Шрифты
  const fonts = await prisma.subtitleFont.findMany({
    where: { subtitleTrack: { episode: { animeId } }, fileCid: { not: null }, ipfsSize: null },
    select: { id: true, fileCid: true },
  })
  for (const font of fonts) {
    try {
      const s = await stat(font.fileCid!)
      await prisma.subtitleFont.update({ where: { id: font.id }, data: { ipfsSize: s.size } })
      updated++
    } catch {
      /* файл может быть недоступен */
    }
  }

  if (updated > 0) {
    log.info('Backfill ipfsSize завершён', { animeId, updated })
  }
}
