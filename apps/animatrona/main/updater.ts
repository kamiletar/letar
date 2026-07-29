/**
 * Модуль автообновлений для Animatrona
 *
 * Использует electron-updater для автоматического обновления приложения.
 * Поддерживает GitHub Releases как источник обновлений.
 *
 * Улучшенная версия: без блокирующих диалогов, с changelog из GitHub API
 */

import type { BrowserWindow } from 'electron'
import { app, net } from 'electron'
import { autoUpdater, type ProgressInfo, type UpdateDownloadedEvent, type UpdateInfo } from 'electron-updater'

import { createModuleLogger } from './utils/logger'

const log = createModuleLogger('Updater')

// Настройки автообновления
autoUpdater.autoDownload = false // Не скачивать автоматически
autoUpdater.autoInstallOnAppQuit = true // Установить при выходе

// Перенаправляем логгер electron-updater через наш логгер
autoUpdater.logger = {
  info: (message: string) => log.info(message),
  warn: (message: string) => log.warn(message),
  error: (message: string) => log.error(message),
  debug: (message: string) => log.debug(message),
}

/**
 * Статус обновления для UI
 */
export interface UpdateStatus {
  /** Текущий статус */
  status: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  /** Информация о доступном обновлении */
  updateInfo: UpdateInfo | null
  /** Прогресс загрузки (0-100) */
  downloadProgress: number
  /** Сообщение об ошибке */
  error: string | null
  /** Скорость загрузки (bytes/s) */
  downloadSpeed: number
  /** Оставшееся время загрузки (секунды) */
  downloadEta: number
}

// Синглтон состояния обновлений
let updateStatus: UpdateStatus = {
  status: 'idle',
  updateInfo: null,
  downloadProgress: 0,
  error: null,
  downloadSpeed: 0,
  downloadEta: 0,
}

// Ссылка на главное окно для IPC
let mainWindowRef: BrowserWindow | null = null

// Кэш changelog для текущей версии
let changelogCache: { version: string; changelog: string } | null = null

// Флаг: пока качали старую версию — появилась новее, нужно перекачать после завершения
let newerVersionFoundDuringDownload = false

/**
 * Форматирует ошибку electron-updater в понятное сообщение
 */
function formatUpdateError(error: Error): string {
  const msg = error.message || ''

  // 404 — latest.yml не найден (нет релизов на GitHub)
  if (msg.includes('Cannot find latest') || msg.includes('404')) {
    return 'Обновления пока недоступны'
  }

  // Нет интернета или DNS ошибка
  if (msg.includes('ENOTFOUND') || msg.includes('getaddrinfo')) {
    return 'Нет подключения к интернету'
  }

  // Таймаут
  if (msg.includes('ETIMEDOUT') || msg.includes('timeout')) {
    return 'Превышено время ожидания'
  }

  // SSL ошибка
  if (msg.includes('certificate') || msg.includes('SSL')) {
    return 'Ошибка безопасного соединения'
  }

  // Ошибка записи файла
  if (msg.includes('EACCES') || msg.includes('EPERM')) {
    return 'Нет прав для записи файла обновления'
  }

  // Для остальных — первая строка без HTTP headers
  const firstLine = msg.split('\n')[0]
  return firstLine.length > 100 ? firstLine.substring(0, 100) + '...' : firstLine
}

/**
 * Получить текущий статус обновления (сериализованный для renderer)
 */
export function getUpdateStatus() {
  return serializeStatus()
}

/**
 * Получить changelog из GitHub Releases
 */
export async function fetchChangelog(version: string): Promise<string | null> {
  // Проверяем кэш
  if (changelogCache && changelogCache.version === version) {
    return changelogCache.changelog
  }

  try {
    // Релизы animatrona в letar монорепо тегаются как animatrona-v<version>
    const url = `https://api.github.com/repos/kamiletar/letar/releases/tags/animatrona-v${version}`
    const request = net.request({
      url,
      method: 'GET',
    })

    // Устанавливаем User-Agent (GitHub требует)
    request.setHeader('User-Agent', 'Animatrona-Update-Client')

    return await new Promise<string>((resolve, reject) => {
      let data = ''

      request.on('response', (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}`))
          return
        }

        response.on('data', (chunk) => {
          data += chunk.toString()
        })

        response.on('end', () => {
          try {
            const release = JSON.parse(data)
            const changelog = release.body || 'Нет описания'
            // Кэшируем
            changelogCache = { version, changelog }
            resolve(changelog)
          } catch (error) {
            reject(error)
          }
        })

        response.on('error', (error) => {
          reject(error)
        })
      })

      request.on('error', (error) => {
        reject(error)
      })

      request.end()
    })
  } catch (error) {
    log.error('Failed to fetch changelog', { error })
    return null
  }
}

/**
 * Сравнить две версии semver — возвращает true если candidate новее current
 */
function isNewerVersion(current: string, candidate: string): boolean {
  const parse = (v: string) => v.split('.').map((n) => parseInt(n, 10) || 0)
  const [cMaj, cMin, cPatch] = parse(current)
  const [nMaj, nMin, nPatch] = parse(candidate)
  if (nMaj !== cMaj) {
    return nMaj > cMaj
  }
  if (nMin !== cMin) {
    return nMin > cMin
  }
  return nPatch > cPatch
}

/**
 * Нормализовать releaseNotes из electron-updater
 * Может быть string, ReleaseNoteInfo[] или null
 */
function normalizeReleaseNotes(notes: unknown): string | undefined {
  if (!notes) {
    return undefined
  }
  if (typeof notes === 'string') {
    return notes
  }
  // ReleaseNoteInfo[] — массив объектов {version, note}
  if (Array.isArray(notes)) {
    return notes
      .map((n) => (typeof n === 'string' ? n : n.note || ''))
      .filter(Boolean)
      .join('\n')
  }
  return undefined
}

/**
 * Сериализовать статус для отправки в renderer
 */
function serializeStatus() {
  return {
    status: updateStatus.status,
    updateInfo: updateStatus.updateInfo
      ? {
          version: updateStatus.updateInfo.version,
          releaseDate: updateStatus.updateInfo.releaseDate,
          releaseNotes: normalizeReleaseNotes(updateStatus.updateInfo.releaseNotes),
        }
      : null,
    downloadProgress: updateStatus.downloadProgress,
    error: updateStatus.error,
    downloadSpeed: updateStatus.downloadSpeed,
    downloadEta: updateStatus.downloadEta,
  }
}

/**
 * Уведомить renderer о изменении статуса
 */
function notifyRenderer(): void {
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    mainWindowRef.webContents.send('updater:status', serializeStatus())
  }
}

/**
 * Инициализация автообновлений
 */
export function initAutoUpdater(mainWindow: BrowserWindow): void {
  // Сохраняем ссылку на окно
  mainWindowRef = mainWindow

  // В development режиме не проверяем обновления
  if (!app.isPackaged) {
    log.info('Skipping update check in development mode')
    return
  }

  // Обработчики событий
  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for updates...')
    updateStatus = { ...updateStatus, status: 'checking', error: null }
    mainWindow.webContents.send('updater:checking')
    notifyRenderer()
  })

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    log.info('Update available', { version: info.version })

    // Если уже качаем или скачали старую версию — проверяем, не вышла ли новее
    if (updateStatus.status === 'downloading' || updateStatus.status === 'downloaded') {
      const currentVersion = updateStatus.updateInfo?.version
      if (currentVersion && isNewerVersion(currentVersion, info.version)) {
        log.info('Найдена более новая версия, отменяем старую', { from: currentVersion, to: info.version })
        if (updateStatus.status === 'downloaded') {
          // Уже скачали старую — сразу начинаем скачивать новую
          updateStatus = {
            ...updateStatus,
            status: 'downloading',
            updateInfo: info,
            downloadProgress: 0,
            downloadSpeed: 0,
            downloadEta: 0,
          }
          notifyRenderer()
          autoUpdater.downloadUpdate().catch((err: unknown) => log.error('Ошибка скачивания новой версии', { err }))
        } else {
          // Ещё качаем — ставим флаг, перекачаем после завершения текущей
          newerVersionFoundDuringDownload = true
          updateStatus = { ...updateStatus, updateInfo: info }
          notifyRenderer()
        }
        return
      }
    }

    updateStatus = { ...updateStatus, status: 'available', updateInfo: info, error: null }
    mainWindow.webContents.send('updater:available', info)
    notifyRenderer()

    fetchChangelog(info.version)
      .then((changelog) => {
        if (changelog) {
          mainWindow.webContents.send('updater:changelog', { version: info.version, changelog })
        }
      })
      .catch((error) => {
        log.error('Failed to load changelog', { error })
      })
  })

  autoUpdater.on('update-not-available', () => {
    log.info('No updates available')
    updateStatus = { ...updateStatus, status: 'not-available', error: null }
    mainWindow.webContents.send('updater:not-available')
    notifyRenderer()
  })

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    log.info('Download progress', { percent: progress.percent.toFixed(1) })
    updateStatus = {
      ...updateStatus,
      status: 'downloading',
      downloadProgress: progress.percent,
      downloadSpeed: progress.bytesPerSecond,
      downloadEta: progress.bytesPerSecond > 0 ? (progress.total - progress.transferred) / progress.bytesPerSecond : 0,
      error: null,
    }
    mainWindow.webContents.send('updater:progress', progress)
    notifyRenderer()
  })

  autoUpdater.on('update-downloaded', (info: UpdateDownloadedEvent) => {
    log.info('Update downloaded', { version: info.version })

    // Пока качали — нашли версию новее, немедленно скачиваем её
    if (newerVersionFoundDuringDownload) {
      newerVersionFoundDuringDownload = false
      const newerVersion = updateStatus.updateInfo?.version ?? '?'
      log.info('Загрузка завершена, но есть более новая версия — скачиваем её', {
        downloaded: info.version,
        newer: newerVersion,
      })
      updateStatus = { ...updateStatus, status: 'downloading', downloadProgress: 0, downloadSpeed: 0, downloadEta: 0 }
      notifyRenderer()
      autoUpdater.downloadUpdate().catch((err: unknown) => log.error('Ошибка скачивания новой версии', { err }))
      return
    }

    updateStatus = {
      ...updateStatus,
      status: 'downloaded',
      downloadProgress: 100,
      updateInfo: info,
      error: null,
    }
    mainWindow.webContents.send('updater:downloaded', info)
    notifyRenderer()

    // НЕ показываем блокирующий диалог - renderer покажет toast уведомление
    // Пользователь сам решит когда устанавливать через UI
  })

  autoUpdater.on('error', (error) => {
    const friendlyMessage = formatUpdateError(error)
    log.error('Update error', { message: friendlyMessage })
    updateStatus = { ...updateStatus, status: 'error', error: friendlyMessage }
    mainWindow.webContents.send('updater:error', friendlyMessage)
    notifyRenderer()
  })

  // НЕ проверяем обновления автоматически!
  // Renderer сам вызовет checkForUpdates() если autoCheck включён в настройках
  // См. use-update-notifications.ts
}

/**
 * Проверить наличие обновлений
 */
export async function checkForUpdates(): Promise<void> {
  try {
    await autoUpdater.checkForUpdates()
  } catch {
    // Ошибка проверки обновлений — игнорируем
  }
}

/**
 * Скачать обновление
 */
export async function downloadUpdate(): Promise<void> {
  try {
    await autoUpdater.downloadUpdate()
  } catch {
    // Ошибка скачивания — игнорируем
  }
}

/**
 * Установить скачанное обновление и перезапустить
 */
export function installUpdate(): void {
  autoUpdater.quitAndInstall(false, true)
}
