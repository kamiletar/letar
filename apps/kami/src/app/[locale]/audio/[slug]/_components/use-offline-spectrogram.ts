'use client'

import { useEffect, useState } from 'react'

interface OfflineSpectrogramState {
  /** Столбцы спектра (75% полезных частотных bin'ов на каждый) для всего трека, или null пока не готово */
  columns: Uint8Array[] | null
  isLoading: boolean
}

/** Количество столбцов статичной сонограммы — не зависит от ширины canvas, растягивается при отрисовке */
const COLUMN_COUNT = 300
const FFT_SIZE = 2048
/** Та же доля спектра, что и в живом рендере AudioSpectrogram — верхний шум отбрасывается */
const USABLE_BINS_RATIO = 0.75

/**
 * Офлайн-анализ спектра всего трека: рендерит файл через `OfflineAudioContext`,
 * планирует `suspend()` на COLUMN_COUNT равномерных точках по длительности и на
 * каждой паузе снимает срез частот `AnalyserNode` — получается статичная
 * сонограмма всего трека ещё до старта воспроизведения (без реального проигрывания).
 */
export function useOfflineSpectrogram(audioUrl: string): OfflineSpectrogramState {
  const [columns, setColumns] = useState<Uint8Array[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function analyze() {
      setColumns(null)
      setIsLoading(true)

      try {
        const response = await fetch(audioUrl)
        const arrayBuffer = await response.arrayBuffer()
        const decodeContext = new AudioContext()
        const audioBuffer = await decodeContext.decodeAudioData(arrayBuffer)
        await decodeContext.close()

        if (cancelled) {
          return
        }

        const offlineCtx = new OfflineAudioContext(1, audioBuffer.length, audioBuffer.sampleRate)
        const source = offlineCtx.createBufferSource()
        source.buffer = audioBuffer
        const analyser = offlineCtx.createAnalyser()
        analyser.fftSize = FFT_SIZE
        analyser.smoothingTimeConstant = 0
        source.connect(analyser)
        analyser.connect(offlineCtx.destination)
        source.start()

        const usableBins = Math.floor(analyser.frequencyBinCount * USABLE_BINS_RATIO)
        const interval = audioBuffer.duration / COLUMN_COUNT
        const result: Uint8Array[] = []

        const renderPromise = offlineCtx.startRendering()

        for (let i = 1; i <= COLUMN_COUNT; i++) {
          const t = i * interval
          if (t >= audioBuffer.duration) {
            break
          }
          await offlineCtx.suspend(t)
          if (!cancelled) {
            const full = new Uint8Array(analyser.frequencyBinCount)
            analyser.getByteFrequencyData(full)
            result.push(full.slice(0, usableBins))
          }
          offlineCtx.resume()
          if (cancelled) {
            break
          }
        }

        await renderPromise

        if (!cancelled) {
          setColumns(result)
          setIsLoading(false)
        }
      } catch {
        // Файл недоступен для CORS-fetch, OfflineAudioContext не поддержан и т.п. — молча
        // деградируем, сонограмма остаётся рабочей в live-режиме после старта воспроизведения
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    analyze()

    return () => {
      cancelled = true
    }
  }, [audioUrl])

  return { columns, isLoading }
}
