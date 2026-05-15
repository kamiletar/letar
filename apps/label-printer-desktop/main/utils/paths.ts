/**
 * Утилиты для работы с путями в Electron main process
 * Единое место для функций получения путей к ресурсам
 */
import { app } from 'electron'
import { join } from 'path'

/**
 * Получить путь к ресурсам приложения
 * В dev-режиме: корень label-printer-desktop
 * В production: resourcesPath (где лежит app.asar)
 */
export function getResourcesPath(): string {
  if (app.isPackaged) {
    return process.resourcesPath
  }
  // В dev режиме nextron компилирует main в app/background.js
  // __dirname = C:\web\lena\apps\label-printer-desktop\app
  // Поэтому поднимаемся на 1 уровень до apps/label-printer-desktop/
  const resourcesPath = join(__dirname, '../')
  console.warn('[paths] __dirname:', __dirname)
  console.warn('[paths] resourcesPath:', resourcesPath)
  return resourcesPath
}

/**
 * Получить путь к директории шаблонов этикеток
 */
export function getTemplatesPath(): string {
  return join(getResourcesPath(), 'templates')
}

/**
 * Получить путь к директории с данными пользователя
 * (настройки, логи, БД)
 */
export function getUserDataPath(): string {
  return app.getPath('userData')
}

/**
 * Получить путь к файлу БД SQLite
 */
export function getDatabasePath(): string {
  return join(getUserDataPath(), 'label-printer.db')
}
