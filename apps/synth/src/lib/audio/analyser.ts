// Анализ мастер-шины для VJ-визуала: FFT-энергия по трём полосам (бас/середина/верх).
// AnalyserNode подключается веткой от masterGain (masterGain.connect(analyser)), сам никуда
// дальше не подключается — это стандартный «tap»-паттерн Web Audio, не влияет на звук.

export interface FreqBands {
  bass: number // 0..1, низкие частоты (~20-250Гц) — «вихри-узлы» графа
  mid: number // 0..1, середина (~250-2000Гц)
  treble: number // 0..1, верха (~2000Гц+) — «искры»/частицы на рёбрах
  overall: number // 0..1, средняя энергия по всему спектру
}

export function createMasterAnalyser(ctx: BaseAudioContext): AnalyserNode {
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 1024
  analyser.smoothingTimeConstant = 0.75
  return analyser
}

// Переиспользуемый буфер — не аллоцировать Uint8Array каждый кадр в рендер-цикле VJ.
export function createBandsReader(analyser: AnalyserNode) {
  const data = new Uint8Array(analyser.frequencyBinCount)

  const bassEnd = Math.max(1, Math.floor(analyser.frequencyBinCount * 0.08))
  const midEnd = Math.max(bassEnd + 1, Math.floor(analyser.frequencyBinCount * 0.35))

  return function readBands(): FreqBands {
    analyser.getByteFrequencyData(data)

    let bassSum = 0
    for (let i = 0; i < bassEnd; i++) {
      bassSum += data[i] ?? 0
    }
    let midSum = 0
    for (let i = bassEnd; i < midEnd; i++) {
      midSum += data[i] ?? 0
    }
    let trebleSum = 0
    for (let i = midEnd; i < data.length; i++) {
      trebleSum += data[i] ?? 0
    }
    let total = 0
    for (let i = 0; i < data.length; i++) {
      total += data[i] ?? 0
    }

    return {
      bass: bassSum / bassEnd / 255,
      mid: midSum / (midEnd - bassEnd) / 255,
      treble: trebleSum / (data.length - midEnd) / 255,
      overall: total / data.length / 255,
    }
  }
}
