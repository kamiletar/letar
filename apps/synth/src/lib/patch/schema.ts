import { z } from 'zod/v4'

// === Осцилляторы ===

export const OscWaveSchema = z.enum(['sine', 'sawtooth', 'square', 'triangle'])
export type OscWave = z.infer<typeof OscWaveSchema>

const SubOscSchema = z.object({
  wave: OscWaveSchema,
  octave: z.number().int().min(-2).max(2),
  detune: z.number().min(-100).max(100), // центы; ±100 = ±1 полутон
  gain: z.number().min(0).max(1),
})

// === ADSR-огибающая ===

export const AdsrSchema = z.object({
  attack: z.number().min(0).max(10), // секунды
  decay: z.number().min(0).max(10),
  sustain: z.number().min(0).max(1), // 0–1
  release: z.number().min(0).max(10),
})
export type Adsr = z.infer<typeof AdsrSchema>

// === FX-секция (мастер-шина) ===

export const FxSchema = z.object({
  reverb: z.object({
    wet: z.number().min(0).max(1), // 0 = сухой, 1 = полное пространство
    decay: z.number().min(0.1).max(8), // время затухания, секунды
  }),
  space: z.object({
    azimuth: z.number().min(-1).max(1), // -1 = слева, 0 = по центру, 1 = справа (PannerNode HRTF)
    depth: z.number().min(0).max(1), // 0 = вплотную, 1 = далеко (влияет на громкость через distance-модель)
    autoOrbit: z.boolean(), // звук вращается по кругу вокруг слушателя, а не стоит статично
    orbitRate: z.number().min(0.02).max(1), // оборотов в секунду при autoOrbit
  }),
})
export type FxParams = z.infer<typeof FxSchema>

// === Пиано-ролл (мелодический паттерн для SUB/FM) ===

export const MelodicNoteSchema = z.object({
  note: z.number().int().min(0).max(127), // MIDI-нота
  step: z.number().int().min(0).max(31), // шаг начала (16-е доли)
  length: z.number().int().min(1).max(32), // длительность в шагах
  velocity: z.number().min(0).max(1),
})
export type MelodicNote = z.infer<typeof MelodicNoteSchema>

export const MelodicSequenceSchema = z.object({
  notes: z.array(MelodicNoteSchema),
  steps: z.number().int().min(8).max(32), // длина паттерна в шагах (16 = 1 такт, 32 = 2 такта)
  bpm: z.number().int().min(40).max(240),
  swing: z.number().min(0).max(1),
})
export type MelodicSequence = z.infer<typeof MelodicSequenceSchema>

// === Арпеджиатор ===

export const ArpModeSchema = z.enum(['up', 'down', 'up-down', 'random'])
export type ArpMode = z.infer<typeof ArpModeSchema>

export const ArpeggiatorSchema = z.object({
  enabled: z.boolean(),
  mode: ArpModeSchema,
  stepsPerNote: z.number().int().min(1).max(8), // 1 = 16-я, 2 = 8-я, 4 = четверть
  octaves: z.number().int().min(1).max(3),
  gate: z.number().min(0.05).max(1), // доля шага, которую реально звучит нота
  bpm: z.number().int().min(40).max(240),
})
export type ArpeggiatorParams = z.infer<typeof ArpeggiatorSchema>

// === Субтрактивный движок ===

export const SubtractiveEngineSchema = z.object({
  osc1: SubOscSchema,
  osc2: SubOscSchema,
  filter: z.object({
    type: z.enum(['lowpass', 'highpass', 'bandpass']),
    cutoff: z.number().min(0).max(1), // нормализованный лог: 0→20Hz, 1→20kHz
    resonance: z.number().min(0).max(0.99), // Q; <1 чтобы не самовозбуждаться
    envAmount: z.number().min(-1).max(1), // доля ADSR-модуляции cutoff
    adsr: AdsrSchema,
  }),
  amp: z.object({
    adsr: AdsrSchema,
    gain: z.number().min(0).max(1),
  }),
  lfo: z.object({
    wave: OscWaveSchema,
    target: z.enum(['cutoff', 'pitch', 'amp']),
    rate: z.number().min(0.01).max(20), // Гц
    depth: z.number().min(0).max(1),
  }),
  fx: FxSchema,
  // Оба поля опциональны: старые сохранённые патчи их не имеют — студия подставляет пустые
  // дефолты в коде (см. use-piano-roll.ts / use-arpeggiator.ts), а не через z.default(), чтобы
  // в сохранённом JSON реально отсутствовало неиспользуемое поле.
  sequence: MelodicSequenceSchema.optional(),
  arpeggiator: ArpeggiatorSchema.optional(),
})
export type SubtractiveEngineParams = z.infer<typeof SubtractiveEngineSchema>

// === FM-движок (DX7-совместимый, 6 операторов) ===

const FmEgSchema = z.object({
  rates: z.tuple([
    z.number().int().min(0).max(99),
    z.number().int().min(0).max(99),
    z.number().int().min(0).max(99),
    z.number().int().min(0).max(99),
  ]),
  levels: z.tuple([
    z.number().int().min(0).max(99),
    z.number().int().min(0).max(99),
    z.number().int().min(0).max(99),
    z.number().int().min(0).max(99),
  ]),
})

const FmOperatorSchema = z.object({
  ratio: z.number().min(0.01).max(32), // множитель несущей (при fixed=false)
  fixed: z.boolean(),
  fixedFreq: z.number().min(0).max(20000), // Гц (при fixed=true)
  level: z.number().int().min(0).max(99),
  eg: FmEgSchema,
  velocitySensitivity: z.number().int().min(0).max(7),
  feedback: z.number().int().min(0).max(7),
})

export const FmEngineSchema = z.object({
  algorithm: z.number().int().min(1).max(32),
  operators: z.tuple([
    FmOperatorSchema,
    FmOperatorSchema,
    FmOperatorSchema,
    FmOperatorSchema,
    FmOperatorSchema,
    FmOperatorSchema,
  ]),
  pitchEg: z.object({
    rates: z.tuple([
      z.number().int().min(0).max(99),
      z.number().int().min(0).max(99),
      z.number().int().min(0).max(99),
      z.number().int().min(0).max(99),
    ]),
    levels: z.tuple([
      z.number().int().min(0).max(99),
      z.number().int().min(0).max(99),
      z.number().int().min(0).max(99),
      z.number().int().min(0).max(99),
    ]),
  }),
  lfo: z.object({
    speed: z.number().int().min(0).max(99),
    delay: z.number().int().min(0).max(99),
    wave: z.enum(['sine', 'triangle', 'saw-up', 'saw-down', 'square', 'sample-hold']),
    pmDepth: z.number().int().min(0).max(99),
    amDepth: z.number().int().min(0).max(99),
  }),
  sequence: MelodicSequenceSchema.optional(),
  arpeggiator: ArpeggiatorSchema.optional(),
})
export type FmEngineParams = z.infer<typeof FmEngineSchema>

// === Драм-движок (16 пэдов) ===

export const DrumPadSynthSchema = z.object({
  type: z.enum(['808kick', 'snare', 'hat-closed', 'hat-open', 'clap', 'tom']),
  pitch: z.number().int().min(0).max(127),
  decay: z.number().min(0.01).max(5),
  tone: z.number().min(0).max(1),
  level: z.number().min(0).max(1),
})

export const DrumPadSchema = z.object({
  index: z.number().int().min(0).max(15),
  name: z.string().max(16),
  synth: DrumPadSynthSchema.nullable(),
})

// Паттерн степ-секвенсора (16 пэдов × 16 шагов) — опционален: старые патчи и свежесозданные
// киты его не имеют, тогда студия подставляет пустую сетку и BPM 120 (см. use-drum-sequencer.ts)
export const SequencerPatternSchema = z.object({
  pattern: z.array(z.array(z.boolean()).min(16).max(16)).min(16).max(16),
  bpm: z.number().int().min(40).max(240),
  // Доля смещения нечётных 16-х долей — «покачивание» шага. Опционально: старые паттерны его
  // не имеют, студия подставляет 0 (ровный шаг), см. use-drum-sequencer.ts.
  swing: z.number().min(0).max(1).optional(),
})
export type SequencerPattern = z.infer<typeof SequencerPatternSchema>

export const DrumkitEngineSchema = z.object({
  pads: z.array(DrumPadSchema).min(16).max(16),
  sequence: SequencerPatternSchema.optional(),
})
export type DrumkitEngineParams = z.infer<typeof DrumkitEngineSchema>
export type DrumPadSynth = z.infer<typeof DrumPadSynthSchema>
export type DrumPad = z.infer<typeof DrumPadSchema>

// === Базовые поля ===

const PatchBaseSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(64),
  author: z.string(),
  visibility: z.enum(['private', 'public']),
  license: z.string(),
  tags: z.array(z.string()),
  createdAt: z.string(), // ISO 8601
  color: z.string().nullable(),
  render: z.object({ previewWav: z.string().nullable() }),
})

// === Итоговая схема патча (keystone) ===

export const PatchSchema = z.discriminatedUnion('type', [
  PatchBaseSchema.extend({ type: z.literal('subtractive'), engine: SubtractiveEngineSchema }),
  PatchBaseSchema.extend({ type: z.literal('fm'), engine: FmEngineSchema }),
  PatchBaseSchema.extend({ type: z.literal('drumkit'), engine: DrumkitEngineSchema }),
])

export type Patch = z.infer<typeof PatchSchema>
export type SubtractivePatch = Extract<Patch, { type: 'subtractive' }>
export type FmPatch = Extract<Patch, { type: 'fm' }>
export type DrumkitPatch = Extract<Patch, { type: 'drumkit' }>
