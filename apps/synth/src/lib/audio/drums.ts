// Синтез перкуссии в стиле 808/909 — 16 пэдов, каждый удар собирается «на лету» из
// осцилляторов и шума (без сэмплов). Velocity-sensitive: громче удар → громче и чуть ярче звук.

import type { DrumPadSynth } from '../patch/schema'
import { midiToFreq } from './midi'

// Классические соотношения частот для 909-стиля хай-хэта (6 негармоничных square-осцилляторов)
const HAT_RATIOS = [2, 3, 4.16, 5.43, 6.79, 8.21]

function velocityScale(velocity: number): number {
  return 0.4 + 0.6 * Math.max(0, Math.min(1, velocity))
}

function createNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1
  }
  return buffer
}

// Кик/том: синус с быстрым питч-свипом сверху вниз («удар молоточка») + амп-огибающая.
// tone управляет силой свипа — больше tone = более щёлкающая, «клик»-атака (характерно для 808).
function triggerKickOrTom(ctx: AudioContext, dest: AudioNode, synth: DrumPadSynth, velocity: number): void {
  const now = ctx.currentTime
  const baseFreq = midiToFreq(synth.pitch)
  const sweepMult = 1 + synth.tone * 4

  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(baseFreq * (1 + sweepMult), now)
  osc.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.04)

  const gain = ctx.createGain()
  const peak = Math.max(0.0001, synth.level * velocityScale(velocity))
  gain.gain.setValueAtTime(peak, now)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(0.02, synth.decay))

  osc.connect(gain)
  gain.connect(dest)
  osc.start(now)
  osc.stop(now + synth.decay + 0.05)
}

// Малый барабан: тональное тело (2 расстроенных треугольника) + шумовой «треск» (band-pass шум).
// tone смешивает тело и шум — 0 = глухой тональный удар, 1 = почти один треск.
function triggerSnare(
  ctx: AudioContext,
  dest: AudioNode,
  noiseBuffer: AudioBuffer,
  synth: DrumPadSynth,
  velocity: number
): void {
  const now = ctx.currentTime
  const baseFreq = midiToFreq(synth.pitch)
  const vel = velocityScale(velocity)

  const toneGain = ctx.createGain()
  const tonalPeak = Math.max(0.0001, synth.level * (1 - synth.tone) * vel)
  toneGain.gain.setValueAtTime(tonalPeak, now)
  toneGain.gain.exponentialRampToValueAtTime(0.0001, now + Math.min(synth.decay, 0.15))
  toneGain.connect(dest)

  for (const mult of [1, 1.5]) {
    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = baseFreq * mult
    osc.connect(toneGain)
    osc.start(now)
    osc.stop(now + 0.2)
  }

  const noiseSrc = ctx.createBufferSource()
  noiseSrc.buffer = noiseBuffer
  const bandpass = ctx.createBiquadFilter()
  bandpass.type = 'bandpass'
  bandpass.frequency.value = 1500 + synth.tone * 2500
  bandpass.Q.value = 0.7

  const noiseGain = ctx.createGain()
  const noisePeak = Math.max(0.0001, synth.level * (0.4 + synth.tone * 0.6) * vel)
  noiseGain.gain.setValueAtTime(noisePeak, now)
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(0.02, synth.decay))

  noiseSrc.connect(bandpass)
  bandpass.connect(noiseGain)
  noiseGain.connect(dest)
  noiseSrc.start(now)
  noiseSrc.stop(now + synth.decay + 0.1)
}

// Хай-хэт (закрытый/открытый — разница только в decay патча): 6 square-осцилляторов
// в негармоничных соотношениях (классический 909-приём) → highpass → короткая/длинная огибающая.
function triggerHat(ctx: AudioContext, dest: AudioNode, synth: DrumPadSynth, velocity: number): void {
  const now = ctx.currentTime
  const baseFreq = midiToFreq(synth.pitch) * 0.5
  const stopAt = now + synth.decay + 0.1

  const mix = ctx.createGain()
  mix.gain.value = 0.2 // компенсация суммы 6 осцилляторов
  for (const ratio of HAT_RATIOS) {
    const osc = ctx.createOscillator()
    osc.type = 'square'
    osc.frequency.value = baseFreq * ratio
    osc.connect(mix)
    osc.start(now)
    osc.stop(stopAt)
  }

  const highpass = ctx.createBiquadFilter()
  highpass.type = 'highpass'
  highpass.frequency.value = 4000 + synth.tone * 6000
  mix.connect(highpass)

  const gain = ctx.createGain()
  const peak = Math.max(0.0001, synth.level * velocityScale(velocity))
  gain.gain.setValueAtTime(peak, now)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(0.02, synth.decay))
  highpass.connect(gain)
  gain.connect(dest)
}

// Хлопок: несколько близких шумовых всплесков («флэм») сливаются в один хлопок + хвост.
// tone поднимает центр band-pass фильтра — ярче/резче хлопок.
function triggerClap(
  ctx: AudioContext,
  dest: AudioNode,
  noiseBuffer: AudioBuffer,
  synth: DrumPadSynth,
  velocity: number
): void {
  const now = ctx.currentTime
  const vel = velocityScale(velocity)

  const bandpass = ctx.createBiquadFilter()
  bandpass.type = 'bandpass'
  bandpass.frequency.value = 1000 + synth.tone * 2000
  bandpass.Q.value = 4

  const master = ctx.createGain()
  master.gain.value = Math.max(0.0001, synth.level * vel)
  bandpass.connect(master)
  master.connect(dest)

  const burstOffsets = [0, 0.012, 0.024, 0.036]
  burstOffsets.forEach((offset, i) => {
    const src = ctx.createBufferSource()
    src.buffer = noiseBuffer
    const g = ctx.createGain()
    const start = now + offset
    const isLast = i === burstOffsets.length - 1
    const dur = isLast ? Math.max(0.02, synth.decay) : 0.02

    g.gain.setValueAtTime(0.0001, start)
    g.gain.linearRampToValueAtTime(1, start + 0.002)
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur)

    src.connect(g)
    g.connect(bandpass)
    src.start(start)
    src.stop(start + dur + 0.05)
  })
}

export class DrumEngine {
  private ctx: AudioContext
  private destination: AudioNode
  private noiseBuffer: AudioBuffer

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx
    this.destination = destination
    this.noiseBuffer = createNoiseBuffer(ctx)
  }

  /** Ударяет по пэду (one-shot — не требует note-off) */
  trigger(synth: DrumPadSynth, velocity = 1): void {
    switch (synth.type) {
      case '808kick':
      case 'tom':
        triggerKickOrTom(this.ctx, this.destination, synth, velocity)
        break
      case 'snare':
        triggerSnare(this.ctx, this.destination, this.noiseBuffer, synth, velocity)
        break
      case 'clap':
        triggerClap(this.ctx, this.destination, this.noiseBuffer, synth, velocity)
        break
      case 'hat-closed':
      case 'hat-open':
        triggerHat(this.ctx, this.destination, synth, velocity)
        break
    }
  }

  // Ударные — one-shot голоса, сами останавливаются через AudioScheduledSourceNode.stop(); хранить нечего.
  // Метод оставлен для единообразия с SubtractiveEngine/FmEngine (студия дергает dispose() на всех движках при размонтировании).
  dispose(): void {
    // no-op
  }
}
