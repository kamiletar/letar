import type { BrowserWindow } from 'electron'
import { registerAppHandlers } from './app.handlers'
import { registerManifestHandlers } from './manifest.handlers'
import { registerRecentReleaseHandlers } from './recent-release.handlers'
import { registerSettingsHandlers } from './settings.handlers'
import { registerTrackerHandlers } from './tracker.handlers'
import { registerWatchProgressHandlers } from './watch-progress.handlers'

/**
 * Регистрирует все IPC handlers. Добавляй новые register*Handlers сюда по мере роста приложения.
 */
export function registerIpcHandlers(_getMainWindow: () => BrowserWindow | null): void {
  registerAppHandlers()
  registerTrackerHandlers()
  registerRecentReleaseHandlers()
  registerSettingsHandlers()
  registerManifestHandlers()
  registerWatchProgressHandlers()
}
