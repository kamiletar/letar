import type {
  ExternalAudioScanResult,
  ExternalSubtitleScanResult,
  FileFilter,
  MediaFileInfo,
} from '@letar/folder-player-react'
import type { MediaInfo } from '@letar/folder-scan'
import type { EmbeddedSubtitlesIpcResult } from '../../main/ipc/embedded-subtitles.handlers'
import type { FfmpegInstallResult, TranscodeIpcResult } from '../../main/ipc/ffmpeg.handlers'
import type { FfmpegInstallProgress, FfmpegStatus } from '../../main/services/ffmpeg/ffmpeg-installer.service'
import type { TranscodeProgress, TranscodeRequest } from '../../main/services/ffmpeg/transcode.service'

export type { FfmpegInstallProgress, FfmpegStatus, TranscodeIpcResult, TranscodeProgress, TranscodeRequest }

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
  power: {
    setPreventSleep: (enabled: boolean) => Promise<void>
  }
  ffmpeg: {
    getStatus: () => Promise<FfmpegStatus>
    getDownloadedSize: () => Promise<number>
    install: () => Promise<FfmpegInstallResult>
    cancelInstall: () => Promise<void>
    uninstall: () => Promise<FfmpegStatus>
    onInstallProgress: (callback: (progress: FfmpegInstallProgress) => void) => () => void
  }
  transcode: {
    prepare: (request: TranscodeRequest) => Promise<TranscodeIpcResult>
    cancel: () => Promise<void>
    getCacheSize: () => Promise<number>
    clearCache: () => Promise<void>
    onProgress: (callback: (progress: TranscodeProgress) => void) => () => void
  }
  getPathForFile: (file: File) => string
  onOpenFile: (callback: (filePath: string) => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
