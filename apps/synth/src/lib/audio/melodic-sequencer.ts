// Мелодический степ-секвенсор для SUB/FM патчей — «пиано-ролл»: ноты с высотой и длительностью
// вместо булевых ударов драм-сетки. Переиспользует lookahead-планировщик StepSequencer, но вместо
// собственного управления голосами вызывает те же noteOn/noteOff, что и клавиатура/MIDI-вход
// студии — во время воспроизведения подсвечиваются те же клавиши на виртуальной клавиатуре
// (глаз видит то же, что слышит ухо).
//
// Точность здесь не sample-accurate, в отличие от драм-триггеров (которые сами планируют
// огибающую на аудио-часах через `AudioScheduledSourceNode.start(when)`): SUB/FM запускаются
// через setTimeout с задержкой, вычисленной от текущего момента до аудио-времени шага — тот же
// компромисс, на который уже пошёл FM-движок (управление через postMessage в AudioWorklet, тоже
// не sample-accurate). Для мелодических нот с собственной ADSR-атакой эта погрешность (доли
// периода lookahead, ~100мс) не слышна — в отличие от драм-транзиента, где она была бы заметна.

import type { MelodicSequence } from '../patch/schema'
import { StepSequencer } from './sequencer'

export type NoteOnFn = (note: number, velocity: number) => void
export type NoteOffFn = (note: number) => void

export class MelodicSequencer {
  private readonly ctx: BaseAudioContext
  private readonly noteOn: NoteOnFn
  private readonly noteOff: NoteOffFn
  private readonly getSequence: () => MelodicSequence
  private scheduler: StepSequencer | null = null

  constructor(ctx: BaseAudioContext, noteOn: NoteOnFn, noteOff: NoteOffFn, getSequence: () => MelodicSequence) {
    this.ctx = ctx
    this.noteOn = noteOn
    this.noteOff = noteOff
    this.getSequence = getSequence
  }

  get isRunning(): boolean {
    return this.scheduler?.isRunning ?? false
  }

  start(onStepVisual?: (step: number) => void): void {
    if (this.scheduler) {
      return
    }
    const seq = this.getSequence()
    this.scheduler = new StepSequencer(
      this.ctx,
      (stepIndex, time) => this.handleStep(stepIndex, time, onStepVisual),
      seq.steps,
    )
    this.scheduler.setBpm(seq.bpm)
    this.scheduler.setSwing(seq.swing)
    this.scheduler.start()
  }

  stop(): void {
    this.scheduler?.stop()
    this.scheduler = null
  }

  // Дёргается при изменении BPM/свинга «на лету», пока секвенсор уже играет.
  updateTiming(): void {
    const seq = this.getSequence()
    this.scheduler?.setBpm(seq.bpm)
    this.scheduler?.setSwing(seq.swing)
  }

  private handleStep(stepIndex: number, time: number, onStepVisual?: (step: number) => void): void {
    const seq = this.getSequence()
    const stepDuration = 60 / seq.bpm / 4
    const delayMs = Math.max(0, (time - this.ctx.currentTime) * 1000)

    for (const note of seq.notes) {
      if (note.step !== stepIndex) {
        continue
      }
      const durationMs = note.length * stepDuration * 1000
      setTimeout(() => this.noteOn(note.note, note.velocity), delayMs)
      setTimeout(() => this.noteOff(note.note), delayMs + durationMs)
    }
    if (onStepVisual) {
      setTimeout(() => onStepVisual(stepIndex), delayMs)
    }
  }
}
