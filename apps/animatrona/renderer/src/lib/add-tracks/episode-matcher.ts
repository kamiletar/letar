/**
 * Матчинг файлов донора с эпизодами библиотеки
 *
 * Сопоставляет файлы из папки-донора с существующими эпизодами
 * по номеру эпизода, извлечённому из имени файла.
 */

/**
 * Кросс-платформенный basename — работает с / и \ на всех платформах
 * (path.basename в браузере/Next.js не понимает Windows backslashes)
 */
function crossPlatformBasename(filePath: string): string {
  return filePath.split(/[/\\]/).pop() || filePath
}

/**
 * Кросс-платформенный extname
 */
function crossPlatformExtname(filePath: string): string {
  const basename = crossPlatformBasename(filePath)
  const lastDot = basename.lastIndexOf('.')
  return lastDot > 0 ? basename.slice(lastDot) : ''
}

/** Типы файлов донора */
export type DonorFileType = 'video' | 'audio' | 'subtitle'

/** Тип контента: серия или спешл */
export type ContentType = 'series' | 'special' | 'unknown'

/** Файл из папки-донора */
export interface DonorFile {
  /** Полный путь к файлу */
  path: string
  /** Имя файла */
  name: string
  /** Номер эпизода (null если не удалось определить) */
  episodeNumber: number | null
  /** Тип файла */
  type: DonorFileType
  /** Расширение файла */
  extension: string
  /** Тип контента: серия или спешл */
  contentType: ContentType
  /** Название группы озвучки (имя папки-дублёра) */
  dubGroup: string | null
}

/** Результат сопоставления */
export interface EpisodeMatch {
  /** Файл донора */
  donorFile: DonorFile
  /** Целевой эпизод (null если не найден) */
  targetEpisode: { id: string; number: number } | null
  /** Уверенность сопоставления */
  confidence: 'auto' | 'manual' | 'unmatched'
}

/** Расширения видеофайлов */
const VIDEO_EXTENSIONS = new Set(['.mkv', '.mp4', '.avi', '.webm', '.m4v', '.mov'])

/** Расширения аудиофайлов */
const AUDIO_EXTENSIONS = new Set(['.mp3', '.aac', '.flac', '.opus', '.m4a', '.wav', '.ogg', '.ac3', '.dts', '.mka'])

/** Расширения субтитров */
const SUBTITLE_EXTENSIONS = new Set(['.ass', '.ssa', '.srt', '.vtt', '.sub'])

import { parseEpisodeNumber } from '../parse-filename'

// Реэкспорт как extractEpisodeNumber для обратной совместимости
export { parseEpisodeNumber as extractEpisodeNumber } from '../parse-filename'

/**
 * Определить тип контента: серия, спешл или неизвестно
 *
 * Паттерны:
 * - serija, serii, серия → series
 * - speshl, special, спешл, OVA, спецвыпуск → special
 */
export function detectContentType(fileName: string): ContentType {
  const lowerName = fileName.toLowerCase()

  // Паттерны для серий
  if (/serija|serii|серия|episode|эпизод/i.test(lowerName)) {
    return 'series'
  }

  // Паттерны для спешлов/OVA
  if (/speshl|special|спешл|ova|овa|спецвыпуск|oad|ona|\bsp\d/i.test(lowerName)) {
    return 'special'
  }

  return 'unknown'
}

/**
 * Определить тип файла по расширению
 */
export function getFileType(fileName: string): DonorFileType | null {
  const ext = crossPlatformExtname(fileName).toLowerCase()

  if (VIDEO_EXTENSIONS.has(ext)) {
    return 'video'
  }
  if (AUDIO_EXTENSIONS.has(ext)) {
    return 'audio'
  }
  if (SUBTITLE_EXTENSIONS.has(ext)) {
    return 'subtitle'
  }

  return null
}

/**
 * Создать DonorFile из пути к файлу
 *
 * @param filePath Полный путь к файлу
 * @param dubGroup Название группы озвучки (имя папки-дублёра)
 */
export function createDonorFile(filePath: string, dubGroup: string | null = null): DonorFile | null {
  const name = crossPlatformBasename(filePath)
  const extension = crossPlatformExtname(filePath).toLowerCase()
  const type = getFileType(filePath)

  if (!type) {
    return null
  }

  return {
    path: filePath,
    name,
    episodeNumber: parseEpisodeNumber(name),
    type,
    extension,
    contentType: detectContentType(name),
    dubGroup,
  }
}

/**
 * Сопоставить файлы донора с эпизодами библиотеки
 *
 * Автоматически матчит по номеру эпизода.
 * Возвращает список с результатами сопоставления.
 */
export function matchDonorFilesToEpisodes(
  donorFiles: DonorFile[],
  libraryEpisodes: Array<{ id: string; number: number }>
): EpisodeMatch[] {
  // Создаём карту: номер эпизода → эпизод
  const episodeMap = new Map<number, { id: string; number: number }>()
  for (const ep of libraryEpisodes) {
    episodeMap.set(ep.number, ep)
  }

  return donorFiles.map((donorFile) => {
    // Если номер эпизода не определён — unmatched
    if (donorFile.episodeNumber === null) {
      return {
        donorFile,
        targetEpisode: null,
        confidence: 'unmatched' as const,
      }
    }

    // Ищем эпизод с таким номером
    const targetEpisode = episodeMap.get(donorFile.episodeNumber) ?? null

    return {
      donorFile,
      targetEpisode,
      confidence: targetEpisode ? ('auto' as const) : ('unmatched' as const),
    }
  })
}

/**
 * Обновить сопоставление вручную
 */
export function updateMatch(
  matches: EpisodeMatch[],
  donorFilePath: string,
  targetEpisode: { id: string; number: number } | null
): EpisodeMatch[] {
  return matches.map((match) => {
    if (match.donorFile.path !== donorFilePath) {
      return match
    }

    return {
      ...match,
      targetEpisode,
      confidence: targetEpisode ? 'manual' : 'unmatched',
    }
  })
}

/**
 * Проверить, все ли файлы сопоставлены
 */
export function allFilesMatched(matches: EpisodeMatch[]): boolean {
  return matches.every((m) => m.targetEpisode !== null)
}

/**
 * Получить статистику сопоставления
 */
export function getMatchStats(matches: EpisodeMatch[]) {
  const total = matches.length
  const matched = matches.filter((m) => m.targetEpisode !== null).length
  const unmatched = total - matched
  const auto = matches.filter((m) => m.confidence === 'auto').length
  const manual = matches.filter((m) => m.confidence === 'manual').length

  return { total, matched, unmatched, auto, manual }
}
