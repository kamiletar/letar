import type { SubtractiveEngineParams } from '../patch/schema'
import { cutoffNormToFreq, midiToFreq } from './midi'

// Максимальная амплитуда LFO/env по cutoff в Гц
const CUTOFF_SWEEP_HZ = 4000
// Максимальная амплитуда LFO по высоте в центах
const PITCH_SWEEP_CENTS = 50

interface Voice {
  osc1: OscillatorNode
  osc2: OscillatorNode
  gainOsc1: GainNode
  gainOsc2: GainNode
  filter: BiquadFilterNode
  gainAmp: GainNode
  lfo: OscillatorNode
  gainLfo: GainNode
  midiNote: number
  startedAt: number
  isReleasing: boolean
}

function startVoice(
  ctx: BaseAudioContext,
  dest: AudioNode,
  patch: SubtractiveEngineParams,
  midiNote: number,
  velocity: number
): Voice {
  const now = ctx.currentTime
  const freq = midiToFreq(midiNote)

  // — Осцилляторы —
  const osc1 = ctx.createOscillator()
  const osc2 = ctx.createOscillator()
  osc1.type = patch.osc1.wave
  osc2.type = patch.osc2.wave
  osc1.frequency.value = freq * Math.pow(2, patch.osc1.octave)
  osc2.frequency.value = freq * Math.pow(2, patch.osc2.octave)
  osc1.detune.value = patch.osc1.detune
  osc2.detune.value = patch.osc2.detune

  const gainOsc1 = ctx.createGain()
  const gainOsc2 = ctx.createGain()
  gainOsc1.gain.value = patch.osc1.gain
  gainOsc2.gain.value = patch.osc2.gain

  // — Фильтр —
  const filter = ctx.createBiquadFilter()
  filter.type = patch.filter.type
  // Q: 0.99 → 28.5; нет самовозбуждения по умолчанию
  filter.Q.value = patch.filter.resonance * 28.5

  const baseFreq = cutoffNormToFreq(patch.filter.cutoff)
  const { attack: fa, decay: fd, sustain: fs } = patch.filter.adsr
  const envPeak = Math.max(20, baseFreq + patch.filter.envAmount * CUTOFF_SWEEP_HZ)
  const envSustain = Math.max(20, baseFreq + patch.filter.envAmount * fs * CUTOFF_SWEEP_HZ)

  filter.frequency.setValueAtTime(baseFreq, now)
  if (Math.abs(patch.filter.envAmount) > 0.01) {
    filter.frequency.linearRampToValueAtTime(envPeak, now + fa)
    filter.frequency.setTargetAtTime(envSustain, now + fa, fd / 3)
  }

  // — Amp-огибающая —
  const velScale = 0.3 + 0.7 * velocity // velocity 0–1 → масштаб 0.3–1.0
  const gainAmp = ctx.createGain()
  gainAmp.gain.value = 0
  const { attack: aa, decay: ad, sustain: as_, release: _ar } = patch.amp.adsr
  const peak = patch.amp.gain * velScale

  gainAmp.gain.setValueAtTime(0, now)
  gainAmp.gain.linearRampToValueAtTime(peak, now + aa)
  gainAmp.gain.setTargetAtTime(peak * as_, now + aa, ad / 3)

  // — LFO —
  const lfo = ctx.createOscillator()
  lfo.type = patch.lfo.wave
  lfo.frequency.value = patch.lfo.rate
  const gainLfo = ctx.createGain()

  if (patch.lfo.target === 'cutoff') {
    gainLfo.gain.value = patch.lfo.depth * CUTOFF_SWEEP_HZ
    lfo.connect(gainLfo)
    gainLfo.connect(filter.frequency) // аддитивно поверх огибающей
  } else if (patch.lfo.target === 'pitch') {
    gainLfo.gain.value = patch.lfo.depth * PITCH_SWEEP_CENTS
    lfo.connect(gainLfo)
    gainLfo.connect(osc1.detune)
    gainLfo.connect(osc2.detune)
  } else if (patch.lfo.target === 'amp') {
    gainLfo.gain.value = patch.lfo.depth * peak * 0.4
    lfo.connect(gainLfo)
    gainLfo.connect(gainAmp.gain)
  }

  // — Граф сигнала —
  osc1.connect(gainOsc1)
  osc2.connect(gainOsc2)
  gainOsc1.connect(filter)
  gainOsc2.connect(filter)
  filter.connect(gainAmp)
  gainAmp.connect(dest)

  osc1.start(now)
  osc2.start(now)
  lfo.start(now)

  return { osc1, osc2, gainOsc1, gainOsc2, filter, gainAmp, lfo, gainLfo, midiNote, startedAt: now, isReleasing: false }
}

function triggerRelease(ctx: BaseAudioContext, voice: Voice, releaseTime: number): void {
  const now = ctx.currentTime
  const curGain = voice.gainAmp.gain.value

  voice.gainAmp.gain.cancelScheduledValues(now)
  voice.gainAmp.gain.setValueAtTime(Math.max(0.0001, curGain), now)
  voice.gainAmp.gain.linearRampToValueAtTime(0.0001, now + releaseTime)
  voice.isReleasing = true

  const stopAt = now + releaseTime + 0.05
  try {
    voice.osc1.stop(stopAt)
    voice.osc2.stop(stopAt)
    voice.lfo.stop(stopAt)
  } catch {
    // уже остановлен
  }
}

function killVoice(voice: Voice): void {
  try {
    voice.osc1.stop()
    voice.osc2.stop()
    voice.lfo.stop()
  } catch {
    // уже остановлен
  }
  try {
    voice.gainAmp.disconnect()
  } catch {
    // уже отключён
  }
}

const MAX_VOICES = 8

export class SubtractiveEngine {
  private voices = new Map<number, Voice>() // midiNote → Voice
  private ageQueue: number[] = [] // очередь для voice stealing (старший = первый)
  private ctx: BaseAudioContext
  private destination: AudioNode

  constructor(ctx: BaseAudioContext, destination: AudioNode) {
    this.ctx = ctx
    this.destination = destination
  }

  noteOn(midiNote: number, patch: SubtractiveEngineParams, velocity = 1): void {
    // Переиграть ту же ноту — быстро завершить старый голос
    if (this.voices.has(midiNote)) {
      this.noteOff(midiNote, patch.amp.adsr.release * 0.1)
    }

    // Voice stealing: убрать самый старый голос если нет слота
    if (this.voices.size >= MAX_VOICES) {
      const oldest = this.ageQueue.shift()
      if (oldest !== undefined) {
        const v = this.voices.get(oldest)
        if (v) {
          killVoice(v)
        }
        this.voices.delete(oldest)
      }
    }

    const voice = startVoice(this.ctx, this.destination, patch, midiNote, velocity)
    this.voices.set(midiNote, voice)
    this.ageQueue.push(midiNote)
  }

  noteOff(midiNote: number, releaseTime: number): void {
    const voice = this.voices.get(midiNote)
    if (!voice || voice.isReleasing) {
      return
    }

    triggerRelease(this.ctx, voice, releaseTime)
    this.ageQueue = this.ageQueue.filter((n) => n !== midiNote)

    // Чистим карту после затухания
    const cleanupMs = (releaseTime + 0.2) * 1000
    setTimeout(() => this.voices.delete(midiNote), cleanupMs)
  }

  allNotesOff(releaseTime: number): void {
    for (const [note] of this.voices) {
      this.noteOff(note, releaseTime)
    }
  }

  dispose(): void {
    for (const [, voice] of this.voices) {
      killVoice(voice)
    }
    this.voices.clear()
    this.ageQueue = []
  }
}
