'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { AudioSyncMode, HueRotateMode } from '../_schemas/viewer-settings.schema'
import type { AudioAnalyzerData } from './use-audio-analyzer'

/**
 * Настройки режима hue-rotate
 */
interface HueRotateSettings {
  /** Включен ли эффект */
  enabled: boolean
  /** Режим работы */
  mode: HueRotateMode
  /** Базовая скорость вращения (градусов/сек) */
  baseSpeed: number
  /** Модуляция от баса (0-100%) */
  bassModulation: number
  /** Размер скачка на бите (градусов) */
  beatJumpSize: number
  /** Сглаживание (0-100%) */
  smoothing: number
  /** Режим аудио-синхронизации */
  audioSyncMode: AudioSyncMode
}

/**
 * Конфигурация режимов синхронизации для hue-rotate
 */
interface HueRotateModeConfig {
  /** Базовая скорость (градусов/сек) */
  defaultBaseSpeed: number
  /** Модификатор модуляции */
  modulationMultiplier: number
  /** Модификатор скачков */
  jumpMultiplier: number
}

/**
 * Конфигурации для meditation и trance режимов
 */
const AUDIO_SYNC_MODE_CONFIGS: Record<Exclude<AudioSyncMode, 'off'>, HueRotateModeConfig> = {
  meditation: {
    defaultBaseSpeed: 6, // 6°/сек = 1 оборот за 60 сек
    modulationMultiplier: 0.5, // Лёгкая модуляция
    jumpMultiplier: 0.5, // Небольшие скачки
  },
  trance: {
    defaultBaseSpeed: 30, // 30°/сек = 1 оборот за 12 сек
    modulationMultiplier: 1.5, // Сильная модуляция
    jumpMultiplier: 1.5, // Заметные скачки
  },
}

/**
 * Плавная интерполяция (lerp)
 */
function lerp(current: number, target: number, factor: number): number {
  return current + (target - current) * factor
}

/**
 * Хук для управления hue-rotate эффектом с синхронизацией по музыке.
 *
 * Поддерживает 5 режимов работы:
 * - bass: Угол напрямую зависит от уровня баса
 * - accumulative: Постоянное вращение с ускорением от музыки
 * - multiband: Разные частоты влияют на разные сегменты спектра
 * - beat-driven: Импульсные скачки на каждом бите
 * - combined: Комбинация всех подходов (рекомендуется)
 */
export function useHueRotateEffect(audioData: AudioAnalyzerData | null, settings: HueRotateSettings): number {
  const [hueAngle, setHueAngle] = useState(0)
  const previousHueRef = useRef(0)
  const cumulativeHueRef = useRef(0)
  const beatJumpOffsetRef = useRef(0)
  const lastTimestampRef = useRef<number>(0)
  const animationFrameRef = useRef<number | null>(null)

  // Получаем конфигурацию режима
  const modeConfig = settings.audioSyncMode !== 'off' ? AUDIO_SYNC_MODE_CONFIGS[settings.audioSyncMode] : null

  /**
   * Стратегия 1: Hue следует за басом (0-360° в зависимости от уровня баса)
   */
  const calculateHueFromBass = useCallback((audioData: AudioAnalyzerData, bassModulation: number): number => {
    const bassNormalized = audioData.bass // 0-1
    const hueAngle = bassNormalized * 360 // 0-360°
    return hueAngle * (bassModulation / 100)
  }, [])

  /**
   * Стратегия 2: Накопительное вращение (постоянный цикл с ускорением от музыки)
   */
  const calculateAccumulativeHue = useCallback(
    (audioData: AudioAnalyzerData | null, deltaTime: number, baseSpeed: number): number => {
      // Базовая скорость вращения
      const speedDegPerMs = baseSpeed / 1000 // градусов/мс

      // Ускорение от общей амплитуды
      const speedBoost = audioData ? audioData.amplitude * 2 : 0 // 0-2x

      // Обновить накопленный угол
      const increment = (speedDegPerMs + speedBoost * speedDegPerMs) * deltaTime
      cumulativeHueRef.current = (cumulativeHueRef.current + increment) % 360

      return cumulativeHueRef.current
    },
    [],
  )

  /**
   * Стратегия 3: Многополосная модуляция (разные частоты → разные цвета)
   */
  const calculateMultiBandHue = useCallback((audioData: AudioAnalyzerData): number => {
    // Разные частоты влияют на разные сегменты спектра
    const bassComponent = audioData.bass * 120 // 0-120° (красный → жёлтый)
    const midComponent = audioData.mid * 120 // 0-120° (жёлтый → голубой)
    const highComponent = audioData.high * 120 // 0-120° (голубой → красный)

    const totalHue = (bassComponent + midComponent + highComponent) % 360

    return totalHue
  }, [])

  /**
   * Стратегия 4: Импульсы на битах (плавное вращение + резкие скачки)
   */
  const calculateBeatDrivenHue = useCallback(
    (audioData: AudioAnalyzerData | null, deltaTime: number, baseSpeed: number, beatJumpSize: number): number => {
      // Базовый медленный цикл
      const speedDegPerMs = baseSpeed / 1000
      cumulativeHueRef.current = (cumulativeHueRef.current + speedDegPerMs * deltaTime) % 360

      // При детекции бита — добавить скачок
      if (audioData?.beatDetected) {
        const jumpAmount = beatJumpSize * audioData.beatIntensity
        beatJumpOffsetRef.current = jumpAmount
      }

      // Плавное затухание скачка
      beatJumpOffsetRef.current *= 0.9 // Экспоненциальное затухание

      const finalHue = (cumulativeHueRef.current + beatJumpOffsetRef.current) % 360

      return finalHue
    },
    [],
  )

  /**
   * Стратегия 5: Комбинированная (рекомендуется) — все подходы вместе
   */
  const calculateCombinedHue = useCallback(
    (
      audioData: AudioAnalyzerData | null,
      deltaTime: number,
      baseSpeed: number,
      bassModulation: number,
      beatJumpSize: number,
      modeConfig: HueRotateModeConfig | null,
    ): number => {
      // 1. Базовое вращение (зависит от режима)
      const effectiveBaseSpeed = modeConfig ? modeConfig.defaultBaseSpeed : baseSpeed
      const speedDegPerMs = effectiveBaseSpeed / 1000

      cumulativeHueRef.current = (cumulativeHueRef.current + speedDegPerMs * deltaTime) % 360

      // 2. Модуляция от баса (волнообразное отклонение)
      let bassOffset = 0
      if (audioData) {
        const modulationStrength = (bassModulation / 100) * (modeConfig?.modulationMultiplier ?? 1)
        bassOffset = Math.sin(audioData.bass * Math.PI * 2) * 60 * modulationStrength // ±60° отклонение
      }

      // 3. Скачки на битах
      if (audioData?.beatDetected) {
        const jumpMultiplier = modeConfig?.jumpMultiplier ?? 1
        beatJumpOffsetRef.current = beatJumpSize * audioData.beatIntensity * jumpMultiplier
      }

      // Затухание скачка
      beatJumpOffsetRef.current *= 0.9

      // 4. Финальный расчёт
      const finalHue = (cumulativeHueRef.current + bassOffset + beatJumpOffsetRef.current) % 360

      return finalHue
    },
    [],
  )

  /**
   * Главная функция вычисления угла
   */
  const computeHueAngle = useCallback(
    (timestamp: number) => {
      if (!settings.enabled) {
        // Если выключено - сброс к 0
        setHueAngle(0)
        previousHueRef.current = 0
        return
      }

      // Вычисляем deltaTime
      const deltaTime = lastTimestampRef.current ? timestamp - lastTimestampRef.current : 16.67
      lastTimestampRef.current = timestamp

      let newHue: number

      // Выбор стратегии в зависимости от режима
      switch (settings.mode) {
        case 'bass':
          newHue = audioData ? calculateHueFromBass(audioData, settings.bassModulation) : 0
          break

        case 'accumulative':
          newHue = calculateAccumulativeHue(audioData, deltaTime, settings.baseSpeed)
          break

        case 'multiband':
          newHue = audioData ? calculateMultiBandHue(audioData) : 0
          break

        case 'beat-driven':
          newHue = calculateBeatDrivenHue(audioData, deltaTime, settings.baseSpeed, settings.beatJumpSize)
          break

        case 'combined':
        default:
          newHue = calculateCombinedHue(
            audioData,
            deltaTime,
            settings.baseSpeed,
            settings.bassModulation,
            settings.beatJumpSize,
            modeConfig,
          )
          break
      }

      // Применяем сглаживание через lerp
      const smoothingFactor = settings.smoothing / 100 // 0-1
      const smoothedHue = lerp(previousHueRef.current, newHue, smoothingFactor)

      previousHueRef.current = smoothedHue
      setHueAngle(smoothedHue)

      // Следующий кадр
      animationFrameRef.current = requestAnimationFrame(computeHueAngle)
    },
    [
      settings,
      audioData,
      modeConfig,
      calculateHueFromBass,
      calculateAccumulativeHue,
      calculateMultiBandHue,
      calculateBeatDrivenHue,
      calculateCombinedHue,
    ],
  )

  // Запуск/остановка анимации
  useEffect(() => {
    if (settings.enabled) {
      lastTimestampRef.current = 0 // Сброс для правильного deltaTime
      animationFrameRef.current = requestAnimationFrame(computeHueAngle)
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      setHueAngle(0)
      previousHueRef.current = 0
      cumulativeHueRef.current = 0
      beatJumpOffsetRef.current = 0
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [settings.enabled, computeHueAngle])

  return hueAngle
}
