/**
 * Electron main process — точка входа KamiKeyThe
 *
 * Заменяет src/index.ts. Управляет жизненным циклом приложения,
 * Electron Tray (вместо systray2), окнами редактора и настроек.
 * Koffi модули (hotkeys, overlay, notification) работают без изменений.
 */

import { app, BrowserWindow, Menu, Tray } from 'electron'
import path from 'path'
import { cycleLayout, loadConfig, saveConfig } from '../src/config'
import { setAppProfiles, setExcludedProcesses } from '../src/exclusions'
import {
  destroyHotkeyWindow,
  initHotkeyWindow,
  registerHotkeys,
  registerSystemHotkeys,
  reloadHotkeys,
  setCharSentCallback,
  setLayoutCharCallback,
  setOverlayCallbacks,
  setSystemHotkeyCallbacks,
  startMessagePump,
  stopMessagePump,
  unregisterHotkeys,
  unregisterSystemHotkeys,
} from '../src/hotkeys'
import { getActiveLayoutName, getKeymap, getShiftKeymap, updateKeymap } from '../src/keymap'
import { getCurrentLayout, logLayoutInfo } from '../src/layout'
import { destroyNotification, initNotification, showNotification } from '../src/notification'
import { destroyOverlay, hideOverlay, initOverlay, rebuildVkMap, showOverlay } from '../src/overlay'
import { incrementStat, initStats, shutdownStats } from '../src/stats'
import type { KeymapConfig } from '../src/types'
import { loadAppIconPath, loadTrayIcon } from './app-icon'
import { registerAllHandlers } from './ipc'
import { checkForUpdatesManually, initAutoUpdater } from './updater'
import { editorWindowOptions, watchNativeTheme } from './window-chrome'

/** Текущий конфиг (мутабельный — обновляется при cycleLayout / save) */
let config: KeymapConfig

/** Состояние хоткеев */
let hotkeysEnabled = true

/** Electron объекты */
let tray: Tray | null = null
let editorWindow: BrowserWindow | null = null

/** URL Vite dev server (задаётся через env) */
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

// === Управление конфигом (экспортируется для IPC) ===

export function getConfig(): KeymapConfig {
  return config
}

export function applyConfig(newConfig: KeymapConfig): void {
  config = newConfig
  saveConfig(config)
  reloadHotkeys(config)
  rebuildVkMap()
  if (config.appProfiles?.length) {
    setAppProfiles(config.appProfiles)
  }
  setExcludedProcesses(newConfig.excludedProcesses ?? [])

  // Уведомить renderer об изменении конфига
  broadcastConfigChanged()
}

export function doCycleLayout(): KeymapConfig {
  config = cycleLayout(config)
  saveConfig(config)
  reloadHotkeys(config)
  rebuildVkMap()
  if (config.appProfiles?.length) {
    setAppProfiles(config.appProfiles)
  }
  return config
}

export function isHotkeyEnabled(): boolean {
  return hotkeysEnabled
}

export function setHotkeyEnabled(on: boolean): void {
  if (on === hotkeysEnabled) {
    return
  }
  hotkeysEnabled = on
  if (on) {
    registerHotkeys()
    startMessagePump()
    console.log('Перехват AltGr включён')
  } else {
    stopMessagePump()
    unregisterHotkeys()
    console.log('Перехват AltGr выключен')
  }
  updateTrayMenu()
  broadcastHotkeyEnabledChanged()
}

/** Отправить состояние перехвата во все окна renderer — трей и переключатель в шапке синхронны */
function broadcastHotkeyEnabledChanged(): void {
  const windows = BrowserWindow.getAllWindows()
  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.webContents.send('system:hotkeyEnabledChanged', hotkeysEnabled)
    }
  }
}

/** Отправить обновлённый конфиг во все окна renderer */
function broadcastConfigChanged(): void {
  const windows = BrowserWindow.getAllWindows()
  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.webContents.send('config:changed', config)
    }
  }
}

// === Управление окнами ===

function getPreloadPath(): string {
  return path.join(__dirname, 'preload.js')
}

export function openEditorWindow(page: 'editor' | 'settings' = 'editor'): void {
  if (editorWindow && !editorWindow.isDestroyed()) {
    // Окно уже открыто — переключаем страницу через IPC, не перезагружаем (иначе теряются
    // несохранённые правки в редакторе)
    if (editorWindow.isMinimized()) {
      editorWindow.restore()
    }
    editorWindow.webContents.send('app:navigate', page)
    editorWindow.show()
    editorWindow.focus()
    return
  }

  editorWindow = new BrowserWindow(editorWindowOptions(loadAppIconPath(), getPreloadPath()))
  editorWindow.removeMenu()

  editorWindow.once('ready-to-show', () => {
    editorWindow?.show()
  })

  if (VITE_DEV_SERVER_URL) {
    editorWindow.loadURL(`${VITE_DEV_SERVER_URL}#${page}`)
    editorWindow.webContents.openDevTools()
  } else {
    editorWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'), { hash: page })
  }

  editorWindow.on('closed', () => {
    editorWindow = null
  })
}

/** Настройки заменены редактором — перенаправляем */
export function openSettingsWindow(): void {
  openEditorWindow()
}

// === Tray ===

function createTray(): void {
  tray = new Tray(loadTrayIcon())
  tray.setToolTip('KamiKeyThe — типографские символы через AltGr')

  // Даблклик по иконке → открыть редактор
  tray.on('double-click', () => openEditorWindow())

  updateTrayMenu()
}

function updateTrayMenu(): void {
  if (!tray) {
    return
  }

  const autostartEnabled = app.getLoginItemSettings().openAtLogin

  const menu = Menu.buildFromTemplate([
    {
      label: hotkeysEnabled ? 'Включено' : 'Выключено',
      type: 'checkbox',
      checked: hotkeysEnabled,
      click: () => setHotkeyEnabled(!hotkeysEnabled),
    },
    { type: 'separator' },
    {
      label: '\u2328 Редактор',
      click: () => openEditorWindow(),
    },
    {
      label: '\u2699 Настройки',
      click: () => openEditorWindow('settings'),
    },
    { type: 'separator' },
    {
      label: 'Проверить обновления',
      click: () => void checkForUpdatesManually(),
    },
    { type: 'separator' },
    {
      label: 'Автозагрузка',
      type: 'checkbox',
      checked: autostartEnabled,
      click: () => {
        app.setLoginItemSettings({ openAtLogin: !autostartEnabled })
        updateTrayMenu()
      },
    },
    {
      label: 'Выход',
      click: () => app.quit(),
    },
  ])

  tray.setContextMenu(menu)
}

// === Graceful shutdown ===

function shutdown(): void {
  console.log('\nЗавершение...')
  stopMessagePump()
  unregisterHotkeys()
  unregisterSystemHotkeys()
  destroyHotkeyWindow()
  shutdownStats()
  destroyNotification()
  destroyOverlay()

  // Уничтожить трей чтобы процесс мог завершиться
  if (tray) {
    tray.destroy()
    tray = null
  }
}

// === Запуск приложения ===

app.whenReady().then(() => {
  console.log(`KamiKeyThe v${app.getVersion()} — запуск...`)
  console.log(`Платформа: ${process.platform} ${process.arch}`)
  console.log(`Electron: ${process.versions.electron}, Node: ${process.version}`)
  console.log()

  // Детекция раскладки клавиатуры
  logLayoutInfo()
  console.log()

  // Загрузить конфиг и маппинги
  config = loadConfig()
  updateKeymap(config)
  if (config.appProfiles?.length) {
    setAppProfiles(config.appProfiles)
    console.log(`Per-app профили: ${config.appProfiles.length}`)
  }
  setExcludedProcesses(config.excludedProcesses ?? [])
  if (config.excludedProcesses?.length) {
    console.log(`Исключения: ${config.excludedProcesses.length} процессов`)
  }
  console.log(`Раскладка: ${getActiveLayoutName()} (${config.layouts.length} доступно)`)
  console.log()

  // Статистика использования
  initStats()

  // Скрытое окно для приёма WM_HOTKEY (Electron-совместимость)
  initHotkeyWindow()

  // Регистрация хоткеев
  console.log('Регистрация хоткеев:')
  registerHotkeys()
  console.log()

  // Системные хоткеи (AltGr+Ё, AltGr+Shift+Ё) — независимы от toggle
  console.log('Системные хоткеи:')
  registerSystemHotkeys()
  console.log()

  // Инициализация GUI (GDI overlay + notification)
  initOverlay()
  rebuildVkMap()
  setOverlayCallbacks(() => {
    showOverlay()
    // Раскладка проверяется в момент показа overlay (а не только при старте) — см. PLAN.md
    // «Сигнализация о несовместимой раскладке»: US English физически не синтезирует AltGr
    const layout = getCurrentLayout()
    if (!layout.hasAltGr) {
      showNotification(`AltGr не работает — раскладка ${layout.name}`, {
        width: 480,
        durationMs: 2500,
      })
    }
  }, hideOverlay)
  setCharSentCallback(incrementStat)
  setLayoutCharCallback((layoutName, hotkeyId) => {
    const layout = config.layouts.find((l) => l.name === layoutName)
    if (!layout) {
      return undefined
    }
    const keymap = getKeymap()
    const shiftKeymap = getShiftKeymap()
    if (hotkeyId < keymap.length) {
      const srcMapping = keymap[hotkeyId]
      if (!srcMapping) {
        return undefined
      }
      const targetMapping = layout.mappings.find((m) => m.vk === srcMapping.vk)
      return targetMapping?.char
    }
    const shiftIndex = hotkeyId - keymap.length
    const srcShift = shiftKeymap[shiftIndex]
    if (!srcShift) {
      return undefined
    }
    const targetMapping = layout.mappings.find((m) => m.vk === srcShift.vk)
    return targetMapping?.shiftChar
  })
  initNotification()

  // Колбэки системных хоткеев
  setSystemHotkeyCallbacks(
    // AltGr+Ё → переключить раскладку
    () => {
      config = doCycleLayout()
      const name = getActiveLayoutName()
      showNotification(`Раскладка: ${name}`)
      console.log(`Раскладка переключена: ${name}`)
      broadcastConfigChanged()
    },
    // AltGr+Shift+Ё → открыть редактор
    () => {
      openEditorWindow()
    },
  )

  // Запускаем message pump
  startMessagePump()

  // Регистрируем IPC handlers
  registerAllHandlers()

  // Создаём иконку в трее
  createTray()

  // Автообновление — тихая проверка при старте (10с задержка), см. main/updater.ts
  initAutoUpdater()

  // Синхронизация titleBarOverlay/фона окна с системной темой Windows
  watchNativeTheme(() => (editorWindow ? [editorWindow] : []))

  // В dev открываем окно редактора сразу — иначе его видно только через трей/хоткей
  if (VITE_DEV_SERVER_URL) {
    openEditorWindow()
  }

  console.log('KamiKeyThe активен. Используйте AltGr+клавиша для ввода символов.')
})

// Приложение живёт в трее — не закрываем при закрытии всех окон
app.on('window-all-closed', () => {
  // Ничего — app живёт в трее
})

app.on('before-quit', () => {
  shutdown()
})

// Гарантированный выход — если process не завершается за 3 секунды, форсируем
app.on('quit', () => {
  setTimeout(() => process.exit(0), 3000)
})
