/**
 * Динамический whitelist разрешённых путей для media:// протокола
 *
 * Защита от произвольного чтения файлов:
 * - Library и temp всегда разрешены
 * - Другие папки добавляются только при выборе через native диалог
 * - XSS атака не может программно добавить путь в whitelist
 */

import { app } from 'electron'
import path from 'path'

import { getDefaultLibraryPath } from '../services/output-path-resolver'
import { createModuleLogger } from '../utils/logger'

const log = createModuleLogger('AllowedPaths')

/** Set разрешённых директорий (абсолютные пути) */
const allowedPaths = new Set<string>()

/** Флаг инициализации */
let initialized = false

/**
 * Инициализация whitelist — добавляет базовые разрешённые пути
 * Вызывается из background.ts после app.whenReady()
 */
export function initAllowedPaths(): void {
  if (initialized) {
    return
  }

  // Папка библиотеки — всегда разрешена
  const libraryPath = getDefaultLibraryPath()
  allowedPaths.add(path.resolve(libraryPath))

  // Temp папка — для временных файлов при обработке
  const tempPath = app.getPath('temp')
  allowedPaths.add(path.resolve(tempPath))

  // userData — для кэша и данных приложения
  const userDataPath = app.getPath('userData')
  allowedPaths.add(path.resolve(userDataPath))

  initialized = true

  log.info('Initialized', { paths: [...allowedPaths] })
}

/**
 * Добавляет путь в whitelist
 * Вызывается из dialog handlers при выборе папки пользователем
 */
export function allowPath(folderPath: string): void {
  const resolved = path.resolve(folderPath)
  allowedPaths.add(resolved)
  log.info('Path added', { path: resolved })
}

/**
 * Добавляет путь к файлу в whitelist (добавляет родительскую директорию)
 */
export function allowFilePath(filePath: string): void {
  const dirPath = path.dirname(filePath)
  allowPath(dirPath)
}

/**
 * Проверяет, разрешён ли доступ к файлу
 * Файл разрешён, если он находится внутри любой из разрешённых директорий
 */
export function isPathAllowed(filePath: string): boolean {
  const resolved = path.resolve(filePath)

  for (const allowed of allowedPaths) {
    // Файл внутри разрешённой директории
    if (resolved.startsWith(allowed + path.sep) || resolved === allowed) {
      return true
    }
  }

  return false
}

/**
 * Возвращает список разрешённых путей (для отладки)
 */
export function getAllowedPaths(): string[] {
  return [...allowedPaths]
}
