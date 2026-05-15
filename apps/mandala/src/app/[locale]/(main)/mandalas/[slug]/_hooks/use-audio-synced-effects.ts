'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { AudioSyncMode } from '../_schemas/viewer-settings.schema'
import type { AudioAnalyzerData } from './use-audio-analyzer'

/**
 * Параметры эффектов, синхронизированных с музыкой
 */
export interface AudioSyncedEffects {
  /** Множитель скорости градиента (1.0 = без изменений) */
  gradientSpeedMultiplier: number
  /** Множитель скорости вращения (1.0 = без изменений) */
  spinSpeedMultiplier: number
  /** Интенсивность пульсации на основе баса (0-1) */
  pulseIntensity: number
  /** Масштаб мандалы при ударе (1.0 = без изменений) */
  beatScale: number
  /** Был ли только что обнаружен бит */
  beatTriggered: boolean
  /** Интенсивность средних частот (0-1) */
  midIntensity: number
  /** Интенсивность высоких частот (0-1) */
  highIntensity: number
  /** Сдвиг цвета на основе спектра (0-1) */
  colorShift: number
}

/**
 * Начальные значения
 */
const DEFAULT_EFFECTS: AudioSyncedEffects = {
  gradientSpeedMultiplier: 1,
  spinSpeedMultiplier: 1,
  pulseIntensity: 0,
  beatScale: 1,
  beatTriggered: false,
  midIntensity: 0,
  highIntensity: 0,
  colorShift: 0,
}

/**
 * Конфигурация режимов синхронизации
 */
interface SyncModeConfig {
  /** Максимальное изменение скорости градиента (±%) */
  gradientVariation: number
  /** Максимальное изменение скорости вращения (±%) */
  spinVariation: number
  /** Максимальная интенсивность пульсации */
  maxPulseIntensity: number
  /** Максимальное увеличение масштаба при бите (%) */
  beatScaleBoost: number
  /** Длительность затухания бита (мс) */
  beatDecayDuration: number
}

const SYNC_MODE_CONFIGS: Record<Exclude<AudioSyncMode, 'off'>, SyncModeConfig> = {
  meditation: {
    gradientVariation: 0.25, // ±25% — заметнее, но мягко
    spinVariation: 0.1, // ±10% — лёгкое изменение вращения
    maxPulseIntensity: 0.5, // Умеренная пульсация
    beatScaleBoost: 0.05, // +5% при бите — заметно, но не резко
    beatDecayDuration: 600, // Плавное затухание
  },
  trance: {
    gradientVariation: 0.5, // ±50%
    spinVariation: 0.3, // ±30%
    maxPulseIntensity: 1.0, // Полная пульсация
    beatScaleBoost: 0.08, // +8% при бите
    beatDecayDuration: 200, // Быстрое затухание
  },
}

/**
 * Плавная интерполяция (lerp)
 */
function lerp(current: number, target: number, factor: number): number {
  return current + (target - current) * factor
}

interface UseAudioSyncedEffectsOptions {
  /** Данные анализатора */
  analyzerData: AudioAnalyzerData
  /** Режим синхронизации */
  mode: AudioSyncMode
  /** Включена ли синхронизация */
  enabled: boolean
  /** Чувствительность к басу (0-100) */
  bassSensitivity: number
  /** Чувствительность к ритму (0-100) */
  beatSensitivity: number
  /** Включена ли пульсация на бит */
  beatPulseEnabled: boolean
  /** Включена ли адаптивная скорость градиента */
  adaptiveGradientEnabled: boolean
  /** Включена ли адаптивная скорость вращения */
  adaptiveSpinEnabled: boolean
}

/**
 * Хук для вычисления параметров визуальных эффектов,
 * синхронизированных с аудио.
 */
export function useAudioSyncedEffects({
  analyzerData,
  mode,
  enabled,
  bassSensitivity,
  beatSensitivity,
  beatPulseEnabled,
  adaptiveGradientEnabled,
  adaptiveSpinEnabled,
}: UseAudioSyncedEffectsOptions): AudioSyncedEffects {
  const [effects, setEffects] = useState<AudioSyncedEffects>(DEFAULT_EFFECTS)
  const lastBeatTimeRef = useRef<number>(0)
  const animationFrameRef = useRef<number | null>(null)

  // Нормализованные чувствительности (0-2, где 1 = стандартная)
  const normalizedBassSensitivity = bassSensitivity / 50
  const normalizedBeatSensitivity = beatSensitivity / 50

  // Унифицированный lerp фактор на основе чувствительности
  // Базовый 0.08 + до 0.17 в зависимости от чувствительности = 0.08-0.25
  const unifiedLerpFactor = 0.08 + (bassSensitivity / 100) * 0.17

  // Вычисление эффектов
  const computeEffects = useCallback(() => {
    if (!enabled || mode === 'off') {
      setEffects(DEFAULT_EFFECTS)
      return
    }

    const config = SYNC_MODE_CONFIGS[mode]
    const { bass, amplitude, beatDetected, beatIntensity, mid, high } = analyzerData

    // Применяем чувствительность
    const effectiveBass = Math.min(bass * normalizedBassSensitivity, 1)
    const effectiveAmplitude = Math.min(amplitude * normalizedBassSensitivity, 1)
    const effectiveMid = Math.min(mid * normalizedBassSensitivity, 1)
    const effectiveHigh = Math.min(high * normalizedBassSensitivity, 1)

    // Скорость градиента: быстрее при высоком басе
    let gradientSpeedMultiplier = 1
    if (adaptiveGradientEnabled) {
      // От (1 - variation) до (1 + variation)
      gradientSpeedMultiplier = 1 + (effectiveBass - 0.5) * 2 * config.gradientVariation
    }

    // Скорость вращения: быстрее при высокой амплитуде
    let spinSpeedMultiplier = 1
    if (adaptiveSpinEnabled && config.spinVariation > 0) {
      spinSpeedMultiplier = 1 + (effectiveAmplitude - 0.5) * 2 * config.spinVariation
    }

    // Интенсивность пульсации
    const pulseIntensity = effectiveBass * config.maxPulseIntensity

    // Beat detection и масштаб — используем плавный beatIntensity
    const now = performance.now()
    let beatTriggered = false

    if (beatPulseEnabled && beatDetected && normalizedBeatSensitivity > 0) {
      lastBeatTimeRef.current = now
      beatTriggered = true
    }

    // Плавный beatScale на основе beatIntensity (0-1)
    // beatIntensity уже учитывает энергетический скачок
    let beatScale = 1
    if (beatPulseEnabled) {
      // Комбинируем: мгновенный beatIntensity + затухание от последнего бита
      const timeSinceBeat = now - lastBeatTimeRef.current
      const decayFactor = timeSinceBeat < config.beatDecayDuration ? 1 - timeSinceBeat / config.beatDecayDuration : 0
      const easedDecay = 1 - (1 - decayFactor) * (1 - decayFactor)

      // beatIntensity для плавности + decay для сохранения эффекта после бита
      const combinedIntensity = Math.max(beatIntensity, easedDecay * 0.5)
      beatScale = 1 + config.beatScaleBoost * combinedIntensity * normalizedBeatSensitivity
    }

    // Вычисляем mid/high интенсивности
    const midIntensity = effectiveMid * config.maxPulseIntensity
    const highIntensity = effectiveHigh * config.maxPulseIntensity

    // Сдвиг цвета на основе общего спектра (mid+high создают "яркость")
    const colorShift = (effectiveMid * 0.6 + effectiveHigh * 0.4) * config.maxPulseIntensity

    setEffects((prev) => ({
      // Унифицированная интерполяция — все эффекты синхронизированы
      gradientSpeedMultiplier: lerp(prev.gradientSpeedMultiplier, gradientSpeedMultiplier, unifiedLerpFactor),
      spinSpeedMultiplier: lerp(prev.spinSpeedMultiplier, spinSpeedMultiplier, unifiedLerpFactor),
      pulseIntensity: lerp(prev.pulseIntensity, pulseIntensity, unifiedLerpFactor),
      beatScale: lerp(prev.beatScale, beatScale, unifiedLerpFactor * 2), // Быстрее для отзывчивости
      beatTriggered,
      midIntensity: lerp(prev.midIntensity, midIntensity, unifiedLerpFactor),
      highIntensity: lerp(prev.highIntensity, highIntensity, unifiedLerpFactor),
      colorShift: lerp(prev.colorShift, colorShift, unifiedLerpFactor),
    }))

    // Следующий кадр
    animationFrameRef.current = requestAnimationFrame(computeEffects)
  }, [
    enabled,
    mode,
    analyzerData,
    normalizedBassSensitivity,
    normalizedBeatSensitivity,
    beatPulseEnabled,
    adaptiveGradientEnabled,
    adaptiveSpinEnabled,
    unifiedLerpFactor,
  ])

  // Запуск/остановка цикла вычислений
  useEffect(() => {
    if (enabled && mode !== 'off') {
      animationFrameRef.current = requestAnimationFrame(computeEffects)
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      setEffects(DEFAULT_EFFECTS)
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [enabled, mode, computeEffects])

  return effects
}
