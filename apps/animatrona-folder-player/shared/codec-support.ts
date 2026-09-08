/**
 * Детекция кодеков и контейнеров, которые Chromium в Electron не воспроизводит.
 *
 * Живёт в `shared/`, потому что нужна обоим процессам: renderer показывает по ней сообщение
 * пользователю, main строит по ней план обработки в ffmpeg (`transcode-plan.ts`).
 * Раньше файл лежал в `renderer/app/_lib/` — перенесён при Фазе 6, чтобы список
 * неподдерживаемого не разъехался между «что показываем» и «что чиним».
 *
 * Системные кодек-паки (K-Lite и т.п.) здесь не помогают — Chromium декодирует `<video>`
 * собственным движком, не через системные DirectShow-фильтры.
 *
 * HEVC намеренно не входит в список «неподдерживаемых» — Chromium умеет его аппаратно в
 * зависимости от системы, это не гарантированный отказ (см. таблицу в PLAN.md §4).
 */

import type { AudioTrack, VideoTrack } from '@letar/folder-scan'

export interface CodecSupportIssue {
  kind: 'video' | 'audio' | 'container'
  /** Кодек (или расширение контейнера) как его вернул пробер — для диагностики */
  codec: string
  /** Человекочитаемая причина — можно показывать пользователю */
  message: string
}

export interface CodecSupportResult {
  supported: boolean
  issues: CodecSupportIssue[]
}

/** Кодеки звука, которые Chromium не проигрывает — ключ в нижнем регистре без пробелов/дефисов */
export const UNSUPPORTED_AUDIO_CODECS: Record<string, string> = {
  ac3: 'AC3',
  eac3: 'E-AC3 (Dolby Digital Plus)',
  dts: 'DTS',
  dtshd: 'DTS-HD',
  truehd: 'TrueHD',
  mlpfba: 'TrueHD',
}

/**
 * Контейнеры, которые Chromium не разбирает даже с поддерживаемыми кодеками внутри —
 * лечатся ремуксом (`-c copy`), без перекодирования. MKV сюда не входит: matroska Chromium
 * читает, и приложение играет такие файлы напрямую.
 */
export const UNSUPPORTED_CONTAINERS: Record<string, string> = {
  avi: 'AVI',
  wmv: 'WMV',
  flv: 'FLV',
  ts: 'MPEG-TS',
  m2ts: 'MPEG-TS (M2TS)',
}

export function normalizeCodecKey(codec: string | undefined): string {
  return (codec ?? '').trim().toLowerCase().replace(/[\s-]/g, '')
}

export function isAvcCodec(codec: string | undefined): boolean {
  const key = normalizeCodecKey(codec)
  return key === 'avc' || key === 'h264' || key.includes('avc')
}

/** Дорожка, которая реально будет воспроизводиться (дефолтная, иначе первая) */
export function pickDefaultTrack<T extends { isDefault?: boolean }>(tracks: T[]): T | undefined {
  return tracks.find((t) => t.isDefault) ?? tracks[0]
}

/** Видео в 10-битном цвете (Hi10P) — Chromium его не декодирует ни на какой системе */
export function isHi10pVideo(video: VideoTrack | undefined): boolean {
  return Boolean(video && isAvcCodec(video.codec) && video.bitDepth === 10)
}

/** Кодек звука не воспроизводится Chromium — возвращает человекочитаемое имя или `null` */
export function getUnsupportedAudioLabel(audio: AudioTrack | undefined): string | null {
  if (!audio) {
    return null
  }
  return UNSUPPORTED_AUDIO_CODECS[normalizeCodecKey(audio.codec)] ?? null
}

/** Контейнер не разбирается Chromium — возвращает человекочитаемое имя или `null` */
export function getUnsupportedContainerLabel(filePath: string | null | undefined): string | null {
  if (!filePath) {
    return null
  }
  const extension = filePath.split('.').pop()?.toLowerCase() ?? ''
  return UNSUPPORTED_CONTAINERS[extension] ?? null
}

export function checkCodecSupport(
  videoTracks: VideoTrack[],
  audioTracks: AudioTrack[],
  filePath?: string | null,
): CodecSupportResult {
  const issues: CodecSupportIssue[] = []

  const video = videoTracks[0]
  if (isHi10pVideo(video)) {
    issues.push({
      kind: 'video',
      codec: video?.codec ?? 'AVC',
      message: 'Видео в 10-битном цвете (Hi10P) — Chromium его не декодирует',
    })
  }

  const audio = pickDefaultTrack(audioTracks)
  const audioLabel = getUnsupportedAudioLabel(audio)
  if (audioLabel) {
    issues.push({
      kind: 'audio',
      codec: audio?.codec ?? audioLabel,
      message: `Звук в формате ${audioLabel} — Chromium его не проигрывает`,
    })
  }

  const containerLabel = getUnsupportedContainerLabel(filePath)
  if (containerLabel) {
    issues.push({
      kind: 'container',
      codec: containerLabel,
      message: `Контейнер ${containerLabel} — Chromium его не разбирает`,
    })
  }

  return { supported: issues.length === 0, issues }
}
