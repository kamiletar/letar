import { contextBridge, ipcRenderer } from 'electron'

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
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI
