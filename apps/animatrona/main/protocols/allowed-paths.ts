/**
 * Whitelist разрешённых путей для media:// протокола — тонкая обёртка над `@letar/folder-scan`
 *
 * Общий Set-based механизм живёт в либе (переиспользуется будущим `animatrona-player`),
 * здесь — только Animatrona-специфичная инициализация: библиотека, temp, userData.
 */

import { app } from 'electron'
import path from 'path'

import { getDefaultLibraryPath } from '../services/output-path-resolver'
import { createModuleLogger } from '../utils/logger'

export { allowFilePath, allowPath, getAllowedPaths, isPathAllowed } from '@letar/folder-scan'
import { initAllowedPaths as initAllowedPathsInLib } from '@letar/folder-scan'

const log = createModuleLogger('AllowedPaths')

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
  initialized = true

  const initialPaths = [
    // Папка библиотеки — всегда разрешена
    path.resolve(getDefaultLibraryPath()),
    // Temp папка — для временных файлов при обработке
    path.resolve(app.getPath('temp')),
    // userData — для кэша и данных приложения
    path.resolve(app.getPath('userData')),
  ]

  initAllowedPathsInLib(initialPaths)

  log.info('Initialized', { paths: initialPaths })
}
