/**
 * Модуль системного трея для Animatrona
 *
 * Функционал:
 * - Иконка в системном трее
 * - Контекстное меню
 * - Минимизация в трей
 * - Уведомления о прогрессе
 * - Сохранение настроек
 */

import type { BrowserWindow } from 'electron'
import { app, Menu, nativeImage, Tray } from 'electron'
import path from 'path'

import type { TraySettings } from './ipc/tray.handlers'

let tray: Tray | null = null
let mainWindowRef: BrowserWindow | null = null

// Настройки трея (синхронизируются с БД через IPC)
let traySettings: TraySettings = {
  minimizeToTray: true,
  closeToTray: true,
  showTrayNotification: true,
}

// Флаг: показывали ли уведомление о сворачивании в эту сессию
let notificationShownThisSession = false

/**
 * Получить путь к иконке трея
 * Для Windows используем .ico, для остальных .png
 */
function getTrayIconPath(isProd: boolean): string {
  const iconName = process.platform === 'win32' ? 'icon.ico' : 'icon.png'

  if (isProd) {
    return path.join(process.resourcesPath, iconName)
  }
  return path.join(__dirname, '..', 'resources', iconName)
}

/**
 * Создать контекстное меню трея
 */
function createContextMenu(mainWindow: BrowserWindow | null): Menu {
  return Menu.buildFromTemplate([
    {
      label: 'Показать Animatrona',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Библиотека',
      click: () => {
        mainWindow?.show()
        mainWindow?.webContents.send('navigate', '/library')
      },
    },
    {
      label: 'Очередь импорта',
      click: () => {
        mainWindow?.show()
        mainWindow?.webContents.send('navigate', '/transcode')
      },
    },
    { type: 'separator' },
    {
      label: 'Настройки',
      click: () => {
        mainWindow?.show()
        mainWindow?.webContents.send('navigate', '/settings')
      },
    },
    { type: 'separator' },
    {
      label: traySettings.closeToTray ? 'Закрытие в трей: Вкл' : 'Закрытие в трей: Выкл',
      type: 'checkbox',
      checked: traySettings.closeToTray,
      click: () => {
        traySettings.closeToTray = !traySettings.closeToTray
        // Обновляем меню
        if (tray) {
          tray.setContextMenu(createContextMenu(mainWindow))
        }
        // Синхронизируем с renderer (сохранение в БД)
        mainWindow?.webContents.send('tray:settingsChanged', traySettings)
      },
    },
    { type: 'separator' },
    {
      label: 'Выход',
      click: () => {
        // Принудительный выход
        traySettings.closeToTray = false
        app.quit()
      },
    },
  ])
}

/**
 * Инициализация системного трея
 */
export function initTray(mainWindow: BrowserWindow, isProd: boolean): Tray {
  mainWindowRef = mainWindow
  const iconPath = getTrayIconPath(isProd)

  // Создаём иконку
  const icon = nativeImage.createFromPath(iconPath)

  // Для Windows/Linux масштабируем иконку
  const trayIcon = icon.resize({ width: 16, height: 16 })

  tray = new Tray(trayIcon)

  // Устанавливаем tooltip
  tray.setToolTip('Animatrona - Media Transcoder')

  // Контекстное меню
  tray.setContextMenu(createContextMenu(mainWindow))

  // Двойной клик — показать окно (Windows)
  tray.on('double-click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus()
      } else {
        mainWindow.show()
      }
    }
  })

  // Обработка закрытия окна — минимизировать в трей
  mainWindow.on('close', (event) => {
    if (traySettings.closeToTray && !app.isQuitting) {
      event.preventDefault()
      mainWindow.hide()

      // Показываем уведомление (только первый раз за сессию)
      if (traySettings.showTrayNotification && !notificationShownThisSession && tray && !tray.isDestroyed()) {
        if (process.platform === 'win32') {
          tray.displayBalloon({
            title: 'Animatrona',
            content: 'Приложение продолжает работать в фоне',
            iconType: 'info',
          })
        }
        notificationShownThisSession = true
      }
    }
  })

  return tray
}

/**
 * Обновить tooltip трея (для показа прогресса)
 */
export function updateTrayTooltip(message: string): void {
  if (tray && !tray.isDestroyed()) {
    tray.setToolTip(message)
  }
}

/**
 * Уничтожить трей
 */
export function destroyTray(): void {
  if (tray && !tray.isDestroyed()) {
    tray.destroy()
    tray = null
  }
}

/**
 * Получить текущие настройки трея
 */
export function getTraySettings(): TraySettings {
  return { ...traySettings }
}

/**
 * Обновить настройки трея (вызывается из IPC handler)
 */
export function updateTraySettings(settings: Partial<TraySettings>): void {
  traySettings = { ...traySettings, ...settings }

  // Обновляем контекстное меню если изменилась настройка closeToTray
  if ('closeToTray' in settings && tray && mainWindowRef) {
    tray.setContextMenu(createContextMenu(mainWindowRef))
  }
}

/**
 * Установить начальные настройки трея (вызывается при загрузке из БД)
 */
export function setInitialTraySettings(settings: TraySettings): void {
  traySettings = settings

  // Обновляем контекстное меню
  if (tray && mainWindowRef) {
    tray.setContextMenu(createContextMenu(mainWindowRef))
  }
}

// Обратная совместимость с предыдущими версиями
export function isMinimizeToTray(): boolean {
  return traySettings.minimizeToTray
}

export function setMinimizeToTray(value: boolean): void {
  traySettings.minimizeToTray = value
}
