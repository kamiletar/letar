/**
 * IPC для «расширенной поддержки форматов» — докачка ffmpeg по требованию (PLAN.md §10).
 *
 * Прогресс шлём через `event.sender.send`, а не через ссылку на главное окно: канал живёт
 * ровно столько, сколько длится вызов `ffmpeg:install`, и адресован тому окну, которое его
 * начало.
 */

import { ipcMain } from 'electron'

import type { FfmpegInstallProgress, FfmpegStatus } from '../services/ffmpeg/ffmpeg-installer.service'
import {
  cancelFfmpegInstall,
  getDownloadedFfmpegSize,
  getFfmpegStatus,
  installFfmpeg,
  uninstallFfmpeg,
} from '../services/ffmpeg/ffmpeg-installer.service'
import type { TranscodeProgress, TranscodeRequest } from '../services/ffmpeg/transcode.service'
import {
  cancelTranscode,
  clearTranscodeCache,
  getTranscodeCacheSize,
  transcodeFile,
} from '../services/ffmpeg/transcode.service'

export interface FfmpegInstallResult {
  success: boolean
  status?: FfmpegStatus
  error?: string
}

export interface TranscodeIpcResult {
  success: boolean
  /** Путь к готовому файлу — рендерер отдаёт его в `<video>` через `media://` */
  outputPath?: string
  fromCache?: boolean
  error?: string
}

export function registerFfmpegHandlers(): void {
  ipcMain.handle('ffmpeg:getStatus', (): Promise<FfmpegStatus> => getFfmpegStatus())

  ipcMain.handle('ffmpeg:getDownloadedSize', (): Promise<number> => getDownloadedFfmpegSize())

  ipcMain.handle('ffmpeg:install', async (event): Promise<FfmpegInstallResult> => {
    try {
      const status = await installFfmpeg((progress: FfmpegInstallProgress) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send('ffmpeg:installProgress', progress)
        }
      })
      return { success: true, status }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('ffmpeg:cancelInstall', (): void => {
    cancelFfmpegInstall()
  })

  ipcMain.handle('ffmpeg:uninstall', async (): Promise<FfmpegStatus> => {
    await uninstallFfmpeg()
    return getFfmpegStatus()
  })

  ipcMain.handle('transcode:prepare', async (event, request: TranscodeRequest): Promise<TranscodeIpcResult> => {
    try {
      const result = await transcodeFile(request, (progress: TranscodeProgress) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send('transcode:progress', progress)
        }
      })
      return { success: true, outputPath: result.outputPath, fromCache: result.fromCache }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('transcode:cancel', (): void => {
    cancelTranscode()
  })

  ipcMain.handle('transcode:getCacheSize', (): Promise<number> => getTranscodeCacheSize())

  ipcMain.handle('transcode:clearCache', (): Promise<void> => clearTranscodeCache())
}
