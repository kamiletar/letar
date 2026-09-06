/**
 * Динамический whitelist разрешённых путей для media:// протокола
 *
 * Защита от произвольного чтения файлов:
 * - Начальные пути передаются вызывающим кодом (библиотека, temp, userData — эти пути
 *   специфичны для конкретного приложения, поэтому не знает о них сама)
 * - Другие папки добавляются только при выборе через native диалог
 * - XSS атака не может программно добавить путь в whitelist
 */

import path from 'path'

/** Set разрешённых директорий (абсолютные пути) */
const allowedPaths = new Set<string>()

/**
 * Инициализация whitelist — добавляет базовые разрешённые пути приложения
 * (папку библиотеки, temp, userData и т.п. — решает вызывающий код)
 */
export function initAllowedPaths(initialPaths: string[]): void {
  for (const initialPath of initialPaths) {
    allowedPaths.add(path.resolve(initialPath))
  }
}

/**
 * Добавляет путь в whitelist
 * Вызывается из dialog handlers при выборе папки пользователем
 */
export function allowPath(folderPath: string): void {
  const resolved = path.resolve(folderPath)
  allowedPaths.add(resolved)
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
