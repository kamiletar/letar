/**
 * Константы оформления окна, общие для main (BrowserWindow/titleBarOverlay) и renderer (шапка).
 *
 * Высота 48px — гайдлайн Microsoft для заголовка с интерактивным содержимым (навигация,
 * переключатель) — см. .claude/docs/electron-window-controls-overlay-pattern.md.
 */

/** Высота зоны заголовка окна в пикселях */
export const TITLE_BAR_HEIGHT = 48

/** Цвета системных кнопок (symbolColor) и фона окна по теме */
export const WINDOW_THEME = {
  dark: { background: '#0b0e0c', symbol: '#e9efe9' },
  light: { background: '#f4f7f4', symbol: '#101511' },
} as const
