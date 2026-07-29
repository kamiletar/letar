'use strict'
// FM-синтезатор: 6 операторов, все 32 настоящих алгоритма DX7, DX7-вдохновлённые EG
// Запускается в AudioWorkletGlobalScope — отдельный поток, нет доступа к DOM

// ============================================================
// Все 32 алгоритма DX7 (источник истины: src/lib/patch/dx7-algorithms.ts —
// AudioWorklet-скрипт не может импортировать модули приложения, поэтому таблица
// продублирована здесь; при изменении держать в синхроне с TS-версией).
// src[i]: какие операторы модулируют оператор i (0-индекс, op0=DX7-OP1 … op5=DX7-OP6)
// carriers: операторы, выход которых идёт в аудио
// fbOp: единственный оператор с "обратным" ребром — на него подаётся feedback патча (0-7);
// не всегда самомодуляция (алгоритмы 4 и 6 берут обратную связь от соседнего оператора)
// ============================================================
const ALGORITHMS = [
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

// Все 32 алгоритма DX7 устроены так, что модулятор оператора i всегда имеет индекс >= i,
// КРОМЕ ровно одного "обратного" ребра (feedback) на fbOp — поэтому фиксированный порядок
// обработки 5→0 всегда топологически корректен без явной сортировки под каждый алгоритм.
const PROCESS_ORDER = [5, 4, 3, 2, 1, 0]

// rate (0–99) → время перехода в секундах (логарифмическая шкала)
// rate 99 ≈ 1 мс; rate 0 ≈ 10 с
function rateToSec(r) {
  if (r >= 99) return 0.001
  const t = 1 - r / 99
  return 0.001 + t * t * 10
}

// ============================================================
// Один голос — 6 операторов с фазой и EG
// ============================================================
class Voice {
  constructor(id) {
    this.id = id
    this.active = false
    this.midiNote = -1
    this.startTime = 0 // для voice stealing
    this.vel = 1

    this.phases = new Float64Array(6) // нормализованная фаза [0, 1)
    this.egValues = new Float64Array(6) // текущий уровень EG [0, 1]
    // 0=Attack 1=Decay1 2=Decay2(sustain) 3=Release 4=Idle
    this.egStages = new Int32Array(6).fill(4)

    this.outputs = new Float64Array(6) // выходы операторов текущего сэмпла (предыдущего — для feedback-рёбер)
  }

  noteOn(midiNote, velocity, ops) {
    this.midiNote = midiNote
    this.vel = 0.3 + 0.7 * velocity
    this.active = true
    this.outputs.fill(0)

    for (let i = 0; i < 6; i++) {
      this.phases[i] = 0
      // Стартуем с уровня L4 (Release level, обычно 0)
      this.egValues[i] = ops[i].eg.levels[3] / 99
      this.egStages[i] = 0 // Attack
    }
  }

  noteOff() {
    for (let i = 0; i < 6; i++) {
      if (this.egStages[i] < 3) this.egStages[i] = 3 // → Release
    }
  }

  isIdle() {
    for (let i = 0; i < 6; i++) {
      if (this.egStages[i] !== 4) return false
    }
    return true
  }

  // Один шаг EG для оператора i; возвращает текущий уровень
  stepEG(i, eg, sr) {
    const s = this.egStages[i]
    if (s === 4) return this.egValues[i]

    const target = eg.levels[s] / 99
    const time = rateToSec(eg.rates[s])
    const delta = 1 / (time * sr)
    const cur = this.egValues[i]
    const diff = target - cur

    if (Math.abs(diff) <= delta) {
      this.egValues[i] = target
      if (s === 0) {
        this.egStages[i] = 1 // Attack → Decay1
      } else if (s === 1) {
        this.egStages[i] = 2 // Decay1 → Decay2/sustain
      } // s=2: держим L3 до noteOff (DX7-behaviour)
      else if (s === 3 && target <= 0.0005) this.egStages[i] = 4 // Release → Idle
    } else {
      this.egValues[i] = cur + Math.sign(diff) * delta
    }

    return this.egValues[i]
  }

  // Вычисляет один аудио-сэмпл голоса
  tick(ops, alg, sr) {
    const baseFreq = 440 * Math.pow(2, (this.midiNote - 69) / 12)
    // Максимальная глубина модуляции в радианах (DX7-style: ≈7 при level=99)
    const MOD = 7

    for (const i of PROCESS_ORDER) {
      const op = ops[i]
      const freq = op.fixed ? op.fixedFreq : baseFreq * op.ratio
      const eg = this.stepEG(i, op.eg, sr)
      const level = (op.level / 99) * eg * this.vel

      // Сумма модуляций от источников. this.outputs[src] хранит текущий сэмпл, если src уже
      // обработан в этом же проходе (src > i — обычный «вперёд по цепочке» случай), иначе ещё
      // не перезаписанное значение предыдущего сэмпла — это и есть feedback-рёбра алгоритмов
      // 1-32 (не всегда самомодуляция, см. алгоритмы 4/6 в dx7-algorithms.ts), без zero-delay петель.
      let modRad = 0
      if (i === alg.fbOp && op.feedback > 0) {
        for (const src of alg.src[i]) {
          modRad += this.outputs[src] * (op.feedback / 7) * Math.PI * 2
        }
      } else {
        for (const src of alg.src[i]) {
          modRad += this.outputs[src] * MOD
        }
      }

      // Шаг фазы (нормализованная [0,1))
      this.phases[i] += freq / sr
      if (this.phases[i] >= 1) this.phases[i] -= 1

      // Синус с фазовой модуляцией
      this.outputs[i] = Math.sin(2 * Math.PI * this.phases[i] + modRad) * level
    }

    // Сумма несущих → аудио-сэмпл
    let out = 0
    for (const c of alg.carriers) out += this.outputs[c]

    // Мягкое ограничение (tanh) против клиппинга при глубокой модуляции
    return Math.tanh(out)
  }
}

// ============================================================
// FM AudioWorklet Processor
// ============================================================
class FmProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.voices = Array.from({ length: 8 }, (_, id) => new Voice(id))
    this.patch = null
    this.time = 0 // монотонный счётчик сэмплов для voice stealing

    this.port.onmessage = ({ data }) => {
      switch (data.type) {
        case 'patch':
          this.patch = data.patch
          break
        case 'noteOn':
          this._on(data.note, data.vel)
          break
        case 'noteOff':
          this._off(data.note)
          break
        case 'allOff':
          this.voices.forEach((v) => {
            if (v.active) v.noteOff()
          })
          break
      }
    }
  }

  _on(note, vel) {
    if (!this.patch) return

    // Ищем свободный или простаивающий голос
    let v = this.voices.find((v) => !v.active || v.isIdle())
    if (!v) {
      // Voice stealing: берём самый старый голос
      v = this.voices.reduce((a, b) => (a.startTime < b.startTime ? a : b))
    }
    v.startTime = this.time
    v.noteOn(note, vel, this.patch.operators)
  }

  _off(note) {
    this.voices.forEach((v) => {
      if (v.active && v.midiNote === note) v.noteOff()
    })
  }

  process(_inputs, outputs) {
    if (!this.patch) return true

    const algIdx = Math.min(31, Math.max(0, this.patch.algorithm - 1))
    const alg = ALGORITHMS[algIdx]
    const ops = this.patch.operators
    const sr = sampleRate // глобальная константа AudioWorkletGlobalScope
    const out = outputs[0]
    const L = out[0]
    const R = out[1] ?? L

    for (let f = 0; f < L.length; f++) {
      this.time++
      let s = 0

      for (const v of this.voices) {
        if (!v.active) continue
        s += v.tick(ops, alg, sr)
        if (v.isIdle()) v.active = false
      }

      L[f] = s
      if (R !== L) R[f] = s
    }

    return true
  }
}

registerProcessor('fm-processor', FmProcessor)
