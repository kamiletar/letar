/**
 * Поиск и сопоставление шрифтов
 */

import * as fs from 'fs'
import * as path from 'path'

/** Расширения файлов шрифтов */
const FONT_EXTENSIONS = ['.ttf', '.otf', '.woff', '.woff2']

/**
 * Рекурсивный поиск файлов с определёнными расширениями
 */
export function findFilesRecursively(dir: string, extensions: string[]): string[] {
  if (!fs.existsSync(dir)) {
    return []
  }

  const results: string[] = []

  try {
    const entries = fs.readdirSync(dir)

    for (const entry of entries) {
      const fullPath = path.join(dir, entry)
      const stat = fs.lstatSync(fullPath)

      if (stat.isDirectory()) {
        results.push(...findFilesRecursively(fullPath, extensions))
      } else {
        const ext = path.extname(entry).toLowerCase()
        if (extensions.includes(ext)) {
          results.push(fullPath)
        }
      }
    }
  } catch {
    // Игнорируем ошибки доступа к папкам
  }

  return results
}

/**
 * Найти все файлы шрифтов в папке
 */
export function findFonts(fontDir: string): string[] {
  return findFilesRecursively(fontDir, FONT_EXTENSIONS)
}

/**
 * Сопоставить названия шрифтов с файлами
 *
 * Ищет файлы, имена которых содержат название шрифта (case-insensitive)
 *
 * @param fontDir Папка с шрифтами
 * @param fontNames Названия шрифтов для поиска
 * @returns Массив путей к найденным файлам шрифтов
 */
export function matchFonts(fontDir: string, fontNames: string[]): string[] {
  const allFonts = findFonts(fontDir)
  const matched = new Set<string>()

  for (const fontName of fontNames) {
    const lowerName = fontName.toLowerCase()

    // Ищем файл, имя которого содержит название шрифта
    for (const fontPath of allFonts) {
      const fileName = path.basename(fontPath).toLowerCase()

      // Проверяем различные варианты совпадения
      if (fileName.includes(lowerName) || lowerName.includes(fileName.replace(/\.(ttf|otf|woff2?)$/i, ''))) {
        matched.add(fontPath)
      }
    }
  }

  return Array.from(matched)
}

/**
 * Нормализовать название шрифта
 *
 * Удаляет лишние пробелы, приводит к нижнему регистру
 */
export function normalizeFontName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').trim()
}

/**
 * Получить информацию о шрифте из имени файла
 */
export function getFontInfo(fontPath: string): {
  name: string
  format: string
  isOpenType: boolean
} {
  const ext = path.extname(fontPath).toLowerCase()
  const name = path.basename(fontPath, ext)

  return {
    name,
    format: ext.slice(1), // Убираем точку
    isOpenType: ext === '.otf',
  }
}

/**
 * Определить MIME-тип шрифта
 */
export function getFontMimeType(fontPath: string): string {
  const ext = path.extname(fontPath).toLowerCase()

  switch (ext) {
    case '.otf':
      return 'application/vnd.ms-opentype'
    case '.woff':
      return 'font/woff'
    case '.woff2':
      return 'font/woff2'
    case '.ttf':
    default:
      return 'application/x-truetype-font'
  }
}
