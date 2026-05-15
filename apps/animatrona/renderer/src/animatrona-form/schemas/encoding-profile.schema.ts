import { z } from 'zod/v4'

/** Enum значения из Prisma (используем как литералы) */
const VideoCodecSchema = z.enum(['AV1', 'HEVC', 'H264', 'COPY'])
const RateControlSchema = z.enum(['VBR', 'CONSTQP', 'CQ'])
const TuneSchema = z.enum(['NONE', 'HQ', 'UHQ', 'ULL', 'LL'])
const MultipassSchema = z.enum(['DISABLED', 'QRES', 'FULLRES'])
const BRefModeSchema = z.enum(['DISABLED', 'EACH', 'MIDDLE'])
/** GPU пресеты (NVENC p1-p7) */
const GpuPresetValues = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'] as const
/** CPU пресеты: SVT-AV1 (числовые) + libx265/libx264 (именованные) */
const CpuPresetValues = [
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'ultrafast',
  'superfast',
  'veryfast',
  'faster',
  'fast',
  'medium',
  'slow',
  'slower',
  'veryslow',
] as const
const PresetSchema = z.enum([...GpuPresetValues, ...CpuPresetValues])

/**
 * Схема для создания/редактирования профиля кодирования
 */
export const EncodingProfileSchema = z
  .object({
    /** Имя профиля */
    name: z.string().min(1, 'Введите имя профиля').max(100, 'Имя слишком длинное'),

    /** Видео кодек */
    codec: VideoCodecSchema.default('AV1'),

    /** Использовать GPU */
    useGpu: z.boolean().default(true),

    /** Режим контроля битрейта */
    rateControl: RateControlSchema.default('CQ'),

    /** Constant Quality (15-40, ниже = лучше) */
    cq: z.number().min(15).max(51).default(24),

    /** Максимальный битрейт в kbps (опционально) */
    maxBitrate: z.number().min(1000).max(100000).nullish(),

    /** Пресет скорость/качество (p1-p7) */
    preset: PresetSchema.default('p5'),

    /** Tune параметр */
    tune: TuneSchema.default('HQ'),

    /** Multipass режим */
    multipass: MultipassSchema.default('DISABLED'),

    /** Spatial Adaptive Quantization */
    spatialAq: z.boolean().default(true),

    /** Temporal Adaptive Quantization */
    temporalAq: z.boolean().default(true),

    /** AQ Strength (1-15) */
    aqStrength: z.number().min(1).max(15).default(8),

    /** Lookahead фреймов (0-250, для Blackwell до 250) */
    lookahead: z.number().min(0).max(250).nullish().default(16),

    /** Lookahead level */
    lookaheadLevel: z.number().min(0).max(3).nullish().default(null),

    /** GOP Size */
    gopSize: z.number().min(0).max(600).default(250),

    /** B-Ref Mode */
    bRefMode: BRefModeSchema.default('MIDDLE'),

    /** Принудительно 10-bit */
    force10Bit: z.boolean().default(false),

    /** Temporal Filter */
    temporalFilter: z.boolean().default(false),

    /**
     * Принудительно использовать CPU кодирование (libsvtav1)
     * Полезно если известно что контент не работает с NVENC
     */
    preferCpu: z.boolean().default(false),
  })
  .strip()

export type EncodingProfileFormData = z.infer<typeof EncodingProfileSchema>

/**
 * Дефолтные значения для нового профиля
 */
export const encodingProfileDefaults: EncodingProfileFormData = {
  name: '',
  codec: 'AV1',
  useGpu: true,
  rateControl: 'CQ',
  cq: 24,
  maxBitrate: null,
  preset: 'p5',
  tune: 'HQ',
  multipass: 'DISABLED',
  spatialAq: true,
  temporalAq: true,
  aqStrength: 8,
  lookahead: 16,
  lookaheadLevel: null,
  gopSize: 250,
  bRefMode: 'MIDDLE',
  force10Bit: false,
  temporalFilter: false,
  preferCpu: false,
}
