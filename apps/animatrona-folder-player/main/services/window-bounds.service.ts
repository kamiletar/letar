/**
 * Запоминание размера, позиции и maximized/fullscreen-состояния главного окна между
 * запусками — `@letar/electron-storage` (JSON-файл в userData).
 */
import { createJsonStore } from '@letar/electron-storage'
import type { BrowserWindow, Rectangle } from 'electron'
import { screen } from 'electron'

export interface WindowBoundsState {
  bounds: Rectangle
  isMaximized: boolean
  isFullScreen: boolean
}

const DEFAULT_BOUNDS: Rectangle = { x: 0, y: 0, width: 1100, height: 780 }

const DEFAULT_STATE: WindowBoundsState = {
  bounds: DEFAULT_BOUNDS,
  isMaximized: false,
  isFullScreen: false,
}

const store = createJsonStore<WindowBoundsState>('window-bounds.json', DEFAULT_STATE, {
  mergeDefaults: true,
})

/** Пересекается ли прямоугольник хотя бы с одним реальным дисплеем (окно не улетело за экран) */
function isOnScreen(bounds: Rectangle): boolean {
  return screen.getAllDisplays().some((display) => {
    const area = display.workArea
    return (
      bounds.x < area.x + area.width
      && bounds.x + bounds.width > area.x
      && bounds.y < area.y + area.height
      && bounds.y + bounds.height > area.y
    )
  })
}

/**
 * Сохранённое состояние окна, провалидированное против текущих дисплеев — например после
 * отключения второго монитора, на котором окно было в прошлый раз.
 */
export function getInitialWindowState(): WindowBoundsState {
  const state = store.loadSync()
  if (!isOnScreen(state.bounds)) {
    return { ...state, bounds: DEFAULT_BOUNDS }
  }
  return state
}

/**
 * Подписка на события окна — сохраняет нормальные (не maximized) bounds при resize/move и
 * maximized/fullscreen-флаги при их смене. Дебаунс на resize/move — иначе перетаскивание
 * окна пишет на диск на каждый пиксель.
 */
export function trackWindowBounds(window: BrowserWindow): void {
  let saveTimer: NodeJS.Timeout | null = null

  const saveNow = () => {
    if (window.isDestroyed()) {
      return
    }
    store.saveSync({
      bounds: window.isMaximized() || window.isFullScreen() ? store.loadSync().bounds : window.getBounds(),
      isMaximized: window.isMaximized(),
      isFullScreen: window.isFullScreen(),
    })
  }

  const scheduleSave = () => {
    if (saveTimer) {
      clearTimeout(saveTimer)
    }
    saveTimer = setTimeout(saveNow, 500)
  }

  window.on('resize', scheduleSave)
  window.on('move', scheduleSave)
  window.on('maximize', saveNow)
  window.on('unmaximize', saveNow)
  window.on('enter-full-screen', saveNow)
  window.on('leave-full-screen', saveNow)
  window.on('close', () => {
    if (saveTimer) {
      clearTimeout(saveTimer)
    }
    saveNow()
  })
}
