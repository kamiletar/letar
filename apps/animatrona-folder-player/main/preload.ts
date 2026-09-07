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
