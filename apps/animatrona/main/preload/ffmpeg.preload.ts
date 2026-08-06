/**
 * Preload — FFmpeg
 *
 * Анализ, транскодирование, мерж и генерация скриншотов.
 */

import { ipcRenderer } from 'electron'
import type {
  AudioTranscodeOptions,
  AudioTranscodeVBROptions,
  DemuxOptions,
  DemuxResult,
  MediaInfo,
  MergeConfig,
  OperationResult,
  TranscodeProgress,
  VideoTranscodeOptions,
} from '../../shared/types'
import { on } from './ipc-helper'

/** FFmpeg операции */
export const ffmpegPreload = {
  /** Анализ медиафайла */
  probe: (filePath: string): Promise<OperationResult & { data?: MediaInfo }> =>
    ipcRenderer.invoke('ffmpeg:probe', filePath),

  /** Транскодирование видео */
  transcodeVideo: (input: string, output: string, options: VideoTranscodeOptions): Promise<OperationResult> =>
    ipcRenderer.invoke('ffmpeg:transcodeVideo', input, output, options),

  /** Транскодирование аудио */
  transcodeAudio: (input: string, output: string, options: AudioTranscodeOptions): Promise<OperationResult> =>
    ipcRenderer.invoke('ffmpeg:transcodeAudio', input, output, options),

  /** Мерж в MKV */
  merge: (config: MergeConfig): Promise<OperationResult & { outputPath?: string }> =>
    ipcRenderer.invoke('ffmpeg:merge', config),

  /** Демультиплексирование (извлечение потоков без перекодирования) */
  demux: (inputPath: string, outputDir: string, options?: DemuxOptions): Promise<DemuxResult> =>
    ipcRenderer.invoke('ffmpeg:demux', inputPath, outputDir, options),

  /** Извлечение шрифтов из MKV attachments (extract + IPFS upload + cleanup) */
  extractFonts: (
    inputPath: string,
  ): Promise<{
    fonts: Array<{ name: string; ext: string; fileName: string; cid: string | null; ipfsSize: number | null }>
  }> => ipcRenderer.invoke('ffmpeg:extractFonts', inputPath),

  /** Извлечение одного потока по streamSpec (напр. "0:s:2") — без полного demux */
  extractStream: (
    inputPath: string,
    outputPath: string,
    streamSpec: string,
  ): Promise<{ success: boolean; path: string; size: number }> =>
    ipcRenderer.invoke('ffmpeg:extractStream', inputPath, outputPath, streamSpec),

  /** Транскодирование аудио VBR (умный подбор битрейта) */
  transcodeAudioVBR: (
    input: string,
    output: string,
    options: AudioTranscodeVBROptions,
  ): Promise<OperationResult & { outputPath?: string }> =>
    ipcRenderer.invoke('ffmpeg:transcodeAudioVBR', input, output, options),

  /** Кодирование тестового сэмпла */
  encodeSample: (options: {
    inputPath: string
    outputPath: string
    profile: unknown
    startTime?: number
    duration?: number
    sourceBitDepth?: number
  }): Promise<{ success: boolean; outputPath: string; encodingTime: number; outputSize: number; error?: string }> =>
    ipcRenderer.invoke('ffmpeg:encodeSample', options),

  /** Генерация скриншотов из видео */
  generateScreenshots: async (
    inputPath: string,
    outputDir: string,
    duration: number,
    options: {
      count: number
      format?: 'webp' | 'jpg' | 'png'
      thumbnailWidth?: number
      fullWidth?: number
      quality?: number
      skipStartPercent?: number
    },
  ): Promise<{
    success: boolean
    thumbnails: string[]
    fullSize: string[]
    error?: string
  }> => {
    const result = await ipcRenderer.invoke('ffmpeg:generateScreenshots', inputPath, outputDir, duration, options)
    // Разворачиваем data из createHandler
    if (result.success && result.data) {
      return { success: true, thumbnails: result.data.thumbnails, fullSize: result.data.fullSize }
    }
    return { success: false, thumbnails: [], fullSize: [], error: result.error }
  },

  /** Генерация thumbnail sprite sheet для hover preview */
  generateThumbnailSprite: async (
    inputPath: string,
    outputDir: string,
    duration: number,
    options?: {
      frameCount?: number
      frameWidth?: number
      frameHeight?: number
      columns?: number
      quality?: number
    },
  ): Promise<{
    success: boolean
    spritePath: string
    vttPath: string
    spriteSize: number
    error?: string
  }> => {
    const result = await ipcRenderer.invoke('ffmpeg:generateThumbnailSprite', inputPath, outputDir, duration, options)
    // Разворачиваем data из createHandler
    if (result.success && result.data) {
      return {
        success: true,
        spritePath: result.data.spritePath,
        vttPath: result.data.vttPath,
        spriteSize: result.data.spriteSize,
      }
    }
    return { success: false, spritePath: '', vttPath: '', spriteSize: 0, error: result.error }
  },

  /** Подписка на прогресс генерации скриншотов */
  onScreenshotsProgress: on<[{ current: number; total: number }]>('ffmpeg:screenshots-progress'),

  /** Подписка на прогресс FFmpeg операций */
  onProgress: on<[TranscodeProgress & { type: string; profileName?: string }]>('ffmpeg:progress'),

  /** Убить все активные FFmpeg процессы */
  killAll: (): Promise<OperationResult & { data?: { killed: number } }> => ipcRenderer.invoke('ffmpeg:killAll'),

  /** Получить версию FFmpeg */
  getVersion: (): Promise<OperationResult & { data?: string }> => ipcRenderer.invoke('ffmpeg:getVersion'),

  /** Получить информацию об оборудовании (GPU и CPU) */
  getHardwareInfo: (): Promise<OperationResult & { data?: { gpuModel: string | null; cpuModel: string } }> =>
    ipcRenderer.invoke('ffmpeg:getHardwareInfo'),
}
