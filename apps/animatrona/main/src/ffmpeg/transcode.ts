/**
 * Модуль транскодирования — перекодирование видео и аудио
 */

import * as path from 'path'
import { spawnFFmpeg } from '../../utils/ffmpeg-spawn'
import { getVideoDuration } from './probe'
import type { AudioTranscodeOptions, TranscodeProgress, VideoTranscodeOptions } from './types'

/**
 * Парсинг времени из вывода FFmpeg
 * Формат: "time=00:01:30.50"
 */
function parseTimeToSeconds(str: string): number | null {
  const match = str.match(/time=(\d+):(\d+):(\d+)\.(\d+)/)
  if (!match) {
    return null
  }

  const [, hours, minutes, seconds, hundredths] = match
  return (
    parseInt(hours, 10) * 3600 + parseInt(minutes, 10) * 60 + parseInt(seconds, 10) + parseInt(hundredths, 10) / 100
  )
}

/**
 * Транскодирование видео в AV1
 *
 * @param inputPath Путь к исходному видео
 * @param outputPath Путь для выходного файла
 * @param options Настройки кодирования
 * @param onProgress Callback для прогресса
 */
export async function transcodeVideo(
  inputPath: string,
  outputPath: string,
  options: VideoTranscodeOptions,
  onProgress?: (progress: TranscodeProgress) => void
): Promise<void> {
  const duration = await getVideoDuration(inputPath)

  const args = ['-y', '-i', inputPath]

  // Выбор кодека на основе настроек
  const codec = options.codec || 'av1'

  if (options.useGpu) {
    // NVIDIA NVENC кодеки
    const nvencCodecs = {
      av1: 'av1_nvenc',
      hevc: 'hevc_nvenc',
      h264: 'h264_nvenc',
    }
    args.push(
      '-c:v',
      nvencCodecs[codec],
      '-cq',
      options.cq.toString(),
      '-preset',
      options.preset,
      '-tune',
      'hq',
      '-rc',
      'constqp',
      '-g',
      '360',
      '-spatial-aq',
      '1',
      '-temporal-aq',
      '1',
      '-aq-strength',
      '15'
    )
  } else {
    // CPU кодеки
    const cpuCodecs = {
      av1: 'libsvtav1',
      hevc: 'libx265',
      h264: 'libx264',
    }
    args.push('-c:v', cpuCodecs[codec], '-crf', options.cq.toString(), '-preset', options.preset, '-g', '360')
  }

  // Без аудио (обрабатываем отдельно)
  args.push('-an')

  // Выходной файл
  args.push(outputPath)

  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    const ff = spawnFFmpeg(args)

    ff.stderr.on('data', (data) => {
      const str = data.toString()
      const currentTime = parseTimeToSeconds(str)

      if (currentTime !== null && onProgress) {
        const percent = Math.min(100, (currentTime / duration) * 100)
        const elapsed = (Date.now() - startTime) / 1000
        const eta = elapsed > 0 ? (elapsed / percent) * (100 - percent) : 0

        onProgress({
          percent,
          currentTime,
          totalDuration: duration,
          eta,
          stage: 'video',
        })
      }
    })

    ff.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`ffmpeg video transcode exited with code ${code}`))
      }
    })

    ff.on('error', reject)
  })
}

/**
 * Конвертация аудио в AAC
 *
 * @param inputPath Путь к исходному аудио/видео
 * @param outputPath Путь для выходного файла
 * @param options Настройки кодирования
 * @param onProgress Callback для прогресса
 */
export async function transcodeAudio(
  inputPath: string,
  outputPath: string,
  options: AudioTranscodeOptions,
  onProgress?: (progress: TranscodeProgress) => void
): Promise<void> {
  const duration = await getVideoDuration(inputPath)
  const { syncOffset } = options

  // Временный WAV файл для промежуточной обработки
  const tempWav = outputPath.replace(path.extname(outputPath), '.wav')

  // Шаг 1: Декодирование в WAV
  await new Promise<void>((resolve, reject) => {
    const startTime = Date.now()

    // Аргументы для FFmpeg
    const args: string[] = ['-y']

    // Положительное смещение: донор опережает → обрезать начало через -ss (до -i)
    if (syncOffset && syncOffset > 0) {
      args.push('-ss', (syncOffset / 1000).toFixed(3))
    }

    args.push('-i', inputPath)

    // Если указан streamIndex — выбираем конкретный аудиопоток (для MKV без demux)
    if (options.streamIndex !== undefined) {
      args.push('-map', `0:a:${options.streamIndex}`)
    }

    args.push('-ar', options.sampleRate.toString(), '-ac', options.channels.toString())

    // Отрицательное смещение: донор отстаёт → добавить тишину через adelay
    if (syncOffset && syncOffset < 0) {
      const delayMs = Math.abs(syncOffset)
      // adelay формат: delay_left|delay_right (для стерео)
      // Для многоканального аудио — все каналы получат одинаковую задержку
      args.push('-af', `adelay=${delayMs}|${delayMs}|${delayMs}|${delayMs}|${delayMs}|${delayMs}|${delayMs}|${delayMs}`)
    }

    args.push(tempWav)

    const ff = spawnFFmpeg(args)

    ff.stderr.on('data', (data) => {
      const str = data.toString()
      const currentTime = parseTimeToSeconds(str)

      if (currentTime !== null && onProgress) {
        const percent = Math.min(50, (currentTime / duration) * 50)
        const elapsed = (Date.now() - startTime) / 1000
        const eta = elapsed > 0 ? (elapsed / percent) * (100 - percent) : 0

        onProgress({
          percent,
          currentTime,
          totalDuration: duration,
          eta,
          stage: 'audio',
        })
      }
    })

    ff.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`ffmpeg audio decode exited with code ${code}`))
      }
    })

    ff.on('error', reject)
  })

  // Шаг 2: Кодирование в AAC
  await new Promise<void>((resolve, reject) => {
    const startTime = Date.now()
    const ff = spawnFFmpeg(['-y', '-i', tempWav, '-c:a', 'aac', '-b:a', `${options.bitrate}k`, outputPath])

    ff.stderr.on('data', (data) => {
      const str = data.toString()
      const currentTime = parseTimeToSeconds(str)

      if (currentTime !== null && onProgress) {
        const percent = Math.min(100, 50 + (currentTime / duration) * 50)
        const elapsed = (Date.now() - startTime) / 1000
        const eta = elapsed > 0 ? (elapsed / (percent - 50)) * (100 - percent) : 0

        onProgress({
          percent,
          currentTime,
          totalDuration: duration,
          eta,
          stage: 'audio',
        })
      }
    })

    ff.on('close', async (code) => {
      // Удаляем временный WAV файл
      try {
        const fs = await import('fs')
        fs.unlinkSync(tempWav)
      } catch {
        // Игнорируем ошибки удаления
      }

      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`ffmpeg audio encode exited with code ${code}`))
      }
    })

    ff.on('error', reject)
  })
}

/** Дефолтные настройки видео */
export const defaultVideoOptions: VideoTranscodeOptions = {
  codec: 'av1',
  useGpu: true,
  cq: 24,
  preset: 'p5',
}

/** Дефолтные настройки аудио */
export const defaultAudioOptions: AudioTranscodeOptions = {
  bitrate: 192,
  sampleRate: 48000,
  channels: 2,
}
