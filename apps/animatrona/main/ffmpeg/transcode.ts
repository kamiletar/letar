/**
 * Модуль транскодирования — перекодирование видео и аудио
 */

import { spawnFFmpeg } from '../utils/ffmpeg-spawn'
import { getGpuCapability } from '../utils/hardware-info'
import { createModuleLogger } from '../utils/logger'
import { type EncoderCapabilities, getEncoderStrategy, mapToCpuPreset } from './encoder-strategies'
import { buildNvencEncodeArgs, isNvencTemporalFilterError, NvencTemporalFilterError } from './nvenc-args'
import { getVideoDuration } from './probe'
import type {
  AudioTranscodeOptions,
  AudioTranscodeVBROptions,
  EncodingProfileOptions,
  TranscodeProgress,
  VideoTranscodeOptions,
} from './types'
import { parseTimeToSeconds } from './utils'

const log = createModuleLogger('Transcode')

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
  onProgress?: (progress: TranscodeProgress) => void,
): Promise<void> {
  const duration = await getVideoDuration(inputPath)

  const args = ['-y', '-i', inputPath]

  // Выбор кодека на основе настроек
  const codec = options.codec || 'av1'

  if (options.useGpu) {
    // Те же аргументы NVENC, что у VideoPool и VMAF-сэмплов (nvenc-args.ts)
    const { supportsTemporalFilter } = await getGpuCapability()
    args.push(...buildNvencEncodeArgs({ ...options, codec }, { temporalFilterSupported: supportsTemporalFilter }))
  } else {
    // CPU кодеки
    const cpuCodecs = {
      av1: 'libsvtav1',
      hevc: 'libx265',
      h264: 'libx264',
    }
    const cpuPreset = mapToCpuPreset(options.preset, codec.toUpperCase())
    args.push('-c:v', cpuCodecs[codec], '-crf', options.cq.toString(), '-preset', cpuPreset, '-g', '360')
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
  onProgress?: (progress: TranscodeProgress) => void,
): Promise<void> {
  console.warn('[transcodeAudio] input:', inputPath, '→ output:', outputPath)

  const duration = await getVideoDuration(inputPath)
  const { syncOffset } = options

  // Один шаг: напрямую input → AAC (без промежуточного WAV)
  await new Promise<void>((resolve, reject) => {
    const startTime = Date.now()
    const args: string[] = ['-y']

    // Положительное смещение: обрезать начало
    if (syncOffset && syncOffset > 0) {
      args.push('-ss', (syncOffset / 1000).toFixed(3))
    }

    args.push('-i', inputPath)

    // Выбор аудиопотока
    if (options.streamIndex !== undefined) {
      args.push('-map', `0:a:${options.streamIndex}`)
    }

    args.push('-c:a', 'aac', '-b:a', `${options.bitrate}k`)
    args.push('-ar', options.sampleRate.toString(), '-ac', options.channels.toString())

    // Отрицательное смещение: добавить тишину
    if (syncOffset && syncOffset < 0) {
      const delayMs = Math.abs(syncOffset)
      args.push('-af', `adelay=${delayMs}|${delayMs}|${delayMs}|${delayMs}|${delayMs}|${delayMs}|${delayMs}|${delayMs}`)
    }

    args.push(outputPath)

    console.warn('[transcodeAudio] FFmpeg cmd:', args.join(' '))
    const ff = spawnFFmpeg(args)

    ff.stderr.on('data', (data) => {
      const str = data.toString()
      const currentTime = parseTimeToSeconds(str)

      if (currentTime !== null && onProgress) {
        const percent = Math.min(100, (currentTime / duration) * 100)
        const elapsed = (Date.now() - startTime) / 1000
        const eta = elapsed > 0 ? (elapsed / percent) * (100 - percent) : 0

        onProgress({ percent, currentTime, totalDuration: duration, eta, stage: 'audio' })
      }
    })

    ff.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`ffmpeg audio transcode exited with code ${code}`))
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

/**
 * Конвертация аудио в AAC с VBR (target bitrate)
 *
 * Отличия от transcodeAudio():
 * - Напрямую конвертирует без промежуточного WAV
 * - Target bitrate вместо CBR
 * - Опциональные sampleRate/channels (по умолчанию сохраняет исходные)
 *
 * @param inputPath Путь к исходному аудио/видео
 * @param outputPath Путь для выходного файла (.m4a или .aac)
 * @param options Настройки VBR кодирования
 * @param onProgress Callback для прогресса
 */
export async function transcodeAudioVBR(
  inputPath: string,
  outputPath: string,
  options: AudioTranscodeVBROptions,
  onProgress?: (progress: TranscodeProgress) => void,
): Promise<void> {
  const duration = await getVideoDuration(inputPath)

  // Собираем аргументы ffmpeg
  const args = [
    '-y',
    '-threads',
    '0', // Использовать все доступные потоки
    '-i',
    inputPath,
    '-c:a',
    'aac',
    '-b:a',
    `${options.targetBitrate}k`,
    '-vn', // Без видео
  ]

  // Опциональный sample rate
  if (options.sampleRate) {
    args.push('-ar', options.sampleRate.toString())
  }

  // Опциональное количество каналов
  if (options.channels) {
    args.push('-ac', options.channels.toString())
  }

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
        const eta = elapsed > 0 && percent > 0 ? (elapsed / percent) * (100 - percent) : 0

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
        reject(new Error(`ffmpeg audio VBR transcode exited with code ${code}`))
      }
    })

    ff.on('error', reject)
  })
}

/** Дефолтные настройки VBR аудио */
export const defaultAudioVBROptions: AudioTranscodeVBROptions = {
  targetBitrate: 192,
}

/**
 * Сколько символов предыдущего чанка stderr приклеивать к следующему: строка об отказе
 * временного фильтра может разорваться на границе чанков
 */
const STDERR_CHUNK_OVERLAP = 128

/**
 * Возможности GPU для стратегии кодирования. CPU-профилю nvidia-smi не нужен
 */
async function resolveEncoderCapabilities(useGpu: boolean): Promise<EncoderCapabilities> {
  if (!useGpu) {
    return { temporalFilterSupported: false }
  }
  const { supportsTemporalFilter } = await getGpuCapability()
  return { temporalFilterSupported: supportsTemporalFilter }
}

/**
 * Запуск кодирования по профилю с повтором без временного фильтра NVENC.
 *
 * Фильтр — улучшение, а не требование профиля: отказ ffmpeg (GPU старше Blackwell, меньше
 * 4 B-кадров) не должен ронять задачу.
 */
async function withTemporalFilterFallback<T>(
  profile: EncodingProfileOptions,
  run: (effectiveProfile: EncodingProfileOptions) => Promise<T>,
): Promise<T> {
  try {
    return await run(profile)
  } catch (error) {
    if (!(error instanceof NvencTemporalFilterError) || !profile.temporalFilter) {
      throw error
    }
    log.warn('NVENC отказал во временном фильтре — повтор без него', { profile: profile.name })
    return run({ ...profile, temporalFilter: false })
  }
}

/**
 * Транскодирование видео с использованием профиля
 *
 * @param inputPath Путь к исходному видео
 * @param outputPath Путь для выходного файла
 * @param profile Профиль кодирования
 * @param sourceBitDepth Битность исходного видео (опционально, для автоопределения 10-bit)
 * @param onProgress Callback для прогресса
 * @param cropFilter Готовая строка `crop=W:H:X:Y` из cropdetect (см. cropdetect.ts) — опционально
 */
export async function transcodeVideoWithProfile(
  inputPath: string,
  outputPath: string,
  profile: EncodingProfileOptions,
  sourceBitDepth = 8,
  onProgress?: (progress: TranscodeProgress) => void,
  cropFilter?: string,
): Promise<void> {
  const duration = await getVideoDuration(inputPath)
  const capabilities = await resolveEncoderCapabilities(profile.useGpu)

  const run = (effectiveProfile: EncodingProfileOptions): Promise<void> => {
    // Коррекция: -hwaccel и -hwaccel_output_format должны быть до -i
    // Перестраиваем аргументы правильно
    const finalArgs: string[] = ['-y']

    // Стратегия кодирования определяет hwaccel и цепочку видеофильтров
    const strategy = getEncoderStrategy(effectiveProfile.useGpu, capabilities)

    // Сначала hwaccel опции (если есть) — они должны идти до -i
    finalArgs.push(...strategy.buildHwaccelArgs())

    // Затем input
    finalArgs.push('-i', inputPath)

    // Crop (обрезка чёрных полос, см. cropdetect.ts) + deband для аниме контента (убирает
    // banding в градиентах). Deband опционально отключается через profile.deband для тяжёлых файлов.
    const videoFilter = strategy.buildVideoFilterChain({
      deband: effectiveProfile.deband !== false,
      cropFilter,
      sourceBitDepth,
    })
    if (videoFilter) {
      finalArgs.push('-vf', videoFilter)
    }

    // Затем все аргументы кодирования (без hwaccel — они уже добавлены выше)
    finalArgs.push(...strategy.buildArgs(effectiveProfile, sourceBitDepth))

    // Без аудио
    finalArgs.push('-an')

    // Output
    finalArgs.push(outputPath)

    return new Promise((resolve, reject) => {
      const startTime = Date.now()
      const ff = spawnFFmpeg(finalArgs)
      // Весь stderr длинного кодирования не храним: флаг + перекрытие на стыке чанков
      let temporalFilterRejected = false
      let chunkOverlap = ''

      ff.stderr.on('data', (data) => {
        const str = data.toString()
        if (!temporalFilterRejected && isNvencTemporalFilterError(chunkOverlap + str)) {
          temporalFilterRejected = true
        }
        chunkOverlap = str.slice(-STDERR_CHUNK_OVERLAP)
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
          const message = `ffmpeg video transcode with profile "${effectiveProfile.name}" exited with code ${code}`
          reject(temporalFilterRejected ? new NvencTemporalFilterError(message) : new Error(message))
        }
      })

      ff.on('error', reject)
    })
  }

  return withTemporalFilterFallback(profile, run)
}

/**
 * Кодирование тестового сэмпла (первые N секунд)
 *
 * @param inputPath Путь к исходному видео
 * @param outputPath Путь для выходного файла
 * @param profile Профиль кодирования
 * @param startTime Начало сэмпла (секунды)
 * @param duration Длительность сэмпла (секунды)
 * @param sourceBitDepth Битность исходного видео
 * @param onProgress Callback для прогресса
 */
export async function encodeSample(
  inputPath: string,
  outputPath: string,
  profile: EncodingProfileOptions,
  startTime = 0,
  duration = 300,
  sourceBitDepth = 8,
  onProgress?: (progress: TranscodeProgress) => void,
): Promise<{ success: boolean; outputPath: string; encodingTime: number; outputSize: number }> {
  const capabilities = await resolveEncoderCapabilities(profile.useGpu)

  const run = (
    effectiveProfile: EncodingProfileOptions,
  ): Promise<{ success: boolean; outputPath: string; encodingTime: number; outputSize: number }> => {
    // Стратегия кодирования определяет hwaccel и цепочку видеофильтров
    const strategy = getEncoderStrategy(effectiveProfile.useGpu, capabilities)
    const encodingArgs = strategy.buildArgs(effectiveProfile, sourceBitDepth)

    const args: string[] = ['-y']

    // Hardware acceleration — должна идти до -i
    args.push(...strategy.buildHwaccelArgs())

    // Seek to start (до -i для быстрого seek'а)
    args.push('-ss', startTime.toString())

    // Duration
    args.push('-t', duration.toString())

    // Input
    args.push('-i', inputPath)

    // Deband фильтр для аниме контента (опционально). Без crop — сэмпл только для оценки
    // качества/скорости профиля, не для финального транскода.
    const sampleVideoFilter = strategy.buildVideoFilterChain({
      deband: effectiveProfile.deband !== false,
      sourceBitDepth,
    })
    if (sampleVideoFilter) {
      args.push('-vf', sampleVideoFilter)
    }

    // Encoding args
    args.push(...encodingArgs)

    // Без аудио для теста
    args.push('-an')

    // Output
    args.push(outputPath)

    const encodingStartTime = Date.now()

    return new Promise((resolve, reject) => {
      const ff = spawnFFmpeg(args)
      let stderrBuffer = '' // Буфер для сбора stderr

      ff.stderr.on('data', (data) => {
        const str = data.toString()
        stderrBuffer += str // Собираем весь stderr
        const currentTime = parseTimeToSeconds(str)

        if (currentTime !== null && onProgress) {
          const percent = Math.min(100, (currentTime / duration) * 100)
          const elapsed = (Date.now() - encodingStartTime) / 1000
          const eta = elapsed > 0 && percent > 0 ? (elapsed / percent) * (100 - percent) : 0

          onProgress({
            percent,
            currentTime,
            totalDuration: duration,
            eta,
            stage: 'video',
          })
        }
      })

      ff.on('error', (err) => {
        // Обработка ошибки spawn (ENOENT, etc)
        reject(new Error(`FFmpeg spawn error: ${err.message}`))
      })

      ff.on('close', async (code) => {
        const encodingTime = (Date.now() - encodingStartTime) / 1000

        if (code === 0) {
          // Получаем размер выходного файла
          const fs = await import('fs')
          let outputSize = 0
          try {
            const stats = fs.statSync(outputPath)
            outputSize = stats.size
          } catch {
            // Игнорируем ошибки
          }

          resolve({
            success: true,
            outputPath,
            encodingTime,
            outputSize,
          })
        } else {
          // Последние 500 символов stderr для диагностики
          const stderrTail = stderrBuffer.slice(-500)
          const message =
            `ffmpeg sample encode with profile "${effectiveProfile.name}" exited with code ${code}\nStderr: ${stderrTail}`
          reject(isNvencTemporalFilterError(stderrBuffer) ? new NvencTemporalFilterError(message) : new Error(message))
        }
      })
    })
  }

  return withTemporalFilterFallback(profile, run)
}
