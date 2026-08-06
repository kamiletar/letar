// Арпеджиатор: раскладывает зажатые ноты (аккорд на клавиатуре/MIDI) в бегущую последовательность.
// Использует тот же StepSequencer, что и драм-/пиано-ролл-секвенсоры, как аудио-часы. Триггерит
// ноты через переданные noteOn/noteOff — те же функции, что и обычная игра, поэтому сгенерированные
// арпеджио-ноты звучат тем же движком/патчем и подсвечиваются на клавиатуре, как обычные.

import type { ArpeggiatorParams, ArpMode } from '../patch/schema'
import { StepSequencer } from './sequencer'

export type NoteOnFn = (note: number, velocity: number) => void
export type NoteOffFn = (note: number) => void

// Строит порядок обхода зажатых нот на N октав вверх для режимов up/down/up-down.
// Экспортирована отдельно от класса — чистая функция, тестируется без Web Audio.
export function buildArpOrder(heldNotes: number[], mode: Exclude<ArpMode, 'random'>, octaves: number): number[] {
  if (heldNotes.length === 0) {
    return []
  }
  const sorted = [...heldNotes].sort((a, b) => a - b)
  const spread: number[] = []
  for (let oct = 0; oct < octaves; oct++) {
    for (const note of sorted) {
      spread.push(note + oct * 12)
    }
  }
  if (mode === 'up') {
    return spread
  }
  if (mode === 'down') {
    return [...spread].reverse()
  }
  // up-down: вверх, потом вниз без повтора крайних нот (иначе на стыке слышен «спотык»)
  const down = [...spread].reverse().slice(1, -1)
  return [...spread, ...down]
}

export class Arpeggiator {
  private readonly ctx: BaseAudioContext
  private readonly noteOn: NoteOnFn
  private readonly noteOff: NoteOffFn
  private readonly getParams: () => ArpeggiatorParams
  private scheduler: StepSequencer | null = null
  private heldNotes: number[] = []
  private cursor = 0
  private lastSoundingNote: number | null = null

  constructor(ctx: BaseAudioContext, noteOn: NoteOnFn, noteOff: NoteOffFn, getParams: () => ArpeggiatorParams) {
    this.ctx = ctx
    this.noteOn = noteOn
    this.noteOff = noteOff
    this.getParams = getParams
  }

  get isRunning(): boolean {
    return this.scheduler?.isRunning ?? false
  }

  // Нота зажата (клавиатура/MIDI note-on) — добавляется в аккорд, запускает арпеджио при первой ноте.
  noteHeld(note: number): void {
    if (!this.heldNotes.includes(note)) {
      this.heldNotes.push(note)
    }
    if (!this.scheduler) {
      this.cursor = 0
      const params = this.getParams()
      this.scheduler = new StepSequencer(this.ctx, (stepIndex, time) => this.handleStep(stepIndex, time))
      this.scheduler.setBpm(params.bpm)
      this.scheduler.start()
    }
  }

  // Нота отпущена — убирается из аккорда; когда отпущены все, арпеджио останавливается.
  noteReleased(note: number): void {
    this.heldNotes = this.heldNotes.filter((n) => n !== note)
    if (this.heldNotes.length === 0) {
      this.stop()
    }
  }

  // BPM арпеджиатора меняется «на лету», пока он уже играет.
  updateTiming(): void {
    this.scheduler?.setBpm(this.getParams().bpm)
  }

  stop(): void {
    this.scheduler?.stop()
    this.scheduler = null
    this.heldNotes = []
    if (this.lastSoundingNote !== null) {
      this.noteOff(this.lastSoundingNote)
      this.lastSoundingNote = null
    }
  }

  private handleStep(stepIndex: number, time: number): void {
    const params = this.getParams()
    if (stepIndex % params.stepsPerNote !== 0 || this.heldNotes.length === 0) {
      return
    }

    const order = buildArpOrder(this.heldNotes, params.mode === 'random' ? 'up' : params.mode, params.octaves)
    const note = params.mode === 'random'
      ? order[Math.floor(Math.random() * order.length)]
      : order[this.cursor % order.length]
    this.cursor++

    const stepDuration = 60 / params.bpm / 4
    const noteDurationMs = stepDuration * params.stepsPerNote * params.gate * 1000
    const delayMs = Math.max(0, (time - this.ctx.currentTime) * 1000)

    // Обрываем предыдущую звучащую ноту раньше атаки следующей — иначе на legato-гейте (100%)
    // ноты накладываются, а движок (по midiNote-ключу голосов) просто перезапустит ту же ноту.
    if (this.lastSoundingNote !== null) {
      const toRelease = this.lastSoundingNote
      setTimeout(() => this.noteOff(toRelease), delayMs)
    }
    setTimeout(() => this.noteOn(note, 0.85), delayMs)
    this.lastSoundingNote = note
    setTimeout(() => {
      if (this.lastSoundingNote === note) {
        this.noteOff(note)
        this.lastSoundingNote = null
      }
    }, delayMs + noteDurationMs)
  }
}
