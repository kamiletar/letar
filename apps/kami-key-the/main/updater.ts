/**
 * Автообновление через electron-updater — источник GitHub Releases
 * (тот же provider, что уже настроен в electron-builder.yml: publish.provider=github).
 *
 * Диалоговый UX по образцу label-printer-desktop (main/services/updater.service.ts) — не
 * toast/renderer-интеграция, как у animatrona: у KamiKeyThe нет постоянно открытого окна
 * (приложение живёт в трее), поэтому статус обновления некуда стримить, когда окно закрыто.
 */

import { app, dialog } from 'electron'
import { autoUpdater, type UpdateInfo } from 'electron-updater'

let initialized = false

function configureLogger(): void {
  autoUpdater.logger = {
    info: (message: string) => console.log(`[Updater] ${message}`),
    warn: (message: string) => console.warn(`[Updater] ${message}`),
    error: (message: string) => console.error(`[Updater] ${message}`),
    debug: (message: string) => console.log(`[Updater:debug] ${message}`),
  }
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
    autoUpdater.checkForUpdates().catch((err: unknown) => {
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
