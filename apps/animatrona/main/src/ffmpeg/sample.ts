/**
 * Модуль сэмплирования — извлечение и кодирование тестовых фрагментов видео
 */

import * as fs from 'fs'
import * as path from 'path'
import type { SampleConfig } from '../../../shared/types/vmaf'
import { DEFAULT_SAMPLE_CONFIG } from '../../../shared/types/vmaf'
import { spawnFFmpeg } from '../../utils/ffmpeg-spawn'
import { getVideoDuration } from './probe'
import type { VideoTranscodeOptions } from './types'

/** Результат кодирования сэмпла */
export interface EncodedSample {
  /** Путь к закодированному файлу */
  path: string
  /** Размер файла в байтах */
  size: number
  /** Длительность в секундах */
  duration: number
  /** Время кодирования в мс */
  encodingTime: number
}

/** Результат кодирования сэмплов с информацией о fallback */
export interface EncodedSamplesResult {
  /** Закодированные сэмплы */
  samples: EncodedSample[]
  /** Был использован CPU fallback (GPU encoding crashed) */
  usedCpuFallback: boolean
}

/** Маппинг NVENC preset → libsvtav1 preset (для CPU fallback) */
const _NVENC_TO_SVT_PRESET: Record<string, number> = {
  p7: 3, // Максимальное качество
  p6: 4,
  p5: 4,
  p4: 6,
  p3: 6,
  p2: 8,
  p1: 8,
}

/** SVT-AV1 параметры для аниме (best practices 2025, для CPU fallback) */
const _SVT_AV1_PARAMS = [
  'tune=0', // VQ/psychovisual
  'film-grain=4', // Для аниме (8 для live-action)
  'film-grain-denoise=0', // Отключить деноизинг — сохраняет детали
  'enable-overlays=1', // Улучшает качество
  'scd=1', // Scene change detection
  'enable-tf=0', // Отключить temporal filtering — резкость линий
  'enable-qm=1', // Quantization matrices — лучше сжатие
].join(':')

/** SVT-AV1 параметры для VMAF сэмплов — оптимизированы для низкого потребления RAM */
const SVT_AV1_VMAF_PARAMS = [
  'tune=0', // VQ/psychovisual
  'film-grain=0', // Без grain для VMAF — быстрее
  'enable-overlays=0', // Отключаем для скорости
  'scd=0', // Отключаем SCD
  'enable-tf=0', // Отключить temporal filtering
  'enable-qm=0', // Отключаем QM — меньше RAM
  'lookahead=0', // Минимальный lookahead — КРИТИЧНО для RAM
  'lp=2', // Ограничиваем до 2 tile потоков — меньше RAM
].join(':')

/**
 * Извлечение сэмплов из видео
 *
 * @param inputPath Путь к исходному видео
 * @param outputDir Папка для сохранения сэмплов
 * @param config Конфигурация сэмплирования
 * @returns Массив путей к извлечённым сэмплам
 */
export async function extractSamples(
  inputPath: string,
  outputDir: string,
  config?: Partial<SampleConfig>,
  videoFilter?: string,
): Promise<string[]> {
  const cfg: SampleConfig = { ...DEFAULT_SAMPLE_CONFIG, ...config }
  const duration = await getVideoDuration(inputPath)

  // Создаём папку если не существует
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const samples: string[] = []

  // Извлекаем сэмплы параллельно
  const promises = cfg.positions.slice(0, cfg.count).map(async (position, index) => {
    const startTime = Math.max(0, duration * position - cfg.duration / 2)
    const outputPath = path.join(outputDir, `sample_${index}.mkv`)

    await extractSample(inputPath, outputPath, startTime, cfg.duration, videoFilter)
    return outputPath
  })

  const results = await Promise.all(promises)
  samples.push(...results)

  return samples
}

/**
 * Извлечение одного сэмпла из видео (без перекодирования)
 *
 * ВАЖНО: -ss ПОСЛЕ -i для точного seeking в BDRemux файлах
 * (иначе FFmpeg ищет ближайший keyframe и сэмпл может быть пустым)
 */
async function extractSample(
  inputPath: string,
  outputPath: string,
  startTime: number,
  duration: number,
  videoFilter?: string,
): Promise<void> {
  // Используем FFV1 — истинно lossless кодек, сохраняет 10-bit
  // libx264 CRF 0 не поддерживает 10-bit без специальной сборки
  const args = ['-y', '-ss', startTime.toFixed(3), '-i', inputPath, '-t', duration.toFixed(3), '-map', '0:v:0']

  // Применяем фильтр перед FFV1 (например, Anime4K → lossless 1080p эталон)
  if (videoFilter) {
    args.push('-vf', videoFilter)
  }

  args.push(
    '-c:v',
    'ffv1',
    '-level',
    '3', // Multithreading
    '-coder',
    '1', // Range coder (лучше сжатие)
    '-context',
    '1', // Large context (лучше сжатие)
    '-slicecrc',
    '1', // Проверка целостности
    outputPath,
  )

  return new Promise((resolve, reject) => {
    const ff = spawnFFmpeg(args)
    let stderrOutput = ''

    ff.stderr?.on('data', (data: Buffer) => {
      stderrOutput += data.toString()
    })

    ff.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        const lastLines = stderrOutput.split('\n').slice(-5).join('\n')
        reject(new Error(`Failed to extract sample: exit code ${code}\n${lastLines}`))
      }
    })

    ff.on('error', reject)
  })
}

/**
 * Параллельное кодирование всех сэмплов (использует все доступные NVENC потоки)
 *
 * @param samples Массив путей к сэмплам
 * @param outputDir Папка для закодированных сэмплов
 * @param options Настройки кодирования
 * @returns Массив результатов кодирования
 */
export async function encodeSamplesParallel(
  samples: string[],
  outputDir: string,
  options: VideoTranscodeOptions,
): Promise<EncodedSample[]> {
  // Создаём папку если не существует
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  // Запускаем все кодирования параллельно (4 NVENC потока)
  const promises = samples.map(async (samplePath, index) => {
    const outputPath = path.join(outputDir, `encoded_${index}.mkv`)
    return encodeSample(samplePath, outputPath, options, false)
  })

  return Promise.all(promises)
}

/**
 * Параллельное кодирование сэмплов с автоматическим fallback на CPU
 *
 * Стратегия:
 * 1. Кодируем ОДИН сэмпл на GPU для проверки
 * 2. Если успешно — кодируем остальные на GPU параллельно
 * 3. Если ошибка — сразу переключаемся на CPU для ВСЕХ сэмплов
 *
 * Это предотвращает запуск множества падающих GPU процессов.
 *
 * @param samples Массив путей к сэмплам
 * @param outputDir Папка для закодированных сэмплов
 * @param options Настройки кодирования
 * @param preferCpu Принудительно использовать CPU (из профиля)
 * @returns Результат с информацией о fallback
 */
export async function encodeSamplesParallelWithFallback(
  samples: string[],
  outputDir: string,
  options: VideoTranscodeOptions,
  preferCpu = false,
): Promise<EncodedSamplesResult> {
  // Создаём папку если не существует
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const codec = (options.codec || 'av1').toLowerCase()

  // Для AV1: если preferCpu или !useGpu — сразу CPU
  // Для других кодеков: GPU работает стабильно, используем как обычно
  const shouldTryGpu = codec === 'av1' && options.useGpu && !preferCpu

  if (shouldTryGpu && samples.length > 0) {
    // Сначала тестируем GPU на ОДНОМ сэмпле
    const testSamplePath = samples[0]
    const testOutputPath = path.join(outputDir, 'encoded_0.mkv')

    try {
      const testResult = await encodeSample(testSamplePath, testOutputPath, options, false)

      // GPU работает — кодируем остальные сэмплы параллельно
      if (samples.length > 1) {
        const remainingPromises = samples.slice(1).map(async (samplePath, index) => {
          const outputPath = path.join(outputDir, `encoded_${index + 1}.mkv`)
          return encodeSample(samplePath, outputPath, options, false)
        })

        const remainingResults = await Promise.all(remainingPromises)

        return {
          samples: [testResult, ...remainingResults],
          usedCpuFallback: false,
        }
      }

      // Только один сэмпл
      return {
        samples: [testResult],
        usedCpuFallback: false,
      }
    } catch {
      // GPU crash — переключаемся на CPU
      // Очищаем тестовый файл если создан
      if (fs.existsSync(testOutputPath)) {
        try {
          fs.unlinkSync(testOutputPath)
        } catch {
          // Игнорируем ошибки удаления
        }
      }
    }
  }

  // CPU кодирование (libsvtav1) — ПОСЛЕДОВАТЕЛЬНО чтобы избежать OOM
  // libsvtav1 потребляет много RAM, параллельный запуск 4 процессов вызывает OOM
  const results: EncodedSample[] = []
  for (let index = 0; index < samples.length; index++) {
    const samplePath = samples[index]
    const outputPath = path.join(outputDir, `encoded_${index}.mkv`)
    const result = await encodeSample(samplePath, outputPath, options, true)
    results.push(result)
  }

  return {
    samples: results,
    usedCpuFallback: shouldTryGpu || preferCpu, // true если пробовали GPU и упали, или preferCpu
  }
}

/**
 * Кодирование одного сэмпла
 *
 * @param inputPath Путь к исходному сэмплу
 * @param outputPath Путь для выходного файла
 * @param options Настройки кодирования
 * @param forceCpu Использовать CPU кодирование (libsvtav1)
 */
async function encodeSample(
  inputPath: string,
  outputPath: string,
  options: VideoTranscodeOptions,
  forceCpu: boolean,
): Promise<EncodedSample> {
  const startTime = Date.now()
  const duration = await getVideoDuration(inputPath)

  const args = buildEncodingArgs(inputPath, outputPath, options, forceCpu)

  await new Promise<void>((resolve, reject) => {
    const ff = spawnFFmpeg(args)
    let stderrOutput = ''

    ff.stderr?.on('data', (data: Buffer) => {
      stderrOutput += data.toString()
    })

    ff.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        const lastLines = stderrOutput.split('\n').slice(-10).join('\n')
        reject(new Error(`Failed to encode sample: exit code ${code}\n${lastLines}`))
      }
    })

    ff.on('error', reject)
  })

  // Проверяем что файл создан и не пустой
  if (!fs.existsSync(outputPath)) {
    throw new Error(`Encoded sample not created: ${outputPath}`)
  }

  const stats = fs.statSync(outputPath)

  if (stats.size === 0) {
    throw new Error(`Encoded sample is empty (0 bytes): ${outputPath}`)
  }

  return {
    path: outputPath,
    size: stats.size,
    duration,
    encodingTime: Date.now() - startTime,
  }
}

/**
 * Построение аргументов FFmpeg для кодирования
 *
 * ВАЖНО: Порядок аргументов FFmpeg критичен!
 * Input options (-hwaccel) должны идти ПЕРЕД -i
 * Output options (-c:v, -cq) должны идти ПОСЛЕ -i
 *
 * @param inputPath Путь к исходному файлу
 * @param outputPath Путь для выходного файла
 * @param options Настройки кодирования
 * @param forceCpu Принудительно использовать CPU кодирование (libsvtav1 для AV1)
 */
function buildEncodingArgs(
  inputPath: string,
  outputPath: string,
  options: VideoTranscodeOptions,
  forceCpu: boolean,
): string[] {
  // Начинаем с -y (overwrite)
  const args = ['-y']

  // NOTE: Deband фильтр НЕ применяется для VMAF тестирования!
  // Он изменяет изображение, что VMAF воспринимает как потерю качества.
  // Deband добавляется только при финальном кодировании (transcode.ts).

  // Нормализуем codec к нижнему регистру (БД хранит AV1, HEVC, H264)
  const codec = (options.codec || 'av1').toLowerCase()
  const useNvenc = options.useGpu && !forceCpu

  // === INPUT OPTIONS (до -i) ===
  // -hwaccel cuda должен быть ДО -i для GPU декодирования
  if (useNvenc && codec === 'av1') {
    args.push('-hwaccel', 'cuda')
  }

  // Входной файл
  args.push('-i', inputPath)

  // === OUTPUT OPTIONS (после -i) ===

  // GOP для VMAF сэмплов
  const gop = '120'

  if (codec === 'av1') {
    if (forceCpu || !options.useGpu) {
      // libsvtav1 — быстрый и надёжный CPU encoder для AV1
      // Используется при crash NVENC или preferCpu
      // Используем более агрессивный preset (8) для скорости — это тестовые сэмплы
      const svtPreset = 8 // Быстрый preset для VMAF тестов

      args.push('-c:v', 'libsvtav1')
      args.push('-crf', options.cq.toString())
      args.push('-preset', svtPreset.toString())
      args.push('-g', gop)
      args.push('-svtav1-params', SVT_AV1_VMAF_PARAMS) // Оптимизировано для RAM
      args.push('-pix_fmt', 'yuv420p10le') // 10-bit обязательно
    } else {
      // av1_nvenc — NVIDIA GPU encoder
      // Может crash на некоторых BlurayRemux файлах
      args.push('-c:v', 'av1_nvenc')
      args.push('-cq', options.cq.toString())
      args.push('-preset', options.preset)
      args.push('-g', gop)
      args.push('-pix_fmt', 'p010le') // 10-bit для NVENC
      args.push('-tune', 'hq')
      args.push('-spatial-aq', '1')
      args.push('-temporal-aq', '1')
      args.push('-aq-strength', '15')
    }
  } else if (options.useGpu && !forceCpu) {
    // NVIDIA NVENC для H264/HEVC (работают стабильно)
    const nvencCodecs: Record<string, string> = {
      hevc: 'hevc_nvenc',
      h264: 'h264_nvenc',
    }

    // Pixel format: p010le для 10-bit
    args.push('-pix_fmt', 'p010le')

    // -cq работает с VBR rate control
    args.push('-c:v', nvencCodecs[codec], '-cq', options.cq.toString(), '-preset', options.preset, '-g', gop)

    // H264/HEVC: включаем AQ для лучшего качества
    args.push('-tune', 'hq', '-spatial-aq', '1', '-temporal-aq', '1', '-aq-strength', '15')
  } else {
    // CPU кодеки (fallback если GPU недоступен)
    const cpuCodecs: Record<string, string> = {
      hevc: 'libx265',
      h264: 'libx264',
    }

    args.push('-c:v', cpuCodecs[codec], '-crf', options.cq.toString(), '-preset', options.preset, '-g', gop)
  }

  // Без аудио
  args.push('-an')

  // Выходной файл
  args.push(outputPath)

  return args
}

/**
 * Очистка временных файлов сэмплов
 */
export function cleanupSamples(sampleDir: string): void {
  try {
    if (fs.existsSync(sampleDir)) {
      fs.rmSync(sampleDir, { recursive: true, force: true })
    }
  } catch {
    // Игнорируем ошибки очистки
  }
}
