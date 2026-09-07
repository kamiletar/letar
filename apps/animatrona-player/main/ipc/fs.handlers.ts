import {
  type ExternalAudioScanResult,
  type ExternalSubtitleScanResult,
  type MediaFileInfo,
  type MediaType,
  scanFolderForMedia,
  scanForExternalAudio,
  scanForExternalSubtitles,
} from '@letar/folder-scan'
import { ipcMain } from 'electron'

import { allowPath } from '../protocols/allowed-paths'

export function registerFsHandlers(): void {
  ipcMain.handle(
    'fs:scanFolder',
    async (
      _event,
      folderPath: string,
      recursive: boolean | undefined,
      mediaTypes: MediaType[] | undefined,
    ): Promise<{ success: boolean; files: MediaFileInfo[] }> => {
      allowPath(folderPath)
      const files = await scanFolderForMedia(folderPath, recursive ?? true, mediaTypes ?? ['video'])
      return { success: true, files }
    },
  )

  ipcMain.handle(
    'fs:scanExternalAudio',
    (
      _event,
      videoFolderPath: string,
      videoFiles: Array<{ path: string; episodeNumber: number }>,
    ): Promise<ExternalAudioScanResult> => scanForExternalAudio(videoFolderPath, videoFiles),
  )

  ipcMain.handle(
    'fs:scanExternalSubtitles',
    (
      _event,
      videoFolderPath: string,
      videoFiles: Array<{ path: string; episodeNumber: number }>,
    ): Promise<ExternalSubtitleScanResult> => scanForExternalSubtitles(videoFolderPath, videoFiles),
  )
}
