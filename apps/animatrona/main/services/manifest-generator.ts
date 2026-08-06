/**
 * Генератор манифестов для эпизодов
 * Создаёт JSON файл с метаданными для плеера
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

import type { Chapter as DemuxChapter, DemuxResult } from '../../shared/types'
import type {
  ChaptersDocument,
  EncodingDocument,
  EpisodeManifest,
  GenerateManifestOptions,
  GenerateManifestResult,
  MANIFEST_VERSION,
  ManifestAudioTrack,
  ManifestChapter,
  ManifestChapterType,
  ManifestEncodingInfo,
  ManifestSubtitleFont,
  ManifestSubtitleTrack,
  ManifestThumbnails,
  ManifestVideo,
  ThumbnailsDocument,
  TrackOverride,
} from '../../shared/types/manifest'
import { matchFonts } from './font-matcher'
import { addBytes } from './ipfs/unixfs-service'
import { getFontsFromASS } from './subtitle-parser'

/**
 * Определяет тип главы по названию
 */
function detectChapterType(title: string): ManifestChapterType {
  const lowerTitle = title.toLowerCase()

  // Опенинг
  if (lowerTitle.includes('open') || lowerTitle.includes('op') || lowerTitle.includes('opening')) {
    return 'op'
  }

  // Эндинг
  if (lowerTitle.includes('end') || lowerTitle.includes('ed') || lowerTitle.includes('ending')) {
    return 'ed'
  }

  // Рекап
  if (lowerTitle.includes('recap') || lowerTitle.includes('summary') || lowerTitle.includes('previous')) {
    return 'recap'
  }

  // Превью следующей серии
  if (lowerTitle.includes('preview') || lowerTitle.includes('next')) {
    return 'preview'
  }

  return 'chapter'
}

/**
 * Определяет, можно ли пропустить главу
 */
function isChapterSkippable(type: ManifestChapterType): boolean {
  return type === 'op' || type === 'ed' || type === 'recap' || type === 'preview'
}

/**
 * Конвертирует секунды в миллисекунды
 */
function secToMs(seconds: number): number {
  return Math.round(seconds * 1000)
}

/**
 * Преобразует каналы в строковый формат
 */
function formatChannels(channels: number): string {
  switch (channels) {
    case 1:
      return '1.0'
    case 2:
      return '2.0'
    case 6:
      return '5.1'
    case 8:
      return '7.1'
    default:
      return `${channels}.0`
  }
}

/**
 * Извлекает шрифты для ASS субтитров
 * Парсит ASS файл и сопоставляет с извлечёнными шрифтами из MKV
 */
function getSubtitleFonts(subtitlePath: string, fontsDir: string | null): ManifestSubtitleFont[] | undefined {
  // Только для ASS/SSA форматов
  const ext = path.extname(subtitlePath).toLowerCase()
  if (ext !== '.ass' && ext !== '.ssa') {
    return undefined
  }

  // Если нет папки шрифтов — нечего сопоставлять
  if (!fontsDir || !fs.existsSync(fontsDir)) {
    return undefined
  }

  try {
    // Получаем имена шрифтов из ASS файла
    const fontNames = getFontsFromASS(subtitlePath)
    if (fontNames.length === 0) {
      return undefined
    }

    // Сопоставляем с файлами шрифтов
    const matchedPaths = matchFonts(fontsDir, fontNames)
    if (matchedPaths.length === 0) {
      return undefined
    }

    // Преобразуем в ManifestSubtitleFont[]
    // matchFonts возвращает пути, нужно извлечь имена
    return matchedPaths.map((fontPath) => ({
      name: path.basename(fontPath, path.extname(fontPath)),
      path: fontPath,
    }))
  } catch {
    // Ошибка парсинга — возвращаем undefined
    return undefined
  }
}

/**
 * Находит переопределение для дорожки по streamIndex
 */
function findTrackOverride(overrides: TrackOverride[] | undefined, streamIndex: number): TrackOverride | undefined {
  return overrides?.find((o) => o.streamIndex === streamIndex)
}

/**
 * Генерирует манифест из результатов demux
 */
export async function generateManifestFromDemux(
  demuxResult: DemuxResult,
  options: GenerateManifestOptions,
): Promise<GenerateManifestResult> {
  try {
    const { episodeId, outputDir, animeInfo, audioTrackOverrides, subtitleTrackOverrides } = options

    // Проверяем наличие видео
    if (!demuxResult.video) {
      return { success: false, error: 'Видеопоток не найден в результатах demux' }
    }

    // Генерируем информацию о видео
    const video: ManifestVideo = {
      path: demuxResult.video.path,
      durationMs: secToMs(demuxResult.video.duration),
      width: demuxResult.video.width,
      height: demuxResult.video.height,
      codec: demuxResult.video.codec,
      bitrate: demuxResult.video.bitrate,
    }

    // Генерируем аудиодорожки с применением переопределений из UI
    const audioTracks: ManifestAudioTrack[] = demuxResult.audioTracks.map((track, index) => {
      const override = findTrackOverride(audioTrackOverrides, track.index)
      return {
        id: `audio-${track.index}`,
        streamIndex: track.index,
        // Приоритет: override > demuxResult > fallback
        language: override?.language || track.language || 'und',
        title: track.title || `Audio ${index + 1}`,
        codec: track.codec,
        channels: formatChannels(track.channels),
        bitrate: track.bitrate,
        isDefault: index === 0, // Первая дорожка по умолчанию
        extractedPath: track.path,
        // Пути к транскодированным файлам будут обновлены позже из БД
        transcodedPath: undefined,
        // Статус по умолчанию — queued, будет обновлён после транскодирования
        transcodeStatus: 'queued' as const,
        // Группа озвучки из UI (AniDUB, AniLibria и т.д.)
        dubGroup: override?.dubGroup,
      }
    })

    // Генерируем субтитры с шрифтами и переопределениями из UI
    const subtitleTracks: ManifestSubtitleTrack[] = demuxResult.subtitles.map((track, index) => {
      const override = findTrackOverride(subtitleTrackOverrides, track.index)
      return {
        id: `sub-${track.index}`,
        streamIndex: track.index,
        // Приоритет: override > demuxResult > fallback
        language: override?.language || track.language || 'und',
        title: track.title || `Subtitles ${index + 1}`,
        format: track.format,
        filePath: track.path,
        isDefault: index === 0,
        // Извлекаем шрифты из ASS файлов и сопоставляем с fontsDir
        fonts: getSubtitleFonts(track.path, demuxResult.fontsDir),
        // Группа субтитров из UI (HorribleSubs, FanSub Team и т.д.)
        dubGroup: override?.dubGroup,
      }
    })

    // Генерируем главы и загружаем в IPFS как отдельный ChaptersDocument
    const chapters: ManifestChapter[] = demuxResult.metadata.chapters.map((chapter: DemuxChapter) => {
      const type = detectChapterType(chapter.title)
      return {
        startMs: secToMs(chapter.start),
        endMs: secToMs(chapter.end),
        title: chapter.title,
        type,
        skippable: isChapterSkippable(type),
      }
    })

    let chaptersCid: string | undefined
    if (chapters.length > 0) {
      const chaptersDoc: ChaptersDocument = { version: 1, chapters }
      // pin: false — попадёт в directoryCid через episode manifest
      chaptersCid = await addBytes(Buffer.from(JSON.stringify(chaptersDoc), 'utf-8'), { pin: false })
    }

    // Собираем манифест
    const manifest: EpisodeManifest = {
      version: 1 as typeof MANIFEST_VERSION,
      episodeId,
      info: animeInfo,
      video,
      audioTracks,
      subtitleTracks,
      chapters: [], // Инлайн главы пустые — используется chaptersCid
      chaptersCid,
      // metadataCid записывается при регенерации манифестов (после загрузки metadata.json в IPFS)
      // thumbnails и navigation обновляются после генерации через updateManifest*
      generatedAt: new Date().toISOString(),
    }

    // Записываем манифест в файл
    const manifestFileName = 'manifest.json'
    const manifestPath = path.join(outputDir, manifestFileName)

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')

    return {
      success: true,
      manifestPath,
      manifest,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Читает существующий манифест
 */
export function readManifest(manifestPath: string): EpisodeManifest | null {
  try {
    if (!fs.existsSync(manifestPath)) {
      return null
    }

    const content = fs.readFileSync(manifestPath, 'utf-8')
    return JSON.parse(content) as EpisodeManifest
  } catch {
    return null
  }
}

/**
 * Обновляет навигацию в манифесте
 */
export function updateManifestNavigation(manifestPath: string, navigation: EpisodeManifest['navigation']): boolean {
  try {
    const manifest = readManifest(manifestPath)
    if (!manifest) {
      return false
    }

    manifest.navigation = navigation
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')
    return true
  } catch {
    return false
  }
}

/**
 * Обновляет thumbnails в манифесте
 * Создаёт ThumbnailsDocument в IPFS, записывает thumbnailsCid в манифест, очищает inline thumbnails
 */
export async function updateManifestThumbnails(manifestPath: string, thumbnails: ManifestThumbnails): Promise<boolean> {
  try {
    const manifest = readManifest(manifestPath)
    if (!manifest || !thumbnails) {
      return false
    }

    // Создаём ThumbnailsDocument и загружаем в IPFS
    const doc: ThumbnailsDocument = { version: 1, thumbnails }
    // pin: false — thumbnailsCid попадёт в directoryCid через episode manifest
    const thumbnailsCid = await addBytes(Buffer.from(JSON.stringify(doc), 'utf-8'), { pin: false })

    // Записываем CID, очищаем inline
    manifest.thumbnailsCid = thumbnailsCid
    delete manifest.thumbnails
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')
    return true
  } catch {
    return false
  }
}

/**
 * Обновляет информацию о кодировании в манифесте
 * Создаёт EncodingDocument в IPFS, записывает encodingCid в манифест, очищает inline encoding
 */
export async function updateManifestEncoding(manifestPath: string, encoding: ManifestEncodingInfo): Promise<boolean> {
  try {
    const manifest = readManifest(manifestPath)
    if (!manifest || !encoding) {
      return false
    }

    // Создаём EncodingDocument и загружаем в IPFS
    const doc: EncodingDocument = { version: 1, encoding }
    // pin: false — encodingCid попадёт в directoryCid через episode manifest
    const encodingCid = await addBytes(Buffer.from(JSON.stringify(doc), 'utf-8'), { pin: false })

    // Записываем CID, очищаем inline
    manifest.encodingCid = encodingCid
    delete manifest.encoding
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')
    return true
  } catch {
    return false
  }
}

/**
 * Тип данных аудиодорожки из БД для перестройки манифеста
 */
interface DbAudioTrackData {
  streamIndex: number
  language: string | null
  title: string | null
  codec: string
  channels: string
  bitrate: number | null
  isDefault: boolean
  dubGroup: string | null
  transcodedCid: string | null
  ipfsSize?: number | null
}

/**
 * Тип данных субтитров из БД для перестройки манифеста
 */
interface DbSubtitleTrackData {
  streamIndex: number
  language: string | null
  title: string | null
  format: string
  isDefault: boolean
  dubGroup: string | null
  fileCid: string | null
  ipfsSize?: number | null
  fonts?: Array<{
    fontName: string
    fileCid: string | null
    fileExt: string
    ipfsSize?: number | null
  }>
}

/**
 * Полная перестройка аудио/субтитров в манифесте из данных БД
 *
 * Решает проблему дублирования: внешние дорожки (streamIndex = -1, -2, ...)
 * не matching'ются по streamIndex при merge-подходе. Полная перестройка
 * гарантирует уникальные id и корректные метаданные для каждой дорожки.
 *
 * Используется при первичном импорте (import-processor) и регенерации (episode-manifest-regen).
 */
export function rebuildManifestTracks(
  manifest: EpisodeManifest,
  dbAudioTracks: DbAudioTrackData[],
  dbSubtitleTracks: DbSubtitleTrackData[],
): { manifest: EpisodeManifest; changed: boolean } {
  let changed = false

  // Перестройка аудиодорожек — только дорожки с transcodedCid
  const newAudioTracks: ManifestAudioTrack[] = dbAudioTracks
    .filter((t) => t.transcodedCid)
    .map((t, i) => ({
      id: `audio-${i}`,
      streamIndex: t.streamIndex,
      language: t.language || 'und',
      title: t.title || `Audio ${i + 1}`,
      codec: t.codec,
      channels: t.channels,
      bitrate: t.bitrate ?? undefined,
      isDefault: t.isDefault,
      cid: t.transcodedCid!,
      dubGroup: t.dubGroup ?? undefined,
      // Сохраняем size из старого манифеста (match по CID) или из БД
      size: manifest.audioTracks.find((m) => m.cid === t.transcodedCid)?.size ?? (t.ipfsSize || undefined),
    }))

  // Сравниваем значимые поля (без size — он может быть undefined)
  const serializeAudio = (tracks: ManifestAudioTrack[]) =>
    JSON.stringify(
      tracks.map(({ id, streamIndex, language, title, codec, channels, bitrate, isDefault, cid, dubGroup }) => ({
        id,
        streamIndex,
        language,
        title,
        codec,
        channels,
        bitrate,
        isDefault,
        cid,
        dubGroup,
      })),
    )

  if (serializeAudio(manifest.audioTracks) !== serializeAudio(newAudioTracks)) {
    manifest.audioTracks = newAudioTracks
    changed = true
  }

  // Перестройка субтитров — только дорожки с fileCid
  const newSubtitleTracks: ManifestSubtitleTrack[] = dbSubtitleTracks
    .filter((t) => t.fileCid)
    .map((t, i) => ({
      id: `sub-${i}`,
      streamIndex: t.streamIndex,
      language: t.language || 'und',
      title: t.title || `Subtitles ${i + 1}`,
      format: t.format,
      isDefault: t.isDefault,
      cid: t.fileCid!,
      dubGroup: t.dubGroup ?? undefined,
      size: manifest.subtitleTracks.find((m) => m.cid === t.fileCid)?.size ?? (t.ipfsSize || undefined),
      fonts: t.fonts
        ?.filter((f) => f.fileCid)
        .map((f) => ({
          name: f.fontName,
          cid: f.fileCid!,
          fileExt: f.fileExt !== 'ttf' ? f.fileExt : undefined,
          size: manifest.subtitleTracks.flatMap((m) => m.fonts ?? []).find((mf) => mf.cid === f.fileCid)?.size
            ?? (f.ipfsSize || undefined),
        })),
    }))

  const serializeSub = (tracks: ManifestSubtitleTrack[]) =>
    JSON.stringify(
      tracks.map(({ id, streamIndex, language, title, format, isDefault, cid, dubGroup }) => ({
        id,
        streamIndex,
        language,
        title,
        format,
        isDefault,
        cid,
        dubGroup,
      })),
    )

  if (serializeSub(manifest.subtitleTracks) !== serializeSub(newSubtitleTracks)) {
    manifest.subtitleTracks = newSubtitleTracks
    changed = true
  }

  return { manifest, changed }
}

/**
 * Перестраивает аудио/субтитры в локальном файле манифеста из данных БД
 *
 * Используется в import-processor перед загрузкой манифеста в IPFS.
 * Возвращает true если были изменения.
 */
export function rebuildManifestTracksFromFile(
  manifestPath: string,
  dbAudioTracks: DbAudioTrackData[],
  dbSubtitleTracks: DbSubtitleTrackData[],
): boolean {
  const manifest = readManifest(manifestPath)
  if (!manifest) {
    return false
  }

  const { changed } = rebuildManifestTracks(manifest, dbAudioTracks, dbSubtitleTracks)

  if (changed) {
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')
  }

  return changed
}

/**
 * Обновляет CID'ы медиафайлов в манифесте перед загрузкой в IPFS
 *
 * Заменяет локальные пути (path, extractedPath, filePath) на CID'ы из IPFS.
 * Удаляет технические поля, не нужные для веб-плеера (transcodeStatus, путевые поля).
 */
export function updateManifestMediaCids(
  manifestPath: string,
  options: {
    /** CID транскодированного видео */
    videoCid?: string
    /** CID'ы аудиодорожек: map trackId -> cid */
    audioTrackCids?: Record<string, string>
    /** Кодеки аудиодорожек после транскодирования: map trackId -> codec */
    audioTrackCodecs?: Record<string, string>
    /** Каналы аудиодорожек: map trackId -> channels */
    audioTrackChannels?: Record<string, string>
    /** CID'ы субтитров: map trackId -> cid */
    subtitleTrackCids?: Record<string, string>
    /** CID'ы шрифтов: map fontName -> cid */
    fontCids?: Record<string, string>
    /** Размеры файлов: map CID -> size в байтах */
    sizes?: Record<string, number>
    /** CID metadata.json исходника в IPFS */
    metadataCid?: string
  },
): boolean {
  try {
    const manifest = readManifest(manifestPath)
    if (!manifest) {
      return false
    }

    // Записываем metadataCid исходника
    if (options.metadataCid) {
      manifest.metadataCid = options.metadataCid
    }

    // Обновляем video CID и очищаем локальный путь
    if (options.videoCid) {
      manifest.video.cid = options.videoCid
      if (options.sizes?.[options.videoCid]) {
        manifest.video.size = options.sizes[options.videoCid]
      }
      // Удаляем локальный путь — он не нужен для веб-плеера
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- очистка лишних полей
      delete (manifest.video as any).path
    }

    // Обновляем аудиодорожки
    if (options.audioTrackCids) {
      for (const track of manifest.audioTracks) {
        const cid = options.audioTrackCids[track.id]
        if (cid) {
          track.cid = cid
          if (options.sizes?.[cid]) {
            track.size = options.sizes[cid]
          }
          // Обновляем кодек и каналы на актуальные (после транскодирования)
          const codec = options.audioTrackCodecs?.[track.id]
          if (codec) {
            track.codec = codec
          }
          const channels = options.audioTrackChannels?.[track.id]
          if (channels) {
            track.channels = channels
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- очистка лишних полей
          const t = track as any
          delete t.extractedPath
          delete t.transcodedPath
          delete t.transcodeStatus
        }
      }
    }

    // Обновляем субтитры
    if (options.subtitleTrackCids) {
      for (const track of manifest.subtitleTracks) {
        const cid = options.subtitleTrackCids[track.id]
        if (cid) {
          track.cid = cid
          if (options.sizes?.[cid]) {
            track.size = options.sizes[cid]
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- очистка лишних полей
          delete (track as any).filePath
        }
      }
    }

    // Обновляем шрифты
    if (options.fontCids) {
      for (const track of manifest.subtitleTracks) {
        if (track.fonts) {
          for (const font of track.fonts) {
            const cid = options.fontCids[font.name]
            if (cid) {
              font.cid = cid
              if (options.sizes?.[cid]) {
                font.size = options.sizes[cid]
              }
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- очистка лишних полей
              delete (font as any).path
            }
          }
        }
      }
    }

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')
    return true
  } catch {
    return false
  }
}
