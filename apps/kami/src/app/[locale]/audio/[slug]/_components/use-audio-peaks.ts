'use client'

import { useEffect, useState } from 'react'

interface AudioPeaksState {
  /** Массив пиков (амплитуда 0..1) фиксированной длины, или null пока не декодировано */
  peaks: Float32Array | null
  isLoading: boolean
}

/** Количество точек в итоговом массиве пиков — не зависит от ширины canvas, масштабируется при отрисовке */
const PEAKS_RESOLUTION = 400

/**
 * Декодирует аудиофайл через Web Audio API (`decodeAudioData`) и сводит его к
 * массиву пиков фиксированной длины (max амплитуды по чанкам первого канала) —
 * источник данных для waveform на seekbar.
 */
export function useAudioPeaks(audioUrl: string): AudioPeaksState {
  const [peaks, setPeaks] = useState<Float32Array | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function decode() {
      setPeaks(null)
      setIsLoading(true)

      try {
        const response = await fetch(audioUrl)
        const arrayBuffer = await response.arrayBuffer()
        const audioContext = new AudioContext()
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
        await audioContext.close()

        if (cancelled) {
          return
        }

        const channelData = audioBuffer.getChannelData(0)
        const samplesPerPeak = Math.floor(channelData.length / PEAKS_RESOLUTION) || 1
        const result = new Float32Array(PEAKS_RESOLUTION)

        for (let i = 0; i < PEAKS_RESOLUTION; i++) {
          const start = i * samplesPerPeak
          const end = Math.min(start + samplesPerPeak, channelData.length)
          let max = 0
          for (let j = start; j < end; j++) {
            const abs = Math.abs(channelData[j])
            if (abs > max) {
              max = abs
            }
          }
          result[i] = max
        }

        setPeaks(result)
        setIsLoading(false)
      } catch {
        // Файл недоступен для CORS-fetch, decodeAudioData не поддержан и т.п. — молча деградируем,
        // seekbar остаётся рабочим и без waveform
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    decode()

    return () => {
      cancelled = true
    }
  }, [audioUrl])

  return { peaks, isLoading }
}
