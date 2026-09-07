import { ipcMain } from 'electron'
import type { EmbeddedSubtitlesResult } from '../services/embedded-subtitles'
import { extractEmbeddedSubtitles } from '../services/embedded-subtitles'

export interface EmbeddedSubtitlesIpcResult {
  success: boolean
  data?: EmbeddedSubtitlesResult
  error?: string
}

export function registerEmbeddedSubtitlesHandlers(): void {
  ipcMain.handle('subtitles:extractEmbedded', async (_event, filePath: string): Promise<EmbeddedSubtitlesIpcResult> => {
    try {
      const data = await extractEmbeddedSubtitles(filePath)
      return { success: true, data }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })
}
