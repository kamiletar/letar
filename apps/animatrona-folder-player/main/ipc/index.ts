import type { BrowserWindow } from 'electron'
import { registerAppHandlers } from './app.handlers'
import { registerDialogHandlers } from './dialog.handlers'
import { registerEmbeddedSubtitlesHandlers } from './embedded-subtitles.handlers'
import { registerFfmpegHandlers } from './ffmpeg.handlers'
import { registerFsHandlers } from './fs.handlers'
import { registerPowerHandlers } from './power.handlers'
import { registerProbeHandlers } from './probe.handlers'

/**
 * Регистрирует все IPC handlers. Добавляй новые register*Handlers сюда по мере роста приложения.
 */
export function registerIpcHandlers(_getMainWindow: () => BrowserWindow | null): void {
  registerAppHandlers()
  registerDialogHandlers()
  registerFsHandlers()
  registerProbeHandlers()
  registerEmbeddedSubtitlesHandlers()
  registerPowerHandlers()
  registerFfmpegHandlers()
}
