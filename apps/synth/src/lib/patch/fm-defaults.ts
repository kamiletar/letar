import type { FmPatch } from './schema'

// Шаблон оператора с нейтральными значениями (звучит как синус)
function neutralOp(ratio = 1, level = 0) {
  return {
    ratio,
    fixed: false,
    fixedFreq: 0,
    level,
    eg: {
      rates: [99, 85, 0, 70] as [number, number, number, number],
      levels: [99, 0, 0, 0] as [number, number, number, number],
    },
    velocitySensitivity: 2,
    feedback: 0,
  }
}

// Стеклянные колокола — настоящий DX7-алгоритм 2: [OP2(fb)→OP1] (несущая) + [OP6→OP5→OP4→OP3]
// (вторая несущая). Верхний оператор глубокой цепочки с ratio=14 даёт металлический призвук,
// feedback на коротком дуэте op0/op1 добавляет «песок» в атаку — см. dx7-algorithms.ts (алг. 2).
export const FM_GLASS_BELLS: FmPatch = {
  schemaVersion: 1,
  id: 'fm-glass-bells-001',
  name: 'Glass Bells',
  author: 'synth',
  visibility: 'private',
  license: 'CC0-1.0',
  tags: ['fm', 'bell', 'dx7'],
  createdAt: '2026-01-01T00:00:00Z',
  color: null,
  render: { previewWav: null },
  type: 'fm',
  engine: {
    algorithm: 2,
    operators: [
      // op0 — несущая короткого дуэта (ratio=1)
      {
        ...neutralOp(1, 82),
        eg: {
          rates: [99, 85, 0, 75] as [number, number, number, number],
          levels: [99, 30, 0, 0] as [number, number, number, number],
        },
        velocitySensitivity: 4,
      },
      // op1 — модулятор op0 с feedback (алгоритм 2: fbOp=1) — «песок» в атаке
      {
        ...neutralOp(1, 65),
        eg: {
          rates: [99, 90, 0, 80] as [number, number, number, number],
          levels: [99, 20, 0, 0] as [number, number, number, number],
        },
        feedback: 3,
        velocitySensitivity: 5,
      },
      // op2 — несущая длинной цепочки (основной тон колокола, медленное затухание)
      {
        ...neutralOp(1, 88),
        eg: {
          rates: [99, 70, 0, 65] as [number, number, number, number],
          levels: [99, 55, 0, 0] as [number, number, number, number],
        },
        velocitySensitivity: 4,
      },
      // op3 — модулятор op2
      {
        ...neutralOp(1, 70),
        eg: {
          rates: [99, 78, 0, 72] as [number, number, number, number],
          levels: [99, 40, 0, 0] as [number, number, number, number],
        },
        velocitySensitivity: 3,
      },
      // op4 — модулятор op3
      {
        ...neutralOp(2, 65),
        eg: {
          rates: [99, 84, 0, 76] as [number, number, number, number],
          levels: [99, 30, 0, 0] as [number, number, number, number],
        },
        velocitySensitivity: 3,
      },
      // op5 — вершина цепочки (ratio=14 → «хрустальный» металлический призвук)
      {
        ...neutralOp(14, 72),
        eg: {
          rates: [99, 90, 0, 80] as [number, number, number, number],
          levels: [99, 0, 0, 0] as [number, number, number, number],
        },
        velocitySensitivity: 5,
      },
    ],
    pitchEg: {
      rates: [99, 99, 99, 99] as [number, number, number, number],
      levels: [50, 50, 50, 50] as [number, number, number, number],
    },
    lfo: { speed: 0, delay: 0, wave: 'sine', pmDepth: 0, amDepth: 0 },
  },
}

// FM-бас — настоящий DX7-алгоритм 1: [OP2→OP1] (несущая) + [OP6(fb)→OP5→OP4→OP3] (несущая) —
// см. dx7-algorithms.ts. Глубокая 4-операторная цепочка с feedback на вершине (op5) даёт
// классический FM-growl; короткая пара (op0/op1) добавляет чистый фундамент рядом с ним.
export const FM_BASS: FmPatch = {
  schemaVersion: 1,
  id: 'fm-bass-001',
  name: 'FM Bass',
  author: 'synth',
  visibility: 'private',
  license: 'CC0-1.0',
  tags: ['fm', 'bass', 'dx7'],
  createdAt: '2026-01-01T00:00:00Z',
  color: null,
  render: { previewWav: null },
  type: 'fm',
  engine: {
    algorithm: 1,
    operators: [
      // op0 — несущая короткой пары (чистый фундамент)
      {
        ...neutralOp(1, 85),
        eg: {
          rates: [99, 65, 99, 62] as [number, number, number, number],
          levels: [99, 75, 75, 0] as [number, number, number, number],
        },
        velocitySensitivity: 2,
      },
      // op1 — модулятор op0 (ratio=1, лёгкое обогащение)
      {
        ...neutralOp(1, 55),
        eg: {
          rates: [99, 70, 99, 65] as [number, number, number, number],
          levels: [99, 60, 60, 0] as [number, number, number, number],
        },
        velocitySensitivity: 2,
      },
      // op2 — несущая growl-цепочки (основной «грязный» бас)
      {
        ...neutralOp(1, 90),
        eg: {
          rates: [99, 60, 99, 60] as [number, number, number, number],
          levels: [99, 80, 80, 0] as [number, number, number, number],
        },
        velocitySensitivity: 3,
      },
      // op3 — модулятор op2
      {
        ...neutralOp(1, 65),
        eg: {
          rates: [99, 72, 99, 66] as [number, number, number, number],
          levels: [99, 55, 55, 0] as [number, number, number, number],
        },
        velocitySensitivity: 2,
      },
      // op4 — модулятор op3 (ratio=2, добавляет октаву гармоник)
      {
        ...neutralOp(2, 55),
        eg: {
          rates: [99, 78, 99, 70] as [number, number, number, number],
          levels: [99, 40, 40, 0] as [number, number, number, number],
        },
        velocitySensitivity: 1,
      },
      // op5 — вершина цепочки с feedback (алгоритм 1: fbOp=5) — «грязный» growl-призвук
      {
        ...neutralOp(1, 55),
        eg: {
          rates: [99, 85, 99, 75] as [number, number, number, number],
          levels: [99, 40, 40, 0] as [number, number, number, number],
        },
        feedback: 3,
        velocitySensitivity: 2,
      },
    ],
    pitchEg: {
      rates: [99, 99, 99, 99] as [number, number, number, number],
      levels: [50, 50, 50, 50] as [number, number, number, number],
    },
    lfo: { speed: 0, delay: 0, wave: 'sine', pmDepth: 0, amDepth: 0 },
  },
}
