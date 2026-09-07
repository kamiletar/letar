/**
 * Детекция кодеков, которые Chromium в Electron не декодирует — без ffmpeg-транскодирования
 * плеер играет файлы как есть, и часть старых раздач аниме (Hi10P, AC3/DTS-звук) даёт чёрный
 * экран без единого сообщения (см. PLAN.md §4 «Матрица кодеков»).
 *
 * Системные кодек-паки (K-Lite и т.п.) здесь не помогают — Chromium декодирует `<video>`
 * собственным движком, не через системные DirectShow-фильтры. Единственный честный выход —
 * сообщить и предложить открыть файл в системном плеере (там K-Lite реально работает).
 *
 * HEVC намеренно не входит в список «неподдерживаемых» — Chromium умеет его аппаратно в
 * зависимости от системы, это не гарантированный отказ (см. таблицу в PLAN.md).
 */

import type { AudioTrack, VideoTrack } from '@letar/folder-scan'

export interface CodecSupportIssue {
  kind: 'video' | 'audio'
  /** Кодек как его вернул пробер (для диагностики) */
  codec: string
  /** Человекочитаемая причина — можно показывать пользователю */
  message: string
}

export interface CodecSupportResult {
  supported: boolean
  issues: CodecSupportIssue[]
}

/** Кодеки звука, которые Chromium не проигрывает — ключ в нижнем регистре без пробелов/дефисов */
const UNSUPPORTED_AUDIO_CODECS: Record<string, string> = {
  ac3: 'AC3',
  eac3: 'E-AC3 (Dolby Digital Plus)',
  dts: 'DTS',
  dtshd: 'DTS-HD',
  truehd: 'TrueHD',
  mlpfba: 'TrueHD',
}

function normalizeCodecKey(codec: string | undefined): string {
  return (codec ?? '').trim().toLowerCase().replace(/[\s-]/g, '')
}

function isAvcCodec(codec: string | undefined): boolean {
  const key = normalizeCodecKey(codec)
  return key === 'avc' || key === 'h264' || key.includes('avc')
}

/** Дорожка, которая реально будет воспроизводиться (дефолтная, иначе первая) */
function pickDefaultTrack<T extends { isDefault?: boolean }>(tracks: T[]): T | undefined {
  return tracks.find((t) => t.isDefault) ?? tracks[0]
}

export function checkCodecSupport(videoTracks: VideoTrack[], audioTracks: AudioTrack[]): CodecSupportResult {
  const issues: CodecSupportIssue[] = []

  const video = videoTracks[0]
  if (video && isAvcCodec(video.codec) && video.bitDepth === 10) {
    issues.push({
      kind: 'video',
      codec: video.codec ?? 'AVC',
      message: 'Видео в 10-битном цвете (Hi10P) — Chromium его не декодирует',
    })
  }

  const audio = pickDefaultTrack(audioTracks)
  if (audio) {
    const label = UNSUPPORTED_AUDIO_CODECS[normalizeCodecKey(audio.codec)]
    if (label) {
      issues.push({
        kind: 'audio',
        codec: audio.codec ?? label,
        message: `Звук в формате ${label} — Chromium его не проигрывает`,
      })
    }
  }

  return { supported: issues.length === 0, issues }
}
