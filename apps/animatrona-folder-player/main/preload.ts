import { contextBridge, ipcRenderer, webUtils } from 'electron'

interface FileFilter {
  name: string
  extensions: string[]
}

interface MediaFileInfo {
  path: string
  name: string
  size: number
  extension: string
}

interface ExternalAudioScanResult {
  audioDirs: string[]
  audioTracks: unknown[]
  unmatchedFiles: string[]
}

interface ExternalSubtitleScanResult {
  subsDirs: string[]
  fontsDirs: string[]
  subtitles: unknown[]
  unmatchedFiles: string[]
}

interface ProbeResult {
  success: boolean
  data?: unknown
  error?: string
}

interface EmbeddedSubtitlesResult {
  success: boolean
  data?: unknown
  error?: string
}

/** Состояние ffmpeg — «расширенная поддержка форматов», см. main/services/ffmpeg */
interface FfmpegStatus {
  available: boolean
  source: 'downloaded' | 'system' | null
  ffmpegPath: string | null
  ffprobePath: string | null
  version: string | null
  missingDecoders: string[]
  installSupported: boolean
}

interface FfmpegInstallProgress {
  stage: 'downloading' | 'extracting' | 'verifying' | 'done'
  percent?: number
  receivedBytes?: number
  totalBytes?: number
}

interface FfmpegInstallResult {
  success: boolean
  status?: FfmpegStatus
  error?: string
}

interface TranscodeProgress {
  percent?: number
  processedSec: number
  totalSec: number
  speed: number | null
}

interface TranscodeIpcResult {
  success: boolean
  outputPath?: string
  fromCache?: boolean
  error?: string
}

interface TranscodeStreamingIpcResult {
  success: boolean
  cached?: boolean
  outputPath?: string
  error?: string
}

interface SpriteIpcResult {
  success: boolean
  spritePath?: string
  vtt?: string
  error?: string
}

/**
 * API, доступный в renderer process через window.electronAPI.
 * Добавляй новые методы сюда и в main/ipc/*.handlers.ts — IPC единственный
 * способ связи между main и renderer (contextIsolation: true, nodeIntegration: false).
 */
const electronAPI = {
  getVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),
  dialog: {
    selectFile: (filters?: FileFilter[]): Promise<string | null> => ipcRenderer.invoke('dialog:selectFile', filters),
    selectFolder: (): Promise<string | null> => ipcRenderer.invoke('dialog:selectFolder'),
  },
  fs: {
    scanFolder: (
      folderPath: string,
      recursive?: boolean,
      mediaTypes?: Array<'video' | 'audio'>,
    ): Promise<{ success: boolean; files: MediaFileInfo[] }> =>
      ipcRenderer.invoke('fs:scanFolder', folderPath, recursive, mediaTypes),
    scanExternalAudio: (
      folderPath: string,
      videoFiles: Array<{ path: string; episodeNumber: number }>,
    ): Promise<ExternalAudioScanResult> => ipcRenderer.invoke('fs:scanExternalAudio', folderPath, videoFiles),
    scanExternalSubtitles: (
      folderPath: string,
      videoFiles: Array<{ path: string; episodeNumber: number }>,
    ): Promise<ExternalSubtitleScanResult> => ipcRenderer.invoke('fs:scanExternalSubtitles', folderPath, videoFiles),
    /** Локальный постер серии в папке (poster/cover/folder.jpg|png|webp) — `null`, если не найден */
    findPoster: (folderPath: string): Promise<string | null> => ipcRenderer.invoke('fs:findPoster', folderPath),
  },
  probe: (filePath: string): Promise<ProbeResult> => ipcRenderer.invoke('probe:file', filePath),
  subtitles: {
    extractEmbedded: (filePath: string): Promise<EmbeddedSubtitlesResult> =>
      ipcRenderer.invoke('subtitles:extractEmbedded', filePath),
  },
  shell: {
    openPath: (filePath: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('app:openInSystemPlayer', filePath),
  },
  power: {
    setPreventSleep: (enabled: boolean): Promise<void> => ipcRenderer.invoke('power:setPreventSleep', enabled),
  },
  ffmpeg: {
    getStatus: (): Promise<FfmpegStatus> => ipcRenderer.invoke('ffmpeg:getStatus'),
    getDownloadedSize: (): Promise<number> => ipcRenderer.invoke('ffmpeg:getDownloadedSize'),
    install: (): Promise<FfmpegInstallResult> => ipcRenderer.invoke('ffmpeg:install'),
    cancelInstall: (): Promise<void> => ipcRenderer.invoke('ffmpeg:cancelInstall'),
    uninstall: (): Promise<FfmpegStatus> => ipcRenderer.invoke('ffmpeg:uninstall'),
    /** Прогресс идущей установки. Возвращает функцию отписки. */
    onInstallProgress: (callback: (progress: FfmpegInstallProgress) => void): () => void => {
      const listener = (_event: Electron.IpcRendererEvent, progress: FfmpegInstallProgress) => callback(progress)
      ipcRenderer.on('ffmpeg:installProgress', listener)
      return () => ipcRenderer.removeListener('ffmpeg:installProgress', listener)
    },
  },
  transcode: {
    /** Готовит файл к воспроизведению; `request` — см. TranscodeRequest в main/services/ffmpeg */
    prepare: (request: unknown): Promise<TranscodeIpcResult> => ipcRenderer.invoke('transcode:prepare', request),
    /**
     * Потоковая подготовка — не ждёт всего файла: байты фрагментированного MP4 приходят через
     * `onStreamChunk` по мере кодирования, воспроизведение можно начинать сразу через
     * `MediaSource`. Если файл уже в кэше — `cached: true`, стрим не запускается, работает как
     * обычный `prepare`.
     */
    prepareStreaming: (request: unknown): Promise<TranscodeStreamingIpcResult> =>
      ipcRenderer.invoke('transcode:prepareStreaming', request),
    cancel: (): Promise<void> => ipcRenderer.invoke('transcode:cancel'),
    getCacheSize: (): Promise<number> => ipcRenderer.invoke('transcode:getCacheSize'),
    clearCache: (): Promise<void> => ipcRenderer.invoke('transcode:clearCache'),
    onProgress: (callback: (progress: TranscodeProgress) => void): () => void => {
      const listener = (_event: Electron.IpcRendererEvent, progress: TranscodeProgress) => callback(progress)
      ipcRenderer.on('transcode:progress', listener)
      return () => ipcRenderer.removeListener('transcode:progress', listener)
    },
    onStreamChunk: (callback: (chunk: Uint8Array) => void): () => void => {
      const listener = (_event: Electron.IpcRendererEvent, chunk: Uint8Array) => callback(chunk)
      ipcRenderer.on('transcode:streamChunk', listener)
      return () => ipcRenderer.removeListener('transcode:streamChunk', listener)
    },
    onStreamProgress: (callback: (progress: TranscodeProgress) => void): () => void => {
      const listener = (_event: Electron.IpcRendererEvent, progress: TranscodeProgress) => callback(progress)
      ipcRenderer.on('transcode:streamProgress', listener)
      return () => ipcRenderer.removeListener('transcode:streamProgress', listener)
    },
    onStreamEnd: (callback: (result: { outputPath: string }) => void): () => void => {
      const listener = (_event: Electron.IpcRendererEvent, result: { outputPath: string }) => callback(result)
      ipcRenderer.on('transcode:streamEnd', listener)
      return () => ipcRenderer.removeListener('transcode:streamEnd', listener)
    },
    onStreamError: (callback: (message: string) => void): () => void => {
      const listener = (_event: Electron.IpcRendererEvent, message: string) => callback(message)
      ipcRenderer.on('transcode:streamError', listener)
      return () => ipcRenderer.removeListener('transcode:streamError', listener)
    },
  },
  sprite: {
    /** Нарезает превью-спрайт для файла (или отдаёт из кэша). `null`, если ffmpeg недоступен. */
    generate: (filePath: string, durationSec: number): Promise<SpriteIpcResult> =>
      ipcRenderer.invoke('sprite:generate', filePath, durationSec),
    cancel: (): Promise<void> => ipcRenderer.invoke('sprite:cancel'),
    getCacheSize: (): Promise<number> => ipcRenderer.invoke('sprite:getCacheSize'),
    clearCache: (): Promise<void> => ipcRenderer.invoke('sprite:clearCache'),
  },
  /** Путь на диске для перетащенного `File` — `File.path` удалён в Electron ≥32 */
  getPathForFile: (file: File): string => webUtils.getPathForFile(file),
  /**
   * Файл, открытый двойным кликом (ассоциация) или переданный уже запущенному окну повторным
   * запуском/`open-file` (macOS). Возвращает функцию отписки.
   */
  onOpenFile: (callback: (filePath: string) => void): () => void => {
    const listener = (_event: Electron.IpcRendererEvent, filePath: string) => callback(filePath)
    ipcRenderer.on('app:openFile', listener)
    return () => ipcRenderer.removeListener('app:openFile', listener)
  },
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI
