/**
 * Автообновление через electron-updater — источник GitHub Releases.
 *
 * ⚠️ НЕ используем встроенный GithubProvider электрон-апдейтера напрямую.
 * `kamiletar/letar` — общий монорепо-репозиторий: animatrona публикует туда же свои релизы.
 * `GithubProvider.getLatestTagName()` всегда бьёт в репозиторий-wide
 * `GET /repos/{owner}/{repo}/releases/latest` — это САМЫЙ СВЕЖИЙ релиз ВСЕГО репозитория,
 * не конкретного приложения. Если animatrona выпустит релиз позже, чем последний релиз
 * KamiKeyThe, автообновление KamiKeyThe найдёт релиз animatrona (более новый по дате) и
 * предложит скачать/установить его инсталлятор — подмена приложения при апдейте.
 *
 * Поэтому сами находим свой тег по префиксу `kami-key-the-v` через список релизов
 * (`GET /releases`, не `/releases/latest`) и подставляем electron-updater
 * `generic`-провайдер с URL конкретного релиза — дальше вся стандартная механика
 * (проверка sha512, blockmap-diff, `quitAndInstall`) работает как обычно, просто указана
 * на правильный релиз явно, а не через репозиторий-wide эвристику.
 *
 * Диалоговый UX (не toast/renderer-стрим, как у animatrona) — по образцу
 * label-printer-desktop: у KamiKeyThe нет постоянно открытого окна (приложение живёт в трее).
 */

import { app, dialog, net } from 'electron'
import { autoUpdater, type UpdateInfo } from 'electron-updater'

const REPO_OWNER = 'kamiletar'
const REPO_NAME = 'letar'
const TAG_PREFIX = 'kami-key-the-v'

interface GithubReleaseSummary {
  tag_name: string
  draft: boolean
  prerelease: boolean
}

let initialized = false

function configureLogger(): void {
  autoUpdater.logger = {
    info: (message: string) => console.log(`[Updater] ${message}`),
    warn: (message: string) => console.warn(`[Updater] ${message}`),
    error: (message: string) => console.error(`[Updater] ${message}`),
    debug: (message: string) => console.log(`[Updater:debug] ${message}`),
  }
}

/** Найти тег последнего релиза именно KamiKeyThe в общем репозитории kamiletar/letar */
async function findOwnLatestTag(): Promise<string | null> {
  const response = await net.fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases?per_page=50`, {
    headers: { 'User-Agent': 'KamiKeyThe-Update-Client', Accept: 'application/vnd.github+json' },
  })
  if (!response.ok) {
    throw new Error(`GitHub API вернул ${response.status}`)
  }
  // GitHub возвращает релизы отсортированными по дате публикации (свежие первыми)
  const releases = (await response.json()) as GithubReleaseSummary[]
  const own = releases.find((r) => !r.draft && !r.prerelease && r.tag_name.startsWith(TAG_PREFIX))
  return own?.tag_name ?? null
}

/**
 * Направить electron-updater на релиз конкретно KamiKeyThe (не repo-wide "latest").
 * Возвращает false, если свой релиз не найден (например, ни разу не публиковались).
 */
async function pointFeedAtOwnRelease(): Promise<boolean> {
  const tag = await findOwnLatestTag()
  if (!tag) {
    console.warn(`[Updater] Не найден релиз с префиксом тега "${TAG_PREFIX}" в ${REPO_OWNER}/${REPO_NAME}`)
    return false
  }
  autoUpdater.setFeedURL({
    provider: 'generic',
    url: `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/download/${tag}`,
  })
  return true
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
    pointFeedAtOwnRelease()
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
    const found = await pointFeedAtOwnRelease()
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
