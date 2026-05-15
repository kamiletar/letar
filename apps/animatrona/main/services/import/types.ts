/**
 * Типы для import-service (main process)
 *
 * Портированы из renderer/src/lib/import/types.ts
 * Без React зависимостей — чистые интерфейсы
 */

import type { DemuxResult } from '../../../shared/types'
import type { TrackOverride } from '../../../shared/types/manifest'
import type { AggregatedProgress } from '../../../shared/types/parallel-transcode'

/** Стадии обработки импорта */
export type ProcessingStage =
  | 'idle'
  | 'pre-encode'
  | 'creating_anime'
  | 'creating_season'
  | 'demuxing'
  | 'creating_episodes'
  | 'transcoding_video'
  | 'transcoding_audio'
  | 'generating_manifests'
  | 'detecting_intros'
  | 'syncing_relations'
  | 'done'
  | 'error'
  | 'cancelled'

/** Данные для пост-обработки эпизода (скриншоты + манифест) */
export interface PostProcessData {
  episodeId: string
  outputDir: string
  videoOutputPath: string
  duration: number
  demuxResult: DemuxResult
  animeName: string
  seasonNumber: number
  episodeNumber: number
  sourcePath: string
  sourceSize?: number
  encodingProfileId?: string
  encodingProfileName?: string
  videoOptions?: {
    codec: string
    cq: number
    preset: string
    rateControl: string
    tune?: string
    multipass?: string
    spatialAq?: boolean
    temporalAq?: boolean
    aqStrength?: number
    gopSize?: number
    lookahead?: number
    bRefMode?: string
    force10Bit?: boolean
  }
  vmafScore?: number
  encoderType?: 'gpu' | 'cpu'
  hardwareModel?: string
  ffmpegCommand?: string
  ffmpegVersion?: string
  transcodeDurationMs?: number
  activeGpuWorkers?: number
  videoMaxConcurrent?: number
  audioMaxConcurrent?: number
  audioTrackOverrides?: TrackOverride[]
  subtitleTrackOverrides?: TrackOverride[]
}

/** Результат импорта */
export interface ImportResult {
  success: boolean
  animeId?: string
  episodeCount?: number
  error?: string
  /** Предупреждение о частичном успехе (часть видео не транскодирована) */
  warning?: string
}

/** Метаданные о кодировании видео */
export interface VideoEncodingMeta {
  ffmpegCommand?: string
  transcodeDurationMs?: number
  activeGpuWorkers?: number
}

/** Состояние импорта (для IPC обновлений) */
export interface ImportState {
  stage: ProcessingStage
  currentFile: number
  totalFiles: number
  currentFileName: string | null
  error: string | null
  parallelProgress: AggregatedProgress | null
}
