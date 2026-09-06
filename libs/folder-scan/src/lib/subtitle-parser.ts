/**
 * Парсер субтитров — извлечение информации из ASS файлов
 */

import * as fs from 'fs'
import * as path from 'path'

/**
 * Извлечь названия шрифтов из ASS файла
 *
 * Парсит секцию [V4+ Styles] и извлекает имена шрифтов
 * из строк Style: Name,FontName,...
 */
export function getFontsFromASS(assPath: string): string[] {
  const content = fs.readFileSync(assPath, 'utf8')
  const fontNames = new Set<string>()

  // Ищем строки Style в секции стилей
  const styleLines = content.match(/^Style:.+/gm) || []

  for (const line of styleLines) {
    // Формат: Style: name, fontname, size, colors...
    const parts = line.split(',')
    if (parts[1]) {
      const fontName = parts[1].trim()
      if (fontName) {
        fontNames.add(fontName)
      }
    }
  }

  return Array.from(fontNames)
}

/**
 * Определить язык по имени файла/папки
 *
 * Использует word boundaries для предотвращения ложных срабатываний
 * (например, "Koe" не должно матчить "ko" для корейского)
 */
export function detectLanguageFromName(name: string): string {
  const languageMap: Record<string, string[]> = {
    ru: ['rus', 'рус', 'russian', 'русский'], // 'ru' убран — слишком короткий
    en: ['eng', 'english', 'английский'], // 'en' убран — слишком короткий
    jp: ['jpn', 'jap', 'japanese', 'японский'], // 'jp' убран — слишком короткий
    fr: ['fra', 'french', 'французский'],
    de: ['ger', 'german', 'немецкий'],
    es: ['spa', 'spanish', 'испанский'],
    it: ['ita', 'italian', 'итальянский'],
    ko: ['kor', 'korean', 'корейский'], // 'ko' убран — слишком короткий, матчит "Koe"
    zh: ['chi', 'chinese', 'китайский'],
  }

  const lowName = name.toLowerCase()

  for (const [code, variants] of Object.entries(languageMap)) {
    // Используем word boundary: паттерн должен быть окружён не-буквами или быть на краю строки
    if (variants.some((v) => new RegExp(`(?:^|[^a-zа-яё])${v}(?:[^a-zа-яё]|$)`, 'i').test(lowName))) {
      return code
    }
  }

  return 'und' // undefined language
}

/**
 * Определить язык по пути к файлу
 *
 * Проверяет названия папок от конца к началу
 */
export function detectLanguageFromPath(filePath: string): string {
  const parts = filePath.split(path.sep)

  for (let i = parts.length - 1; i >= 0; i--) {
    const lang = detectLanguageFromName(parts[i])
    if (lang !== 'und') {
      return lang
    }
  }

  return 'und'
}

/**
 * Извлечь название (для дорожки) из пути к файлу
 *
 * Приоритет:
 * 1. Суффикс из имени файла: "video.надписи.ass" → "надписи"
 * 2. Название папки (исключая технические имена)
 * 3. Имя файла без расширения
 */
export function detectTitleFromPath(filePath: string): string {
  const technicalNames = ['audio', 'subs', 'subtitles', 'video', 'fonts', 'attachments', 'tracks']

  // 1. Попробовать извлечь суффикс из имени файла
  // Паттерн: "basename.suffix.ext" где suffix — название дорожки
  const fileName = path.basename(filePath)
  const ext = path.extname(fileName) // .ass, .srt, etc.
  const nameWithoutExt = path.basename(fileName, ext)

  // Ищем последнюю точку — суффикс после неё может быть названием дорожки
  const lastDotIndex = nameWithoutExt.lastIndexOf('.')
  if (lastDotIndex > 0) {
    const suffix = nameWithoutExt.slice(lastDotIndex + 1).trim()
    // Проверяем что суффикс похож на название (не число, не слишком короткий)
    if (suffix.length >= 2 && !/^\d+$/.test(suffix)) {
      return suffix
    }
  }

  // 2. Fallback: ищем в папках
  const parts = filePath.split(path.sep).slice(0, -1) // Исключаем имя файла

  for (let i = parts.length - 1; i >= 0; i--) {
    const name = parts[i].trim()
    if (name && !technicalNames.includes(name.toLowerCase())) {
      return name
    }
  }

  // 3. Если не нашли, возвращаем имя файла без расширения
  return nameWithoutExt
}

/**
 * Информация о субтитрах
 */
export interface SubtitleInfo {
  /** Путь к файлу */
  path: string
  /** Код языка */
  language: string
  /** Название дорожки */
  title: string
  /** Названия шрифтов (для ASS) */
  fontNames: string[]
  /** Формат (ass, srt, vtt) */
  format: string
}

/**
 * Получить информацию о субтитрах
 */
export function getSubtitleInfo(subtitlePath: string): SubtitleInfo {
  const ext = path.extname(subtitlePath).toLowerCase().slice(1)
  const isASS = ext === 'ass' || ext === 'ssa'

  return {
    path: subtitlePath,
    language: detectLanguageFromPath(subtitlePath),
    title: detectTitleFromPath(subtitlePath),
    fontNames: isASS ? getFontsFromASS(subtitlePath) : [],
    format: ext,
  }
}
