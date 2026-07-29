// Вокальный тракт (Фаза 5): микрофон → компрессор/лимитер → 3-полосный EQ → де-эссер →
// send'ы на reverb/delay + мониторный выход в наушники. Собирается один раз при подключении
// микрофона, живёт весь сеанс репетиции/записи — параметры двигаются вживую через AudioParam,
// без пересборки графа (тот же принцип, что у useMasterBus).

export interface VoiceChainParams {
  inputGain: number // линейный трим входа, 0..2
  compressor: {
    threshold: number // dB, -60..0 — выравнивает громкость: тише порога не трогает, громче — придавливает
    ratio: number // 1..20
    attack: number // сек, 0..1
    release: number // сек, 0..1
  }
  eq: {
    lowGain: number // dB, -15..15 — low-shelf ~120Гц
    midGain: number // dB — peaking ~1000Гц
    highGain: number // dB — high-shelf ~6000Гц
  }
  deEsser: {
    enabled: boolean
    threshold: number // dB, -60..0 — с какой громкости шипения начинает придавливать
  }
  reverbSend: number // 0..1 — сколько голоса уходит в общую комнату мастер-шины
  delaySend: number // 0..1
  monitorGain: number // 0..1.5 — громкость в наушниках/колонках (репетиция)
}

export const DEFAULT_VOICE_CHAIN_PARAMS: VoiceChainParams = {
  inputGain: 1,
  compressor: { threshold: -24, ratio: 4, attack: 0.005, release: 0.15 },
  eq: { lowGain: 0, midGain: 0, highGain: 0 },
  deEsser: { enabled: true, threshold: -30 },
  reverbSend: 0.15,
  delaySend: 0,
  monitorGain: 1,
}

// Частота раздела де-эссера: ниже — «тело» голоса нетронуто, выше — свистящие «с/ш» под компрессией.
const DE_ESSER_SPLIT_HZ = 5500
const DELAY_TIME_SEC = 0.28
const DELAY_FEEDBACK = 0.32

export interface VoiceChainNodes {
  input: GainNode // сюда подключается MediaStreamAudioSourceNode микрофона
  compressor: DynamicsCompressorNode
  deEsserComp: DynamicsCompressorNode
  lowShelf: BiquadFilterNode
  midPeak: BiquadFilterNode
  highShelf: BiquadFilterNode
  output: GainNode // сухой пост-EQ сигнал — источник для мониторинга/reverb-send/записи
  monitorGain: GainNode // → ctx.destination (репетиция — слышно то же, что будет на сцене)
  reverbSendGain: GainNode // подключить снаружи к convolver мастер-шины
  delaySendGain: GainNode
  delayOut: GainNode // эхо тоже подмешивается в монитор
  levelAnalyser: AnalyserNode // для индикатора уровня (пик/RMS)
}

/**
 * Собирает граф вокального тракта. Роутинг:
 * input → deEsser(band-split) → compressor → EQ(low/mid/high) → output
 *   output → monitorGain → destination
 *   output → levelAnalyser (tap, для индикатора)
 *   output → reverbSendGain (снаружи подключить к convolver мастер-шины)
 *   output → delaySendGain → delay → feedback-петля → delayOut → monitorGain
 */
export function buildVoiceChain(ctx: AudioContext, params: VoiceChainParams): VoiceChainNodes {
  const input = ctx.createGain()
  input.gain.value = params.inputGain

  // Срез низкочастотного гула (дыхание/сцена/стойка микрофона) — фиксированный, не выведен в UI
  const rumbleFilter = ctx.createBiquadFilter()
  rumbleFilter.type = 'highpass'
  rumbleFilter.frequency.value = 80

  // Де-эссер: делим сигнал на «тело» (проходит нетронутым) и «шипение» (жмём компрессором),
  // затем складываем обратно. Настоящий sidechain-EQ Web Audio не даёт сделать проще без
  // AudioWorklet — этот band-split приём достаточно честно ловит «с/ш» без лишней сложности.
  const deEsserLow = ctx.createBiquadFilter()
  deEsserLow.type = 'lowpass'
  deEsserLow.frequency.value = DE_ESSER_SPLIT_HZ
  const deEsserHigh = ctx.createBiquadFilter()
  deEsserHigh.type = 'highpass'
  deEsserHigh.frequency.value = DE_ESSER_SPLIT_HZ
  const deEsserComp = ctx.createDynamicsCompressor()
  deEsserComp.threshold.value = params.deEsser.enabled ? params.deEsser.threshold : 0
  deEsserComp.ratio.value = 14
  deEsserComp.attack.value = 0.001
  deEsserComp.release.value = 0.06
  deEsserComp.knee.value = 6
  const deEsserSum = ctx.createGain()

  const compressor = ctx.createDynamicsCompressor()
  compressor.threshold.value = params.compressor.threshold
  compressor.ratio.value = params.compressor.ratio
  compressor.attack.value = params.compressor.attack
  compressor.release.value = params.compressor.release
  compressor.knee.value = 12

  const lowShelf = ctx.createBiquadFilter()
  lowShelf.type = 'lowshelf'
  lowShelf.frequency.value = 120
  lowShelf.gain.value = params.eq.lowGain

  const midPeak = ctx.createBiquadFilter()
  midPeak.type = 'peaking'
  midPeak.frequency.value = 1000
  midPeak.Q.value = 0.8
  midPeak.gain.value = params.eq.midGain

  const highShelf = ctx.createBiquadFilter()
  highShelf.type = 'highshelf'
  highShelf.frequency.value = 6000
  highShelf.gain.value = params.eq.highGain

  const output = ctx.createGain()

  const levelAnalyser = ctx.createAnalyser()
  levelAnalyser.fftSize = 1024
  levelAnalyser.smoothingTimeConstant = 0

  const monitorGain = ctx.createGain()
  monitorGain.gain.value = params.monitorGain

  const reverbSendGain = ctx.createGain()
  reverbSendGain.gain.value = params.reverbSend

  const delaySendGain = ctx.createGain()
  delaySendGain.gain.value = params.delaySend
  const delay = ctx.createDelay(1)
  delay.delayTime.value = DELAY_TIME_SEC
  const delayFeedback = ctx.createGain()
  delayFeedback.gain.value = DELAY_FEEDBACK
  const delayOut = ctx.createGain()

  // Роутинг
  input.connect(rumbleFilter)
  rumbleFilter.connect(deEsserLow)
  rumbleFilter.connect(deEsserHigh)
  deEsserHigh.connect(deEsserComp)
  deEsserLow.connect(deEsserSum)
  deEsserComp.connect(deEsserSum)
  deEsserSum.connect(compressor)
  compressor.connect(lowShelf)
  lowShelf.connect(midPeak)
  midPeak.connect(highShelf)
  highShelf.connect(output)

  output.connect(monitorGain)
  monitorGain.connect(ctx.destination)
  output.connect(levelAnalyser)

  output.connect(reverbSendGain)

  output.connect(delaySendGain)
  delaySendGain.connect(delay)
  delay.connect(delayFeedback)
  delayFeedback.connect(delay)
  delay.connect(delayOut)
  delayOut.connect(monitorGain)

  return {
    input,
    compressor,
    deEsserComp,
    lowShelf,
    midPeak,
    highShelf,
    output,
    monitorGain,
    reverbSendGain,
    delaySendGain,
    delayOut,
    levelAnalyser,
  }
}

/** Применяет живое изменение параметров к уже собранному графу — без пересоздания узлов. */
export function applyVoiceChainParams(nodes: VoiceChainNodes, params: VoiceChainParams): void {
  nodes.input.gain.value = params.inputGain
  nodes.compressor.threshold.value = params.compressor.threshold
  nodes.compressor.ratio.value = params.compressor.ratio
  nodes.compressor.attack.value = params.compressor.attack
  nodes.compressor.release.value = params.compressor.release
  nodes.deEsserComp.threshold.value = params.deEsser.enabled ? params.deEsser.threshold : 0
  nodes.lowShelf.gain.value = params.eq.lowGain
  nodes.midPeak.gain.value = params.eq.midGain
  nodes.highShelf.gain.value = params.eq.highGain
  nodes.reverbSendGain.gain.value = params.reverbSend
  nodes.delaySendGain.gain.value = params.delaySend
  nodes.monitorGain.gain.value = params.monitorGain
}
