import type { MediaInfo } from '@letar/folder-scan'
import { ipcMain } from 'electron'
import { mediaInfoWasmProber } from '../services/media-info-prober'

export interface ProbeResult {
  success: boolean
  data?: MediaInfo
  error?: string
}

export function registerProbeHandlers(): void {
  ipcMain.handle('probe:file', async (_event, filePath: string): Promise<ProbeResult> => {
    try {
      const data = await mediaInfoWasmProber.probe(filePath)
      return { success: true, data }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })
}
