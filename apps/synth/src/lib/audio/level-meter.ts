// Индикатор уровня (пик/RMS) для вокального тракта — репетиция должна показывать, не «зашкаливает
// ли» голос, прежде чем ты вышел бы на сцену.

export interface LevelReading {
  peak: number // 0..1 — пиковое значение за кадр
  rms: number // 0..1 — среднеквадратичное («ощущаемая» громкость)
  clipping: boolean // пик почти в 0dBFS — сигнал перегружен
}

// Переиспользуемый буфер — не аллоцировать Float32Array каждый кадр rAF-цикла.
export function createLevelReader(analyser: AnalyserNode) {
  const data = new Float32Array(analyser.fftSize)

  return function readLevel(): LevelReading {
    analyser.getFloatTimeDomainData(data)

    let peak = 0
    let sumSquares = 0
    for (let i = 0; i < data.length; i++) {
      const v = Math.abs(data[i] ?? 0)
      if (v > peak) {
        peak = v
      }
      sumSquares += (data[i] ?? 0) ** 2
    }
    const rms = Math.sqrt(sumSquares / data.length)

    return { peak: Math.min(1, peak), rms: Math.min(1, rms), clipping: peak > 0.98 }
  }
}
