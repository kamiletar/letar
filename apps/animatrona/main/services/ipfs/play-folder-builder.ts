/**
 * PlayFolderBuilder — сборка папки `play/` внутри directoryCid аниме
 *
 * Переиспользует standalone Web Player (index.html + SubtitlesOctopus lib), уже
 * реализованный для ручного экспорта (`web-export/asset-bundler.ts`), но встраивает его
 * прямо в основной directoryCid каждого аниме — так что для просмотра достаточно
 * IPFS-гейтвея и directoryCid, без отдельного шага экспорта.
 *
 * Манифест строится в режиме `referenced` — все src в манифесте это голые CID, плеер
 * резолвит их через gateway независимо от того, где сам плеер лежит в дереве директории.
 * Поэтому play/episodes/NN/video.webm внутри play/ ссылается на тот же CID, что и
 * ../episodes/NN/video.webm в основном дереве — IPFS не дублирует блоки, только лишняя
 * запись в directory listing.
 */

import type { ChaptersDocument } from '@letar/animatrona-types'
import type { NamingPattern } from '../../../shared/types/export'
import type { QueueEpisodeExportData, QueueExportConfig } from '../../../shared/types/export-queue'
import { resolveTrackKey } from '../../../shared/types/track-key'
import { createModuleLogger } from '../../utils/logger'
import { buildDirectoryStructure } from '../web-export/asset-bundler'
import { generateManifest } from '../web-export/manifest-generator'
import type { DirEntry } from './unified-ipfs-service'
import { safeCat } from './unified-ipfs-service'

const log = createModuleLogger('PlayFolderBuilder')

/** Минимальные данные, нужные для сборки play/ — структурно совместимо с Prisma-результатом */
interface PlayFolderAnime {
  name: string
  originalName?: string | null
  year?: number | null
  posterCid?: string | null
  poster?: { cid: string | null } | null
  episodes: Array<{
    id: string
    number: number
    name?: string | null
    durationMs?: number | null
    transcodedCid?: string | null
    season?: { number: number } | null
    audioTracks: Array<{
      language: string
      title?: string | null
      dubGroup?: string | null
      transcodedCid?: string | null
      streamIndex: number
      isDefault: boolean
    }>
    subtitleTracks: Array<{
      language: string
      title?: string | null
      dubGroup?: string | null
      fileCid?: string | null
      format?: string | null
      streamIndex: number
      isDefault: boolean
      fonts: Array<{ fileCid: string | null }>
    }>
  }>
}

/**
 * Читает ChaptersDocument по CID (уже пробитый/восстановленный в pre-pass'е
 * anime-directory-builder.ts — chapters.json и так уже часть directoryCid, тут только
 * читаем содержимое, никакой новый контент не пинится).
 */
async function readChapters(chaptersCid: string): Promise<ChaptersDocument['chapters'] | undefined> {
  try {
    const content = await safeCat(chaptersCid, 8_000)
    if (!content) {
      return undefined
    }
    const doc = JSON.parse(content.toString('utf-8')) as ChaptersDocument
    return doc.chapters
  } catch (error) {
    log.warn('Не удалось прочитать ChaptersDocument для play/', {
      chaptersCid,
      error: error instanceof Error ? error.message : String(error),
    })
    return undefined
  }
}

/**
 * Строит DirEntry[] для папки `play/` (standalone-плеер) из уже загруженных данных аниме.
 *
 * Возвращает null если ни у одного эпизода нет загруженного видео — играть нечего.
 */
export async function buildPlayFolderEntries(
  anime: PlayFolderAnime,
  chaptersByEp?: Map<string, string>,
): Promise<DirEntry | null> {
  const episodesWithVideo = anime.episodes.filter((ep) => !!ep.transcodedCid)
  if (episodesWithVideo.length === 0) {
    return null
  }

  const episodes: QueueEpisodeExportData[] = await Promise.all(
    episodesWithVideo.map(async (ep) => {
      const chaptersCid = chaptersByEp?.get(ep.id)
      // generateManifest() читает ep.chapters.length без null-проверки — всегда массив, не undefined
      const chapters = (chaptersCid ? await readChapters(chaptersCid) : undefined) ?? []

      return {
        id: ep.id,
        number: ep.number,
        seasonNumber: ep.season?.number ?? 1,
        name: ep.name ?? undefined,
        durationMs: ep.durationMs ?? undefined,
        videoCid: ep.transcodedCid!,
        audioTracks: ep.audioTracks
          .filter((t) => t.transcodedCid)
          .map((t) => ({
            language: t.language,
            title: t.title ?? t.dubGroup ?? null,
            transcodedCid: t.transcodedCid!,
            streamIndex: t.streamIndex,
          })),
        subtitleTracks: ep.subtitleTracks
          .filter((t) => t.fileCid)
          .map((t) => ({
            language: t.language,
            title: t.title ?? t.dubGroup ?? null,
            format: t.format,
            fileCid: t.fileCid!,
            fontCids: t.fonts.map((f) => f.fileCid).filter((cid): cid is string => !!cid),
          })),
        chapters,
      } satisfies QueueEpisodeExportData
    }),
  )

  // Все ключи дорожек по всем эпизодам — плеер сам решает, какие показать для конкретной серии
  const audioKeys = new Set<string>()
  const subtitleKeys = new Set<string>()
  let defaultAudioKey: string | undefined
  let defaultSubtitleKey: string | undefined

  for (const ep of episodesWithVideo) {
    for (const t of ep.audioTracks) {
      if (!t.transcodedCid) {
        continue
      }
      const key = resolveTrackKey(t.language, t.title, t.dubGroup)
      audioKeys.add(key)
      if (t.isDefault && !defaultAudioKey) {
        defaultAudioKey = key
      }
    }
    for (const t of ep.subtitleTracks) {
      if (!t.fileCid) {
        continue
      }
      const key = resolveTrackKey(t.language, t.title, t.dubGroup)
      subtitleKeys.add(key)
      if (t.isDefault && !defaultSubtitleKey) {
        defaultSubtitleKey = key
      }
    }
  }

  const config: QueueExportConfig = {
    animeName: anime.name,
    originalName: anime.originalName ?? undefined,
    year: anime.year ?? undefined,
    outputDir: '',
    namingPattern: '{Anime} - {nn}' satisfies NamingPattern,
    posterCid: anime.posterCid ?? anime.poster?.cid ?? undefined,
    episodes,
    selectedAudioKeys: [...audioKeys],
    selectedSubtitleKeys: [...subtitleKeys],
  }

  const selectedEpisodes = episodes.map((ep) => ep.number)

  try {
    const manifest = generateManifest({
      config,
      mode: 'referenced',
      selectedEpisodes,
      defaultAudioKey,
      defaultSubtitleKey,
    })

    const children = await buildDirectoryStructure(config, selectedEpisodes, manifest)

    return { name: 'play', type: 'directory', children }
  } catch (error) {
    log.warn('Не удалось собрать play/ — пропускаем, остальная директория не пострадает', {
      anime: anime.name,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}
