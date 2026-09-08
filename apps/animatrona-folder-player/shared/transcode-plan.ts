/**
 * План обработки файла для ffmpeg — эскалация по стоимости, а не «всегда транскод» (PLAN.md §10).
 *
 * Порядок ровно такой, потому что цена шагов различается на порядки:
 * 1. `direct` — ffmpeg не нужен вовсе, файл играет как есть (обычный случай, самый частый);
 * 2. `remux` — проблема только в контейнере, поток копируется байт в байт (секунды на серию);
 * 3. `audio-only` — перекодируется звук (AC3/DTS/TrueHD → AAC), видео копируется. Самый частый
 *    случай в аниме и почти бесплатный: звук считается в десятки раз быстрее реального времени;
 * 4. `video-and-audio` — Hi10P-видео нужно перекодировать. Целевой кодек — VP9 profile 2
 *    (сохраняет 10-бит цвет, не «убивает» его в 8 бит) — Chromium декодирует его софтверно
 *    (libvpx), без зависимости от GPU/системы, в отличие от Hi10P AVC, который не декодирует
 *    вообще никогда. Дорого, нагружает CPU, поэтому только когда иначе никак.
 *
 * Функция чистая и не зависит от electron — тестируется обычным vitest, используется и в main
 * (строит команду ffmpeg), и в renderer (объясняет пользователю, что произойдёт).
 */

import type { AudioTrack, VideoTrack } from '@letar/folder-scan'

import { getUnsupportedAudioLabel, getUnsupportedContainerLabel, isHi10pVideo, pickDefaultTrack } from './codec-support'

export type TranscodeStrategy = 'direct' | 'remux' | 'audio-only' | 'video-and-audio'

/** Насколько дорого обойдётся обработка — по этому полю UI решает, предупреждать ли пользователя */
export type TranscodeCost = 'none' | 'cheap' | 'moderate' | 'expensive'

export interface TranscodePlan {
  strategy: TranscodeStrategy
  videoAction: 'copy' | 'transcode'
  audioAction: 'copy' | 'transcode'
  /** Нужен ли вообще ffmpeg — при `direct` файл отдаётся напрямую через `media://` */
  needsFfmpeg: boolean
  cost: TranscodeCost
  /** Почему выбрана именно эта стратегия — показываем пользователю списком */
  reasons: string[]
}

const COST_BY_STRATEGY: Record<TranscodeStrategy, TranscodeCost> = {
  direct: 'none',
  remux: 'cheap',
  'audio-only': 'moderate',
  'video-and-audio': 'expensive',
}

export interface BuildTranscodePlanInput {
  videoTracks: VideoTrack[]
  audioTracks: AudioTrack[]
  /** Путь к файлу — нужен, чтобы распознать контейнер, который Chromium не разбирает */
  filePath?: string | null
  /** Индекс выбранной звуковой дорожки; по умолчанию — дефолтная дорожка контейнера */
  audioTrackIndex?: number
}

export function buildTranscodePlan(
  { videoTracks, audioTracks, filePath, audioTrackIndex }: BuildTranscodePlanInput,
): TranscodePlan {
  const reasons: string[] = []

  const video = videoTracks[0]
  const videoNeedsTranscode = isHi10pVideo(video)
  if (videoNeedsTranscode) {
    reasons.push('видео в 10-битном цвете (Hi10P) — перекодируем в VP9, сохраняя 10 бит')
  }

  const audio = audioTrackIndex === undefined ? pickDefaultTrack(audioTracks) : audioTracks[audioTrackIndex]
  const audioLabel = getUnsupportedAudioLabel(audio)
  if (audioLabel) {
    reasons.push(`звук ${audioLabel} — перекодируем в AAC`)
  }

  const containerLabel = getUnsupportedContainerLabel(filePath)
  if (containerLabel) {
    reasons.push(`контейнер ${containerLabel} — перепаковываем без потери качества`)
  }

  const videoAction = videoNeedsTranscode ? 'transcode' : 'copy'
  const audioAction = audioLabel ? 'transcode' : 'copy'

  let strategy: TranscodeStrategy
  if (videoNeedsTranscode) {
    strategy = 'video-and-audio'
  } else if (audioLabel) {
    strategy = 'audio-only'
  } else if (containerLabel) {
    strategy = 'remux'
  } else {
    strategy = 'direct'
  }

  return {
    strategy,
    videoAction,
    audioAction,
    needsFfmpeg: strategy !== 'direct',
    cost: COST_BY_STRATEGY[strategy],
    reasons,
  }
}

/**
 * Аргументы кодеков для ffmpeg по плану. Контейнер/вывод сюда не входят — их задаёт вызывающий
 * (HLS-сегменты, прогрессивный fMP4 и т.п.).
 *
 * Видео (Hi10P → VP9 profile 2, 10-бит): `-crf 30 -b:v 0` — VBR с постоянным качеством
 * (аналог x264 `-crf`, шкала VP9 другая — 0..63), `-deadline realtime -cpu-used 5 -row-mt 1` —
 * компромисс скорость/сжатие ради приемлемого времени ожидания, проверено эмпирически на
 * реальном Hi10P-файле (~6x реалтайма на обычном CPU, PLAN.md). До 2026-09-08 здесь стоял
 * `libx264 -preset veryfast -crf 20 -pix_fmt yuv420p` — приводил Hi10P к 8-битному цвету, что
 * само по себе не нужно (проблема была в кодеке, не в глубине цвета).
 * Аппаратные энкодеры сюда намеренно не подставляются: у них другой набор ключей на каждого
 * вендора, а промах по доступности даёт падение ffmpeg вместо картинки.
 */
export function buildCodecArgs(plan: TranscodePlan): string[] {
  const args: string[] = []

  if (plan.videoAction === 'transcode') {
    args.push(
      '-c:v',
      'libvpx-vp9',
      '-pix_fmt',
      'yuv420p10le',
      '-profile:v',
      '2',
      '-crf',
      '30',
      '-b:v',
      '0',
      '-deadline',
      'realtime',
      '-cpu-used',
      '5',
      '-row-mt',
      '1',
    )
  } else {
    args.push('-c:v', 'copy')
  }

  if (plan.audioAction === 'transcode') {
    // 2 канала: многоканальный AC3/DTS сводим в стерео — Chromium многоканальный AAC играет
    // не везде, а для просмотра на ноутбуке/наушниках разницы нет
    args.push('-c:a', 'aac', '-ac', '2', '-b:a', '192k')
  } else {
    args.push('-c:a', 'copy')
  }

  return args
}
