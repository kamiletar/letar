/**
 * Whitelist разрешённых путей для media:// протокола — тонкая обёртка над `@letar/folder-scan`
 *
 * В отличие от Animatrona здесь нет папки библиотеки — только userData/temp и папки,
 * которые пользователь сам выбрал через диалог (добавляются в dialog.handlers.ts).
 */

import { app } from 'electron'
import path from 'node:path'

import { createModuleLogger, initAllowedPaths as initAllowedPathsInLib } from '@letar/folder-scan'

export { allowFilePath, allowPath, getAllowedPaths, isPathAllowed } from '@letar/folder-scan'

const log = createModuleLogger('AllowedPaths')

let initialized = false

/**
 * Инициализация whitelist — вызывается из background.ts после app.whenReady()
 */
export function initAllowedPaths(): void {
  if (initialized) {
    return
  }
  initialized = true

  const initialPaths = [
    path.resolve(app.getPath('temp')),
    path.resolve(app.getPath('userData')),
  ]

  initAllowedPathsInLib(initialPaths)

  log.info('Initialized', { paths: initialPaths })
}
