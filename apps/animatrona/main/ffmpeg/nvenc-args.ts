/**
 * Аргументы NVENC — единый источник для реального импорта (VideoPool) и VMAF-сэмплов
 *
 * Подбор CQ по VMAF имеет смысл, только если сэмплы кодируются теми же параметрами, что и
 * финальный файл: временный фильтр, lookahead и multipass заметно меняют размер при том же CQ.
 */

import type { TuneType, VideoTranscodeOptions } from './types'

/** Кодек в нижнем регистре, как в VideoTranscodeOptions */
export type NvencCodec = VideoTranscodeOptions['codec']

/** Маппинг кодеков на NVENC-энкодеры ffmpeg */
const NVENC_ENCODERS: Record<NvencCodec, string> = {
  av1: 'av1_nvenc',
  hevc: 'hevc_nvenc',
  h264: 'h264_nvenc',
}

/**
 * Уровень временного фильтра (Blackwell).
 *
 * Обёртка nvenc.c принимает только NV_ENC_TEMPORAL_FILTER_LEVEL_0 и _4 — на любое другое
 * значение, включая 1, отвечает «Invalid temporal filtering level.». Драйвер тут ни при чём:
 * до 2026-09-16 фильтр был выключен как «не поддерживаемый драйвером 572.90», а в коде
 * стоял `-tf_level 1`.
 */
export const NVENC_TEMPORAL_FILTER_LEVEL = 4

/**
 * Минимум B-кадров для временного фильтра. При меньшем числе ffmpeg пишет
 * «Temporal filtering needs at least 4 B-Frames (-bf 4).», и кодирование падает на
 * «InitializeEncoder failed: invalid param» — это не предупреждение, а отказ.
 */
export const NVENC_TEMPORAL_FILTER_MIN_B_FRAMES = 4

/** Ответы ffmpeg, после которых задачу стоит повторить без временного фильтра */
const TEMPORAL_FILTER_ERROR_PATTERN =
  /Temporal filtering not supported|Temporal filtering needs at least|Invalid temporal filtering level/i

/** Кодирование упало из-за временного фильтра NVENC — можно повторить без него */
export class NvencTemporalFilterError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NvencTemporalFilterError'
  }
}

/** Строка stderr ffmpeg говорит об отказе временного фильтра (старый GPU, мало B-кадров) */
export function isNvencTemporalFilterError(stderr: string): boolean {
  return TEMPORAL_FILTER_ERROR_PATTERN.test(stderr)
}

/** Входные данные для аргументов временного фильтра */
export interface NvencTemporalFilterInput {
  /** Фильтр включён в профиле */
  enabled: boolean | undefined
  codec: NvencCodec
  tune: TuneType | undefined
  /** GPU умеет фильтр (Blackwell) и он не отключён после отказа ffmpeg */
  supported: boolean
}

/**
 * Аргументы временного фильтра NVENC.
 *
 * B-кадры по умолчанию (замер, драйвер 616.92): AV1 — 5 при HQ и 7 при UHQ, HEVC — 3 при HQ
 * (0 у p1) и 5 при UHQ, H.264 — 3. Явный `-bf 4` для AV1 срезал бы B-кадры у UHQ с 7 до 4,
 * поэтому он добавляется только HEVC/H.264 без UHQ.
 */
export function buildNvencTemporalFilterArgs({ enabled, codec, tune, supported }: NvencTemporalFilterInput): string[] {
  if (!enabled || !supported) {
    return []
  }
  // Low-latency тюны работают без B-кадров, фильтру не на чем работать
  if (tune === 'LL' || tune === 'ULL') {
    return []
  }

  const args = ['-tf_level', String(NVENC_TEMPORAL_FILTER_LEVEL)]
  if (codec !== 'av1' && tune !== 'UHQ') {
    args.push('-bf', String(NVENC_TEMPORAL_FILTER_MIN_B_FRAMES))
  }
  return args
}

/**
 * Принудительный 10-bit имеет смысл только для AV1 и HEVC: H.264 High 10 NVENC на Blackwell
 * выдаёт, но Chromium его не декодирует (см. .claude/docs/chromium-video-codec-limits.md).
 */
export function supportsNvenc10BitOutput(codec: NvencCodec): boolean {
  return codec === 'av1' || codec === 'hevc'
}

/** Контекст сборки аргументов, который не хранится в профиле */
export interface NvencEncodeArgsContext {
  /** Можно ли добавлять временный фильтр (GPU Blackwell и фильтр не отключён после отказа) */
  temporalFilterSupported: boolean
}

/**
 * Аргументы NVENC после `-i` — кодек, rate control, AQ, lookahead, B-кадры, фильтр, 10-bit.
 *
 * Кадры приходят в системную память (`-hwaccel cuda` без `-hwaccel_output_format cuda`),
 * поэтому 10-bit задаётся через `-pix_fmt p010le`.
 */
export function buildNvencEncodeArgs(options: VideoTranscodeOptions, context: NvencEncodeArgsContext): string[] {
  const codec = options.codec || 'av1'
  const args: string[] = ['-c:v', NVENC_ENCODERS[codec]]

  // Rate control и качество
  // ВАЖНО: -cq работает только с VBR, для constqp нужен -qp!
  const rateControl = options.rateControl ?? 'CONSTQP'
  if (rateControl === 'VBR') {
    args.push('-rc', 'vbr')
    args.push('-cq', options.cq.toString())
    if (options.maxBitrate) {
      args.push('-maxrate', `${options.maxBitrate}M`)
      args.push('-bufsize', `${options.maxBitrate * 2}M`)
    }
  } else {
    args.push('-rc', 'constqp')
    args.push('-qp', options.cq.toString()) // -qp для constqp, не -cq!
  }

  // Preset
  args.push('-preset', options.preset)

  // Tune (hq, uhq, ll, ull)
  const tune = options.tune ?? 'HQ'
  if (tune !== 'NONE') {
    args.push('-tune', tune.toLowerCase())
  }

  // Multipass
  const multipass = options.multipass ?? 'DISABLED'
  if (multipass === 'QRES') {
    args.push('-multipass', 'qres')
  } else if (multipass === 'FULLRES') {
    args.push('-multipass', 'fullres')
  }

  // GOP Size
  args.push('-g', (options.gopSize ?? 240).toString())

  // Adaptive Quantization
  args.push('-spatial-aq', (options.spatialAq ?? true) ? '1' : '0')
  args.push('-temporal-aq', (options.temporalAq ?? true) ? '1' : '0')
  args.push('-aq-strength', (options.aqStrength ?? 8).toString())

  // Lookahead (если указан). Глубже 51–58 кадров ffmpeg не применит — см. shared/nvenc-limits.ts
  if (options.lookahead && options.lookahead > 0) {
    args.push('-rc-lookahead', options.lookahead.toString())
    if (options.lookaheadLevel && options.lookaheadLevel > 0) {
      args.push('-lookahead_level', options.lookaheadLevel.toString())
    }
  }

  // B-Ref Mode
  const bRefMode = options.bRefMode ?? 'DISABLED'
  if (bRefMode === 'EACH') {
    args.push('-b_ref_mode', 'each')
  } else if (bRefMode === 'MIDDLE') {
    args.push('-b_ref_mode', 'middle')
  }

  // Temporal Filter (Blackwell)
  args.push(
    ...buildNvencTemporalFilterArgs({
      enabled: options.temporalFilter,
      codec,
      tune,
      supported: context.temporalFilterSupported,
    }),
  )

  // 10-bit вывод
  if (options.force10Bit && supportsNvenc10BitOutput(codec)) {
    args.push('-pix_fmt', 'p010le')
  }

  return args
}
