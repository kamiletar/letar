/**
 * Deep Link Service
 *
 * Обрабатывает animatrona:// URL для приглашений в Watch Party и других функций.
 *
 * Формат URL:
 * - animatrona://import/<manifestCid> — импортировать аниме по CID
 * - animatrona://party/join/<roomId> — присоединиться к Watch Party
 * - animatrona://friend/add/<friendCode> — добавить друга
 */

import { app, BrowserWindow, Notification } from 'electron'
import * as path from 'path'

import type { WatchPartyInvite } from '../../shared/types/orbitdb'
import { createModuleLogger } from '../utils/logger'

const log = createModuleLogger('DeepLink')

/**
 * Интерфейс для обработанного deep link
 */
export interface DeepLinkAction {
  type: 'import' | 'party_join' | 'friend_add' | 'unknown'
  data: Record<string, string>
}

/**
 * Callback для обработки deep link в renderer
 */
type DeepLinkCallback = (action: DeepLinkAction) => void

/**
 * Deep Link Service
 *
 * Singleton для управления deep links.
 */
class DeepLinkService {
  private callback: DeepLinkCallback | null = null
  private pendingAction: DeepLinkAction | null = null
  private isInitialized = false

  /**
   * Инициализирует обработку deep links
   *
   * Должен вызываться один раз при запуске приложения.
   */
  initialize(): void {
    if (this.isInitialized) {
      return
    }
    this.isInitialized = true

    // Регистрируем протокол animatrona://
    // На Windows/Linux это создаёт ассоциацию с приложением
    if (process.defaultApp) {
      // В dev режиме передаём путь к electron
      if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient('animatrona', process.execPath, [process.argv[1]])
      }
    } else {
      // В production просто регистрируем
      app.setAsDefaultProtocolClient('animatrona')
    }

    // macOS: обработка URL через событие
    app.on('open-url', (event, url) => {
      event.preventDefault()
      this.handleDeepLink(url)
    })

    // Windows/Linux: проверяем аргументы при запуске
    // Если приложение уже запущено, new instance получит URL через second-instance
    const gotTheLock = app.requestSingleInstanceLock()

    if (!gotTheLock) {
      // Другой instance уже запущен — передаём URL ему и закрываемся
      app.quit()
      return
    }

    app.on('second-instance', (_event, argv) => {
      // Windows/Linux: URL приходит в argv
      const url = argv.find((arg) => arg.startsWith('animatrona://'))
      if (url) {
        this.handleDeepLink(url)
      }

      // Разворачиваем и фокусируем окно (могло быть скрыто в трей или минимизировано)
      const mainWindow = BrowserWindow.getAllWindows()[0]
      if (mainWindow) {
        if (mainWindow.isMinimized()) {
          mainWindow.restore()
        }
        if (!mainWindow.isVisible()) {
          mainWindow.show()
        }
        mainWindow.focus()
      }
    })

    // Проверяем URL при первом запуске (Windows/Linux)
    const launchUrl = process.argv.find((arg) => arg.startsWith('animatrona://'))
    if (launchUrl) {
      // Откладываем обработку до готовности renderer
      this.pendingAction = this.parseDeepLink(launchUrl)
    }
  }

  /**
   * Устанавливает callback для обработки deep links
   *
   * Вызывается из renderer через IPC.
   */
  setCallback(callback: DeepLinkCallback): void {
    this.callback = callback

    // Если есть отложенный action — отправляем его
    if (this.pendingAction) {
      callback(this.pendingAction)
      this.pendingAction = null
    }
  }

  /**
   * Убирает callback
   */
  removeCallback(): void {
    this.callback = null
  }

  /**
   * Обрабатывает deep link URL
   */
  private handleDeepLink(url: string): void {
    log.info('Received deep link', { url })

    const action = this.parseDeepLink(url)

    if (this.callback) {
      this.callback(action)
    } else {
      // Renderer ещё не готов — сохраняем
      this.pendingAction = action
    }

    // Фокусируем окно
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore()
      }
      mainWindow.focus()
    }
  }

  /**
   * Парсит deep link URL
   */
  private parseDeepLink(url: string): DeepLinkAction {
    try {
      // animatrona://import/<manifestCid>
      // animatrona://party/join/<roomId>
      // animatrona://friend/add/<friendCode>
      //
      // new URL('animatrona://import/Qm...') парсит 'import' как hostname,
      // а '/Qm...' как pathname. Собираем все сегменты из hostname + pathname.
      const parsed = new URL(url)
      const pathParts = [parsed.hostname, ...parsed.pathname.split('/').filter(Boolean)]

      // Импорт аниме по CID манифеста
      if (pathParts[0] === 'import' && pathParts[1]) {
        return {
          type: 'import',
          data: { manifestCid: pathParts[1] },
        }
      }

      if (pathParts[0] === 'party' && pathParts[1] === 'join' && pathParts[2]) {
        return {
          type: 'party_join',
          data: { roomId: pathParts[2] },
        }
      }

      if (pathParts[0] === 'friend' && pathParts[1] === 'add' && pathParts[2]) {
        return {
          type: 'friend_add',
          data: { friendCode: pathParts[2] },
        }
      }

      return { type: 'unknown', data: { url } }
    } catch {
      return { type: 'unknown', data: { url } }
    }
  }

  /**
   * Генерирует invite link для Watch Party
   */
  generateWatchPartyInvite(roomId: string, roomName: string, hostName: string, animeName: string): WatchPartyInvite {
    const deepLink = `animatrona://party/join/${roomId}`
    const now = Date.now()

    return {
      roomId,
      roomName,
      hostName,
      animeName,
      deepLink,
      createdAt: now,
      expiresAt: now + 24 * 60 * 60 * 1000, // 24 часа
    }
  }

  /**
   * Генерирует deep link для добавления друга
   */
  generateFriendLink(friendCode: string): string {
    return `animatrona://friend/add/${friendCode}`
  }

  /**
   * Показывает системное уведомление о приглашении
   */
  showInviteNotification(invite: WatchPartyInvite): void {
    if (!Notification.isSupported()) {
      return
    }

    const notification = new Notification({
      title: 'Приглашение в Watch Party',
      body: `${invite.hostName} приглашает смотреть "${invite.animeName}"`,
      icon: path.join(app.isPackaged ? process.resourcesPath : app.getAppPath(), 'resources', 'icon.png'),
    })

    notification.on('click', () => {
      // Переходим к комнате
      if (this.callback) {
        this.callback({
          type: 'party_join',
          data: { roomId: invite.roomId },
        })
      }
    })

    notification.show()
  }
}

// Singleton instance
let instance: DeepLinkService | null = null

/**
 * Получить singleton instance DeepLinkService
 */
export function getDeepLinkService(): DeepLinkService {
  if (!instance) {
    instance = new DeepLinkService()
  }
  return instance
}
