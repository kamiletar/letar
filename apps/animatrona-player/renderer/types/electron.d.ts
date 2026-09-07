import type {
  ExternalAudioScanResult,
  ExternalSubtitleScanResult,
  FileFilter,
  MediaFileInfo,
} from '@letar/folder-player-react'

export interface ElectronAPI {
  getVersion: () => Promise<string>
  dialog: {
    selectFile: (filters?: FileFilter[]) => Promise<string | null>
    selectFolder: () => Promise<string | null>
  }
  fs: {
    scanFolder: (
      folderPath: string,
      recursive?: boolean,
      mediaTypes?: Array<'video' | 'audio'>,
    ) => Promise<{ success: boolean; files: MediaFileInfo[] }>
    scanExternalAudio: (
      folderPath: string,
      videoFiles: Array<{ path: string; episodeNumber: number }>,
    ) => Promise<ExternalAudioScanResult>
    scanExternalSubtitles: (
      folderPath: string,
      videoFiles: Array<{ path: string; episodeNumber: number }>,
    ) => Promise<ExternalSubtitleScanResult>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
