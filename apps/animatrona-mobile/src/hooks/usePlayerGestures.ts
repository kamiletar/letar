/**
 * Хук для обработки жестов плеера
 *
 * Зоны экрана:
 * ┌─────────┬─────────┬─────────┐
 * │ Volume  │  Seek   │Brightness│
 * │  0-33%  │ 33-67%  │  67-100% │
 * └─────────┴─────────┴─────────┘
 *
 * Жесты:
 * - Double-tap левая сторона: -10 сек
 * - Double-tap правая сторона: +10 сек
 * - Вертикальный свайп слева: громкость
 * - Вертикальный свайп справа: яркость
 * - Горизонтальный свайп по центру: перемотка
 */

import { useCallback, useRef, useState } from 'react'
import { Dimensions } from 'react-native'
import {
  Gesture,
  type GestureStateChangeEvent,
  type GestureUpdateEvent,
  type PanGestureHandlerEventPayload,
  type TapGestureHandlerEventPayload,
} from 'react-native-gesture-handler'

import { useBrightness } from './useBrightness'
import { useHaptic } from './useHaptic'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

/** Пороги для определения типа свайпа */
const MIN_SWIPE_DISTANCE = 20
const VOLUME_SENSITIVITY = 100 // Пикселей на 100% громкости
const BRIGHTNESS_SENSITIVITY = 100 // Пикселей на 100% яркости
const SEEK_SENSITIVITY = 300 // Пикселей на 30 секунд

/** Зоны экрана */
const LEFT_ZONE = 0.33
const RIGHT_ZONE = 0.67

export interface GestureState {
  /** Показывать индикатор перемотки */
  showSeekIndicator: boolean
  /** Время перемотки */
  seekDelta: number
  /** Показывать индикатор громкости */
  showVolumeIndicator: boolean
  /** Уровень громкости (0-1) */
  volumeLevel: number
  /** Показывать индикатор яркости */
  showBrightnessIndicator: boolean
  /** Уровень яркости (0-1) */
  brightnessLevel: number
  /** Показывать ripple эффект двойного тапа */
  showDoubleTapRipple: 'left' | 'right' | null
  /** Показывать индикатор 2x скорости (long press) */
  showSpeedBoost: boolean
  /** Активен ли любой жест (для useControlsVisibility) */
  isGestureActive: boolean
}

export interface UsePlayerGesturesOptions {
  /** Текущее время видео */
  currentTime: number
  /** Длительность видео */
  duration: number
  /** Callback перемотки */
  onSeek: (time: number) => void
  /** Callback изменения громкости */
  onVolumeChange: (volume: number) => void
  /** Callback одиночного тапа (toggle controls) */
  onTap: () => void
  /** Callback изменения скорости (для long press 2x) */
  onSpeedChange?: (speed: number) => void
  /** Текущая громкость */
  volume: number
  /** Текущая скорость воспроизведения */
  speed?: number
  /** Landscape режим */
  isLandscape?: boolean
}

export function usePlayerGestures({
  currentTime,
  duration,
  onSeek,
  onVolumeChange,
  onTap,
  onSpeedChange,
  volume,
  speed = 1.0,
  isLandscape = true,
}: UsePlayerGesturesOptions) {
  const { brightness, setBrightness } = useBrightness()
  const haptic = useHaptic()

  const [gestureState, setGestureState] = useState<GestureState>({
    showSeekIndicator: false,
    seekDelta: 0,
    showVolumeIndicator: false,
    volumeLevel: volume,
    showBrightnessIndicator: false,
    brightnessLevel: brightness,
    showDoubleTapRipple: null,
    showSpeedBoost: false,
    isGestureActive: false,
  })

  // Ref для сохранения исходной скорости при long press
  const originalSpeedRef = useRef(speed)

  // Refs для отслеживания состояния свайпа
  const initialVolumeRef = useRef(volume)
  const initialBrightnessRef = useRef(brightness)
  const initialTimeRef = useRef(currentTime)
  const swipeTypeRef = useRef<'volume' | 'brightness' | 'seek' | null>(null)
  const accumulatedSeekRef = useRef(0)

  // Размеры экрана в landscape
  const screenWidth = isLandscape ? Math.max(SCREEN_WIDTH, SCREEN_HEIGHT) : SCREEN_WIDTH
  // screenHeight зарезервирован для будущих жестов (pinch to zoom)
  const _screenHeight = isLandscape ? Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) : SCREEN_HEIGHT

  /** Определить зону тапа */
  const getZone = useCallback(
    (x: number): 'left' | 'center' | 'right' => {
      const relativeX = x / screenWidth
      if (relativeX < LEFT_ZONE) {
        return 'left'
      }
      if (relativeX > RIGHT_ZONE) {
        return 'right'
      }
      return 'center'
    },
    [screenWidth]
  )

  /** Обработчик double-tap */
  const handleDoubleTap = useCallback(
    (event: GestureStateChangeEvent<TapGestureHandlerEventPayload>) => {
      const zone = getZone(event.x)

      if (zone === 'left') {
        // -10 секунд
        haptic.light()
        const newTime = Math.max(0, currentTime - 10)
        onSeek(newTime)
        setGestureState((prev) => ({ ...prev, showDoubleTapRipple: 'left' }))
        setTimeout(() => {
          setGestureState((prev) => ({ ...prev, showDoubleTapRipple: null }))
        }, 300)
      } else if (zone === 'right') {
        // +10 секунд
        haptic.light()
        const newTime = Math.min(duration, currentTime + 10)
        onSeek(newTime)
        setGestureState((prev) => ({ ...prev, showDoubleTapRipple: 'right' }))
        setTimeout(() => {
          setGestureState((prev) => ({ ...prev, showDoubleTapRipple: null }))
        }, 300)
      }
    },
    [currentTime, duration, getZone, haptic, onSeek]
  )

  /** Обработчик начала pan жеста */
  const handlePanStart = useCallback(
    (event: GestureStateChangeEvent<PanGestureHandlerEventPayload>) => {
      const zone = getZone(event.x)
      haptic.selection() // Тактильная обратная связь при начале жеста

      // Определяем тип свайпа по зоне начала
      if (zone === 'left') {
        swipeTypeRef.current = 'volume'
        initialVolumeRef.current = volume
        setGestureState((prev) => ({
          ...prev,
          showVolumeIndicator: true,
          volumeLevel: volume,
        }))
      } else if (zone === 'right') {
        swipeTypeRef.current = 'brightness'
        initialBrightnessRef.current = brightness
        setGestureState((prev) => ({
          ...prev,
          showBrightnessIndicator: true,
          brightnessLevel: brightness,
        }))
      } else {
        swipeTypeRef.current = 'seek'
        initialTimeRef.current = currentTime
        accumulatedSeekRef.current = 0
        setGestureState((prev) => ({
          ...prev,
          showSeekIndicator: true,
          seekDelta: 0,
        }))
      }
    },
    [brightness, currentTime, getZone, haptic, volume]
  )

  /** Обработчик обновления pan жеста */
  const handlePanUpdate = useCallback(
    (event: GestureUpdateEvent<PanGestureHandlerEventPayload>) => {
      const type = swipeTypeRef.current
      if (!type) {
        return
      }

      if (type === 'volume') {
        // Вертикальный свайп для громкости (вверх = громче)
        const delta = -event.translationY / VOLUME_SENSITIVITY
        const newVolume = Math.max(0, Math.min(1, initialVolumeRef.current + delta))
        onVolumeChange(newVolume)
        setGestureState((prev) => ({ ...prev, volumeLevel: newVolume }))
      } else if (type === 'brightness') {
        // Вертикальный свайп для яркости (вверх = ярче)
        const delta = -event.translationY / BRIGHTNESS_SENSITIVITY
        const newBrightness = Math.max(0, Math.min(1, initialBrightnessRef.current + delta))
        setBrightness(newBrightness)
        setGestureState((prev) => ({ ...prev, brightnessLevel: newBrightness }))
      } else if (type === 'seek') {
        // Горизонтальный свайп для перемотки
        const seekSeconds = (event.translationX / SEEK_SENSITIVITY) * 30
        accumulatedSeekRef.current = seekSeconds
        setGestureState((prev) => ({ ...prev, seekDelta: Math.round(seekSeconds) }))
      }
    },
    [onVolumeChange, setBrightness]
  )

  /** Обработчик окончания pan жеста */
  const handlePanEnd = useCallback(() => {
    const type = swipeTypeRef.current

    if (type === 'seek' && accumulatedSeekRef.current !== 0) {
      const newTime = Math.max(0, Math.min(duration, initialTimeRef.current + accumulatedSeekRef.current))
      onSeek(newTime)
    }

    // Сбрасываем состояние
    swipeTypeRef.current = null
    accumulatedSeekRef.current = 0
    setGestureState({
      showSeekIndicator: false,
      seekDelta: 0,
      showVolumeIndicator: false,
      volumeLevel: volume,
      showBrightnessIndicator: false,
      brightnessLevel: brightness,
      showDoubleTapRipple: null,
      showSpeedBoost: false,
      isGestureActive: false,
    })
  }, [brightness, duration, onSeek, volume])

  /** Обработчик начала long press (2x speed) */
  const handleLongPressStart = useCallback(() => {
    originalSpeedRef.current = speed
    haptic.medium()
    onSpeedChange?.(2.0)
    setGestureState((prev) => ({ ...prev, showSpeedBoost: true, isGestureActive: true }))
  }, [speed, haptic, onSpeedChange])

  /** Обработчик окончания long press */
  const handleLongPressEnd = useCallback(() => {
    onSpeedChange?.(originalSpeedRef.current)
    setGestureState((prev) => ({ ...prev, showSpeedBoost: false, isGestureActive: false }))
  }, [onSpeedChange])

  // Создаём жесты
  const singleTap = Gesture.Tap()
    .maxDuration(250)
    .onEnd(() => {
      onTap()
    })

  const doubleTap = Gesture.Tap().numberOfTaps(2).maxDuration(300).onEnd(handleDoubleTap)

  const panGesture = Gesture.Pan()
    .minDistance(MIN_SWIPE_DISTANCE)
    .onStart(handlePanStart)
    .onUpdate(handlePanUpdate)
    .onEnd(handlePanEnd)
    .onFinalize(handlePanEnd)

  // Long press для 2x скорости (как YouTube)
  const longPressGesture = Gesture.LongPress()
    .minDuration(500) // 500ms удержания
    .onStart(handleLongPressStart)
    .onEnd(handleLongPressEnd)
    .onFinalize(handleLongPressEnd)

  // Комбинируем жесты: double-tap приоритетнее single-tap
  const tapGesture = Gesture.Exclusive(doubleTap, singleTap)

  // Long press работает отдельно от tap
  const tapWithLongPress = Gesture.Exclusive(longPressGesture, tapGesture)

  // Все жесты могут работать одновременно
  const composedGesture = Gesture.Simultaneous(tapWithLongPress, panGesture)

  return {
    gesture: composedGesture,
    gestureState,
  }
}
