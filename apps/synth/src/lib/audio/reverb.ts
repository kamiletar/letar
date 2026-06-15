// Генерирует синтетический импульсный отклик (IR) для ConvolverNode.
// Метод: экспоненциально затухающий шум — классический «plate reverb» в браузере.
export async function buildReverbIR(ctx: AudioContext, decay: number): Promise<AudioBuffer> {
  const sampleRate = ctx.sampleRate
  const clampedDecay = Math.max(0.1, Math.min(decay, 8))
  const length = Math.ceil(sampleRate * clampedDecay)
  const offline = new OfflineAudioContext(2, length, sampleRate)

  const source = offline.createBufferSource()
  const irBuf = offline.createBuffer(2, length, sampleRate)

  // Разные левый/правый каналы — даёт стереоширину
  for (let ch = 0; ch < 2; ch++) {
    const data = irBuf.getChannelData(ch)
    const phase = ch === 0 ? 0 : Math.random() * 0.003 * sampleRate // лёгкий сдвиг фазы между каналами
    for (let i = 0; i < length; i++) {
      const t = (i + phase) / length
      // Огибающая: быстрый рост → экспоненциальное затухание
      const envelope = Math.exp(-t * (5 / clampedDecay))
      data[i] = (Math.random() * 2 - 1) * envelope
    }
  }

  source.buffer = irBuf
  source.connect(offline.destination)
  source.start(0)
  return offline.startRendering()
}
