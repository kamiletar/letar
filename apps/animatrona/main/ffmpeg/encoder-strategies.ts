/**
 * Стратегии кодирования — OCP: добавление нового энкодера = новый класс без изменения transcode.ts
 */

import { buildNvencTemporalFilterArgs, type NvencCodec, supportsNvenc10BitOutput } from './nvenc-args'
import type { EncodingProfileOptions } from './types'

/** Опции для сборки цепочки видеофильтров (`-vf`) */
export interface VideoFilterChainOptions {
  /** Включён ли deband-фильтр (аниме-градиенты) */
  deband: boolean
  /** Готовая строка `crop=W:H:X:Y` из cropdetect (см. cropdetect.ts), либо не задана */
  cropFilter?: string
  /**
   * Битность источника. GPU-конвейеру нужна для `hwdownload`: кадры 10-bit источника лежат
   * в VRAM как p010le, и `format=nv12` после `hwdownload` падает с
   * «Invalid output format nv12 for hwframe download». По умолчанию 8.
   */
  sourceBitDepth?: number
}

/** Возможности GPU, которые влияют на аргументы кодирования */
export interface EncoderCapabilities {
  /** GPU умеет временный фильтр NVENC (Blackwell) */
  temporalFilterSupported: boolean
}

/** Интерфейс стратегии кодирования */
export interface EncoderStrategy {
  /** Построить аргументы ffmpeg для кодирования (без hwaccel, без фильтров) */
  buildArgs(profile: EncodingProfileOptions, sourceBitDepth: number): string[]
  /** Построить аргументы hwaccel (должны идти до -i) */
  buildHwaccelArgs(): string[]
  /**
   * Построить строку `-vf`: crop (опционально) + deband (опционально), с учётом того, что
   * GPU-конвейер (NVENC) держит кадр в VRAM и требует hwdownload/hwupload вокруг CPU-фильтров.
   * `undefined`, если ни один из фильтров не нужен.
   */
  buildVideoFilterChain(options: VideoFilterChainOptions): string | undefined
}

/** Маппинг кодеков GPU (NVENC) */
const NVENC_CODECS: Record<string, string> = {
  AV1: 'av1_nvenc',
  HEVC: 'hevc_nvenc',
  H264: 'h264_nvenc',
}

/** Параметры deband: 0.02 — мягкие, не вызывают артефактов */
const DEBAND_FILTER = 'deband=1thr=0.02:2thr=0.02:3thr=0.02:4thr=0.02'

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
 * - Temporal Filter (Blackwell) и принудительный 10-bit через -highbitdepth
 */
export class NvencEncoderStrategy implements EncoderStrategy {
  constructor(private readonly capabilities: EncoderCapabilities) {}

  /** Аргументы hwaccel для GPU — всегда перед -i */
  buildHwaccelArgs(): string[] {
    return ['-hwaccel', 'cuda', '-hwaccel_output_format', 'cuda']
  }

  /**
   * Цепочка CPU-фильтров для GPU-конвейера:
   * hwdownload → [crop] → [deband] → hwupload_cuda
   * hwdownload переносит данные из VRAM в RAM для CPU-фильтров (crop, deband),
   * format=<формат кадров в VRAM> обеспечивает совместимость между GPU и CPU,
   * hwupload_cuda возвращает данные обратно в VRAM для NVENC.
   */
  buildVideoFilterChain({ deband, cropFilter, sourceBitDepth = 8 }: VideoFilterChainOptions): string | undefined {
    if (!deband && !cropFilter) {
      return undefined
    }
    const parts = [cropFilter, deband ? DEBAND_FILTER : undefined].filter(Boolean)
    const swFormat = sourceBitDepth >= 10 ? 'p010le' : 'nv12'
    return `hwdownload,format=${swFormat},${parts.join(',')},format=${swFormat},hwupload_cuda`
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

    const codec = profile.codec.toLowerCase() as NvencCodec

    // Temporal Filter (Blackwell). Уровень только 4 — см. NVENC_TEMPORAL_FILTER_LEVEL
    args.push(
      ...buildNvencTemporalFilterArgs({
        enabled: profile.temporalFilter,
        codec,
        tune: profile.tune,
        supported: this.capabilities.temporalFilterSupported,
      }),
    )

    // 10-bit output. Кадры остаются в VRAM (-hwaccel_output_format cuda), и -pix_fmt p010le
    // тут не работает («Impossible to convert between the formats»). -highbitdepth — родной
    // способ NVENC: 8-bit на входе, 10-bit на выходе. 10-bit источник NVENC и так кодирует в 10-bit.
    if (profile.force10Bit && supportsNvenc10BitOutput(codec)) {
      args.push('-highbitdepth', '1')
    }

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

  /** Цепочка фильтров для CPU-кодирования — crop и deband напрямую, без GPU-трансфера */
  buildVideoFilterChain({ deband, cropFilter }: VideoFilterChainOptions): string | undefined {
    if (!deband && !cropFilter) {
      return undefined
    }
    const parts = [cropFilter, deband ? DEBAND_FILTER : undefined].filter(Boolean)
    return parts.join(',')
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
 * @param capabilities Возможности GPU (см. getGpuCapability в utils/hardware-info.ts)
 * @returns Экземпляр соответствующей стратегии
 */
export function getEncoderStrategy(useGpu: boolean, capabilities: EncoderCapabilities): EncoderStrategy {
  return useGpu ? new NvencEncoderStrategy(capabilities) : new CpuEncoderStrategy()
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
