// Маппинг физических контролов SMK-37 PRO (фейдеры/энкодеры) на параметры SUB-патча.
// Вынесено из studio-client.tsx как чистая логика без React-состояния — легче тестировать и читать отдельно.

import type { SubtractivePatch } from './schema'

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

// CC-маппинг для 4 физических фейдеров SMK-37 PRO (реальные номера подтверждены на железе
// 2026-07-08: CC 68-71, НЕ 70-77 как предполагалось раньше). Абсолютные значения 0-127.
export function applyCC(patch: SubtractivePatch, cc: number, raw: number): SubtractivePatch {
  const norm = raw / 127
  const e = patch.engine
  switch (cc) {
    case 68:
      return { ...patch, engine: { ...e, filter: { ...e.filter, cutoff: norm } } }
    case 69:
      return { ...patch, engine: { ...e, filter: { ...e.filter, resonance: norm * 0.99 } } }
    case 70:
      return { ...patch, engine: { ...e, amp: { ...e.amp, adsr: { ...e.amp.adsr, attack: norm * 2 } } } }
    case 71:
      return { ...patch, engine: { ...e, amp: { ...e.amp, adsr: { ...e.amp.adsr, release: norm * 3 } } } }
    default:
      return patch
  }
}

// Маппинг для 8 крутилок-энкодеров SMK-37 PRO (относительный шаг, см. MidiInputManager.onEncoder) —
// каждый тик прибавляет/убавляет delta к своему параметру, а не задаёт абсолютное положение.
export function applyEncoderDelta(patch: SubtractivePatch, index: number, delta: number): SubtractivePatch {
  const e = patch.engine
  switch (index) {
    case 0:
      return { ...patch, engine: { ...e, osc1: { ...e.osc1, detune: clamp(e.osc1.detune + delta, -100, 100) } } }
    case 1:
      return {
        ...patch,
        engine: { ...e, filter: { ...e.filter, envAmount: clamp(e.filter.envAmount + delta * 0.01, -1, 1) } },
      }
    case 2:
      return { ...patch, engine: { ...e, lfo: { ...e.lfo, rate: clamp(e.lfo.rate + delta * 0.05, 0.01, 20) } } }
    case 3:
      return { ...patch, engine: { ...e, lfo: { ...e.lfo, depth: clamp(e.lfo.depth + delta * 0.01, 0, 1) } } }
    case 4:
      return { ...patch, engine: { ...e, amp: { ...e.amp, gain: clamp(e.amp.gain + delta * 0.01, 0, 1) } } }
    case 5:
      return {
        ...patch,
        engine: { ...e, fx: { ...e.fx, reverb: { ...e.fx.reverb, wet: clamp(e.fx.reverb.wet + delta * 0.01, 0, 1) } } },
      }
    case 6:
      return {
        ...patch,
        engine: {
          ...e,
          fx: { ...e.fx, reverb: { ...e.fx.reverb, decay: clamp(e.fx.reverb.decay + delta * 0.05, 0.1, 8) } },
        },
      }
    case 7:
      return { ...patch, engine: { ...e, osc2: { ...e.osc2, detune: clamp(e.osc2.detune + delta, -100, 100) } } }
    default:
      return patch
  }
}
