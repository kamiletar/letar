/**
 * Загрузка иконки приложения — общая для трея (16×16) и окна (оригинальный размер).
 *
 * Поддержка dev и production путей: .png надёжнее .ico с nativeImage на Windows.
 */

import { type NativeImage, nativeImage } from 'electron'
import path from 'path'

function iconCandidates(): string[] {
  return [
    path.join(__dirname, '..', 'resources', 'icon.png'),
    path.join(__dirname, '..', 'resources', 'icon.ico'),
    path.join(process.resourcesPath ?? '', 'icon.png'),
    path.join(process.resourcesPath ?? '', 'icon.ico'),
  ]
}

/** Путь к первому найденному файлу иконки (для BrowserWindow.icon) */
export function loadAppIconPath(): string {
  for (const candidate of iconCandidates()) {
    if (!nativeImage.createFromPath(candidate).isEmpty()) {
      return candidate
    }
  }
  console.warn('Не удалось найти иконку приложения, пути:', iconCandidates())
  return ''
}

/** Иконка для трея, уменьшенная до 16×16 */
export function loadTrayIcon(): NativeImage {
  for (const candidate of iconCandidates()) {
    const loaded = nativeImage.createFromPath(candidate)
    if (!loaded.isEmpty()) {
      console.log(`Иконка трея: ${candidate}`)
      return loaded.resize({ width: 16, height: 16 })
    }
  }
  console.warn('Не удалось загрузить иконку трея, пути:', iconCandidates())
  return nativeImage.createEmpty()
}
