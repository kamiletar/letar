/**
 * `hydra-synth` не публикует типы — минимальный ambient-контракт под фактически используемую
 * поверхность API. Важно: с `detectAudio: false` (наш случай) конструктор НЕ вызывает
 * `_initAudio()` внутри пакета — значит `synth.a` не создаётся и не запрашивает доступ к
 * микрофону через `getUserMedia`; собственный источник FFT (`window.a`) подставляем вручную,
 * см. `hydra-visualizer.tsx`.
 */
declare module 'hydra-synth' {
  export interface HydraOptions {
    canvas?: HTMLCanvasElement
    width?: number
    height?: number
    numSources?: number
    numOutputs?: number
    makeGlobal?: boolean
    autoLoop?: boolean
    detectAudio?: boolean
    precision?: 'highp' | 'mediump' | 'lowp'
  }

  export default class HydraRenderer {
    constructor(options?: HydraOptions)
    /** dt в миллисекундах — вызывается вручную при `autoLoop: false` */
    tick(dt: number): void
    /** Код визуализации, набранный пользователем — исполняется через `globalThis.eval`
     * внутри самого пакета, без внутреннего try/catch (оборачивать снаружи) */
    eval(code: string): void
    synth: {
      setResolution(width: number, height: number): void
      [key: string]: unknown
    }
  }
}
