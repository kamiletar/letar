/**
 * Preload — Файловая система и субтитры
 *
 * Операции с файлами, сканирование, субтитры.
 */

import { ipcRenderer, webUtils } from 'electron'
import type { ExternalAudioScanResult } from '../services/external-audio-scanner'
import type { ExternalSubtitleScanResult } from '../services/external-subtitle-scanner'

/** Файловая система */
export const fsPreload = {
  /**
   * Получить путь к файлу из File объекта (для Drag & Drop)
   * В Electron с contextIsolation: true свойство file.path недоступно,
   * поэтому используем webUtils.getPathForFile()
   */
  getPathForFile: (file: File): string => webUtils.getPathForFile(file),

  /** Сканировать папку на медиафайлы (video, audio или оба) */
  scanFolder: (
    folderPath: string,
    recursive?: boolean,
    mediaTypes?: ('video' | 'audio')[]
  ): Promise<{ success: boolean; files: Array<{ path: string; name: string; size: number; extension: string }> }> =>
    ipcRenderer.invoke('fs:scanFolder', folderPath, recursive ?? true, mediaTypes ?? ['video']),

  /** Удалить файл или папку (по умолчанию в корзину) */
  delete: (targetPath: string, moveToTrash = true): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('fs:delete', targetPath, moveToTrash),

  /** Проверить существование пути */
  exists: async (targetPath: string): Promise<boolean> => {
    const result = await ipcRenderer.invoke('fs:exists', targetPath)
    return result.success && result.data === true
  },

  /** Получить информацию о файле (размер, дата модификации) */
  stat: async (filePath: string): Promise<{ size?: number; mtime?: Date; error?: string }> => {
    const result = await ipcRenderer.invoke('fs:stat', filePath)
    // createHandler оборачивает в { success, data }, разворачиваем
    if (result.success && result.data) {
      return { size: result.data.size, mtime: result.data.mtime }
    }
    return { error: result.error ?? 'Failed to get file stats' }
  },

  /** Копировать файл */
  copyFile: (sourcePath: string, destPath: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('fs:copyFile', sourcePath, destPath),

  /** Сканировать внешние субтитры (папки Rus Sub/, Subs/ и т.д.) */
  scanExternalSubtitles: (
    videoFolderPath: string,
    videoFiles: Array<{ path: string; episodeNumber: number }>
  ): Promise<ExternalSubtitleScanResult> => ipcRenderer.invoke('fs:scanExternalSubtitles', videoFolderPath, videoFiles),

  /** Сканировать внешние аудио (папки Rus Sound/, Audio/ и т.д.) */
  scanExternalAudio: (
    videoFolderPath: string,
    videoFiles: Array<{ path: string; episodeNumber: number }>
  ): Promise<ExternalAudioScanResult> => ipcRenderer.invoke('fs:scanExternalAudio', videoFolderPath, videoFiles),

  /** Получить метаданные изображения (размеры, blur placeholder) */
  getImageMetadata: (
    filePath: string
  ): Promise<{
    success: boolean
    width?: number
    height?: number
    size?: number
    mimeType?: string
    blurDataURL?: string
    error?: string
  }> => ipcRenderer.invoke('fs:getImageMetadata', filePath),
}

/** Субтитры */
export const subtitlePreload = {
  /** Сдвинуть таймкоды в файле субтитров (ASS/SRT) */
  shift: (options: {
    inputPath: string
    outputPath: string
    offsetMs: number
  }): Promise<{
    success: boolean
    removedEvents?: number
    totalEvents?: number
    error?: string
  }> => ipcRenderer.invoke('subtitle:shift', options),

  /** Предпросмотр сдвига — первые N событий с новыми таймкодами */
  previewShift: (
    inputPath: string,
    offsetMs: number,
    limit?: number
  ): Promise<{
    events: Array<{ start: string; end: string; text: string }>
    total: number
    error?: string
  }> => ipcRenderer.invoke('subtitle:previewShift', inputPath, offsetMs, limit ?? 5),
}
