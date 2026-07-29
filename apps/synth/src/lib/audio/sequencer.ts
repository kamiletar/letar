// Степ-секвенсор: планирует шаги заранее («lookahead») по аудио-часам (`ctx.currentTime`),
// а не по JS-таймеру напрямую — иначе на шагах будет слышен джиттер setTimeout/setInterval.
// Классический приём («A Tale of Two Clocks», Chris Wilson): setTimeout будит нас часто и неточно,
// но мы каждый раз заглядываем на `scheduleAheadTime` вперёд по точным аудио-часам и планируем
// звук именно на них — слышимый результат ровный, даже если сам будильник дрожит.

export type StepCallback = (stepIndex: number, time: number) => void

const DEFAULT_STEPS_PER_BAR = 16
const LOOKAHEAD_MS = 25
const SCHEDULE_AHEAD_SEC = 0.1

export class StepSequencer {
  private readonly ctx: BaseAudioContext
  private readonly onStep: StepCallback
  private readonly totalSteps: number
  private bpm = 120
  private swing = 0 // 0–1: доля периода, на которую задерживаются нечётные 16-е доли («покачивание»)
  private nextStepTime = 0
  private currentStep = 0
  private timerId: ReturnType<typeof setTimeout> | null = null

  // `totalSteps` — длина паттерна в 16-х долях (драм-сетка всегда 16; пиано-ролл может быть 8–32).
  constructor(ctx: BaseAudioContext, onStep: StepCallback, totalSteps = DEFAULT_STEPS_PER_BAR) {
    this.ctx = ctx
    this.onStep = onStep
    this.totalSteps = totalSteps
  }

  get isRunning(): boolean {
    return this.timerId !== null
  }

  // Длительность одного шага (16-я нота) в секундах при текущем BPM
  private get stepDuration(): number {
    return 60 / this.bpm / 4
  }

  setBpm(bpm: number): void {
    this.bpm = Math.max(40, Math.min(240, bpm))
  }

  setSwing(amount: number): void {
    this.swing = Math.max(0, Math.min(1, amount))
  }

  start(): void {
    if (this.isRunning) {
      return
    }
    this.currentStep = 0
    this.nextStepTime = this.ctx.currentTime + 0.05
    this.tick()
  }

  stop(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId)
      this.timerId = null
    }
  }

  private readonly tick = (): void => {
    while (this.nextStepTime < this.ctx.currentTime + SCHEDULE_AHEAD_SEC) {
      // Свинг сдвигает только «слабую» долю (нечётный 16-й шаг) — классическое покачивание шаффла.
      const isOffbeat = this.currentStep % 2 === 1
      const swungTime = isOffbeat ? this.nextStepTime + this.swing * this.stepDuration * 0.5 : this.nextStepTime
      this.onStep(this.currentStep, swungTime)
      this.nextStepTime += this.stepDuration
      this.currentStep = (this.currentStep + 1) % this.totalSteps
    }
    this.timerId = setTimeout(this.tick, LOOKAHEAD_MS)
  }
}
