import type { MediaInfo } from '@letar/folder-scan'
import { ipcMain } from 'electron'
import { mediaInfoWasmProber } from '../services/media-info-prober'
import { getCachedProbe } from '../services/probe-disk-cache.service'

export interface ProbeResult {
  success: boolean
  data?: MediaInfo
  error?: string
}

export function registerProbeHandlers(): void {
  ipcMain.handle('probe:file', async (_event, filePath: string): Promise<ProbeResult> => {
    try {
      const data = await getCachedProbe(filePath, (path) => mediaInfoWasmProber.probe(path))
      return { success: true, data }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })
}
