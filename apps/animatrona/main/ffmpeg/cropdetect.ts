/**
 * Автоопределение чёрных полос (леттербокс/пилларбокс) через `ffmpeg cropdetect`.
 *
 * Сэмплирует несколько точек по таймлайну (не один кадр — открывающая заставка может быть
 * чёрной без реального леттербокса) и берёт моду найденных рамок. Рамка применяется, только
 * если большинство сэмплов сошлись на одном значении и обрезка не мельче порога — ложное
 * срабатывание на шуме/сжатии хуже отсутствия кропа.
 */

import { runFFmpeg } from '../utils/ffmpeg-spawn'

/** Прямоугольник кадра после обрезки полос */
export interface CropRect {
  width: number
  height: number
  x: number
  y: number
}

/** Результат детекции — есть устойчивый леттербокс */
export interface CropDetectResult {
  /** Готовая строка для `-vf`: `crop=W:H:X:Y` */
  filter: string
  rect: CropRect
}

export interface DetectCropOptions {
  /** Ширина источника (px) */
  sourceWidth: number
  /** Высота источника (px) */
  sourceHeight: number
  /** Длительность видео (секунды) — точки сэмплирования распределяются по всей длине */
  duration: number
  /** Сколько точек сэмплировать по таймлайну */
  sampleCount?: number
  /** Длительность одного сэмпла в секундах */
  sampleDurationSec?: number
}

/** Регэксп на найденную рамку — cropdetect печатает уточнённое значение на каждый кадр сэмпла */
const CROP_REGEX = /crop=(\d+):(\d+):(\d+):(\d+)/g

/** Сколько точек сэмплировать по умолчанию */
const DEFAULT_SAMPLE_COUNT = 5

/** Длительность одного сэмпла по умолчанию (секунды) */
const DEFAULT_SAMPLE_DURATION_SEC = 2

/** Минимальная доля сэмплов, согласных с модой рамки — иначе результат ненадёжен */
const MIN_CONSENSUS_RATIO = 0.5

/**
 * Минимальная доля обрезки хотя бы по одному измерению — не обрезаем при незначительных/шумных
 * полосах (компрессионные артефакты по краям кадра дают ложные срабатывания в единицы пикселей).
 */
const MIN_CROP_RATIO = 0.02

/**
 * Извлечь последнее (наиболее уточнённое — cropdetect сходится по мере накопления кадров)
 * найденное значение рамки из stderr одного прогона.
 */
export function parseLastCropRect(stderr: string): CropRect | null {
  CROP_REGEX.lastIndex = 0
  let match: RegExpExecArray | null
  let last: CropRect | null = null
  while ((match = CROP_REGEX.exec(stderr)) !== null) {
    last = { width: Number(match[1]), height: Number(match[2]), x: Number(match[3]), y: Number(match[4]) }
  }
  return last
}

/** Ключ для группировки одинаковых рамок при подсчёте моды */
function rectKey(rect: CropRect): string {
  return `${rect.width}:${rect.height}:${rect.x}:${rect.y}`
}

/**
 * Мода (самое частое значение) среди рамок, найденных по сэмплам.
 * Устойчиво к одиночному сэмплу, попавшему на чёрную заставку/переход, — если большинство
 * сэмплов сходятся на одной рамке, аномальные результаты отбрасываются молчаливым большинством.
 */
export function pickModeRect(rects: CropRect[]): CropRect | null {
  if (rects.length === 0) {
    return null
  }

  const counts = new Map<string, { rect: CropRect; count: number }>()
  for (const rect of rects) {
    const key = rectKey(rect)
    const entry = counts.get(key)
    if (entry) {
      entry.count += 1
    } else {
      counts.set(key, { rect, count: 1 })
    }
  }

  let best: { rect: CropRect; count: number } | null = null
  for (const entry of counts.values()) {
    if (!best || entry.count > best.count) {
      best = entry
    }
  }
  return best?.rect ?? null
}

/** Точки сэмплирования — равномерно между 10% и 90% таймлайна, пропуская интро/аутро */
function buildSamplePoints(duration: number, sampleCount: number): number[] {
  if (sampleCount <= 1) {
    return [duration * 0.5]
  }
  const points: number[] = []
  for (let i = 0; i < sampleCount; i++) {
    points.push(duration * (0.1 + (0.8 * i) / (sampleCount - 1)))
  }
  return points
}

/**
 * Прогнать детекцию на одном сэмпле и вернуть найденную рамку (или null, если сэмпл не
 * открылся — повреждённый фрагмент, стык VFR — не валим всю детекцию из-за одного сэмпла).
 */
async function detectCropAtSample(
  inputPath: string,
  startTime: number,
  sampleDurationSec: number,
): Promise<CropRect | null> {
  try {
    // round=2 — минимальное выравнивание под чётные размеры (нужно всем трём кодекам профиля:
    // AV1/HEVC/H264 с 4:2:0), сохраняет максимум кадра по сравнению с более грубым round=16.
    const { stderr } = await runFFmpeg([
      '-ss',
      startTime.toFixed(2),
      '-i',
      inputPath,
      '-t',
      sampleDurationSec.toString(),
      '-vf',
      'cropdetect=limit=24:round=2:reset=1',
      '-f',
      'null',
      '-',
    ])
    return parseLastCropRect(stderr)
  } catch {
    return null
  }
}

/**
 * Определить устойчивую рамку по нескольким сэмплам таймлайна.
 * Возвращает `null`, если реального леттербокса не нашлось (или уверенности недостаточно) —
 * в этом случае транскод должен идти без crop-фильтра, как раньше.
 */
export async function detectCropFilter(
  inputPath: string,
  options: DetectCropOptions,
): Promise<CropDetectResult | null> {
  const {
    sourceWidth,
    sourceHeight,
    duration,
    sampleCount = DEFAULT_SAMPLE_COUNT,
    sampleDurationSec = DEFAULT_SAMPLE_DURATION_SEC,
  } = options

  if (!duration || duration <= 0 || !sourceWidth || !sourceHeight) {
    return null
  }

  const points = buildSamplePoints(duration, sampleCount)
  const rects: CropRect[] = []
  for (const startTime of points) {
    const rect = await detectCropAtSample(inputPath, startTime, sampleDurationSec)
    if (rect) {
      rects.push(rect)
    }
  }

  if (rects.length === 0) {
    return null
  }

  const mode = pickModeRect(rects)
  if (!mode) {
    return null
  }

  const consensusCount = rects.filter((rect) => rectKey(rect) === rectKey(mode)).length
  if (consensusCount / rects.length < MIN_CONSENSUS_RATIO) {
    return null
  }

  const widthCropped = sourceWidth - mode.width
  const heightCropped = sourceHeight - mode.height
  if (widthCropped < sourceWidth * MIN_CROP_RATIO && heightCropped < sourceHeight * MIN_CROP_RATIO) {
    return null
  }

  return {
    filter: `crop=${mode.width}:${mode.height}:${mode.x}:${mode.y}`,
    rect: mode,
  }
}
