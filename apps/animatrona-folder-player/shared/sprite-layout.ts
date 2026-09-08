/**
 * Раскладка спрайт-листа с превью кадров для перемотки и генерация WebVTT к нему.
 *
 * Показывает превью готовый компонент `TimelinePreview` из `@letar/video-player-react` — тот
 * же, что в полной Animatrona. Ему нужны картинка-спрайт и распарсенные cues; здесь считается
 * геометрия и текст VTT, сама нарезка — ffmpeg (`main/services/ffmpeg/sprite.service.ts`).
 *
 * Формат VTT задан парсером библиотеки (`utils/sprite-vtt.ts`):
 *
 * ```
 * WEBVTT
 *
 * 00:00:00.000 --> 00:00:08.000
 * sprite.jpg#xywh=0,0,160,90
 * ```
 *
 * Функции чистые — считаются и тестируются без ffmpeg и без electron.
 */

/** Размер кадра превью — совпадает с `PREVIEW_WIDTH`/`PREVIEW_HEIGHT` в `TimelinePreview` */
export const FRAME_WIDTH = 160
export const FRAME_HEIGHT = 90

/** Колонок в спрайте — при 160px кадра даёт картинку шириной 1600px */
const COLUMNS = 10

/**
 * Целевое число кадров. Интервал подбирается под длительность, а не берётся фиксированным:
 * иначе двухчасовой фильм дал бы спрайт в тысячи кадров (браузер не тянет текстуры выше
 * ~16000px), а короткая серия — неоправданно частую сетку.
 */
const TARGET_FRAME_COUNT = 200

/** Минимальный шаг между кадрами — чаще смысла нет, а декодирование дорожает */
const MIN_INTERVAL_SEC = 5

export interface SpriteLayout {
  /** Шаг между кадрами в секундах */
  intervalSec: number
  columns: number
  rows: number
  frameWidth: number
  frameHeight: number
  /** Сколько кадров реально будет в спрайте */
  frameCount: number
}

/**
 * Считает раскладку спрайта под длительность файла. Для нулевой/неизвестной длительности
 * возвращает `null` — генерировать нечего.
 */
export function planSpriteLayout(durationSec: number): SpriteLayout | null {
  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    return null
  }

  const intervalSec = Math.max(MIN_INTERVAL_SEC, Math.ceil(durationSec / TARGET_FRAME_COUNT))
  const frameCount = Math.max(1, Math.ceil(durationSec / intervalSec))
  const columns = Math.min(COLUMNS, frameCount)
  const rows = Math.ceil(frameCount / columns)

  return { intervalSec, columns, rows, frameWidth: FRAME_WIDTH, frameHeight: FRAME_HEIGHT, frameCount }
}

/** Секунды → `HH:MM:SS.mmm` (формат таймкода WebVTT) */
export function formatVttTimestamp(seconds: number): string {
  const clamped = Math.max(0, seconds)
  const hours = Math.floor(clamped / 3600)
  const minutes = Math.floor((clamped % 3600) / 60)
  const secs = Math.floor(clamped % 60)
  const millis = Math.round((clamped - Math.floor(clamped)) * 1000)

  const pad = (value: number, size = 2) => String(value).padStart(size, '0')
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}.${pad(millis, 3)}`
}

/**
 * Собирает текст WebVTT: по одному cue на кадр, координаты кадра в спрайте — построчно
 * слева направо, ровно в том порядке, в каком их укладывает фильтр `tile` у ffmpeg.
 */
export function buildSpriteVtt(spriteFileName: string, layout: SpriteLayout, durationSec: number): string {
  const lines = ['WEBVTT', '']

  for (let index = 0; index < layout.frameCount; index++) {
    const startTime = index * layout.intervalSec
    // Последний кадр тянется до конца файла, иначе превью пропадало бы на хвосте таймлайна
    const endTime = index === layout.frameCount - 1
      ? Math.max(durationSec, startTime + layout.intervalSec)
      : (index + 1) * layout.intervalSec

    const x = (index % layout.columns) * layout.frameWidth
    const y = Math.floor(index / layout.columns) * layout.frameHeight

    lines.push(`${formatVttTimestamp(startTime)} --> ${formatVttTimestamp(endTime)}`)
    lines.push(`${spriteFileName}#xywh=${x},${y},${layout.frameWidth},${layout.frameHeight}`)
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Фильтр `-vf` для ffmpeg под эту раскладку.
 *
 * `force_original_aspect_ratio=increase` + `crop` вместо простого `scale` — иначе кадры
 * нестандартного соотношения (4:3 у старых сериалов, 2.39:1 у фильмов) поехали бы по сетке:
 * `tile` укладывает их с фактическим размером, а VTT считает по номинальному.
 */
export function buildSpriteFilter(layout: SpriteLayout): string {
  return [
    `fps=1/${layout.intervalSec}`,
    `scale=${layout.frameWidth}:${layout.frameHeight}:force_original_aspect_ratio=increase`,
    `crop=${layout.frameWidth}:${layout.frameHeight}`,
    `tile=${layout.columns}x${layout.rows}`,
  ].join(',')
}
