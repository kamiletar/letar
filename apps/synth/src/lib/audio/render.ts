// Детерминированный офлайн-рендер патча в WAV через OfflineAudioContext.
// В отличие от живой записи (MasterRecorder, MediaRecorder) — без шумов реального времени
// и системного аудиостека: один и тот же патч всегда даёт побитово одинаковый файл.

import type { DrumkitPatch, FmPatch, Patch, SubtractivePatch } from '../patch/schema'
import { getSample } from '../storage/samples-db'
import { DrumEngine } from './drums'
import { FmEngine } from './fm'
import { buildReverbIR } from './reverb'
import { SubtractiveEngine } from './subtractive'

const SAMPLE_RATE = 44100
// C3 — нота, на которой разумно звучит и бас, и колокольчики
const DEMO_NOTE = 48
const HOLD_SECONDS = 2
const TAIL_MARGIN = 0.3

interface MasterBus {
  ctx: OfflineAudioContext
  masterGain: GainNode
}

// Собирает ту же мастер-шину (сухой сигнал + reverb send), что и живая студия (см. studio-client.tsx handleStart),
// но целиком внутри OfflineAudioContext — рендер идёт быстрее реального времени и без вывода на колонки.
async function buildMasterBus(duration: number, reverbDecay: number, reverbWet: number): Promise<MasterBus> {
  const length = Math.ceil(SAMPLE_RATE * duration)
  const ctx = new OfflineAudioContext(2, length, SAMPLE_RATE)

  const masterGain = ctx.createGain()
  const dryGain = ctx.createGain()
  dryGain.gain.value = 1

  const convolver = ctx.createConvolver()
  convolver.buffer = await buildReverbIR(ctx, reverbDecay)

  const reverbWetGain = ctx.createGain()
  reverbWetGain.gain.value = reverbWet

  masterGain.connect(dryGain)
  dryGain.connect(ctx.destination)
  masterGain.connect(convolver)
  convolver.connect(reverbWetGain)
  reverbWetGain.connect(ctx.destination)

  return { ctx, masterGain }
}

// ВАЖНО: suspend() возвращает promise, который разрешается только когда рендер РЕАЛЬНО дойдёт
// до этой точки времени — а рендер запускается только startRendering(). Поэтому suspend() всегда
// планируем ДО startRendering() (без await), а сам startRendering() не ждём, пока не отработают
// все запланированные паузы — иначе получаем дедлок (await суспенда, который никогда не наступит).

async function renderSubtractive(patch: SubtractivePatch): Promise<AudioBuffer> {
  const release = patch.engine.amp.adsr.release
  const duration = HOLD_SECONDS + release + TAIL_MARGIN
  const { ctx, masterGain } = await buildMasterBus(duration, patch.engine.fx.reverb.decay, patch.engine.fx.reverb.wet)
  const engine = new SubtractiveEngine(ctx, masterGain)

  engine.noteOn(DEMO_NOTE, patch.engine, 1)
  const suspended = ctx.suspend(HOLD_SECONDS).then(() => {
    engine.noteOff(DEMO_NOTE, release)
    return ctx.resume()
  })

  const rendered = ctx.startRendering()
  await suspended
  return rendered
}

async function renderFm(patch: FmPatch): Promise<AudioBuffer> {
  const duration = HOLD_SECONDS + 1.5 + TAIL_MARGIN
  const { ctx, masterGain } = await buildMasterBus(duration, 1.5, 0.2)
  const engine = await FmEngine.create(ctx, masterGain)
  engine.updatePatch(patch.engine)
  engine.noteOn(DEMO_NOTE, 1)

  // FM-движок общается с воркслетом через postMessage — сообщения 'patch'/'noteOn' летят в отдельный
  // аудио-поток асинхронно. OfflineAudioContext рендерит «на максимальной скорости», без пауз реального
  // времени, поэтому без явной задержки рендер иногда стартует раньше, чем воркслет успевает получить
  // и применить сообщения — тогда на выходе тишина. Ждём один макротаск, чтобы сообщения точно дошли.
  await new Promise((resolve) => setTimeout(resolve, 50))

  const suspended = ctx.suspend(HOLD_SECONDS).then(() => {
    engine.noteOff(DEMO_NOTE)
    return ctx.resume()
  })

  const rendered = ctx.startRendering()
  await suspended
  return rendered
}

async function renderDrumkit(patch: DrumkitPatch): Promise<AudioBuffer> {
  const pads = patch.engine.pads.filter((p) => p.synth !== null || Boolean(p.sample))
  const stepSeconds = 0.18
  const duration = Math.max(1, pads.length * stepSeconds + 1)
  const { ctx, masterGain } = await buildMasterBus(duration, 1.2, 0.12)
  const engine = new DrumEngine(ctx, masterGain)

  // Сэмплы декодируются заново под контекст рендера (см. комментарий у DrumEngine.decodeAudioData) —
  // офлайн-рендер получает свой AudioBuffer, независимо от того, что уже декодировано в живой студии.
  await Promise.all(
    pads
      .filter((pad) => pad.sample)
      .map(async (pad) => {
        if (!pad.sample) {
          return
        }
        const stored = await getSample(pad.sample.sampleId)
        if (!stored) {
          return
        }
        const buffer = await engine.decodeAudioData(stored.data.slice(0))
        engine.setSampleBuffer(pad.sample.sampleId, buffer)
      }),
  )

  const suspends: Promise<void>[] = []
  for (let i = 0; i < pads.length; i++) {
    const pad = pads[i]
    if (i === 0) {
      engine.trigger(pad, 1)
      continue
    }
    const at = i * stepSeconds
    suspends.push(
      ctx.suspend(at).then(() => {
        engine.trigger(pad, 1)
        return ctx.resume()
      }),
    )
  }

  const rendered = ctx.startRendering()
  await Promise.all(suspends)
  return rendered
}

async function renderPatchToBuffer(patch: Patch): Promise<AudioBuffer> {
  switch (patch.type) {
    case 'subtractive':
      return renderSubtractive(patch)
    case 'fm':
      return renderFm(patch)
    case 'drumkit':
      return renderDrumkit(patch)
  }
}

// Кодирует AudioBuffer в WAV (PCM 16-bit) — без сторонних зависимостей
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const numFrames = buffer.length
  const bytesPerSample = 2
  const blockAlign = numChannels * bytesPerSample
  const dataSize = numFrames * blockAlign
  const bufferSize = 44 + dataSize

  const arrayBuffer = new ArrayBuffer(bufferSize)
  const view = new DataView(arrayBuffer)

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i))
    }
  }

  writeString(0, 'RIFF')
  view.setUint32(4, bufferSize - 8, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bytesPerSample * 8, true)
  writeString(36, 'data')
  view.setUint32(40, dataSize, true)

  const channels: Float32Array[] = []
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(buffer.getChannelData(ch))
  }

  let offset = 44
  for (let i = 0; i < numFrames; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]))
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
      offset += 2
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' })
}

export async function renderPatchToWav(patch: Patch): Promise<Blob> {
  const buffer = await renderPatchToBuffer(patch)
  return audioBufferToWav(buffer)
}
