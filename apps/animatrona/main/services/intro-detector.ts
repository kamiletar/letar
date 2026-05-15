/**
 * Сервис автоопределения OP/ED через audio fingerprinting
 *
 * Алгоритм вдохновлён intro-skipper (https://github.com/intro-skipper/intro-skipper):
 * 1. Извлекаем аудио-отпечатки (Chromaprint) для intro/outro зон каждого эпизода
 * 2. Попарно сравниваем: XOR + PopCount → количество отличающихся бит
 * 3. Ищем непрерывные совпадающие регионы через инвертированный индекс
 * 4. Фильтруем по длительности (15с ≤ OP ≤ 120с, ED ≤ 240с)
 */

import { extractFingerprint, isFpcalcAvailable } from '../utils/fpcalc'
import { createModuleLogger } from '../utils/logger'

const log = createModuleLogger('IntroDetector')

/** Результат детекции для одного эпизода */
export interface IntroDetectorResult {
  episodeId: string
  introStartMs: number | null
  introEndMs: number | null
  outroStartMs: number | null
  outroEndMs: number | null
}

/** Входные данные эпизода */
export interface EpisodeInput {
  id: string
  sourcePath: string
  /** Длительность в миллисекундах */
  duration: number
}

/** Совпадающий регион между двумя эпизодами */
interface MatchRegion {
  /** Начало в эпизоде A (секунды) */
  startA: number
  /** Конец в эпизоде A (секунды) */
  endA: number
  /** Начало в эпизоде B (секунды) */
  startB: number
  /** Конец в эпизоде B (секунды) */
  endB: number
  /** Качество совпадения (0-1, где 1 = идеальное) */
  quality: number
}

// === Константы ===

/** Длительность одного fingerprint point (~0.128 сек) */
const FP_POINT_DURATION = 0.128

/** Максимальное количество бит различия для "совпадения" (из 32) */
const MAX_BIT_DIFF = 10

/** Минимальная длина OP (секунды) */
const MIN_INTRO_DURATION = 15

/** Максимальная длина OP (секунды) */
const MAX_INTRO_DURATION = 120

/** Максимальная длина ED (секунды) */
const MAX_OUTRO_DURATION = 240

/** Зона анализа для OP: первые N% или максимум M минут */
const INTRO_ZONE_PERCENT = 0.25
const INTRO_ZONE_MAX_SEC = 600 // 10 минут

/** Зона анализа для ED: последние N% или максимум M минут */
const OUTRO_ZONE_PERCENT = 0.25
const OUTRO_ZONE_MAX_SEC = 600

/** Минимальное количество последовательных совпадений для региона */
const MIN_CONSECUTIVE_MATCHES = Math.ceil(MIN_INTRO_DURATION / FP_POINT_DURATION)

/**
 * Время опережения (секунды): алгоритм находит стабильное совпадение спустя
 * несколько секунд после реального начала темы (первые секунды содержат
 * специфичный для эпизода аудио-контент). Вычитаем из detected start,
 * чтобы кнопка появлялась в момент реального начала OP/ED.
 */
const DETECTION_LEAD_SEC = 5

/**
 * Основная функция определения OP/ED
 *
 * @param episodes — минимум 2 эпизода для сравнения
 * @param onProgress — колбэк прогресса
 */
export async function detectIntros(
  episodes: EpisodeInput[],
  onProgress?: (percent: number, stage: string) => void
): Promise<IntroDetectorResult[]> {
  if (!isFpcalcAvailable()) {
    log.warn('fpcalc недоступен, пропускаем определение OP/ED')
    return episodes.map((ep) => ({
      episodeId: ep.id,
      introStartMs: null,
      introEndMs: null,
      outroStartMs: null,
      outroEndMs: null,
    }))
  }

  if (episodes.length < 2) {
    log.info('Менее 2 эпизодов — нечего сравнивать')
    return episodes.map((ep) => ({
      episodeId: ep.id,
      introStartMs: null,
      introEndMs: null,
      outroStartMs: null,
      outroEndMs: null,
    }))
  }

  log.info(`Начинаем определение OP/ED для ${episodes.length} эпизодов`)

  // 1. Извлекаем fingerprints
  onProgress?.(0, 'fingerprinting')

  const introFingerprints = new Map<string, Uint32Array>()
  const outroFingerprints = new Map<string, Uint32Array>()

  /** Смещение intro-зоны для каждого эпизода (секунды) */
  const introOffsets = new Map<string, number>()
  /** Смещение outro-зоны для каждого эпизода (секунды) */
  const outroOffsets = new Map<string, number>()

  log.info(`[IntroDetector] Starting fingerprint extraction for ${episodes.length} episodes...`)

  for (let i = 0; i < episodes.length; i++) {
    const ep = episodes[i]
    const durationSec = ep.duration / 1000
    const progressBase = (i / episodes.length) * 50 // 0-50% на fingerprinting

    onProgress?.(progressBase, `fingerprinting ${i + 1}/${episodes.length}`)

    try {
      // Intro зона: от начала
      const introEnd = Math.min(durationSec * INTRO_ZONE_PERCENT, INTRO_ZONE_MAX_SEC)
      const introFp = await extractFingerprint(ep.sourcePath, 0, introEnd)
      introFingerprints.set(ep.id, introFp)
      introOffsets.set(ep.id, 0)

      // Outro зона: от конца
      const outroStart = Math.max(durationSec * (1 - OUTRO_ZONE_PERCENT), durationSec - OUTRO_ZONE_MAX_SEC)
      const outroDuration = durationSec - outroStart
      const outroFp = await extractFingerprint(ep.sourcePath, outroStart, outroDuration)
      outroFingerprints.set(ep.id, outroFp)
      outroOffsets.set(ep.id, outroStart)
    } catch (err) {
      log.warn(`Не удалось извлечь fingerprint для ${ep.id}:`, err instanceof Error ? err.message : err)
    }
  }

  // 2. Попарно сравниваем для определения OP
  onProgress?.(50, 'comparing_intros')
  const introMatches = findBestMatches(episodes, introFingerprints, introOffsets)

  // 3. Попарно сравниваем для определения ED
  onProgress?.(75, 'comparing_outros')
  const outroMatches = findBestMatches(episodes, outroFingerprints, outroOffsets)

  // 4. Собираем результаты
  onProgress?.(90, 'finalizing')

  const results: IntroDetectorResult[] = episodes.map((ep) => {
    const intro = introMatches.get(ep.id)
    const outro = outroMatches.get(ep.id)

    return {
      episodeId: ep.id,
      introStartMs:
        intro && intro.duration >= MIN_INTRO_DURATION && intro.duration <= MAX_INTRO_DURATION
          ? Math.round(Math.max(0, intro.start - DETECTION_LEAD_SEC) * 1000)
          : null,
      introEndMs:
        intro && intro.duration >= MIN_INTRO_DURATION && intro.duration <= MAX_INTRO_DURATION
          ? Math.round(intro.end * 1000)
          : null,
      outroStartMs:
        outro && outro.duration >= MIN_INTRO_DURATION && outro.duration <= MAX_OUTRO_DURATION
          ? Math.round(Math.max(0, outro.start - DETECTION_LEAD_SEC) * 1000)
          : null,
      outroEndMs:
        outro && outro.duration >= MIN_INTRO_DURATION && outro.duration <= MAX_OUTRO_DURATION
          ? Math.round(outro.end * 1000)
          : null,
    }
  })

  const foundIntros = results.filter((r) => r.introStartMs !== null).length
  const foundOutros = results.filter((r) => r.outroStartMs !== null).length
  log.info(`Найдено: ${foundIntros} OP, ${foundOutros} ED из ${episodes.length} эпизодов`)

  onProgress?.(100, 'done')
  return results
}

// === Внутренние функции ===

interface EpisodeMatch {
  start: number
  end: number
  duration: number
  quality: number
}

/**
 * Находит лучшие совпадения (общие сегменты) между всеми парами эпизодов
 *
 * Для каждого эпизода выбирается наиболее часто встречающийся сегмент
 * (по медиане среди всех совпадений с другими эпизодами)
 */
function findBestMatches(
  episodes: EpisodeInput[],
  fingerprints: Map<string, Uint32Array>,
  offsets: Map<string, number>
): Map<string, EpisodeMatch> {
  // Для каждого эпизода собираем все найденные совпадения
  const allMatches = new Map<string, EpisodeMatch[]>()

  for (const ep of episodes) {
    allMatches.set(ep.id, [])
  }

  // Попарное сравнение
  for (let i = 0; i < episodes.length; i++) {
    for (let j = i + 1; j < episodes.length; j++) {
      const epA = episodes[i]
      const epB = episodes[j]

      const fpA = fingerprints.get(epA.id)
      const fpB = fingerprints.get(epB.id)

      if (!fpA?.length || !fpB?.length) {
        continue
      }

      const offsetA = offsets.get(epA.id) ?? 0
      const offsetB = offsets.get(epB.id) ?? 0

      const regions = findMatchingRegions(fpA, fpB)

      for (const region of regions) {
        const matchA: EpisodeMatch = {
          start: offsetA + region.startA * FP_POINT_DURATION,
          end: offsetA + region.endA * FP_POINT_DURATION,
          duration: (region.endA - region.startA) * FP_POINT_DURATION,
          quality: region.quality,
        }

        const matchB: EpisodeMatch = {
          start: offsetB + region.startB * FP_POINT_DURATION,
          end: offsetB + region.endB * FP_POINT_DURATION,
          duration: (region.endB - region.startB) * FP_POINT_DURATION,
          quality: region.quality,
        }

        allMatches.get(epA.id)!.push(matchA)
        allMatches.get(epB.id)!.push(matchB)
      }
    }
  }

  // Для каждого эпизода выбираем лучший match (наиболее частый по длительности)
  const bestMatches = new Map<string, EpisodeMatch>()

  for (const [epId, matches] of allMatches) {
    if (matches.length === 0) {
      continue
    }

    // Группируем совпадения по длительности (±3 секунды)
    const groups = clusterMatches(matches)

    // Берём самый большой кластер
    const bestGroup = groups.sort((a, b) => b.length - a.length)[0]
    if (!bestGroup || bestGroup.length === 0) {
      continue
    }

    // Медианное значение из кластера
    const sorted = bestGroup.sort((a, b) => a.start - b.start)
    const median = sorted[Math.floor(sorted.length / 2)]

    bestMatches.set(epId, median)
  }

  return bestMatches
}

/**
 * Группирует совпадения в кластеры по похожей длительности
 */
function clusterMatches(matches: EpisodeMatch[]): EpisodeMatch[][] {
  const CLUSTER_TOLERANCE = 3 // ±3 секунды

  const clusters: EpisodeMatch[][] = []

  for (const match of matches) {
    let added = false
    for (const cluster of clusters) {
      const representative = cluster[0]
      if (Math.abs(match.duration - representative.duration) <= CLUSTER_TOLERANCE) {
        cluster.push(match)
        added = true
        break
      }
    }
    if (!added) {
      clusters.push([match])
    }
  }

  return clusters
}

/**
 * Находит совпадающие регионы между двумя fingerprints
 *
 * Алгоритм:
 * 1. Строим инвертированный индекс: для каждого значения в fpA → список позиций
 * 2. Для каждой точки fpB находим совпадения в fpA (по XOR + PopCount)
 * 3. Группируем совпадения по alignment offset (posA - posB)
 * 4. Ищем непрерывные последовательности с одинаковым offset
 */
function findMatchingRegions(fpA: Uint32Array, fpB: Uint32Array): MatchRegion[] {
  // Шаг 1: Для каждого offset посчитаем количество совпадающих точек
  const offsetCounts = new Map<number, number>()

  // Быстрый проход: ищем точные или близкие совпадения
  // Используем шаг (stride) для ускорения — не проверяем каждую точку
  const stride = 3

  for (let posB = 0; posB < fpB.length; posB += stride) {
    for (let posA = 0; posA < fpA.length; posA += stride) {
      const diff = popcount32(fpA[posA] ^ fpB[posB])
      if (diff <= MAX_BIT_DIFF) {
        const offset = posA - posB
        offsetCounts.set(offset, (offsetCounts.get(offset) ?? 0) + 1)
      }
    }
  }

  // Шаг 2: Выбираем наиболее популярные offsets (потенциальные alignment)
  const minVotes = Math.ceil(MIN_CONSECUTIVE_MATCHES / (stride * 2))
  const candidateOffsets = [...offsetCounts.entries()]
    .filter(([, count]) => count >= minVotes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10) // Максимум 10 кандидатов

  // Шаг 3: Для каждого кандидата, делаем полный проход и ищем непрерывные регионы
  const regions: MatchRegion[] = []

  for (const [offset] of candidateOffsets) {
    const matchingPositions: boolean[] = []
    const startB = Math.max(0, -offset)
    const endB = Math.min(fpB.length, fpA.length - offset)

    let totalBitDiff = 0
    let matchCount = 0

    for (let posB = startB; posB < endB; posB++) {
      const posA = posB + offset
      if (posA < 0 || posA >= fpA.length) {
        matchingPositions.push(false)
        continue
      }

      const diff = popcount32(fpA[posA] ^ fpB[posB])
      const isMatch = diff <= MAX_BIT_DIFF
      matchingPositions.push(isMatch)

      if (isMatch) {
        totalBitDiff += diff
        matchCount++
      }
    }

    // Ищем непрерывные регионы (с допуском на пробелы в 2 точки)
    const GAP_TOLERANCE = 2
    let regionStart = -1
    let gap = 0

    for (let i = 0; i <= matchingPositions.length; i++) {
      if (i < matchingPositions.length && matchingPositions[i]) {
        if (regionStart === -1) {
          regionStart = i
        }
        gap = 0
      } else {
        gap++
        if (gap > GAP_TOLERANCE || i === matchingPositions.length) {
          if (regionStart !== -1) {
            const regionEnd = i - gap
            const length = regionEnd - regionStart

            if (length >= MIN_CONSECUTIVE_MATCHES) {
              const quality = matchCount > 0 ? 1 - totalBitDiff / (matchCount * 32) : 0
              regions.push({
                startA: regionStart + offset + startB,
                endA: regionEnd + offset + startB,
                startB: regionStart + startB,
                endB: regionEnd + startB,
                quality,
              })
            }
          }
          regionStart = -1
          gap = 0
        }
      }
    }
  }

  // Дедупликация перекрывающихся регионов — оставляем лучшие
  return deduplicateRegions(regions)
}

/**
 * Удаляет перекрывающиеся регионы, оставляя с лучшим quality
 */
function deduplicateRegions(regions: MatchRegion[]): MatchRegion[] {
  if (regions.length <= 1) {
    return regions
  }

  const sorted = regions.sort((a, b) => b.quality - a.quality)
  const result: MatchRegion[] = []

  for (const region of sorted) {
    const overlaps = result.some(
      (existing) =>
        (region.startA >= existing.startA && region.startA <= existing.endA) ||
        (region.endA >= existing.startA && region.endA <= existing.endA)
    )

    if (!overlaps) {
      result.push(region)
    }
  }

  return result
}

/**
 * Population count (количество установленных бит) для 32-bit числа
 * Используем алгоритм Хэмминга (Hamming Weight)
 */
function popcount32(x: number): number {
  x = x - ((x >> 1) & 0x55555555)
  x = (x & 0x33333333) + ((x >> 2) & 0x33333333)
  x = (x + (x >> 4)) & 0x0f0f0f0f
  return (x * 0x01010101) >> 24
}
