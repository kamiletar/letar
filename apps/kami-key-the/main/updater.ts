/**
 * Автообновление через electron-updater — источник GitHub Releases.
 *
 * ⚠️ НЕ используем встроенный GithubProvider электрон-апдейтера напрямую — `kamiletar/letar`
 * общий для нескольких приложений, репозиторий-wide `/releases/latest` вернёт чужой релиз.
 * Разбор и общая реализация обхода — `@letar/electron-monorepo-updater`
 * (`.claude/docs/electron-monorepo-shared-releases.md`).
 *
 * Диалоговый UX (не toast/renderer-стрим, как у animatrona) — по образцу
 * label-printer-desktop: у KamiKeyThe нет постоянно открытого окна (приложение живёт в трее).
 */

import { pointFeedAtOwnRelease } from '@letar/electron-monorepo-updater'
import { app, dialog, net } from 'electron'
import { autoUpdater, type UpdateInfo } from 'electron-updater'

const REPO_OWNER = 'kamiletar'
const REPO_NAME = 'letar'
const TAG_PREFIX = 'kami-key-the-v'

let initialized = false

function configureLogger(): void {
  autoUpdater.logger = {
    info: (message: string) => console.log(`[Updater] ${message}`),
    warn: (message: string) => console.warn(`[Updater] ${message}`),
    error: (message: string) => console.error(`[Updater] ${message}`),
    debug: (message: string) => console.log(`[Updater:debug] ${message}`),
  }
}

/** Направить electron-updater на релиз конкретно KamiKeyThe (не repo-wide "latest") */
function pointOwnFeed(): Promise<boolean> {
  return pointFeedAtOwnRelease(autoUpdater, {
    fetchFn: net.fetch,
    owner: REPO_OWNER,
    repo: REPO_NAME,
    tagPrefix: TAG_PREFIX,
    userAgent: 'KamiKeyThe-Update-Client',
    onNotFound: (message) => console.warn(`[Updater] ${message}`),
  })
}

/**
 * Инициализация автообновления — вызывать один раз из app.whenReady().
 * В dev-режиме (не упаковано) ничего не делает.
 */
export function initAutoUpdater(): void {
  if (!app.isPackaged) {
    console.log('[Updater] Dev-режим — проверка обновлений пропущена')
    return
  }
  if (initialized) {
    return
  }
  initialized = true

  configureLogger()
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    void dialog
      .showMessageBox({
        type: 'info',
        title: 'Доступно обновление',
        message: `Доступна новая версия KamiKeyThe ${info.version}`,
        detail: 'Скачать и установить сейчас?',
        buttons: ['Скачать', 'Позже'],
        defaultId: 0,
        cancelId: 1,
      })
      .then((result) => {
        if (result.response === 0) {
          void autoUpdater.downloadUpdate()
        }
      })
  })

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    void dialog
      .showMessageBox({
        type: 'info',
        title: 'Обновление готово',
        message: `Версия ${info.version} скачана`,
        detail: 'Перезапустить приложение для установки?',
        buttons: ['Перезапустить', 'Позже'],
        defaultId: 0,
        cancelId: 1,
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall()
        }
      })
  })

  autoUpdater.on('error', (err) => {
    console.error(`[Updater] ${err.message}`)
  })

  // Тихая проверка при старте — без диалога «обновлений нет», чтобы не мешать
  // (приложение живёт в трее, пользователь не ждёт ответа на этот вызов)
  setTimeout(() => {
    pointOwnFeed()
      .then((found) => {
        if (found) {
          return autoUpdater.checkForUpdates()
        }
        return undefined
      })
      .catch((err: unknown) => {
        console.error('[Updater] Ошибка проверки при старте:', err)
      })
  }, 10_000)
}

/**
 * Проверка по требованию (пункт меню трея «Проверить обновления») —
 * в отличие от тихой стартовой проверки, всегда показывает результат.
 */
export async function checkForUpdatesManually(): Promise<void> {
  if (!app.isPackaged) {
    await dialog.showMessageBox({
      type: 'info',
      title: 'Проверка обновлений',
      message: 'Недоступно в режиме разработки',
    })
    return
  }

  try {
    const found = await pointOwnFeed()
    if (!found) {
      await dialog.showMessageBox({
        type: 'info',
        title: 'Обновлений нет',
        message: `Релизы KamiKeyThe не найдены (у вас установлена ${app.getVersion()})`,
      })
      return
    }

    const result = await autoUpdater.checkForUpdates()
    if (!result?.updateInfo || result.updateInfo.version === app.getVersion()) {
      await dialog.showMessageBox({
        type: 'info',
        title: 'Обновлений нет',
        message: `У вас установлена последняя версия (${app.getVersion()})`,
      })
    }
    // Если обновление доступно — диалог со скачиванием покажет обработчик update-available выше
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await dialog.showMessageBox({
      type: 'error',
      title: 'Ошибка проверки обновлений',
      message,
    })
  }
}
