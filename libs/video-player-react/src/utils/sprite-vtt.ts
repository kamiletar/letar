/**
 * Парсер WebVTT со спрайт-координатами для hover preview на таймлайне
 *
 * Формат VTT:
 * ```
 * WEBVTT
 *
 * 00:00:00.000 --> 00:00:05.000
 * sprite.jpg#xywh=0,0,160,90
 * ```
 */

/** Один cue из VTT — временной диапазон + координаты в спрайте */
export interface SpriteCue {
  /** Начало (секунды) */
  startTime: number
  /** Конец (секунды) */
  endTime: number
  /** X координата в спрайте (px) */
  x: number
  /** Y координата в спрайте (px) */
  y: number
  /** Ширина кадра (px) */
  width: number
  /** Высота кадра (px) */
  height: number
}

/** Парсит временную метку VTT "HH:MM:SS.mmm" → секунды */
function parseTimestamp(ts: string): number {
  const parts = ts.trim().split(':')
  if (parts.length === 3) {
    const [h, m, s] = parts
    return Number(h) * 3600 + Number(m) * 60 + Number(s)
  }
  if (parts.length === 2) {
    const [m, s] = parts
    return Number(m) * 60 + Number(s)
  }
  return 0
}

/** Парсит xywh координаты из строки "sprite.jpg#xywh=0,0,160,90" */
function parseXywh(payload: string): { x: number; y: number; width: number; height: number } | null {
  const match = payload.match(/#xywh=(\d+),(\d+),(\d+),(\d+)/)
  if (!match) {
    return null
  }
  return {
    x: Number(match[1]),
    y: Number(match[2]),
    width: Number(match[3]),
    height: Number(match[4]),
  }
}

/**
 * Парсит WebVTT со спрайт-координатами
 *
 * @returns Отсортированный массив SpriteCue (по startTime)
 */
export function parseSpriteCues(vttText: string): SpriteCue[] {
  const cues: SpriteCue[] = []
  const lines = vttText.split('\n').map((l) => l.trim())

  let i = 0
  while (i < lines.length) {
    // Ищем строку с таймкодами "HH:MM:SS.mmm --> HH:MM:SS.mmm"
    const timeLine = lines[i]
    if (timeLine && timeLine.includes('-->')) {
      const [startStr, endStr] = timeLine.split('-->')
      const startTime = parseTimestamp(startStr)
      const endTime = parseTimestamp(endStr)

      // Следующая строка — payload с координатами
      i++
      const payload = lines[i]
      if (payload) {
        const coords = parseXywh(payload)
        if (coords) {
          cues.push({ startTime, endTime, ...coords })
        }
      }
    }
    i++
  }

  return cues
}

/**
 * Находит cue для указанного времени (binary search)
 *
 * @returns SpriteCue или null если время вне диапазона
 */
export function findCueAtTime(cues: SpriteCue[], time: number): SpriteCue | null {
  if (cues.length === 0) {
    return null
  }

  // Binary search по startTime
  let lo = 0
  let hi = cues.length - 1

  while (lo <= hi) {
    const mid = (lo + hi) >>> 1
    const cue = cues[mid]

    if (time < cue.startTime) {
      hi = mid - 1
    } else if (time >= cue.endTime) {
      lo = mid + 1
    } else {
      return cue
    }
  }

  return null
}
