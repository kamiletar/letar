'use client'

/**
 * Хук для анализа аудио через Web Audio API.
 * Использует энергетический алгоритм для детекции битов.
 * Поддерживает как HTML Audio элемент, так и микрофон.
 */

import {
  type AudioAnalyzerData,
  BASS_HISTORY_SIZE,
  computeAverage,
  computeEnergyJumpIntensity,
  computeFrequencyBins,
  DEFAULT_ANALYZER_OPTIONS,
  detectBeat,
  type FrequencyBins,
  INITIAL_ANALYZER_DATA,
} from '@/lib/audio-utils'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { AudioSource } from '../_schemas/viewer-settings.schema'

// Реэкспорт типа для обратной совместимости
export type { AudioAnalyzerData }

// =============================================================================
// Типы
// =============================================================================

/**
 * Параметры анализатора.
 */
interface UseAudioAnalyzerOptions {
  /** Размер FFT (степень 2, 32-2048). Больше = точнее, но медленнее */
  fftSize?: number
  /** Сглаживание временного усреднения (0-1) */
  smoothingTimeConstant?: number
  /** Множитель порога для энергетического beat detection (1.0-2.0) */
  energyThresholdMultiplier?: number
  /** Минимальный абсолютный уровень баса для детекции бита (0-1) */
  minBassLevel?: number
  /** Минимальный интервал между битами в мс */
  beatCooldown?: number
}

// =============================================================================
// Хук
// =============================================================================

/**
 * Хук для анализа аудио через Web Audio API.
 *
 * @param audioElement - HTML Audio элемент для анализа (игнорируется при audioSource='microphone')
 * @param enabled - Включён ли анализатор
 * @param audioSource - Источник аудио: 'player' или 'microphone'
 * @param options - Параметры анализатора
 */
export function useAudioAnalyzer(
  audioElement: HTMLAudioElement | null,
  enabled: boolean,
  audioSource: AudioSource = 'player',
  options: UseAudioAnalyzerOptions = {}
): AudioAnalyzerData {
  const {
    fftSize = DEFAULT_ANALYZER_OPTIONS.fftSize,
    smoothingTimeConstant = DEFAULT_ANALYZER_OPTIONS.smoothingTimeConstant,
    energyThresholdMultiplier = DEFAULT_ANALYZER_OPTIONS.energyThresholdMultiplier,
    minBassLevel = DEFAULT_ANALYZER_OPTIONS.minBassLevel,
    beatCooldown = DEFAULT_ANALYZER_OPTIONS.beatCooldown,
  } = options

  const [data, setData] = useState<AudioAnalyzerData>(INITIAL_ANALYZER_DATA)

  // Refs для Web Audio API
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyzerRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | MediaStreamAudioSourceNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lastBeatTimeRef = useRef<number>(0)
  const connectedElementRef = useRef<HTMLAudioElement | null>(null)
  const microphoneStreamRef = useRef<MediaStream | null>(null)
  const currentSourceTypeRef = useRef<AudioSource | null>(null)

  // История баса для энергетического анализа
  const bassHistoryRef = useRef<number[]>([])

  // Кэш для границ частотных диапазонов
  const frequencyBinsRef = useRef<FrequencyBins | null>(null)

  /**
   * Остановить микрофон.
   */
  const stopMicrophone = useCallback(() => {
    if (microphoneStreamRef.current) {
      microphoneStreamRef.current.getTracks().forEach((track) => track.stop())
      microphoneStreamRef.current = null
    }
  }, [])

  /**
   * Инициализация Web Audio API для HTML Audio элемента.
   */
  const initAudioElement = useCallback(() => {
    if (!audioElement || connectedElementRef.current === audioElement) {
      return
    }

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext()
      }

      const ctx = audioContextRef.current

      const analyzer = ctx.createAnalyser()
      analyzer.fftSize = fftSize
      analyzer.smoothingTimeConstant = smoothingTimeConstant
      analyzerRef.current = analyzer

      frequencyBinsRef.current = computeFrequencyBins(ctx.sampleRate, fftSize, analyzer.frequencyBinCount)

      const source = ctx.createMediaElementSource(audioElement)
      source.connect(analyzer)
      analyzer.connect(ctx.destination)
      sourceRef.current = source
      connectedElementRef.current = audioElement
      currentSourceTypeRef.current = 'player'

      bassHistoryRef.current = []
    } catch (error) {
      console.warn('Не удалось инициализировать Web Audio API:', error)
    }
  }, [audioElement, fftSize, smoothingTimeConstant])

  /**
   * Инициализация Web Audio API для микрофона.
   */
  const initMicrophone = useCallback(async () => {
    if (currentSourceTypeRef.current === 'microphone' && microphoneStreamRef.current) {
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      })

      microphoneStreamRef.current = stream

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext()
      }

      const ctx = audioContextRef.current

      const analyzer = ctx.createAnalyser()
      analyzer.fftSize = fftSize
      analyzer.smoothingTimeConstant = smoothingTimeConstant
      analyzerRef.current = analyzer

      frequencyBinsRef.current = computeFrequencyBins(ctx.sampleRate, fftSize, analyzer.frequencyBinCount)

      const source = ctx.createMediaStreamSource(stream)
      source.connect(analyzer)
      sourceRef.current = source
      currentSourceTypeRef.current = 'microphone'
      connectedElementRef.current = null

      bassHistoryRef.current = []

      setData((prev) => ({ ...prev, hasMicrophoneAccess: true, microphoneError: undefined }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка'
      console.warn('Не удалось получить доступ к микрофону:', error)
      setData((prev) => ({ ...prev, hasMicrophoneAccess: false, microphoneError: errorMessage }))
    }
  }, [fftSize, smoothingTimeConstant])

  /**
   * Анализ частот и вычисление данных.
   */
  const analyze = useCallback(() => {
    const analyzer = analyzerRef.current
    const bins = frequencyBinsRef.current
    if (!analyzer || !enabled || !bins) {
      return
    }

    const bufferLength = analyzer.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    analyzer.getByteFrequencyData(dataArray)

    const { bassEnd, midEnd } = bins

    let bassSum = 0
    let midSum = 0
    let highSum = 0
    let totalSum = 0

    for (let i = 0; i < bufferLength; i++) {
      const value = dataArray[i] / 255

      if (i < bassEnd) {
        bassSum += value
      } else if (i < midEnd) {
        midSum += value
      } else {
        highSum += value
      }
      totalSum += value
    }

    const bass = bassEnd > 0 ? bassSum / bassEnd : 0
    const mid = midEnd > bassEnd ? midSum / (midEnd - bassEnd) : 0
    const high = bufferLength > midEnd ? highSum / (bufferLength - midEnd) : 0
    const amplitude = totalSum / bufferLength

    // Обновляем историю баса
    bassHistoryRef.current.push(bass)
    if (bassHistoryRef.current.length > BASS_HISTORY_SIZE) {
      bassHistoryRef.current.shift()
    }

    // Энергетический beat detection
    let beatDetected = false
    let beatIntensity = 0

    if (bassHistoryRef.current.length >= 3) {
      const avgBass = computeAverage(bassHistoryRef.current)
      beatIntensity = computeEnergyJumpIntensity(bass, avgBass, energyThresholdMultiplier)

      beatDetected = detectBeat(
        bass,
        avgBass,
        energyThresholdMultiplier,
        minBassLevel,
        lastBeatTimeRef.current,
        beatCooldown
      )

      if (beatDetected) {
        lastBeatTimeRef.current = performance.now()
      }
    }

    setData({
      amplitude,
      bass,
      mid,
      high,
      beatDetected,
      beatIntensity,
    })

    animationFrameRef.current = requestAnimationFrame(analyze)
  }, [enabled, energyThresholdMultiplier, minBassLevel, beatCooldown])

  /**
   * Запуск/остановка анализа.
   */
  useEffect(() => {
    const startAnalysis = async () => {
      if (!enabled) {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
          animationFrameRef.current = null
        }
        stopMicrophone()
        setData(INITIAL_ANALYZER_DATA)
        bassHistoryRef.current = []
        return
      }

      if (audioSource === 'microphone') {
        if (currentSourceTypeRef.current === 'player') {
          connectedElementRef.current = null
        }
        await initMicrophone()
      } else if (audioElement) {
        if (currentSourceTypeRef.current === 'microphone') {
          stopMicrophone()
        }
        initAudioElement()
      }

      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume()
      }

      if (analyzerRef.current) {
        animationFrameRef.current = requestAnimationFrame(analyze)
      }
    }

    startAnalysis()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [enabled, audioElement, audioSource, initAudioElement, initMicrophone, stopMicrophone, analyze])

  /**
   * Очистка при размонтировании.
   */
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (microphoneStreamRef.current) {
        microphoneStreamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  return data
}
