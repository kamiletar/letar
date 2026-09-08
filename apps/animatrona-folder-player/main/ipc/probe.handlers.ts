import type { MediaInfo } from '@letar/folder-scan'
import { ipcMain } from 'electron'
import { probeChaptersWithFfprobe } from '../services/ffmpeg/chapters.service'
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
      // mediainfo.js глав не отдаёт (см. media-info-prober.ts) — вне дискового кэша, чтобы
      // доступность ffmpeg проверялась заново на каждый вызов, а не застревала в кэше пробы
      const chapters = data.chapters ?? (await probeChaptersWithFfprobe(filePath))
      return { success: true, data: chapters ? { ...data, chapters } : data }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })
}
