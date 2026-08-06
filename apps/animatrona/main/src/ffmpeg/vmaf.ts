/**
 * Модуль VMAF — расчёт качества видео и автоподбор CQ
 */

import * as os from 'os'
import * as path from 'path'
import type {
  CqIteration,
  CqSearchOptions,
  CqSearchProgress,
  CqSearchResult,
  SampleConfig,
  VmafOptions,
  VmafResult,
} from '../../../shared/types/vmaf'
import { CQ_RANGES, DEFAULT_SAMPLE_CONFIG, DEFAULT_VMAF_OPTIONS } from '../../../shared/types/vmaf'
import { spawnFFmpeg } from '../../utils/ffmpeg-spawn'
import { getVideoDuration, probeFile } from './probe'
import { cleanupSamples, encodeSamplesParallelWithFallback, extractSamples } from './sample'
import type { VideoTranscodeOptions } from './types'

/**
 * Расчёт VMAF между оригинальным и закодированным видео
 *
 * @param encoded Путь к закодированному видео
 * @param original Путь к оригинальному видео
 * @param options Опции расчёта VMAF
 * @returns Результат VMAF с метриками
 */
export async function calculateVMAF(encoded: string, original: string, options?: VmafOptions): Promise<VmafResult> {
  const opts = { ...DEFAULT_VMAF_OPTIONS, ...options }
  const startTime = Date.now()

  // Определяем разрешение для выбора модели
  const mediaInfo = await probeFile(original)
  const height = mediaInfo.videoTracks[0]?.height ?? 1080

  // Выбор модели VMAF: vmaf_4k для разрешения выше 1080p
  const model = opts.model ?? (height > 1080 ? 'vmaf_4k_v0.6.1' : 'vmaf_v0.6.1')

  // Количество потоков для расчёта
  const threads = opts.threads ?? os.cpus().length

  // Построение фильтра libvmaf
  const vmafParams = [
    `model=version=${model}`,
    `n_subsample=${opts.subsample ?? 5}`,
    `n_threads=${threads}`,
    'log_fmt=json',
    'log_path=-', // Вывод JSON в stdout
  ]

  if (opts.phoneModel) {
    vmafParams.push('phone_model=1')
  }

  // FFmpeg команда: сравнение encoded (первый вход) с original (второй вход)
  // [0:v] = encoded, [1:v] = original
  // Конвертируем оба потока в yuv420p10le для совместимости с libvmaf
  const filterComplex = [
    '[0:v]format=yuv420p10le[distorted]',
    '[1:v]format=yuv420p10le[reference]',
    `[distorted][reference]libvmaf=${vmafParams.join(':')}`,
  ].join(';')

  // -hwaccel cuda ускоряет декодирование H264/HEVC файлов
  // НЕ используем hwaccel для AV1 — баги в NVDEC с некоторым контентом
  // libvmaf работает на CPU
  const args = [
    '-hide_banner',
    '-threads',
    String(threads),
    '-i',
    encoded, // AV1 — декод на CPU для стабильности
    '-hwaccel',
    'cuda',
    '-i',
    original, // H264/HEVC — декод на GPU
    '-filter_complex',
    filterComplex,
    '-f',
    'null',
    '-',
  ]

  // Проверяем входные файлы
  const fs = await import('fs')
  const encodedExists = fs.existsSync(encoded)
  const originalExists = fs.existsSync(original)
  const encodedSize = encodedExists ? fs.statSync(encoded).size : 0
  const originalSize = originalExists ? fs.statSync(original).size : 0

  if (!encodedExists || encodedSize === 0) {
    throw new Error(`Encoded file missing or empty: ${encoded}`)
  }
  if (!originalExists || originalSize === 0) {
    throw new Error(`Original file missing or empty: ${original}`)
  }

  return new Promise((resolve, reject) => {
    const ff = spawnFFmpeg(args)

    let stdout = ''
    let stderr = ''

    ff.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    ff.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    ff.on('close', (code) => {
      const calculationTime = Date.now() - startTime

      if (code !== 0) {
        reject(new Error(`VMAF calculation failed: ${stderr.slice(-500)}`))
        return
      }

      try {
        // Парсим JSON результат из stdout
        const result = parseVmafOutput(stdout, stderr)
        resolve({
          ...result,
          calculationTime,
        })
      } catch (error) {
        reject(new Error(`Failed to parse VMAF output: ${error}`))
      }
    })

    ff.on('error', reject)
  })
}

/**
 * Парсинг вывода VMAF из FFmpeg
 */
function parseVmafOutput(stdout: string, stderr: string): Omit<VmafResult, 'calculationTime'> {
  // Пытаемся распарсить JSON из stdout (log_path=-)
  if (stdout.trim()) {
    try {
      const json = JSON.parse(stdout)
      const pooledMetrics = json.pooled_metrics || {}
      const vmafMetric = pooledMetrics.vmaf || {}

      return {
        score: vmafMetric.mean ?? 0,
        pooledMean: vmafMetric.mean ?? 0,
        min: vmafMetric.min ?? 0,
        max: vmafMetric.max ?? 0,
      }
    } catch {
      // JSON не распарсился, пробуем regex
    }
  }

  // Fallback: парсим из stderr (старый формат вывода)
  const vmafMatch = stderr.match(/VMAF score:\s*([\d.]+)/)
  const meanMatch = stderr.match(/VMAF Mean:\s*([\d.]+)/)
  const minMatch = stderr.match(/VMAF Min:\s*([\d.]+)/)
  const maxMatch = stderr.match(/VMAF Max:\s*([\d.]+)/)

  // Альтернативный формат из libvmaf
  const pooledMatch = stderr.match(/\[libvmaf.*?\]\s*VMAF score:\s*([\d.]+)/)
  const altMatch = stderr.match(/VMAF score\s*=\s*([\d.]+)/i)

  const score = parseFloat(vmafMatch?.[1] ?? pooledMatch?.[1] ?? altMatch?.[1] ?? meanMatch?.[1] ?? '0')

  return {
    score,
    pooledMean: parseFloat(meanMatch?.[1] ?? String(score)),
    min: parseFloat(minMatch?.[1] ?? String(score)),
    max: parseFloat(maxMatch?.[1] ?? String(score)),
  }
}

/**
 * Параллельный расчёт VMAF для нескольких пар файлов
 *
 * @param pairs Массив пар [encoded, original]
 * @param options Опции VMAF
 * @returns Массив результатов
 */
export async function calculateVMAFBatch(pairs: Array<[string, string]>, options?: VmafOptions): Promise<VmafResult[]> {
  // Запускаем все расчёты параллельно
  const results = await Promise.all(pairs.map(([encoded, original]) => calculateVMAF(encoded, original, options)))
  return results
}

/**
 * Расчёт среднего VMAF из массива результатов
 */
export function averageVmaf(results: VmafResult[]): number {
  if (results.length === 0) {
    return 0
  }
  const sum = results.reduce((acc, r) => acc + r.score, 0)
  return sum / results.length
}

/**
 * Поиск оптимального CQ для целевого VMAF через бинарный поиск
 *
 * Алгоритм:
 * 1. Извлекаем 4 сэмпла из видео (20%, 40%, 60%, 80%)
 * 2. Бинарный поиск по диапазону CQ
 * 3. На каждой итерации кодируем все сэмплы параллельно (4 NVENC потока)
 * 4. Вычисляем средний VMAF
 * 5. Сужаем диапазон пока не найдём оптимальный CQ
 *
 * Для AV1 сначала пробует av1_nvenc (GPU). При crash автоматически
 * переключается на libsvtav1 (CPU) и устанавливает флаг useCpuFallback.
 *
 * @param inputPath Путь к исходному видео
 * @param videoOptions Базовые настройки кодирования (кодек, GPU, preset)
 * @param options Опции поиска CQ
 * @param onProgress Callback для прогресса
 * @param preferCpu Принудительно использовать CPU кодирование (из профиля)
 * @returns Результат поиска с оптимальным CQ и флагом useCpuFallback
 */
export async function findOptimalCQ(
  inputPath: string,
  videoOptions: Omit<VideoTranscodeOptions, 'cq'>,
  options: Partial<CqSearchOptions> = {},
  onProgress?: (progress: CqSearchProgress) => void,
  preferCpu = false,
): Promise<CqSearchResult> {
  const startTime = Date.now()
  const codec = videoOptions.codec ?? 'av1'

  // Дефолтные опции
  const targetVmaf = options.targetVmaf ?? 95
  const _tolerance = options.tolerance ?? 1 // Зарезервировано для будущего использования
  const cqRange = options.cqRange ?? CQ_RANGES[codec] ?? [16, 40]
  const maxIterations = options.maxIterations ?? 6
  const sampleConfig: SampleConfig = { ...DEFAULT_SAMPLE_CONFIG, ...options.sampleConfig }

  // Временная папка для сэмплов
  const tempDir = path.join(os.tmpdir(), `vmaf-search-${Date.now()}`)
  const samplesDir = path.join(tempDir, 'samples')
  const encodedDir = path.join(tempDir, 'encoded')

  const iterations: CqIteration[] = []
  let [lowCq, highCq] = cqRange

  // Флаг CPU fallback — устанавливается если GPU encoding crashed
  let useCpuFallback = false

  // Вычисляем ожидаемое количество итераций для бинарного поиска
  // ceil(log2(range)) — максимум итераций для сужения диапазона до 1
  const expectedIterations = Math.min(maxIterations, Math.ceil(Math.log2(highCq - lowCq)))

  try {
    // Получаем размер оригинала для расчёта экономии в UI
    const originalInfo = await probeFile(inputPath)
    const originalSize = originalInfo.size

    // Этап 1: Извлечение сэмплов
    onProgress?.({
      currentIteration: 0,
      totalIterations: expectedIterations,
      stage: 'extracting',
      originalSize,
    })

    // Anime4K: применяем фильтр при извлечении → lossless 1080p сэмплы как эталон
    const samples = await extractSamples(inputPath, samplesDir, sampleConfig, options.anime4kFilter)
    const originalDuration = await getVideoDuration(inputPath)

    // Этап 2: Бинарный поиск
    // bestCq инициализируем 0, будет обновлён при первой подходящей итерации
    let bestCq = 0
    let bestVmaf = 0
    let iterationCount = 0

    while (highCq - lowCq > 1 && iterationCount < maxIterations) {
      // Вычисляем пробный CQ (середина диапазона)
      const testCq = Math.round((lowCq + highCq) / 2)

      onProgress?.({
        currentIteration: iterationCount + 1,
        totalIterations: expectedIterations,
        stage: 'encoding',
        currentCq: testCq,
        iterations: [...iterations],
        originalSize,
      })

      // Кодируем все сэмплы параллельно с fallback на CPU при crash
      const encodeResult = await encodeSamplesParallelWithFallback(
        samples,
        path.join(encodedDir, `cq_${testCq}`),
        { ...videoOptions, cq: testCq },
        preferCpu,
      )
      const encodedSamples = encodeResult.samples

      // Запоминаем если был использован CPU fallback
      if (encodeResult.usedCpuFallback) {
        useCpuFallback = true
      }

      onProgress?.({
        currentIteration: iterationCount + 1,
        totalIterations: expectedIterations,
        stage: 'calculating',
        currentCq: testCq,
        iterations: [...iterations],
        originalSize,
        useCpuFallback, // Передаём флаг CPU fallback
      })

      // Вычисляем VMAF для каждого сэмпла
      const vmafPairs: Array<[string, string]> = encodedSamples.map((encoded, i) => [encoded.path, samples[i]])
      const vmafResults = await calculateVMAFBatch(vmafPairs)
      const avgVmaf = averageVmaf(vmafResults)

      // Суммарный размер закодированных сэмплов
      const totalSize = encodedSamples.reduce((acc, s) => acc + s.size, 0)
      const totalEncodingTime = encodedSamples.reduce((acc, s) => acc + s.encodingTime, 0)
      const totalVmafTime = vmafResults.reduce((acc, r) => acc + r.calculationTime, 0)

      const iteration: CqIteration = {
        cq: testCq,
        vmaf: avgVmaf,
        size: totalSize,
        encodingTime: totalEncodingTime,
        vmafTime: totalVmafTime,
      }
      iterations.push(iteration)

      onProgress?.({
        currentIteration: iterationCount + 1,
        totalIterations: expectedIterations,
        stage: 'calculating',
        currentCq: testCq,
        lastIteration: iteration,
        iterations: [...iterations],
        lastVmaf: avgVmaf,
        originalSize,
        useCpuFallback,
      })

      // Обновляем лучший результат
      // Ищем МАКСИМАЛЬНЫЙ CQ с VMAF >= target (больше CQ = меньше размер)
      // Tolerance используется только для остановки поиска, не для критерия выбора
      if (avgVmaf >= targetVmaf) {
        // VMAF достигает целевого — сохраняем если CQ выше (меньше размер)
        if (bestVmaf < targetVmaf || testCq > bestCq) {
          bestCq = testCq
          bestVmaf = avgVmaf
        }
      } else if (bestVmaf < targetVmaf && avgVmaf > bestVmaf) {
        // Целевой VMAF ещё не достигнут — сохраняем лучший из недостигнутых
        bestCq = testCq
        bestVmaf = avgVmaf
      }

      // Сужаем диапазон
      if (avgVmaf >= targetVmaf) {
        // VMAF достаточный — можно увеличить CQ (уменьшить качество/размер)
        lowCq = testCq
      } else {
        // VMAF недостаточный — нужно уменьшить CQ (увеличить качество)
        highCq = testCq
      }

      iterationCount++
    }

    // Если bestCq не был найден, выбираем лучший из протестированных
    if (bestCq === 0 && iterations.length > 0) {
      // Сортируем: сначала по VMAF >= target, потом по максимальному CQ
      const sorted = [...iterations].sort((a, b) => {
        const aOk = a.vmaf >= targetVmaf
        const bOk = b.vmaf >= targetVmaf
        if (aOk && !bOk) {
          return -1
        }
        if (!aOk && bOk) {
          return 1
        }
        if (aOk && bOk) {
          return b.cq - a.cq
        } // Больше CQ = меньше размер
        return b.vmaf - a.vmaf // Лучший VMAF из неподходящих
      })
      bestCq = sorted[0].cq
      bestVmaf = sorted[0].vmaf
    }

    // Финальный результат
    onProgress?.({
      currentIteration: iterationCount,
      totalIterations: iterationCount,
      stage: 'done',
      currentCq: bestCq,
      iterations: [...iterations],
      lastVmaf: bestVmaf,
      originalSize,
      useCpuFallback,
    })

    // Оценка размера полного видео на основе сэмплов
    let bestIteration = iterations.find((i) => i.cq === bestCq)
    // Fallback: если не нашли точное совпадение, берём ближайший
    if (!bestIteration && iterations.length > 0) {
      bestIteration = iterations.reduce((closest, curr) =>
        Math.abs(curr.cq - bestCq) < Math.abs(closest.cq - bestCq) ? curr : closest
      )
    }
    const samplesDuration = sampleConfig.duration * sampleConfig.count
    const estimatedSize = bestIteration ? Math.round((bestIteration.size / samplesDuration) * originalDuration) : 0

    // Расчёт экономии на основе размера оригинала (уже получен в начале)
    const estimatedSavings = originalSize > 0 ? 1 - estimatedSize / originalSize : 0

    // Если сжатие неэффективно — прерываем с ошибкой (если не указан флаг игнорирования)
    // anime4kFilter: упскейл всегда больше оригинала — пропускаем проверку
    if (estimatedSavings <= 0 && originalSize > 0 && !options.skipCompressionCheck && !options.anime4kFilter) {
      throw new Error(
        `Сжатие неэффективно: оценочный размер ${Math.round(estimatedSize / 1024 / 1024)}MB `
          + `>= исходник ${Math.round(originalSize / 1024 / 1024)}MB (CQ=${bestCq}). `
          + `Исходник уже достаточно сжат, перекодирование увеличит размер файла.`,
      )
    }

    return {
      optimalCq: bestCq,
      vmafScore: bestVmaf,
      estimatedSize,
      estimatedSavings: Math.max(0, estimatedSavings),
      iterations,
      totalTime: Date.now() - startTime,
      useCpuFallback,
    }
  } finally {
    // Очистка временных файлов
    cleanupSamples(tempDir)
  }
}
