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

// Стеклянные колокола — два 3-оп стека (алгоритм 2: [5→4→3] + [2→1→0])
// Верхний модулятор с ratio=14 даёт металлический тембр при атаке
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
      // op0 — несущая стека A (ratio=1, медленное затухание)
      {
        ...neutralOp(1, 88),
        eg: {
          rates: [99, 75, 0, 70] as [number, number, number, number],
          levels: [99, 50, 0, 0] as [number, number, number, number],
        },
        feedback: 0,
        velocitySensitivity: 4,
      },
      // op1 — средний модулятор стека A
      {
        ...neutralOp(1, 70),
        eg: {
          rates: [99, 80, 0, 75] as [number, number, number, number],
          levels: [99, 40, 0, 0] as [number, number, number, number],
        },
        velocitySensitivity: 3,
      },
      // op2 — верхний модулятор стека A (ratio=14 → «хрустальный» призвук)
      {
        ...neutralOp(14, 72),
        eg: {
          rates: [99, 90, 0, 80] as [number, number, number, number],
          levels: [99, 0, 0, 0] as [number, number, number, number],
        },
        velocitySensitivity: 5,
      },
      // op3 — несущая стека B (идентично op0)
      {
        ...neutralOp(1, 88),
        eg: {
          rates: [99, 75, 0, 70] as [number, number, number, number],
          levels: [99, 50, 0, 0] as [number, number, number, number],
        },
        velocitySensitivity: 4,
      },
      // op4 — средний модулятор стека B
      {
        ...neutralOp(1, 70),
        eg: {
          rates: [99, 80, 0, 75] as [number, number, number, number],
          levels: [99, 40, 0, 0] as [number, number, number, number],
        },
        velocitySensitivity: 3,
      },
      // op5 — верхний модулятор стека B (ratio=14)
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

// FM-бас — цепочка 5→4→3→2→1→0 (алгоритм 1), feedback на op0 = growl
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
      // op0 — несущий (единственный); feedback=3 даёт «грязный» призвук
      {
        ...neutralOp(1, 90),
        eg: {
          rates: [99, 60, 99, 60] as [number, number, number, number],
          levels: [99, 80, 80, 0] as [number, number, number, number],
        },
        feedback: 3,
        velocitySensitivity: 3,
      },
      // op1 — первый модулятор (ratio=1)
      {
        ...neutralOp(1, 75),
        eg: {
          rates: [99, 65, 99, 60] as [number, number, number, number],
          levels: [99, 70, 70, 0] as [number, number, number, number],
        },
        velocitySensitivity: 2,
      },
      // op2 — ratio=2, добавляет октаву гармоник
      {
        ...neutralOp(2, 60),
        eg: {
          rates: [99, 70, 99, 65] as [number, number, number, number],
          levels: [99, 60, 60, 0] as [number, number, number, number],
        },
        velocitySensitivity: 2,
      },
      // op3
      {
        ...neutralOp(1, 50),
        eg: {
          rates: [99, 75, 99, 70] as [number, number, number, number],
          levels: [99, 50, 50, 0] as [number, number, number, number],
        },
        velocitySensitivity: 1,
      },
      // op4 — ratio=3
      {
        ...neutralOp(3, 40),
        eg: {
          rates: [99, 80, 99, 70] as [number, number, number, number],
          levels: [99, 30, 30, 0] as [number, number, number, number],
        },
        velocitySensitivity: 1,
      },
      // op5 — листовой модулятор (ratio=1)
      {
        ...neutralOp(1, 55),
        eg: {
          rates: [99, 85, 99, 75] as [number, number, number, number],
          levels: [99, 40, 40, 0] as [number, number, number, number],
        },
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
