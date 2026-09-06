/**
 * `butterchurn`/`butterchurn-presets` не публикуют типы (ни `.d.ts` в пакете, ни в
 * `@types/*`) — минимальный ambient-контракт под фактически используемую поверхность API.
 */
declare module 'butterchurn' {
  export interface ButterchurnVisualizerOptions {
    width?: number
    height?: number
    pixelRatio?: number
    textureRatio?: number
  }

  export interface ButterchurnVisualizerInstance {
    connectAudio(audioNode: AudioNode): void
    disconnectAudio(audioNode: AudioNode): void
    loadPreset(preset: unknown, blendTime?: number): void
    setRendererSize(width: number, height: number): void
    render(): void
  }

  const butterchurn: {
    createVisualizer(
      audioContext: AudioContext,
      canvas: HTMLCanvasElement,
      options?: ButterchurnVisualizerOptions,
    ): ButterchurnVisualizerInstance
    isSupported(): boolean
  }

  export default butterchurn
}

declare module 'butterchurn-presets' {
  const presets: {
    getPresets(): Record<string, unknown>
  }
  export default presets
}
