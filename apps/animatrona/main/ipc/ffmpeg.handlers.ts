/**
 * IPC handlers для FFmpeg операций
 */

import { BrowserWindow } from 'electron'
import { mkdir, stat } from 'fs/promises'
import path from 'path'
import type {
  AudioTranscodeOptions,
  AudioTranscodeVBROptions,
  DemuxOptions,
  EncodingProfileOptions,
  MergeConfig,
  VideoTranscodeOptions,
} from '../../shared/types'
import {
  demuxFile,
  encodeSample,
  extractFontsFromFile,
  extractStream,
  generateScreenshots,
  generateThumbnailSprite,
  mergeMKV,
  probeFile,
  type ScreenshotOptions,
  type SpriteSheetOptions,
  transcodeAudio,
  transcodeAudioVBR,
  transcodeVideo,
  transcodeVideoWithProfile,
} from '../ffmpeg'
import { getFFmpegVersion, killAllFFmpeg } from '../utils/ffmpeg-spawn'
import { getCpuModel, getGpuCapability } from '../utils/hardware-info'
import { createHandler, createHandlerWithEvent } from '../utils/ipc-handler-factory'

/**
 * Регистрирует IPC handlers для FFmpeg
 */
export function registerFFmpegHandlers(): void {
  // Убить все активные FFmpeg процессы (отмена обработки)
  createHandler('ffmpeg:killAll', () => {
    const count = killAllFFmpeg()
    return { killed: count }
  })

  // Анализ медиафайла
  createHandler('ffmpeg:probe', (filePath: string) => probeFile(filePath))

  // Получить версию FFmpeg
  createHandler('ffmpeg:getVersion', () => getFFmpegVersion())

  // Получить информацию об оборудовании (GPU возможности + CPU)
  createHandler('ffmpeg:getHardwareInfo', async () => {
    const [gpuCap, cpuModel] = await Promise.all([getGpuCapability(), Promise.resolve(getCpuModel())])
    return {
      gpuModel: gpuCap.model,
      cpuModel,
      generation: gpuCap.generation,
      supportsAv1: gpuCap.supportsAv1,
      supportsUhqTune: gpuCap.supportsUhqTune,
      supportsTemporalFilter: gpuCap.supportsTemporalFilter,
    }
  })

  // Извлечение одного потока по streamSpec (напр. "0:s:2") — лёгкая альтернатива полному demux
  createHandler('ffmpeg:extractStream', async (inputPath: string, outputPath: string, streamSpec: string) => {
    await mkdir(path.dirname(outputPath), { recursive: true })
    await extractStream(inputPath, outputPath, streamSpec)
    const stats = await stat(outputPath)
    return { success: true, path: outputPath, size: stats.size }
  })

  // Извлечение шрифтов из MKV attachments (probe + dump_attachment + IPFS upload + cleanup)
  createHandler('ffmpeg:extractFonts', async (inputPath: string) => {
    const { rm, mkdtemp } = await import('fs/promises')
    const os = await import('os')
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'animatrona-fonts-'))
    try {
      const result = await extractFontsFromFile(inputPath, tempDir)
      if (result.fonts.length === 0) {
        return { fonts: [] }
      }

      // Загружаем каждый шрифт в IPFS прямо в main process
      const { uploadToIpfs } = await import('../services/import/import-ipfs')
      const uploadedFonts = []
      for (const font of result.fonts) {
        const ipfsResult = await uploadToIpfs(font.path)
        uploadedFonts.push({
          name: font.name,
          ext: font.ext,
          fileName: font.fileName,
          cid: ipfsResult?.cid ?? null,
          ipfsSize: ipfsResult?.size ?? null,
        })
      }
      return { fonts: uploadedFonts }
    } finally {
      // Cleanup temp dir — main process может удалить любой путь
      await rm(tempDir, { recursive: true, force: true }).catch(() => {
        // намеренно игнорируем — temp dir мог быть уже удалён
      })
    }
  })

  // Демультиплексирование (извлечение потоков без перекодирования)
  createHandler('ffmpeg:demux', async (inputPath: string, outputDir: string, options?: DemuxOptions) => {
    try {
      return await demuxFile(inputPath, outputDir, options)
    } catch (error) {
      // Возвращаем структурированный результат при ошибке
      return {
        success: false,
        source: inputPath,
        outputDir,
        video: null,
        audioTracks: [],
        subtitles: [],
        metadata: {
          path: '',
          container: '',
          totalDuration: 0,
          totalSize: 0,
          chapters: [],
          tags: {},
          ffprobeRaw: null,
        },
        error: error instanceof Error ? error.message : String(error),
      }
    }
  })

  // Генерация скриншотов из видео (с прогрессом)
  createHandlerWithEvent(
    'ffmpeg:generateScreenshots',
    async (event, inputPath: string, outputDir: string, duration: number, options: ScreenshotOptions) => {
      const result = await generateScreenshots(inputPath, outputDir, duration, {
        ...options,
        onProgress: (current, total) => {
          event.sender.send('ffmpeg:screenshots-progress', { current, total })
        },
      })
      return { thumbnails: result.thumbnails, fullSize: result.fullSize }
    },
  )

  // Генерация thumbnail sprite sheet для hover preview
  createHandler(
    'ffmpeg:generateThumbnailSprite',
    async (inputPath: string, outputDir: string, duration: number, options?: SpriteSheetOptions) => {
      const result = await generateThumbnailSprite(inputPath, outputDir, duration, options)
      return { spritePath: result.spritePath, vttPath: result.vttPath, spriteSize: result.spriteSize }
    },
  )

  // === Handlers с прогрессом (используют event.sender) ===

  // Транскодирование видео
  createHandlerWithEvent(
    'ffmpeg:transcodeVideo',
    async (event, input: string, output: string, options: VideoTranscodeOptions) => {
      await mkdir(path.dirname(output), { recursive: true })
      const win = BrowserWindow.fromWebContents(event.sender)
      await transcodeVideo(input, output, options, (progress) => {
        win?.webContents.send('ffmpeg:progress', { type: 'video', ...progress })
      })
    },
  )

  // Транскодирование аудио
  createHandlerWithEvent(
    'ffmpeg:transcodeAudio',
    async (event, input: string, output: string, options: AudioTranscodeOptions) => {
      await mkdir(path.dirname(output), { recursive: true })
      const win = BrowserWindow.fromWebContents(event.sender)
      await transcodeAudio(input, output, options, (progress) => {
        win?.webContents.send('ffmpeg:progress', { type: 'audio', ...progress })
      })
    },
  )

  // Мерж в MKV
  createHandlerWithEvent('ffmpeg:merge', async (event, config: MergeConfig) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    await mergeMKV(config, (progress) => {
      win?.webContents.send('ffmpeg:progress', { type: 'merge', ...progress })
    })
    return { outputPath: config.outputPath }
  })

  // Транскодирование аудио VBR (умный подбор битрейта)
  createHandlerWithEvent(
    'ffmpeg:transcodeAudioVBR',
    async (event, input: string, output: string, options: AudioTranscodeVBROptions) => {
      await mkdir(path.dirname(output), { recursive: true })
      const win = BrowserWindow.fromWebContents(event.sender)
      await transcodeAudioVBR(input, output, options, (progress) => {
        win?.webContents.send('ffmpeg:progress', { type: 'audio-vbr', trackId: input, ...progress })
      })
      const outputStat = await stat(output)
      return { outputPath: output, outputSize: outputStat.size }
    },
  )

  // Транскодирование видео с профилем
  createHandlerWithEvent(
    'ffmpeg:transcodeWithProfile',
    async (event, input: string, output: string, profile: EncodingProfileOptions, sourceBitDepth = 8) => {
      await mkdir(path.dirname(output), { recursive: true })
      const win = BrowserWindow.fromWebContents(event.sender)
      await transcodeVideoWithProfile(input, output, profile, sourceBitDepth, (progress) => {
        win?.webContents.send('ffmpeg:progress', { type: 'video-profile', profileName: profile.name, ...progress })
      })
      const outputStat = await stat(output)
      return { outputPath: output, outputSize: outputStat.size }
    },
  )

  // Кодирование тестового сэмпла
  createHandlerWithEvent(
    'ffmpeg:encodeSample',
    async (
      event,
      options: {
        inputPath: string
        outputPath: string
        profile: EncodingProfileOptions
        startTime?: number
        duration?: number
        sourceBitDepth?: number
      },
    ) => {
      const outputDir = path.dirname(options.outputPath)
      await mkdir(outputDir, { recursive: true })

      const win = BrowserWindow.fromWebContents(event.sender)
      return await encodeSample(
        options.inputPath,
        options.outputPath,
        options.profile,
        options.startTime ?? 0,
        options.duration ?? 300,
        options.sourceBitDepth ?? 8,
        (progress) => {
          win?.webContents.send('ffmpeg:progress', { type: 'sample', profileName: options.profile.name, ...progress })
        },
      )
    },
  )
}
