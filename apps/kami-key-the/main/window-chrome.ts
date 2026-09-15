/**
 * Оформление окна редактора: titleBarOverlay (нативные кнопки Windows + своя HTML-шапка) и
 * синхронизация с системной темой.
 *
 * Почему titleBarOverlay, а не frame:false с HTML-кнопками — сохраняет Snap Layouts при
 * наведении на «развернуть» (см. .claude/docs/electron-window-controls-overlay-pattern.md).
 */

import { type BrowserWindow, type BrowserWindowConstructorOptions, nativeTheme } from 'electron'
import { TITLE_BAR_HEIGHT, WINDOW_THEME } from '../shared/window-chrome'

/** Опции BrowserWindow для окна редактора */
export function editorWindowOptions(iconPath: string, preloadPath: string): BrowserWindowConstructorOptions {
  const theme = nativeTheme.shouldUseDarkColors ? WINDOW_THEME.dark : WINDOW_THEME.light
  return {
    width: 1180,
    height: 800,
    minWidth: 920,
    minHeight: 620,
    title: 'KamiKeyThe',
    icon: iconPath,
    backgroundColor: theme.background,
    show: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      // Прозрачный фон — под системными кнопками видна наша HTML-шапка, не полоса другого цвета
      color: '#00000000',
      symbolColor: theme.symbol,
      height: TITLE_BAR_HEIGHT,
    },
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  }
}

/** Применить текущую системную тему к titleBarOverlay и фону уже открытого окна */
export function applyWindowTheme(win: BrowserWindow): void {
  if (win.isDestroyed()) {
    return
  }
  const theme = nativeTheme.shouldUseDarkColors ? WINDOW_THEME.dark : WINDOW_THEME.light
  win.setTitleBarOverlay({
    color: '#00000000',
    symbolColor: theme.symbol,
    height: TITLE_BAR_HEIGHT,
  })
  win.setBackgroundColor(theme.background)
}

/** Подписаться на смену системной темы Windows и применить её ко всем переданным окнам */
export function watchNativeTheme(getWindows: () => BrowserWindow[]): void {
  nativeTheme.on('updated', () => {
    for (const win of getWindows()) {
      applyWindowTheme(win)
    }
  })
}
