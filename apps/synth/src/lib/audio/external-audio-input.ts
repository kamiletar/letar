import { type AudioInputDevice, listAudioInputDevices } from './hardware-recorder'
import { buildMusicalAudioConstraints } from './media-constraints'

export { listAudioInputDevices }
export type { AudioInputDevice }

/**
 * VJ на вечеринке/фаершоу может реагировать не только на звук самой студии, но и на внешнюю
 * музыку (другой диджей/колонка) через микрофон/линейный вход. В отличие от `HardwareRecorder`
 * (пишет на диск), здесь источник только «прослушивается» анализатором — ничего не пишется и
 * не подключается к `ctx.destination` (иначе был бы слышимый мониторинг чужого звука через наши
 * колонки поверх оригинала — акустическая обратная связь).
 */
export class ExternalAudioInput {
  private stream: MediaStream | null = null
  private source: MediaStreamAudioSourceNode | null = null
  readonly analyser: AnalyserNode

  constructor(private ctx: AudioContext) {
    this.analyser = ctx.createAnalyser()
    this.analyser.fftSize = 1024
    this.analyser.smoothingTimeConstant = 0.75
  }

  async start(deviceId: string): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: buildMusicalAudioConstraints(deviceId),
    })
    this.source = this.ctx.createMediaStreamSource(this.stream)
    this.source.connect(this.analyser)
  }

  stop(): void {
    this.source?.disconnect()
    this.source = null
    this.stream?.getTracks().forEach((track) => track.stop())
    this.stream = null
  }
}
