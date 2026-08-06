/**
 * Сканер внешних аудиофайлов — поиск MKA/M4A/FLAC и др. в папках рядом с видео
 *
 * Поддерживает:
 * - Несколько папок аудио (Rus Sound/, Eng Dub/, Audio/ и т.д.)
 * - Fuzzy matching аудио к эпизодам по имени файла
 * - Получение информации о кодеке через FFprobe
 */

import { exec } from 'child_process'
import { readdir } from 'fs/promises'
import path from 'path'
import { promisify } from 'util'
import { scanDirectoryRecursive } from '../utils/fs-utils'
import { createModuleLogger } from '../utils/logger'

const log = createModuleLogger('AudioScanner')
const execAsync = promisify(exec)

/** Паттерны папок аудио (case-insensitive) */
const AUDIO_FOLDER_PATTERNS = [
  // Русские
  'rus sound',
  'rus audio',
  'rus dub',
  'russian',
  'озвучка',
  'рус',
  // Английские
  'eng sound',
  'eng audio',
  'eng dub',
  'english',
  // Японские
  'jpn sound',
  'jpn audio',
  'jpn dub',
  'japanese',
  'jap sound',
  'jap audio',
  'jap dub',
  // Общие
  'sound',
  'audio',
  'dub',
  'voices',
]

/** Расширения аудиофайлов */
const AUDIO_EXTENSIONS = new Set(['.mka', '.m4a', '.flac', '.opus', '.mp3', '.aac', '.wav', '.ogg', '.ac3', '.dts'])

/** Результат матчинга аудио */
export interface ExternalAudioMatch {
  /** Путь к файлу аудио */
  filePath: string
  /** Номер эпизода (null если не удалось определить) */
  episodeNumber: number | null
  /** Код языка (ru, en, ja, und) */
  language: string
  /** Название дорожки */
  title: string
  /** Название папки-группы (озвучки) */
  groupName: string
  /** Кодек (aac, opus, flac и т.д.) */
  codec: string
  /** Количество каналов (2, 6, 8) */
  channels: number
  /** Битрейт в bps */
  bitrate: number
}

/** Результат сканирования */
export interface ExternalAudioScanResult {
  /** Найденные папки аудио */
  audioDirs: string[]
  /** Сматченные аудиофайлы */
  audioTracks: ExternalAudioMatch[]
  /** Несматченные файлы (для warning в UI) */
  unmatchedFiles: string[]
}

/**
 * Извлечь имя группы из квадратных скобок в имени папки аудио
 * Например: "RUS Sound [badPuss]" → "badPuss", "[negaushi]" → "negaushi"
 *
 * Ищет ТОЛЬКО в basename папки, чтобы не подхватить скобки из родительского пути
 * (например [BDRip] или [1080p] из имени аниме)
 */
export function extractGroupNameFromAudioDir(audioDir: string): string | undefined {
  const baseName = path.basename(audioDir)
  const match = baseName.match(/\[([^\]]+)\]/)
  return match ? match[1].trim() : undefined
}

/**
 * Проверить является ли директория папкой аудио
 */
function isAudioFolder(dirName: string): boolean {
  const lower = dirName.toLowerCase()
  return AUDIO_FOLDER_PATTERNS.some((pattern) => lower.includes(pattern))
}

/**
 * Является ли директория подпапкой с аудио (любая подпапка не являющаяся корнем)
 * Используется когда явных паттернов нет, но есть подпапки с аудиофайлами
 */
function isAudioExtension(fileName: string): boolean {
  const ext = path.extname(fileName).toLowerCase()
  return AUDIO_EXTENSIONS.has(ext)
}

/** Результат матчинга с опциональным суффиксом */
interface MatchResult {
  episodeNumber: number
  /** Суффикс из имени файла (.ru_Anilibria → { lang: 'ru', group: 'Anilibria' }) */
  suffix?: { lang: string; group: string }
}

/**
 * Match аудио к видеофайлу
 *
 * Алгоритм:
 * 1. Точный матч по basename (без расширения)
 * 2. Fallback: убрать суффикс .lang_group и попробовать снова
 *
 * Суффикс формата `.ru_Anilibria` содержит язык и имя группы перевода.
 */
export function fuzzyMatchToVideo(
  audioFileName: string,
  videoFiles: Array<{ path: string; episodeNumber: number }>,
): MatchResult | null {
  const audioBaseName = path.basename(audioFileName, path.extname(audioFileName)).toLowerCase()

  // 1. Точный матч по имени файла (без расширения)
  for (const video of videoFiles) {
    const videoBaseName = path.basename(video.path, path.extname(video.path)).toLowerCase()
    if (audioBaseName === videoBaseName) {
      return { episodeNumber: video.episodeNumber }
    }
  }

  // 2. Fallback: попробовать убрать суффикс .lang_group
  // Паттерн: .{lang}_{group} где lang = 2-3 буквы, group = любое название
  const suffixMatch = audioBaseName.match(/\.([a-z]{2,3})_([^.]+)$/i)
  if (suffixMatch) {
    const strippedName = audioBaseName.replace(/\.[a-z]{2,3}_[^.]+$/i, '')

    for (const video of videoFiles) {
      const videoBaseName = path.basename(video.path, path.extname(video.path)).toLowerCase()
      if (strippedName === videoBaseName) {
        return {
          episodeNumber: video.episodeNumber,
          suffix: { lang: suffixMatch[1].toLowerCase(), group: suffixMatch[2] },
        }
      }
    }
  }

  // 3. Prefix-матч в обе стороны:
  //    - аудио начинается с имени видео (аудио с доп. суффиксами: "ep01 [audio]" → видео "ep01")
  //    - видео начинается с имени аудио (видео с тегами: "ep01 [BDRip]" → аудио "ep01")
  for (const video of videoFiles) {
    const videoBaseName = path.basename(video.path, path.extname(video.path)).toLowerCase()
    if (audioBaseName.startsWith(videoBaseName) || videoBaseName.startsWith(audioBaseName)) {
      return { episodeNumber: video.episodeNumber }
    }
  }

  // Не нашли матч → unmatched
  return null
}

/**
 * Извлечь название дорожки из имени аудиофайла
 *
 * Паттерны:
 * - "video.[5.1].mka" → "5.1"
 * - "video.[Commentary].mka" → "Commentary"
 * - "video.suffix.mka" → "suffix"
 *
 * @returns Название дорожки или null если не найдено
 */
export function extractTitleFromAudioFilename(fileName: string): string | null {
  const ext = path.extname(fileName) // .mka, .m4a, etc.
  const nameWithoutExt = path.basename(fileName, ext)

  // Паттерн 1: .[название].ext — название в квадратных скобках
  const bracketMatch = nameWithoutExt.match(/\.\[([^\]]+)\]$/)
  if (bracketMatch) {
    return bracketMatch[1]
  }

  // Паттерн 2: .suffix.ext — суффикс после последней точки
  const lastDotIndex = nameWithoutExt.lastIndexOf('.')
  if (lastDotIndex > 0) {
    const suffix = nameWithoutExt.slice(lastDotIndex + 1).trim()
    // Проверяем что суффикс не похож на технические данные (не "x264", не "FLAC", etc.)
    const technicalSuffixes = ['x264', 'x265', 'hevc', 'av1', 'flac', 'aac', 'opus', 'dts', 'ac3', 'bdremux', 'bdrip']
    if (suffix.length >= 2 && !technicalSuffixes.includes(suffix.toLowerCase())) {
      return suffix
    }
  }

  return null
}

/**
 * Нормализовать код языка в ISO 639-1 (2 буквы)
 * ru, rus → ru | en, eng → en | ja, jp, jpn → ja
 */
export function normalizeLanguageCode(code: string): string {
  const lower = code.toLowerCase()

  // Русский
  if (lower === 'ru' || lower === 'rus') {
    return 'ru'
  }
  // Английский
  if (lower === 'en' || lower === 'eng') {
    return 'en'
  }
  // Японский
  if (lower === 'ja' || lower === 'jp' || lower === 'jpn') {
    return 'ja'
  }

  return lower.slice(0, 2) // Вернуть первые 2 символа как есть
}

/**
 * Определить язык по названию папки
 */
export function detectLanguageFromFolder(folderName: string): string {
  const lower = folderName.toLowerCase()

  if (lower.includes('rus') || lower.includes('рус') || lower.includes('озвучк')) {
    return 'ru'
  }
  if (lower.includes('eng') || lower.includes('english')) {
    return 'en'
  }
  if (lower.includes('jpn') || lower.includes('jap') || lower.includes('japan')) {
    return 'ja'
  }

  // Язык не удалось определить по имени папки
  return 'und'
}

/**
 * Получить информацию об аудиофайле через FFprobe
 */
async function probeAudioFile(
  filePath: string,
): Promise<{ codec: string; channels: number; bitrate: number; language: string }> {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v quiet -print_format json -show_streams -select_streams a:0 "${filePath}"`,
    )

    const data = JSON.parse(stdout)
    const stream = data.streams?.[0]

    if (!stream) {
      return { codec: 'unknown', channels: 2, bitrate: 0, language: 'und' }
    }

    return {
      codec: stream.codec_name || 'unknown',
      channels: stream.channels || 2,
      bitrate: parseInt(stream.bit_rate || '0', 10),
      language: stream.tags?.language || 'und',
    }
  } catch (e) {
    log.warn('FFprobe error', { file: filePath, error: String(e) })
    return { codec: 'unknown', channels: 2, bitrate: 0, language: 'und' }
  }
}

/**
 * Сканировать папку на внешние аудиофайлы
 *
 * @param videoFolderPath Путь к папке с видеофайлами
 * @param videoFiles Список видеофайлов с номерами эпизодов
 */
export async function scanForExternalAudio(
  videoFolderPath: string,
  videoFiles: Array<{ path: string; episodeNumber: number }>,
): Promise<ExternalAudioScanResult> {
  log.info('Scanning for external audio', { path: videoFolderPath, videoCount: videoFiles.length })

  const result: ExternalAudioScanResult = {
    audioDirs: [],
    audioTracks: [],
    unmatchedFiles: [],
  }

  try {
    // 1. Найти папки аудио (по паттернам ИЛИ любые подпапки с аудиофайлами)
    const entries = await readdir(videoFolderPath, { withFileTypes: true })

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue
      }

      const dirPath = path.join(videoFolderPath, entry.name)

      // Проверяем по паттерну
      if (isAudioFolder(entry.name)) {
        result.audioDirs.push(dirPath)
        log.info('Found audio directory (pattern)', { name: entry.name })
        continue
      }

      // Проверяем содержит ли папка аудиофайлы
      try {
        const subEntries = await readdir(dirPath, { withFileTypes: true })
        const hasAudioFiles = subEntries.some((e) => e.isFile() && isAudioExtension(e.name))

        if (hasAudioFiles) {
          result.audioDirs.push(dirPath)
          log.info('Found audio directory (by content)', { name: entry.name })
        }
      } catch {
        // Игнорируем ошибки чтения подпапок
      }
    }

    if (result.audioDirs.length === 0) {
      log.info('No audio folders found')
      return result
    }

    // 2. Сканировать каждую папку аудио (рекурсивно до глубины 3)
    for (const audioDir of result.audioDirs) {
      const dirBaseName = path.basename(audioDir)
      const topGroupName = extractGroupNameFromAudioDir(audioDir) || dirBaseName
      const language = detectLanguageFromFolder(dirBaseName)

      try {
        // Используем рекурсивный сканер для поиска аудио в подпапках
        for await (const audioPath of scanDirectoryRecursive(audioDir, AUDIO_EXTENSIONS, 3)) {
          const audioFileName = path.basename(audioPath)

          // Матчим к эпизоду
          const matchResult = fuzzyMatchToVideo(audioFileName, videoFiles)

          if (matchResult === null) {
            result.unmatchedFiles.push(audioPath)
            log.debug('Unmatched audio file', { file: audioFileName })
            continue
          }

          // Получаем информацию об аудио
          const audioInfo = await probeAudioFile(audioPath)

          // Определяем groupName: проверяем непосредственного родителя файла
          // Структура: RUS Sound/[badPuss]/episode.mka → "badPuss"
          // Структура: Sounds/AniLibria/episode.mka    → "AniLibria" (без скобок — сам basename)
          const parentDir = path.dirname(audioPath)
          const groupName = parentDir !== audioDir
            ? extractGroupNameFromAudioDir(parentDir) || path.basename(parentDir)
            : topGroupName

          // Приоритет языка: суффикс файла > метаданные FFprobe > имя папки
          const finalLanguage = matchResult.suffix?.lang
            ? normalizeLanguageCode(matchResult.suffix.lang)
            : audioInfo.language !== 'und'
            ? audioInfo.language
            : language
          const titleFromFilename = extractTitleFromAudioFilename(audioFileName)
          const finalTitle = matchResult.suffix?.group || titleFromFilename || groupName
          const finalGroupName = matchResult.suffix?.group || groupName

          result.audioTracks.push({
            filePath: audioPath,
            episodeNumber: matchResult.episodeNumber,
            language: finalLanguage,
            title: finalTitle, // Название дорожки (5.1, Commentary, etc.)
            groupName: finalGroupName, // Группа озвучки (badPuss, negaushi, etc.)
            codec: audioInfo.codec,
            channels: audioInfo.channels,
            bitrate: audioInfo.bitrate,
          })

          log.info('Audio track matched', {
            file: audioFileName,
            episode: matchResult.episodeNumber,
            language: finalLanguage,
            title: finalTitle,
            codec: audioInfo.codec,
            channels: audioInfo.channels,
          })
        }
      } catch (e) {
        log.warn('Cannot read audio directory', { dir: audioDir, error: String(e) })
      }
    }

    log.info('Audio scan complete', {
      matched: result.audioTracks.length,
      unmatched: result.unmatchedFiles.length,
    })
  } catch (e) {
    log.error('Audio scan error', { error: String(e) })
  }

  return result
}
