/**
 * Извлечение встроенных (в контейнере MKV) ASS/SSA/SRT-субтитров и вложенных шрифтов —
 * без ffmpeg, потоковым JS-парсером `matroska-subtitles`. Аналог `extractStream`/
 * `extractFontsFromFile` из Animatrona (`main/ffmpeg/demux.ts`), но animatrona-player
 * принципиально не тащит ffmpeg-бинарь — только эта библиотека читает EBML-контейнер сама.
 *
 * `matroska-subtitles` не собирает готовый .ass-файл — отдаёт только заголовок
 * (`[Script Info]` + `[V4+ Styles]`, из `CodecPrivate`) и распарсенные поля каждой Dialogue-
 * строки отдельно (layer, style, name, margin-поля, effect, text — без Start/End, те приходят
 * как `time`/`duration` самого события). Сборка валидного .ass/.srt текста — на нас.
 */
import { SubtitleParser } from 'matroska-subtitles'
import type { SubtitleAttachment, SubtitleCue, SubtitleTrackInfo } from 'matroska-subtitles'
import { createReadStream } from 'node:fs'

export type EmbeddedSubtitleFormat = 'ass' | 'ssa' | 'srt'

export interface EmbeddedSubtitleTrack {
  /** Номер дорожки в Matroska-контейнере (не совпадает с ffprobe/mediainfo индексом) */
  trackNumber: number
  language: string
  title: string
  format: EmbeddedSubtitleFormat
  /** Готовый текст файла — валидный .ass (для ass/ssa) или .srt (для utf8) */
  content: string
}

export interface EmbeddedFont {
  filename: string
  mimetype: string
  data: Uint8Array
}

export interface EmbeddedSubtitlesResult {
  tracks: EmbeddedSubtitleTrack[]
  fonts: EmbeddedFont[]
}

function pad(num: number, width: number): string {
  return String(num).padStart(width, '0')
}

/** `H:MM:SS.cc` — формат времени ASS (сантисекунды, часы без ведущего нуля) */
function formatAssTime(ms: number): string {
  const totalCs = Math.max(0, Math.round(ms / 10))
  const cs = totalCs % 100
  const totalSec = Math.floor(totalCs / 100)
  const s = totalSec % 60
  const totalMin = Math.floor(totalSec / 60)
  const m = totalMin % 60
  const h = Math.floor(totalMin / 60)
  return `${h}:${pad(m, 2)}:${pad(s, 2)}.${pad(cs, 2)}`
}

/** `HH:MM:SS,mmm` — формат времени SRT */
function formatSrtTime(ms: number): string {
  const totalMs = Math.max(0, Math.round(ms))
  const msPart = totalMs % 1000
  const totalSec = Math.floor(totalMs / 1000)
  const s = totalSec % 60
  const totalMin = Math.floor(totalSec / 60)
  const m = totalMin % 60
  const h = Math.floor(totalMin / 60)
  return `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)},${pad(msPart, 3)}`
}

/**
 * Мюксеры (проверено на ffmpeg) кладут в `CodecPrivate` не только `[Script Info]`/
 * `[V4+ Styles]`, но и собственную (пустую) секцию `[Events]`/`Format:` — если добавить свою
 * поверх неё, файл получит два блока `[Events]` подряд. Обрезаем всё начиная с `[Events]`,
 * чтобы Format-строка гарантированно совпадала по порядку полей с собираемыми Dialogue-строками.
 */
function stripEventsSection(header: string): string {
  const idx = header.search(/\[Events\]/i)
  return idx === -1 ? header : header.slice(0, idx)
}

/** Собирает валидный .ass-файл из заголовка трека (Script Info + Styles) и его реплик */
function buildAssContent(header: string, cues: SubtitleCue[]): string {
  const sorted = [...cues].sort((a, b) => a.time - b.time)
  const dialogueLines = sorted.map((cue) => {
    const start = formatAssTime(cue.time)
    const end = formatAssTime(cue.time + cue.duration)
    const layer = cue.layer ?? '0'
    const style = cue.style ?? 'Default'
    const name = cue.name ?? ''
    const marginL = cue.marginL ?? '0'
    const marginR = cue.marginR ?? '0'
    const marginV = cue.marginV ?? '0'
    const effect = cue.effect ?? ''
    return `Dialogue: ${layer},${start},${end},${style},${name},${marginL},${marginR},${marginV},${effect},${cue.text}`
  })

  const eventsSection = [
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
    ...dialogueLines,
  ].join('\r\n')

  return `${stripEventsSection(header).trimEnd()}\r\n\r\n${eventsSection}\r\n`
}

/** Собирает валидный .srt-файл из простых (utf8) реплик */
function buildSrtContent(cues: SubtitleCue[]): string {
  const sorted = [...cues].sort((a, b) => a.time - b.time)
  const entries = sorted.map((cue, i) => {
    const start = formatSrtTime(cue.time)
    const end = formatSrtTime(cue.time + cue.duration)
    const timeRange = `${start} --> ${end}`
    return [String(i + 1), timeRange, cue.text].join('\r\n')
  })

  return `${entries.join('\r\n\r\n')}\r\n`
}

/**
 * Читает MKV потоково (весь файл — субтитры и вложения-шрифты рассеяны по всему контейнеру,
 * seek тут не помогает) и возвращает уже собранные субтитровые файлы + шрифты. Дорого для
 * больших файлов — вызывать только когда внешних субтитров для эпизода не нашлось
 * (`page.tsx`), не на каждое открытие эпизода.
 */
export function extractEmbeddedSubtitles(filePath: string): Promise<EmbeddedSubtitlesResult> {
  return new Promise((resolve, reject) => {
    const parser = new SubtitleParser()
    const trackInfos = new Map<number, SubtitleTrackInfo>()
    const cuesByTrack = new Map<number, SubtitleCue[]>()
    const fonts: EmbeddedFont[] = []

    parser.once('tracks', (tracks) => {
      for (const track of tracks) {
        trackInfos.set(track.number, track)
        cuesByTrack.set(track.number, [])
      }
    })

    parser.on('subtitle', (cue, trackNumber) => {
      cuesByTrack.get(trackNumber)?.push(cue)
    })

    parser.on('file', (file: SubtitleAttachment) => {
      fonts.push({ filename: file.filename, mimetype: file.mimetype, data: file.data })
    })

    parser.on('error', reject)

    parser.on('finish', () => {
      const tracks: EmbeddedSubtitleTrack[] = []
      for (const [trackNumber, info] of trackInfos) {
        const cues = cuesByTrack.get(trackNumber) ?? []
        if (info.type === 'utf8') {
          tracks.push({
            trackNumber,
            language: info.language ?? 'und',
            title: info.name ?? '',
            format: 'srt',
            content: buildSrtContent(cues),
          })
        } else if (info.header) {
          tracks.push({
            trackNumber,
            language: info.language ?? 'und',
            title: info.name ?? '',
            format: info.type,
            content: buildAssContent(info.header, cues),
          })
        }
        // ass/ssa без header (CodecPrivate) не может быть собрана в валидный .ass — пропускаем
      }
      resolve({ tracks, fonts })
    })

    const source = createReadStream(filePath)
    source.on('error', reject)
    source.pipe(parser)
  })
}
