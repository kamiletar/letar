/**
 * Стратегии кодирования — OCP: добавление нового энкодера = новый класс без изменения transcode.ts
 */

import type { EncodingProfileOptions } from './types'

/** Интерфейс стратегии кодирования */
export interface EncoderStrategy {
  /** Построить аргументы ffmpeg для кодирования (без hwaccel, без deband) */
  buildArgs(profile: EncodingProfileOptions, sourceBitDepth: number): string[]
  /** Построить аргументы hwaccel (должны идти до -i) */
  buildHwaccelArgs(): string[]
  /** Построить строку deband видеофильтра */
  buildDebandFilter(): string
}

/** Маппинг кодеков GPU (NVENC) */
const NVENC_CODECS: Record<string, string> = {
  AV1: 'av1_nvenc',
  HEVC: 'hevc_nvenc',
  H264: 'h264_nvenc',
}

/** Маппинг кодеков CPU */
const CPU_CODECS: Record<string, string> = {
  AV1: 'libsvtav1',
  HEVC: 'libx265',
  H264: 'libx264',
}

/**
 * Стратегия NVIDIA NVENC кодирования (GPU)
 *
 * Полная логика из GPU-ветки buildProfileArgs:
 * - Rate Control: VBR / CONSTQP / CQ
 * - Adaptive Quantization (spatial/temporal AQ)
 * - Lookahead и B-Ref Mode
 * - Tune и Multipass
 */
export class NvencEncoderStrategy implements EncoderStrategy {
  /** Аргументы hwaccel для GPU — всегда перед -i */
  buildHwaccelArgs(): string[] {
    return ['-hwaccel', 'cuda', '-hwaccel_output_format', 'cuda']
  }

  /**
   * Deband фильтр для GPU:
   * hwdownload → deband (CPU) → hwupload_cuda
   * hwdownload переносит данные из VRAM в RAM для CPU фильтра,
   * format=nv12 обеспечивает совместимость между GPU и CPU,
   * hwupload_cuda возвращает данные обратно в VRAM для NVENC
   */
  buildDebandFilter(): string {
    return 'hwdownload,format=nv12,deband=1thr=0.02:2thr=0.02:3thr=0.02:4thr=0.02,format=nv12,hwupload_cuda'
  }

  /** Построить аргументы кодирования NVENC (без hwaccel — они добавляются отдельно) */
  buildArgs(profile: EncodingProfileOptions, _sourceBitDepth: number): string[] {
    const args: string[] = []

    // Кодек
    args.push('-c:v', NVENC_CODECS[profile.codec])

    // Rate Control
    switch (profile.rateControl) {
      case 'VBR':
        args.push('-rc', 'vbr', '-cq', profile.cq.toString())
        if (profile.maxBitrate) {
          args.push('-maxrate', `${profile.maxBitrate}M`, '-bufsize', `${profile.maxBitrate * 2}M`)
        }
        break
      case 'CONSTQP':
        args.push('-rc', 'constqp', '-qp', profile.cq.toString())
        break
      case 'CQ':
        args.push('-cq', profile.cq.toString())
        break
    }

    // Пресет
    args.push('-preset', profile.preset)

    // Tune (если не NONE)
    if (profile.tune !== 'NONE') {
      args.push('-tune', profile.tune.toLowerCase())
    }

    // Multipass
    if (profile.multipass !== 'DISABLED') {
      args.push('-multipass', profile.multipass.toLowerCase())
    }

    // Adaptive Quantization
    args.push('-spatial-aq', profile.spatialAq ? '1' : '0')
    args.push('-temporal-aq', profile.temporalAq ? '1' : '0')
    args.push('-aq-strength', profile.aqStrength.toString())

    // Lookahead
    if (profile.lookahead !== undefined && profile.lookahead !== null && profile.lookahead > 0) {
      args.push('-rc-lookahead', profile.lookahead.toString())
    }
    if (profile.lookaheadLevel !== undefined && profile.lookaheadLevel !== null) {
      args.push('-lookahead_level', profile.lookaheadLevel.toString())
    }

    // GOP Size
    args.push('-g', profile.gopSize.toString())

    // B-Ref Mode
    if (profile.bRefMode !== 'DISABLED') {
      args.push('-b_ref_mode', profile.bRefMode.toLowerCase())
    }

    // 10-bit output — только если НЕ используем hwaccel cuda
    // При -hwaccel_output_format cuda формат пикселей управляется GPU автоматически
    // и -pix_fmt вызывает конфликт "Invalid argument"
    // NVENC автоматически сохраняет битность источника
    // Примечание: если нужен принудительный 10-bit без hwaccel,
    // используйте profile.force10Bit с useGpu=false

    // Temporal Filter (Blackwell+)
    // ПРИМЕЧАНИЕ: tf_level пока не поддерживается драйвером 572.90 на RTX 5080
    // FFmpeg выдаёт "Invalid temporal filtering level" для любых значений кроме 0
    // TODO: Включить когда NVIDIA выпустит драйвер с поддержкой Temporal Filter
    // if (profile.temporalFilter) {
    //   args.push('-tf_level', '1')
    // }

    return args
  }
}

/**
 * Стратегия CPU кодирования (libsvtav1, libx265, libx264)
 *
 * Полная логика из CPU-ветки buildProfileArgs:
 * - CRF (аналог CQ для GPU)
 * - Маппинг GPU пресетов (p1-p7) в CPU формат
 * - Опциональный 10-bit для AV1
 */
export class CpuEncoderStrategy implements EncoderStrategy {
  /** CPU кодирование не требует hwaccel аргументов */
  buildHwaccelArgs(): string[] {
    return []
  }

  /** Deband фильтр для CPU — напрямую без GPU трансфера */
  buildDebandFilter(): string {
    return 'deband=1thr=0.02:2thr=0.02:3thr=0.02:4thr=0.02'
  }

  /** Построить аргументы кодирования CPU */
  buildArgs(profile: EncodingProfileOptions, sourceBitDepth: number): string[] {
    const args: string[] = []

    // Кодек
    args.push('-c:v', CPU_CODECS[profile.codec])

    // CRF (аналог CQ для CPU)
    args.push('-crf', profile.cq.toString())

    // Пресет — маппинг GPU → CPU формат (обратная совместимость)
    args.push('-preset', mapToCpuPreset(profile.preset, profile.codec))

    // GOP Size
    args.push('-g', profile.gopSize.toString())

    // 10-bit output для libsvtav1
    if ((profile.force10Bit || sourceBitDepth >= 10) && profile.codec === 'AV1') {
      args.push('-pix_fmt', 'yuv420p10le')
    }

    return args
  }
}

/**
 * Фабрика стратегий кодирования
 *
 * @param useGpu true — NVENC (GPU), false — CPU (libsvtav1/libx265/libx264)
 * @returns Экземпляр соответствующей стратегии
 */
export function getEncoderStrategy(useGpu: boolean): EncoderStrategy {
  return useGpu ? new NvencEncoderStrategy() : new CpuEncoderStrategy()
}

/**
 * Маппинг пресетов GPU (p1-p7) в CPU формат
 *
 * SVT-AV1: числа 0-13 (0 = максимальное качество, 13 = максимальная скорость)
 * libx265/libx264: именованные пресеты (ultrafast...veryslow)
 *
 * Если пресет уже в CPU формате — конвертирует между форматами при необходимости.
 */
export function mapToCpuPreset(preset: string, codec: string): string {
  const isNumeric = /^\d+$/.test(preset)
  const isAv1 = codec === 'AV1'

  // Уже CPU формат
  if (isNumeric && isAv1) {
    return preset
  }
  if (!isNumeric && !preset.startsWith('p') && !isAv1) {
    return preset
  }

  // Числовой пресет SVT-AV1 → именованный для x265/x264
  if (isNumeric && !isAv1) {
    const numToName: Record<string, string> = {
      '4': 'slow',
      '5': 'slow',
      '6': 'medium',
      '7': 'fast',
      '8': 'faster',
      '9': 'faster',
      '10': 'veryfast',
    }
    return numToName[preset] ?? 'medium'
  }

  // GPU пресет (p1-p7) → CPU эквивалент
  const gpuToSvtav1: Record<string, string> = {
    p1: '10',
    p2: '9',
    p3: '8',
    p4: '7',
    p5: '6',
    p6: '5',
    p7: '4',
  }
  const gpuToX26x: Record<string, string> = {
    p1: 'veryfast',
    p2: 'faster',
    p3: 'faster',
    p4: 'fast',
    p5: 'medium',
    p6: 'slow',
    p7: 'slow',
  }

  if (isAv1) {
    return gpuToSvtav1[preset] ?? '6'
  }
  return gpuToX26x[preset] ?? 'medium'
}
