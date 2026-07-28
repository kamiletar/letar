// Маппинг физических контролов SMK-37 PRO (фейдеры/энкодеры) на параметры SUB-патча.
// Вынесено из studio-client.tsx как чистая логика без React-состояния — легче тестировать и читать отдельно.

import type { SubtractivePatch } from './schema'

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

// CC-маппинг для 4 физических фейдеров SMK-37 PRO — устройство переключает их между двумя
// «банками» кнопкой fader bank (мануал: «4 фейдера назначаемых → 8 через fader bank»), поэтому
// на железе видели то CC 68-71, то CC 64-67 в зависимости от того, в каком банке был контроллер
// (подтверждено на железе 2026-07-08/09). Абсолютные значения 0-127, оба банка — 8 слотов подряд.
export function applyCC(patch: SubtractivePatch, cc: number, raw: number): SubtractivePatch {
  const norm = raw / 127
  const e = patch.engine
  switch (cc) {
    // Банк 1 (CC 64-67)
    case 64:
      return { ...patch, engine: { ...e, filter: { ...e.filter, cutoff: norm } } }
    case 65:
      return { ...patch, engine: { ...e, filter: { ...e.filter, resonance: norm * 0.99 } } }
    case 66:
      // *10 — полный диапазон схемы (0-10с), совпадает с тем, как Knob в ParamPanel нормализует
      // отображение (attack/10). Раньше было *2 — фейдер визуально никогда не доходил до 100%.
      return { ...patch, engine: { ...e, amp: { ...e.amp, adsr: { ...e.amp.adsr, attack: norm * 10 } } } }
    case 67:
      return { ...patch, engine: { ...e, amp: { ...e.amp, adsr: { ...e.amp.adsr, release: norm * 10 } } } }
    // Банк 2 (CC 68-71)
    case 68:
      return { ...patch, engine: { ...e, amp: { ...e.amp, gain: norm } } }
    case 69:
      return {
        ...patch,
        engine: { ...e, fx: { ...e.fx, reverb: { ...e.fx.reverb, wet: norm } } },
      }
    case 70:
      return { ...patch, engine: { ...e, osc1: { ...e.osc1, detune: (norm - 0.5) * 200 } } }
    case 71:
      return { ...patch, engine: { ...e, osc2: { ...e.osc2, detune: (norm - 0.5) * 200 } } }
    default:
      return patch
  }
}

// Маппинг для 8 крутилок-энкодеров SMK-37 PRO. Несмотря на «бесконечное» вращение, устройство
// шлёт АБСОЛЮТНУЮ позицию 0-127 (см. MidiInputManager.onEncoder — подтверждено на железе
// 2026-07-09), а не шаг вращения. Раньше здесь была относительная модель (delta) — баг: на
// границе 63/64 знак дельты переворачивался и параметр улетал в крайнее значение почти мгновенно
// («либо 100, либо 0» — репорт владельца). norm-формулы подобраны так, чтобы 1:1 совпадать с тем,
// как соответствующий Knob в ParamPanel нормализует значение для отображения (полный ход энкодера
// = полный ход ручки на экране). Как и у фейдеров, у энкодеров два банка (кнопка knob bank на
// устройстве) — банк 1 и банк 2 управляют РАЗНЫМИ наборами параметров (8+8=16 доступных ручек).
export function applyEncoderValue(patch: SubtractivePatch, index: number, raw: number, bank: 1 | 2): SubtractivePatch {
  return bank === 1 ? applyEncoderValueBank1(patch, index, raw) : applyEncoderValueBank2(patch, index, raw)
}

function applyEncoderValueBank1(patch: SubtractivePatch, index: number, raw: number): SubtractivePatch {
  const norm = raw / 127
  const e = patch.engine
  switch (index) {
    case 0:
      return { ...patch, engine: { ...e, osc1: { ...e.osc1, detune: Math.round((norm - 0.5) * 200) } } }
    case 1:
      return {
        ...patch,
        engine: { ...e, filter: { ...e.filter, envAmount: Math.round((norm - 0.5) * 2 * 100) / 100 } },
      }
    case 2:
      return { ...patch, engine: { ...e, lfo: { ...e.lfo, rate: Math.round(norm * 20 * 100) / 100 } } }
    case 3:
      return { ...patch, engine: { ...e, lfo: { ...e.lfo, depth: Math.round(norm * 100) / 100 } } }
    case 4:
      return { ...patch, engine: { ...e, amp: { ...e.amp, gain: Math.round(norm * 100) / 100 } } }
    case 5:
      return {
        ...patch,
        engine: { ...e, fx: { ...e.fx, reverb: { ...e.fx.reverb, wet: Math.round(norm * 100) / 100 } } },
      }
    case 6:
      return {
        ...patch,
        engine: {
          ...e,
          fx: { ...e.fx, reverb: { ...e.fx.reverb, decay: clamp(Math.round(norm * 80) / 10, 0.1, 8) } },
        },
      }
    case 7:
      return { ...patch, engine: { ...e, osc2: { ...e.osc2, detune: Math.round((norm - 0.5) * 200) } } }
    default:
      return patch
  }
}

// Банк 2 — то, что раньше не крутилось вообще ни одной физической ручкой: усиление осцилляторов,
// огибающая фильтра (отдельная от огибающей amp, которую крутят фейдеры), decay/sustain amp и
// пространственные ручки (азимут/глубина HRTF)
function applyEncoderValueBank2(patch: SubtractivePatch, index: number, raw: number): SubtractivePatch {
  const norm = raw / 127
  const e = patch.engine
  switch (index) {
    case 0:
      return { ...patch, engine: { ...e, osc1: { ...e.osc1, gain: Math.round(norm * 100) / 100 } } }
    case 1:
      return { ...patch, engine: { ...e, osc2: { ...e.osc2, gain: Math.round(norm * 100) / 100 } } }
    case 2:
      return {
        ...patch,
        engine: { ...e, filter: { ...e.filter, adsr: { ...e.filter.adsr, attack: Math.round(norm * 100) / 10 } } },
      }
    case 3:
      return {
        ...patch,
        engine: { ...e, filter: { ...e.filter, adsr: { ...e.filter.adsr, release: Math.round(norm * 100) / 10 } } },
      }
    case 4:
      return {
        ...patch,
        engine: { ...e, amp: { ...e.amp, adsr: { ...e.amp.adsr, decay: Math.round(norm * 100) / 10 } } },
      }
    case 5:
      return {
        ...patch,
        engine: { ...e, amp: { ...e.amp, adsr: { ...e.amp.adsr, sustain: Math.round(norm * 100) / 100 } } },
      }
    case 6:
      return {
        ...patch,
        engine: { ...e, fx: { ...e.fx, space: { ...e.fx.space, azimuth: Math.round((norm - 0.5) * 2 * 100) / 100 } } },
      }
    case 7:
      return {
        ...patch,
        engine: { ...e, fx: { ...e.fx, space: { ...e.fx.space, depth: Math.round(norm * 100) / 100 } } },
      }
    default:
      return patch
  }
}
