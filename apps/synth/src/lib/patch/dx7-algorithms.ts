// Полные графы модуляции всех 32 алгоритмов настоящего DX7 — источник истины для UI
// (fm-panel.tsx) и SysEx-кодирования (dx7-sysex.ts). Раньше (до 2026-07-29) движок знал только
// 5 собственных приближений — см. историю в PLAN.md Фаза 1.5 (техдолг).
//
// Данные сверены по двум независимым источникам:
// 1. mmontag/dx7-synth-js (src/voice-dx7.js, ALGORITHMS) — рабочий JS-порт с прямой числовой
//    таблицей modulationMatrix/outputMix, в комментариях сам ссылается на hexter и Dexed.
// 2. Инвариант, выведенный из Dexed AlgoDisplay.cpp: там у КАЖДОГО алгоритма ровно одна
//    feedback-иконка, и для алгоритмов 4 и 6 она явно помечена особым случаем отрисовки
//    («ALGO 4», «ALGO 6» в switch по `fb`) — это ровно те два алгоритма, где feedback-ребро
//    в таблице выше идёт не на себя, а на один оператор назад по цепочке (не самомодуляция).
//    Для всех остальных 30 алгоритмов ровно одно ребро «оператор модулирует себя или более
//    ранний по порядку обработки оператор» — и оно везде единственное. Проверено скриптом
//    (не руками) при переносе — оба источника согласуются.
//
// src[i]: индексы операторов (0=OP1 … 5=OP6, как и в остальном коде — см. dx7-sysex.ts),
// модулирующих оператор i. carriers: операторы, чей выход идёт в звук. fbOp: единственный
// оператор, на который распространяется общий (глобальный для патча) параметр feedback (0-7) —
// не всегда самомодуляция (алгоритмы 4 и 6 используют ребро от соседнего оператора).
export interface Dx7Algorithm {
  readonly src: readonly (readonly number[])[]
  readonly carriers: readonly number[]
  readonly fbOp: number
}

export const DX7_ALGORITHMS: readonly Dx7Algorithm[] = [
  { src: [[1], [], [3], [4], [5], [5]], carriers: [0, 2], fbOp: 5 }, // 1
  { src: [[1], [1], [3], [4], [5], []], carriers: [0, 2], fbOp: 1 }, // 2
  { src: [[1], [2], [], [4], [5], [5]], carriers: [0, 3], fbOp: 5 }, // 3
  { src: [[1], [2], [], [4], [5], [3]], carriers: [0, 3], fbOp: 5 }, // 4
  { src: [[1], [], [3], [], [5], [5]], carriers: [0, 2, 4], fbOp: 5 }, // 5
  { src: [[1], [], [3], [], [5], [4]], carriers: [0, 2, 4], fbOp: 5 }, // 6
  { src: [[1], [], [3, 4], [], [5], [5]], carriers: [0, 2], fbOp: 5 }, // 7
  { src: [[1], [], [3, 4], [3], [5], []], carriers: [0, 2], fbOp: 3 }, // 8
  { src: [[1], [1], [3, 4], [], [5], []], carriers: [0, 2], fbOp: 1 }, // 9
  { src: [[1], [2], [2], [4, 5], [], []], carriers: [0, 3], fbOp: 2 }, // 10
  { src: [[1], [2], [], [4, 5], [], [5]], carriers: [0, 3], fbOp: 5 }, // 11
  { src: [[1], [1], [3, 4, 5], [], [], []], carriers: [0, 2], fbOp: 1 }, // 12
  { src: [[1], [], [3, 4, 5], [], [], [5]], carriers: [0, 2], fbOp: 5 }, // 13
  { src: [[1], [], [3], [4, 5], [], [5]], carriers: [0, 2], fbOp: 5 }, // 14
  { src: [[1], [1], [3], [4, 5], [], []], carriers: [0, 2], fbOp: 1 }, // 15
  { src: [[1, 2, 4], [], [3], [], [5], [5]], carriers: [0], fbOp: 5 }, // 16
  { src: [[1, 2, 4], [1], [3], [], [5], []], carriers: [0], fbOp: 1 }, // 17
  { src: [[1, 2, 3], [], [2], [4], [5], []], carriers: [0], fbOp: 2 }, // 18
  { src: [[1], [2], [], [5], [5], [5]], carriers: [0, 3, 4], fbOp: 5 }, // 19
  { src: [[2], [2], [2], [4, 5], [], []], carriers: [0, 1, 3], fbOp: 2 }, // 20
  { src: [[2], [2], [2], [5], [5], []], carriers: [0, 1, 3, 4], fbOp: 2 }, // 21
  { src: [[1], [], [5], [5], [5], [5]], carriers: [0, 2, 3, 4], fbOp: 5 }, // 22
  { src: [[], [2], [], [5], [5], [5]], carriers: [0, 1, 3, 4], fbOp: 5 }, // 23
  { src: [[], [], [5], [5], [5], [5]], carriers: [0, 1, 2, 3, 4], fbOp: 5 }, // 24
  { src: [[], [], [], [5], [5], [5]], carriers: [0, 1, 2, 3, 4], fbOp: 5 }, // 25
  { src: [[], [2], [], [4, 5], [], [5]], carriers: [0, 1, 3], fbOp: 5 }, // 26
  { src: [[], [2], [2], [4, 5], [], []], carriers: [0, 1, 3], fbOp: 2 }, // 27
  { src: [[1], [], [3], [4], [4], []], carriers: [0, 2, 5], fbOp: 4 }, // 28
  { src: [[], [], [3], [], [5], [5]], carriers: [0, 1, 2, 4], fbOp: 5 }, // 29
  { src: [[], [], [3], [4], [4], []], carriers: [0, 1, 2, 5], fbOp: 4 }, // 30
  { src: [[], [], [], [], [5], [5]], carriers: [0, 1, 2, 3, 4], fbOp: 5 }, // 31
  { src: [[], [], [], [], [], [5]], carriers: [0, 1, 2, 3, 4, 5], fbOp: 5 }, // 32
]

/** Алгоритмы (1-индекс, как в патче) → 0-индекс массива DX7_ALGORITHMS */
export function getAlgorithm(algorithm: number): Dx7Algorithm {
  const idx = Math.min(31, Math.max(0, Math.round(algorithm) - 1))
  return DX7_ALGORITHMS[idx]
}

/** Человекочитаемая схема связей алгоритма для UI, например "6→5→4→3→2→1" или "1+2+3+4+5+6" */
export function describeAlgorithm(algorithm: number): string {
  const alg = getAlgorithm(algorithm)
  const chains: string[] = []
  const consumed = new Set<number>()

  // Строим цепочки от каждой несущей вверх по модуляторам (для читаемости — сверху вниз, OP-нумерация)
  for (const carrier of alg.carriers) {
    const chain: number[] = [carrier]
    let cur = carrier
    const seen = new Set([carrier])
    for (;;) {
      const mods = alg.src[cur].filter((m) => m !== cur)
      const next = mods.find((m) => !seen.has(m))
      if (next === undefined) {
        break
      }
      chain.push(next)
      seen.add(next)
      cur = next
    }
    chain.forEach((op) => consumed.add(op))
    chains.push(
      chain
        .map((op) => op + 1)
        .reverse()
        .join('→'),
    )
  }

  return chains.join(' + ')
}
