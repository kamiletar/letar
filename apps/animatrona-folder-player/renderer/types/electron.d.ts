import type {
  ExternalAudioScanResult,
  ExternalSubtitleScanResult,
  FileFilter,
  MediaFileInfo,
} from '@letar/folder-player-react'
import type { MediaInfo } from '@letar/folder-scan'
import type { EmbeddedSubtitlesIpcResult } from '../../main/ipc/embedded-subtitles.handlers'

export interface ProbeResult {
  success: boolean
  data?: MediaInfo
  error?: string
}

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
  probe: (filePath: string) => Promise<ProbeResult>
  subtitles: {
    extractEmbedded: (filePath: string) => Promise<EmbeddedSubtitlesIpcResult>
  }
  shell: {
    openPath: (filePath: string) => Promise<{ success: boolean; error?: string }>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
