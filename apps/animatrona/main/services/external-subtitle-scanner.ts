/**
 * Сканер внешних субтитров — поиск ASS/SRT/VTT файлов в папках рядом с видео
 *
 * Поддерживает:
 * - Несколько папок субтитров (Rus Sub/, Eng Sub/, Subs/ и т.д.)
 * - Fuzzy matching субтитров к эпизодам по имени файла
 * - Автоматический поиск шрифтов для ASS
 * - Warning для несматченных файлов
 */

import { readdir } from 'fs/promises'
import path from 'path'
import { detectSubtitleType, type SubtitleType } from '../../shared/utils/subtitle-type'
import { scanDirectoryRecursive } from '../utils/fs-utils'
import { createModuleLogger } from '../utils/logger'
import { getSubtitleInfo } from './subtitle-parser'

const log = createModuleLogger('SubtitleScanner')

/** Паттерны папок субтитров (case-insensitive) */
const SUBTITLE_FOLDER_PATTERNS = [
  'rus sub',
  'eng sub',
  'jpn sub',
  'subs',
  'sub',
  'subtitles',
  'russian',
  'english',
  'japanese',
  'субтитры',
  'надпис',
  'рус',
]

/** Паттерны папок шрифтов (case-insensitive) */
const FONT_FOLDER_PATTERNS = ['fonts', 'font', 'шрифты']

/** Расширения файлов субтитров */
const SUBTITLE_EXTENSIONS = new Set(['.ass', '.ssa', '.srt', '.vtt'])

/** Расширения файлов шрифтов */
const FONT_EXTENSIONS = new Set(['.ttf', '.otf', '.woff', '.woff2', '.eot'])

/**
 * Тип субтитров — реэкспорт единого источника (`shared/utils/subtitle-type`).
 * Классификатор там же и работает одинаково для внешних файлов и встроенных дорожек.
 */
export type { SubtitleType }

/** Результат матчинга субтитра */
export interface ExternalSubtitleMatch {
  /** Путь к файлу субтитров */
  filePath: string
  /** Код языка (ru, en, ja, und) */
  language: string
  /** Название дорожки */
  title: string
  /** Формат (ass, srt, vtt) */
  format: 'ass' | 'srt' | 'vtt' | 'ssa'
  /** Номер эпизода (null если не удалось определить) */
  episodeNumber: number | null
  /** Имена шрифтов из ASS файла */
  fontNames: string[]
  /** Найденные файлы шрифтов */
  matchedFonts: Array<{
    name: string
    path: string
  }>
  /** Название группы субтитров (из квадратных скобок в имени папки) */
  groupName?: string
  /** Тип субтитров (полные, надписи, песни) */
  subtitleType: SubtitleType
}

/** Результат сканирования */
export interface ExternalSubtitleScanResult {
  /** Найденные папки субтитров */
  subsDirs: string[]
  /** Найденные папки шрифтов */
  fontsDirs: string[]
  /** Сматченные субтитры */
  subtitles: ExternalSubtitleMatch[]
  /** Несматченные файлы (для warning в UI) */
  unmatchedFiles: string[]
}

/**
 * Извлечь номер эпизода из имени файла
 *
 * Паттерны:
 * - [01], [12], [001]
 * - E01, EP01, Ep12
 * - -01-, _12_
 * - episode 01
 * - S01E05
 */
function _extractEpisodeNumber(fileName: string): number | null {
  const baseName = path.basename(fileName, path.extname(fileName))

  const patterns = [
    // [01], [001], [12] — минимум 2 цифры (исключает [2] в названии типа "Black Butler 2")
    /\[(\d{2,3})\]/,
    // [OVA1], [OVA01] — специальный паттерн для OVA
    /\[OVA(\d{1,2})\]/i,
    // S01E05, S1E12
    /s\d{1,2}e(\d{1,3})/i,
    // E01, EP01, Ep12
    /[eе]p?(\d{1,3})/i,
    // -01-, _12_, .01.
    /[-_.](\d{2,3})[-_.]/,
    // episode 01, Episode 12
    /episode\s*(\d{1,3})/i,
    // Просто число в конце: filename 01
    /\s(\d{2,3})$/,
  ]

  for (const pattern of patterns) {
    const match = baseName.match(pattern)
    if (match) {
      return parseInt(match[1], 10)
    }
  }

  return null
}

/** Результат матчинга с опциональным суффиксом */
interface MatchResult {
  episodeNumber: number
  /** Суффикс из имени файла (.jp_netflix → { lang: 'jp', group: 'netflix' }) */
  suffix?: { lang: string; group: string }
}

/**
 * Нормализовать код языка в ISO 639-1 (2 буквы)
 * ru, rus → ru | en, eng → en | ja, jp, jpn → ja
 */
function normalizeLanguageCode(code: string): string {
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
 * Match субтитра к видеофайлу
 *
 * Алгоритм:
 * 1. Точный матч по basename (без расширения)
 * 2. Fallback: убрать суффикс .lang_group и попробовать снова
 *
 * Это предотвращает ложные матчи OVA субтитров к обычным эпизодам
 * когда OVA видео не выбраны пользователем.
 *
 * Суффикс формата `.jp_netflix` содержит язык и источник субтитров.
 */
function fuzzyMatchToVideo(
  subtitleFileName: string,
  videoFiles: Array<{ path: string; episodeNumber: number }>
): MatchResult | null {
  const subBaseName = path.basename(subtitleFileName, path.extname(subtitleFileName)).toLowerCase()

  // 0. Если один видеофайл (фильм) — все субтитры относятся к нему
  if (videoFiles.length === 1) {
    const suffixMatch = subBaseName.match(/\.([a-z]{2,3})_([^.]+)$/i)
    return {
      episodeNumber: videoFiles[0].episodeNumber,
      suffix: suffixMatch ? { lang: suffixMatch[1].toLowerCase(), group: suffixMatch[2] } : undefined,
    }
  }

  // 1. Точный матч по имени файла (без расширения)
  for (const video of videoFiles) {
    const videoBaseName = path.basename(video.path, path.extname(video.path)).toLowerCase()
    if (subBaseName === videoBaseName) {
      return { episodeNumber: video.episodeNumber }
    }
    if (subBaseName.startsWith(videoBaseName) || videoBaseName.startsWith(subBaseName)) {
      return { episodeNumber: video.episodeNumber }
    }
  }

  // 2. Fallback: попробовать убрать суффикс .lang_group
  // Паттерн: .{lang}_{group} где lang = 2-3 буквы, group = любое название
  const suffixMatch = subBaseName.match(/\.([a-z]{2,3})_([^.]+)$/i)
  if (suffixMatch) {
    const strippedName = subBaseName.replace(/\.[a-z]{2,3}_[^.]+$/i, '')

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

  // 3. Fallback по номеру эпизода: если имена не совпадают по строке,
  // извлекаем номер из обоих имён и ищем единственный видеофайл с тем же номером.
  // Это покрывает случаи разного форматирования тегов (напр., "ep01 [Audio]" vs "ep01 [BDRip][1080p]")
  const subEpisodeNumber = _extractEpisodeNumber(subtitleFileName)
  if (subEpisodeNumber !== null) {
    const candidates = videoFiles.filter((v) => v.episodeNumber === subEpisodeNumber)
    // Матчим только если совпадение однозначное (один кандидат)
    if (candidates.length === 1) {
      return { episodeNumber: candidates[0].episodeNumber }
    }
  }

  // Не нашли матч → unmatched
  return null
}

/**
 * Проверить является ли директория папкой субтитров
 */
function isSubtitleFolder(dirName: string): boolean {
  const lower = dirName.toLowerCase()
  return SUBTITLE_FOLDER_PATTERNS.some((pattern) => lower.includes(pattern))
}

/**
 * Проверить является ли директория папкой шрифтов
 */
function isFontFolder(dirName: string): boolean {
  const lower = dirName.toLowerCase()
  return FONT_FOLDER_PATTERNS.some((pattern) => lower === pattern || lower.includes(pattern))
}

/**
 * Найти папки шрифтов внутри директории
 */
async function findFontFolders(dir: string): Promise<string[]> {
  const fontDirs: string[] = []

  try {
    const entries = await readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      if (entry.isDirectory() && isFontFolder(entry.name)) {
        fontDirs.push(path.join(dir, entry.name))
      }
    }
  } catch (e: unknown) {
    log.warn(`[ExternalSubScanner] Cannot read dir for fonts: ${dir}`, e as Record<string, unknown>)
  }

  return fontDirs
}

/**
 * Собрать все шрифты из папок
 */
async function collectFonts(fontDirs: string[]): Promise<Map<string, string>> {
  /** Map: lowercase fontName → filePath */
  const fonts = new Map<string, string>()

  for (const fontDir of fontDirs) {
    try {
      const entries = await readdir(fontDir, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase()
          if (FONT_EXTENSIONS.has(ext)) {
            const fontPath = path.join(fontDir, entry.name)
            // Используем имя файла без расширения как ключ
            const fontName = path.basename(entry.name, ext).toLowerCase()
            fonts.set(fontName, fontPath)
          }
        }
      }
    } catch (e: unknown) {
      log.warn(`[ExternalSubScanner] Cannot read font dir: ${fontDir}`, e as Record<string, unknown>)
    }
  }

  return fonts
}

/**
 * Матчить имена шрифтов из ASS к файлам
 */
function matchFontsToFiles(
  fontNames: string[],
  availableFonts: Map<string, string>
): Array<{ name: string; path: string }> {
  const matched: Array<{ name: string; path: string }> = []

  for (const fontName of fontNames) {
    const lowerName = fontName.toLowerCase()

    // Точный матч
    const exactMatch = availableFonts.get(lowerName)
    if (exactMatch) {
      matched.push({ name: fontName, path: exactMatch })
      continue
    }

    // Частичный матч (имя шрифта содержится в имени файла или наоборот)
    for (const [fileName, filePath] of availableFonts) {
      if (fileName.includes(lowerName) || lowerName.includes(fileName)) {
        matched.push({ name: fontName, path: filePath })
        break
      }
    }
  }

  return matched
}

/**
 * Извлечь имя группы из квадратных скобок в пути к папке субтитров
 * Например: "D:/Anime/RUS Subs [Yakusub Studio]/file.ass" → "Yakusub Studio"
 *
 * Ищет [GroupName] в имени папки субтитров и родительских папках subsDir
 */
function extractGroupNameFromSubsDir(subsDir: string): string | undefined {
  // Нормализуем путь
  const normalized = subsDir.replace(/\\/g, '/')
  const parts = normalized.split('/')

  // Ищем квадратные скобки в частях пути (от конца к началу)
  for (let i = parts.length - 1; i >= 0; i--) {
    const match = parts[i].match(/\[([^\]]+)\]/)
    if (match) {
      return match[1].trim()
    }
  }

  return undefined
}

/**
 * Сканировать папку на внешние субтитры
 *
 * @param videoFolderPath Путь к папке с видеофайлами
 * @param videoFiles Список видеофайлов с номерами эпизодов
 */
export async function scanForExternalSubtitles(
  videoFolderPath: string,
  videoFiles: Array<{ path: string; episodeNumber: number }>
): Promise<ExternalSubtitleScanResult> {
  log.info('Scanning for external subtitles', { path: videoFolderPath, videoCount: videoFiles.length })

  const result: ExternalSubtitleScanResult = {
    subsDirs: [],
    fontsDirs: [],
    subtitles: [],
    unmatchedFiles: [],
  }

  try {
    // 1. Найти папки субтитров (до 2 уровней вложенности) + субтитры рядом с видео
    const entries = await readdir(videoFolderPath, { withFileTypes: true })

    // Субтитры рядом с видео (в той же папке)
    const rootSubtitleFiles: string[] = []

    for (const entry of entries) {
      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        if (SUBTITLE_EXTENSIONS.has(ext)) {
          rootSubtitleFiles.push(path.join(videoFolderPath, entry.name))
        }
        continue
      }

      if (!entry.isDirectory()) {
        continue
      }

      if (isSubtitleFolder(entry.name)) {
        const subsDir = path.join(videoFolderPath, entry.name)
        result.subsDirs.push(subsDir)
        log.info('Found subtitles directory', { name: entry.name })

        // Найти папки шрифтов внутри
        const fontDirs = await findFontFolders(subsDir)
        result.fontsDirs.push(...fontDirs)
      } else {
        // Проверить подпапки (для структур типа "RUS Sound/надписи/")
        try {
          const subEntries = await readdir(path.join(videoFolderPath, entry.name), { withFileTypes: true })
          for (const subEntry of subEntries) {
            if (subEntry.isDirectory() && isSubtitleFolder(subEntry.name)) {
              const subsDir = path.join(videoFolderPath, entry.name, subEntry.name)
              result.subsDirs.push(subsDir)
              log.info('Found subtitles directory (nested)', { parent: entry.name, name: subEntry.name })

              const fontDirs = await findFontFolders(subsDir)
              result.fontsDirs.push(...fontDirs)
            }
          }
        } catch {
          // Ошибка чтения подпапки — пропускаем
        }
      }
    }

    if (result.subsDirs.length === 0 && rootSubtitleFiles.length === 0) {
      log.info('No subtitle folders or files found')
      return result
    }

    // Обработать субтитры из корневой папки (рядом с видео)
    if (rootSubtitleFiles.length > 0) {
      log.info('Found subtitle files alongside video', { count: rootSubtitleFiles.length })

      // Шрифты могут быть в корневой папке
      const rootFontDirs = await findFontFolders(videoFolderPath)
      result.fontsDirs.push(...rootFontDirs)
    }

    // 2. Собрать все шрифты
    const availableFonts = await collectFonts(result.fontsDirs)
    log.info('Fonts collected', { count: availableFonts.size })

    // 3. Обработать субтитры из корневой папки (рядом с видео)
    for (const subPath of rootSubtitleFiles) {
      const subFileName = path.basename(subPath)
      const matchResult = fuzzyMatchToVideo(subFileName, videoFiles)

      if (matchResult === null) {
        result.unmatchedFiles.push(subPath)
        log.debug('Unmatched root subtitle file', { file: subFileName })
        continue
      }

      const subInfo = getSubtitleInfo(subPath)
      const finalLanguage = matchResult.suffix?.lang ? normalizeLanguageCode(matchResult.suffix.lang) : subInfo.language
      const finalTitle = matchResult.suffix?.group || subInfo.title
      const subtitleType = detectSubtitleType({ filePath: subPath, title: finalTitle })
      const matchedFonts =
        subInfo.format === 'ass' || subInfo.format === 'ssa' ? matchFontsToFiles(subInfo.fontNames, availableFonts) : []

      result.subtitles.push({
        filePath: subPath,
        language: finalLanguage,
        title: finalTitle,
        format: subInfo.format as 'ass' | 'srt' | 'vtt' | 'ssa',
        episodeNumber: matchResult.episodeNumber,
        fontNames: subInfo.fontNames,
        matchedFonts,
        subtitleType,
      })

      log.info('Root subtitle matched', {
        file: subFileName,
        episode: matchResult.episodeNumber,
        language: finalLanguage,
        title: finalTitle,
        fonts: matchedFonts.length,
        subtitleType,
      })
    }

    // 4. Сканировать каждую папку субтитров (рекурсивно до глубины 3)
    for (const subsDir of result.subsDirs) {
      // Извлекаем имя группы из квадратных скобок в пути к папке
      const groupName = extractGroupNameFromSubsDir(subsDir)

      try {
        // Используем рекурсивный сканер для поиска субтитров в подпапках
        for await (const subPath of scanDirectoryRecursive(subsDir, SUBTITLE_EXTENSIONS, 3)) {
          const subFileName = path.basename(subPath)

          // Матчим к эпизоду
          const matchResult = fuzzyMatchToVideo(subFileName, videoFiles)

          if (matchResult === null) {
            result.unmatchedFiles.push(subPath)
            log.debug('Unmatched subtitle file', { file: subFileName })
            continue
          }

          // Получаем информацию о субтитрах
          const subInfo = getSubtitleInfo(subPath)

          // Если из суффикса имени файла извлечены язык и группа — используем их
          // Иначе используем данные из файла субтитров
          const finalLanguage = matchResult.suffix?.lang
            ? normalizeLanguageCode(matchResult.suffix.lang)
            : subInfo.language
          const finalTitle = matchResult.suffix?.group || subInfo.title

          // Определяем тип субтитров по названию дорожки, имени файла и пути
          const subtitleType = detectSubtitleType({ filePath: subPath, title: finalTitle })

          // Матчим шрифты для ASS
          const matchedFonts =
            subInfo.format === 'ass' || subInfo.format === 'ssa'
              ? matchFontsToFiles(subInfo.fontNames, availableFonts)
              : []

          result.subtitles.push({
            filePath: subPath,
            language: finalLanguage,
            title: finalTitle,
            format: subInfo.format as 'ass' | 'srt' | 'vtt' | 'ssa',
            episodeNumber: matchResult.episodeNumber,
            fontNames: subInfo.fontNames,
            matchedFonts,
            groupName,
            subtitleType,
          })

          log.info('Subtitle matched', {
            file: subFileName,
            episode: matchResult.episodeNumber,
            language: finalLanguage,
            title: finalTitle,
            fonts: matchedFonts.length,
            groupName,
            subtitleType,
          })
        }
      } catch (e) {
        log.warn('Cannot read subs directory', { dir: subsDir, error: String(e) })
      }
    }

    log.info('Subtitle scan complete', {
      matched: result.subtitles.length,
      unmatched: result.unmatchedFiles.length,
    })
  } catch (e) {
    log.error('Subtitle scan error', { error: String(e) })
  }

  return result
}
