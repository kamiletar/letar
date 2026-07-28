import type { FmEngineParams } from '@/lib/patch/schema'

// Обёртка над AudioWorkletNode для FM-движка.
// create() — регистрирует воркслет и возвращает готовый движок.
export class FmEngine {
  private readonly node: AudioWorkletNode
  private readonly gainNode: GainNode

  static async create(ctx: BaseAudioContext, destination: AudioNode): Promise<FmEngine> {
    await ctx.audioWorklet.addModule('/worklets/fm-processor.js')
    return new FmEngine(ctx, destination)
  }

  private constructor(ctx: BaseAudioContext, destination: AudioNode) {
    // FM-полифония суммируется громко — нормализуем через gain
    this.gainNode = ctx.createGain()
    this.gainNode.gain.value = 0.4
    this.gainNode.connect(destination)

    this.node = new AudioWorkletNode(ctx, 'fm-processor', {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [2],
    })
    this.node.connect(this.gainNode)
  }

  updatePatch(patch: FmEngineParams): void {
    this.node.port.postMessage({ type: 'patch', patch })
  }

  noteOn(midiNote: number, velocity: number): void {
    this.node.port.postMessage({ type: 'noteOn', note: midiNote, vel: velocity })
  }

  noteOff(midiNote: number): void {
    this.node.port.postMessage({ type: 'noteOff', note: midiNote })
  }

  allNotesOff(): void {
    this.node.port.postMessage({ type: 'allOff' })
  }

  dispose(): void {
    this.node.port.postMessage({ type: 'allOff' })
    this.node.disconnect()
    this.gainNode.disconnect()
  }
}
