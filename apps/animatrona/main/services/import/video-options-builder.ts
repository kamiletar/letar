/**
 * Построение настроек видео для транскодирования
 * Портировано из renderer — без React зависимостей
 */

import type { EncodingProfile } from '../../../renderer/src/generated/prisma'
import type { RateControlType, VideoTranscodeOptions } from '../../../shared/types'

const DEFAULT_VIDEO_OPTIONS: VideoTranscodeOptions = {
  codec: 'av1',
  useGpu: true,
  preset: 'p7',
  cq: 30,
  rateControl: 'VBR',
  spatialAq: true,
  temporalAq: true,
  aqStrength: 8,
  gopSize: 250,
  lookahead: 32,
  bRefMode: 'MIDDLE',
}

/**
 * Строит настройки видео из профиля кодирования или дефолтные
 */
export function buildVideoOptions(encodingProfile: EncodingProfile | null, effectiveCq: number): VideoTranscodeOptions {
  if (encodingProfile) {
    return {
      codec: encodingProfile.codec.toLowerCase() as 'av1' | 'hevc' | 'h264',
      useGpu: encodingProfile.useGpu,
      preset: encodingProfile.preset,
      cq: effectiveCq,
      rateControl: encodingProfile.rateControl as RateControlType,
      tune: encodingProfile.tune || undefined,
      multipass: encodingProfile.multipass || undefined,
      spatialAq: encodingProfile.spatialAq ?? true,
      temporalAq: encodingProfile.temporalAq ?? true,
      aqStrength: encodingProfile.aqStrength ?? undefined,
      gopSize: encodingProfile.gopSize ?? undefined,
      lookahead: encodingProfile.lookahead ?? undefined,
      bRefMode: encodingProfile.bRefMode || undefined,
      force10Bit: encodingProfile.force10Bit ?? false,
      temporalFilter: encodingProfile.temporalFilter ?? false,
    }
  }

  return {
    ...DEFAULT_VIDEO_OPTIONS,
    cq: effectiveCq,
  }
}

/**
 * Возвращает название профиля для отображения
 */
export function getProfileName(encodingProfile: EncodingProfile | null): string {
  return encodingProfile?.name ?? 'AV1 NVENC (default)'
}
