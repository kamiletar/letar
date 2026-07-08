import type { FmEngineParams } from './schema'

// Конвертер «модель FM-патча ↔ стандартный Yamaha DX7 SysEx».
// Формат подтверждён побайтово реальным железом M-VAVE SMK-37 PRO (Фаза 1.5, 2026-07-07):
// заголовки, checksum и раскладка параметров совпадают с официальным DX7
// (см. apps/synth/src/lib/patch/__fixtures__/README.md).
//
// ⚠️ ИЗВЕСТНОЕ ОГРАНИЧЕНИЕ (сознательно отложено, см. PLAN.md Фаза 1.5):
// наш AudioWorklet (fm-processor.js) реализует только 5 собственных алгоритмов-
// приближений, а не все 32 настоящих топологии DX7. Поле `algorithm` пишется/
// читается как есть (сквозной проход байта), но НЕ гарантирует, что патч будет
// звучать на реальном DX7-совместимом железе так же, как в браузере — это
// требует отдельной работы (перенос точных графов модуляции из Dexed
// AlgoDisplay.cpp). Не полагаться на это поле для звуковой точности.
//
// Также не хранятся в нашей модели (используются DX7-дефолты при кодировании,
// отбрасываются при декодировании): keyboard level scaling (breakpoint/depth/
// curve), keyboard rate scaling, amp mod sensitivity, oscillator detune,
// oscillator key sync, LFO sync, pitch mod sensitivity, transpose.

const SYSEX_START = 0xf0
const SYSEX_END = 0xf7
const YAMAHA_ID = 0x43

const SINGLE_VOICE_PARAM_COUNT = 155
const SINGLE_VOICE_BYTE_COUNT_MS = 0x01
const SINGLE_VOICE_BYTE_COUNT_LS = 0x1b // 155 = 0x9B → 7-bit split: MS=01, LS=1B

const BULK_VOICE_COUNT = 32
const BULK_PACKED_VOICE_SIZE = 128
const BULK_DATA_BYTE_COUNT = BULK_VOICE_COUNT * BULK_PACKED_VOICE_SIZE // 4096
const BULK_BYTE_COUNT_MS = 0x20
const BULK_BYTE_COUNT_LS = 0x00

// DX7 LFO waveform (0-5) ↔ наша модель
const LFO_WAVE_TO_DX7 = { triangle: 0, 'saw-down': 1, 'saw-up': 2, square: 3, sine: 4, 'sample-hold': 5 } as const
const DX7_TO_LFO_WAVE = ['triangle', 'saw-down', 'saw-up', 'square', 'sine', 'sample-hold'] as const

/** Masked two's complement суммы байт (алгоритм checksum из DX7 SysEx spec) */
function checksum(bytes: readonly number[]): number {
  const sum = bytes.reduce((acc, b) => acc + b, 0)
  return -sum & 0x7f
}

// === Кодирование одного оператора (21 байт, unpacked single-voice формат) ===

function encodeOperator(op: FmEngineParams['operators'][number]): number[] {
  // Ratio/fixedFreq → OSC FREQ COARSE + FINE (стандартное DX7-приближение,
  // используется большинством клонов: ratio = coarse' * (1 + fine/100),
  // где coarse'=0.5 при coarse=0, иначе coarse'=coarse)
  let coarse: number
  let fine: number
  if (op.fixed) {
    const decade = Math.min(3, Math.max(0, Math.floor(Math.log10(Math.max(1, op.fixedFreq)))))
    const mantissa = op.fixedFreq / 10 ** decade
    coarse = decade
    fine = Math.round(((mantissa - 1) / 0.0772) * 100) / 100
    fine = Math.min(99, Math.max(0, Math.round(fine)))
  } else if (op.ratio < 0.75) {
    coarse = 0
    fine = Math.min(99, Math.max(0, Math.round((op.ratio / 0.5 - 1) * 100)))
  } else {
    coarse = Math.min(31, Math.max(1, Math.round(op.ratio)))
    fine = Math.min(99, Math.max(0, Math.round((op.ratio / coarse - 1) * 100)))
  }

  return [
    op.eg.rates[0],
    op.eg.rates[1],
    op.eg.rates[2],
    op.eg.rates[3],
    op.eg.levels[0],
    op.eg.levels[1],
    op.eg.levels[2],
    op.eg.levels[3],
    0x27, // KBD LEV SCL BRK PT — дефолт C3 (не храним в модели)
    0, // SCL LEFT DEPTH
    0, // SCL RIGHT DEPTH
    0, // SCL LEFT CURVE
    0, // SCL RIGHT CURVE
    0, // KBD RATE SCALING
    0, // AMP MOD SENSITIVITY
    op.velocitySensitivity,
    op.level,
    op.fixed ? 1 : 0,
    coarse,
    fine,
    7, // OSC DETUNE — дефолт «без детюна» (0 центов = значение 7 в шкале 0-14)
  ]
}

function decodeOperator(bytes: readonly number[]): FmEngineParams['operators'][number] {
  const [r1, r2, r3, r4, l1, l2, l3, l4, , , , , , , , velSens, level, mode, coarse, fine] = bytes
  const fixed = mode === 1
  const ratio = coarse === 0 ? 0.5 * (1 + fine / 100) : coarse * (1 + fine / 100)
  const fixedFreq = fixed ? 10 ** coarse * (1 + (fine * 0.0772) / 100) : 0

  return {
    ratio: fixed ? 1 : ratio,
    fixed,
    fixedFreq,
    level,
    eg: { rates: [r1, r2, r3, r4], levels: [l1, l2, l3, l4] },
    velocitySensitivity: velSens,
    feedback: 0, // feedback глобален в DX7 — восстанавливается отдельно на op0
  }
}

/**
 * Кодирует FM-патч в 155-параметровый unpacked single-voice DX7 SysEx dump.
 * Возвращает полный SysEx-фрейм (F0 43 0n 00 01 1B ...155 байт... checksum F7).
 */
export function encodeSingleVoiceSysex(engine: FmEngineParams, name: string, channel = 0): Uint8Array {
  const data: number[] = []

  // DX7 хранит операторы в порядке OP6→OP1; наш operators[0]=OP1 … operators[5]=OP6
  for (let dx7Op = 0; dx7Op < 6; dx7Op++) {
    const ourIndex = 5 - dx7Op
    data.push(...encodeOperator(engine.operators[ourIndex]))
  }

  data.push(
    ...engine.pitchEg.rates,
    ...engine.pitchEg.levels,
    Math.min(31, Math.max(0, engine.algorithm - 1)),
    engine.operators[0].feedback,
    1, // OSC KEY SYNC — дефолт «включено»
    engine.lfo.speed,
    engine.lfo.delay,
    engine.lfo.pmDepth,
    engine.lfo.amDepth,
    0, // LFO SYNC — дефолт «выключено»
    LFO_WAVE_TO_DX7[engine.lfo.wave],
    3, // PITCH MOD SENSITIVITY — дефолт
    24 // TRANSPOSE — дефолт (24 = без транспонирования)
  )

  const paddedName = name.toUpperCase().padEnd(10, ' ').slice(0, 10)
  for (let i = 0; i < 10; i++) {
    data.push(paddedName.charCodeAt(i))
  }

  if (data.length !== SINGLE_VOICE_PARAM_COUNT) {
    throw new Error(`Ожидалось ${SINGLE_VOICE_PARAM_COUNT} параметров, получено ${data.length}`)
  }

  return new Uint8Array([
    SYSEX_START,
    YAMAHA_ID,
    channel & 0x0f,
    0x00, // format 0 = 1 voice
    SINGLE_VOICE_BYTE_COUNT_MS,
    SINGLE_VOICE_BYTE_COUNT_LS,
    ...data,
    checksum(data),
    SYSEX_END,
  ])
}

/** Декодирует single-voice DX7 SysEx dump обратно в модель FM-патча + имя */
export function decodeSingleVoiceSysex(bytes: Uint8Array): { name: string; engine: FmEngineParams } {
  if (bytes[0] !== SYSEX_START || bytes[bytes.length - 1] !== SYSEX_END) {
    throw new Error('Не похоже на SysEx-фрейм (нет F0/F7)')
  }
  if (bytes[1] !== YAMAHA_ID) {
    throw new Error(`Неизвестный manufacturer ID: 0x${bytes[1].toString(16)}`)
  }
  if (bytes[3] !== 0x00) {
    throw new Error('Это не single-voice dump (format byte != 0)')
  }

  const data = Array.from(bytes.slice(6, 6 + SINGLE_VOICE_PARAM_COUNT))
  return decodeVoiceParams(data)
}

function decodeVoiceParams(data: readonly number[]): { name: string; engine: FmEngineParams } {
  const operators: FmEngineParams['operators'] = [0, 1, 2, 3, 4, 5].map((ourIndex) => {
    const dx7Op = 5 - ourIndex
    return decodeOperator(data.slice(dx7Op * 21, dx7Op * 21 + 21))
  }) as FmEngineParams['operators']

  const g = data.slice(126, 145)
  const [pr1, pr2, pr3, pr4, pl1, pl2, pl3, pl4, alg, fb, , lfoSpeed, lfoDelay, pmDepth, amDepth, , lfoWave] = g

  operators[0] = { ...operators[0], feedback: fb }

  const engine: FmEngineParams = {
    algorithm: Math.min(32, Math.max(1, alg + 1)),
    operators,
    pitchEg: { rates: [pr1, pr2, pr3, pr4], levels: [pl1, pl2, pl3, pl4] },
    lfo: {
      speed: lfoSpeed,
      delay: lfoDelay,
      wave: DX7_TO_LFO_WAVE[lfoWave] ?? 'sine',
      pmDepth,
      amDepth,
    },
  }

  const nameBytes = data.slice(145, 155)
  const name = String.fromCharCode(...nameBytes).trimEnd()

  return { name, engine }
}

/** Разбирает 128-байтный packed voice (используется в 32-голосом bulk dump) */
function decodePackedVoice(bytes: readonly number[]): { name: string; engine: FmEngineParams } {
  // Раскладка из документации: 17 байт/оператор ×6 + 26 глобальных байт.
  // Байты 8,9,10,11,12,13,14 упакованы по несколько параметров на байт —
  // для наших целей (level/velocity/EG/ratio) это не нужно, поэтому
  // распаковываем только используемые нами поля.
  const operators: FmEngineParams['operators'] = [0, 1, 2, 3, 4, 5].map((ourIndex) => {
    const dx7Op = 5 - ourIndex
    const o = dx7Op * 17
    const [r1, r2, r3, r4, l1, l2, l3, l4] = bytes.slice(o, o + 8)
    const velSens = (bytes[o + 13] >> 2) & 0x07
    const level = bytes[o + 14]
    const modeByte = bytes[o + 15]
    const fixed = (modeByte & 0x01) === 1
    const coarse = (modeByte >> 1) & 0x1f
    const fine = bytes[o + 16]
    const ratio = coarse === 0 ? 0.5 * (1 + fine / 100) : coarse * (1 + fine / 100)
    const fixedFreq = fixed ? 10 ** coarse * (1 + (fine * 0.0772) / 100) : 0

    return {
      ratio: fixed ? 1 : ratio,
      fixed,
      fixedFreq,
      level,
      eg: { rates: [r1, r2, r3, r4], levels: [l1, l2, l3, l4] },
      velocitySensitivity: velSens,
      feedback: 0,
    }
  }) as FmEngineParams['operators']

  const base = 102
  const [pr1, pr2, pr3, pr4, pl1, pl2, pl3, pl4] = bytes.slice(base, base + 8)
  const algByte = bytes[base + 8]
  const alg = algByte & 0x1f
  const fbByte = bytes[base + 9]
  const fb = fbByte & 0x07
  const lfoSpeed = bytes[base + 10]
  const lfoDelay = bytes[base + 11]
  const pmDepth = bytes[base + 12]
  const amDepth = bytes[base + 13]
  const lfoByte = bytes[base + 14]
  const lfoWave = (lfoByte >> 1) & 0x07

  operators[0] = { ...operators[0], feedback: fb }

  const engine: FmEngineParams = {
    algorithm: Math.min(32, Math.max(1, alg + 1)),
    operators,
    pitchEg: { rates: [pr1, pr2, pr3, pr4], levels: [pl1, pl2, pl3, pl4] },
    lfo: {
      speed: lfoSpeed,
      delay: lfoDelay,
      wave: DX7_TO_LFO_WAVE[lfoWave] ?? 'sine',
      pmDepth,
      amDepth,
    },
  }

  const nameBytes = bytes.slice(base + 16, base + 26)
  const name = String.fromCharCode(...nameBytes).trimEnd()

  return { name, engine }
}

/** Разбирает 32-голосый bulk dump (например, заводской банк пресетов с SMK-37) */
export function decodeBulkDump(bytes: Uint8Array): Array<{ name: string; engine: FmEngineParams }> {
  if (bytes[0] !== SYSEX_START || bytes[bytes.length - 1] !== SYSEX_END) {
    throw new Error('Не похоже на SysEx-фрейм (нет F0/F7)')
  }
  if (bytes[1] !== YAMAHA_ID) {
    throw new Error(`Неизвестный manufacturer ID: 0x${bytes[1].toString(16)}`)
  }
  if (bytes[3] !== 0x09) {
    throw new Error('Это не 32-voice bulk dump (format byte != 9)')
  }
  if (bytes[4] !== BULK_BYTE_COUNT_MS || bytes[5] !== BULK_BYTE_COUNT_LS) {
    throw new Error('Неверный byte count для bulk dump')
  }

  const data = Array.from(bytes.slice(6, 6 + BULK_DATA_BYTE_COUNT))
  const voices: Array<{ name: string; engine: FmEngineParams }> = []
  for (let v = 0; v < BULK_VOICE_COUNT; v++) {
    voices.push(decodePackedVoice(data.slice(v * BULK_PACKED_VOICE_SIZE, (v + 1) * BULK_PACKED_VOICE_SIZE)))
  }
  return voices
}
