/**
 * GestureOverlay — VLC-style жесты для видеоплеера
 *
 * Использует PanResponder (чистый React Native) для обработки жестов.
 * Не требует react-native-reanimated.
 *
 * Жесты:
 * - Тап: показать/скрыть контролы
 * - Свайп вверх/вниз слева: яркость
 * - Свайп вверх/вниз справа: громкость
 * - Свайп влево/вправо: перемотка
 * - Multi-tap слева: -10/-20/-30 сек (кумулятивный, как VLC)
 * - Multi-tap справа: +10/+20/+30 сек (кумулятивный, как VLC)
 * - Double tap по центру: play/pause
 * - Long press: 2x скорость
 * - Pinch: зум видео (1.0—4.0x)
 * - Pan при зуме: сдвиг видео
 */

import { Haptics } from '@/services/haptics'
import { ChevronsLeft, ChevronsRight, FastForward } from 'lucide-react-native'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Dimensions, PanResponder, StyleSheet, Text, View } from 'react-native'

export interface GestureOverlayProps {
  disabled?: boolean
  /** Контролы сейчас видимы — пропускать тачи к кнопкам */
  controlsVisible?: boolean
  volume: number
  onVolumeChange: (volume: number) => void
  /** Усиление громкости: 0-100 (100 = 200% громкости) */
  volumeBoost?: number
  onVolumeBoostChange?: (boost: number) => void
  brightness: number
  onBrightnessChange: (brightness: number) => void
  currentTime: number
  duration: number
  onSeek: (time: number) => void
  onTogglePlay: () => void
  onToggleControls: () => void
  onSpeedChange?: (speed: number) => void
  playbackSpeed?: number
  /** Текущий масштаб зума */
  zoomScale?: number
  /** Колбэк изменения зума и смещения */
  onZoomChange?: (scale: number, translateX: number, translateY: number) => void
}

const SWIPE_THRESHOLD = 15
const DOUBLE_TAP_DELAY = 300
const LONG_PRESS_DELAY = 500
const SEEK_STEP = 10
const VERTICAL_SENSITIVITY = 0.003
const ZOOM_MIN = 1.0
const ZOOM_MAX = 4.0
const ZOOM_SNAP_THRESHOLD = 1.05

/** Форматирование времени mm:ss или h:mm:ss */
function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }
  return `${m}:${sec.toString().padStart(2, '0')}`
}

/** Расстояние между двумя точками касания */
function getDistance(touches: { pageX: number; pageY: number }[]): number {
  const dx = touches[0].pageX - touches[1].pageX
  const dy = touches[0].pageY - touches[1].pageY
  return Math.sqrt(dx * dx + dy * dy)
}

type GestureType = 'none' | 'volume' | 'brightness' | 'seek' | 'pinch' | 'zoom-pan'

export function GestureOverlay(props: GestureOverlayProps) {
  const { disabled = false } = props

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window')

  // Храним props в ref для доступа из PanResponder callbacks
  const propsRef = useRef(props)
  useEffect(() => {
    propsRef.current = props
  })

  // Состояние UI
  const [indicatorText, setIndicatorText] = useState('')
  const indicatorOpacity = useRef(new Animated.Value(0)).current
  const indicatorScale = useRef(new Animated.Value(0.85)).current

  // Состояние жестов
  const lastTapTimeRef = useRef(0)
  const lastTapXRef = useRef(0)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const gestureStartValueRef = useRef(0)
  const gestureActiveRef = useRef<GestureType>('none')
  const previousSpeedRef = useRef(1.0)
  const hasMovedRef = useRef(false)
  const isLongPressRef = useRef(false)
  const startXRef = useRef(0)
  const startYRef = useRef(0)

  // Мульти-тап (кумулятивный seek как в VLC)
  const multiTapCountRef = useRef(0)
  const multiTapBaseTimeRef = useRef(0)
  const multiTapHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Pinch-to-zoom
  const isPinchingRef = useRef(false)
  const pinchStartDistRef = useRef(0)
  const pinchStartScaleRef = useRef(1)
  const zoomTranslateXRef = useRef(0)
  const zoomTranslateYRef = useRef(0)
  const panStartTranslateXRef = useRef(0)
  const panStartTranslateYRef = useRef(0)

  // Тип индикатора для рендеринга иконок
  const [indicatorType, setIndicatorType] = useState<'text' | 'seek-forward' | 'seek-back' | 'speed' | 'zoom'>('text')

  const showIndicator = useCallback(
    (text: string, type: 'text' | 'seek-forward' | 'seek-back' | 'speed' | 'zoom' = 'text') => {
      setIndicatorText(text)
      setIndicatorType(type)
      indicatorOpacity.stopAnimation()
      indicatorScale.stopAnimation()
      indicatorScale.setValue(0.85)
      Animated.parallel([
        Animated.timing(indicatorOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(indicatorScale, {
          toValue: 1,
          speed: 28,
          bounciness: 6,
          useNativeDriver: true,
        }),
      ]).start()
    },
    [indicatorOpacity, indicatorScale]
  )

  const hideIndicator = useCallback(() => {
    Animated.timing(indicatorOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIndicatorText('')
      setIndicatorType('text')
      indicatorScale.setValue(0.85)
    })
  }, [indicatorOpacity, indicatorScale])

  const clearTimers = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current)
      tapTimerRef.current = null
    }
    if (multiTapHideTimerRef.current) {
      clearTimeout(multiTapHideTimerRef.current)
      multiTapHideTimerRef.current = null
    }
  }, [])

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: () => !disabled,
        onPanResponderGrant: (evt) => {
          const { pageX, pageY } = evt.nativeEvent
          clearTimers()
          hasMovedRef.current = false
          gestureActiveRef.current = 'none'
          isPinchingRef.current = false
          startXRef.current = pageX
          startYRef.current = pageY

          const p = propsRef.current
          const isLeftSide = pageX < screenWidth / 2
          gestureStartValueRef.current = isLeftSide ? p.brightness : p.volume + (p.volumeBoost ?? 0) / 100

          // Long press таймер
          longPressTimerRef.current = setTimeout(() => {
            if (!hasMovedRef.current && !isPinchingRef.current) {
              const p2 = propsRef.current
              if (p2.onSpeedChange) {
                previousSpeedRef.current = p2.playbackSpeed ?? 1.0
                p2.onSpeedChange(2.0)
                isLongPressRef.current = true
                Haptics.medium()
                showIndicator('2x', 'speed')
              }
            }
          }, LONG_PRESS_DELAY)
        },
        onPanResponderMove: (evt, gestureState) => {
          if (isLongPressRef.current) {
            return
          }

          const touches = evt.nativeEvent.touches

          // Pinch: 2 пальца
          if (touches && touches.length >= 2) {
            // Отменяем long press при pinch
            if (longPressTimerRef.current) {
              clearTimeout(longPressTimerRef.current)
              longPressTimerRef.current = null
            }
            hasMovedRef.current = true

            const dist = getDistance([
              { pageX: touches[0].pageX, pageY: touches[0].pageY },
              { pageX: touches[1].pageX, pageY: touches[1].pageY },
            ])

            if (!isPinchingRef.current) {
              // Начало pinch
              isPinchingRef.current = true
              pinchStartDistRef.current = dist
              pinchStartScaleRef.current = propsRef.current.zoomScale ?? 1
              gestureActiveRef.current = 'pinch'
            }

            // Вычисляем новый масштаб
            const ratio = dist / pinchStartDistRef.current
            let newScale = pinchStartScaleRef.current * ratio
            // Snap к 1.0 при малом зуме
            if (newScale < ZOOM_SNAP_THRESHOLD) {
              newScale = ZOOM_MIN
            }
            newScale = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newScale))

            // Если масштаб вернулся к 1.0, сбрасываем translate
            const tx = newScale <= 1 ? 0 : zoomTranslateXRef.current
            const ty = newScale <= 1 ? 0 : zoomTranslateYRef.current
            if (newScale <= 1) {
              zoomTranslateXRef.current = 0
              zoomTranslateYRef.current = 0
            }

            propsRef.current.onZoomChange?.(newScale, tx, ty)
            showIndicator(`x${newScale.toFixed(1)}`, 'zoom')
            return
          }

          // Однопальцевый жест: pan при зуме (scale > 1) или обычные свайпы
          const currentZoom = propsRef.current.zoomScale ?? 1
          const { dx, dy } = gestureState

          // Отмечаем что было движение
          if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            hasMovedRef.current = true
            // Отменяем long press
            if (longPressTimerRef.current) {
              clearTimeout(longPressTimerRef.current)
              longPressTimerRef.current = null
            }
          }

          // При зуме > 1: однопальцевый свайп = pan (сдвиг видео)
          if (
            currentZoom > 1 &&
            gestureActiveRef.current !== 'volume' &&
            gestureActiveRef.current !== 'brightness' &&
            gestureActiveRef.current !== 'seek'
          ) {
            if (gestureActiveRef.current !== 'zoom-pan' && hasMovedRef.current) {
              gestureActiveRef.current = 'zoom-pan'
              panStartTranslateXRef.current = zoomTranslateXRef.current
              panStartTranslateYRef.current = zoomTranslateYRef.current
            }

            if (gestureActiveRef.current === 'zoom-pan') {
              // Ограничиваем translate по размеру видео
              const maxTx = (screenWidth * (currentZoom - 1)) / (2 * currentZoom)
              const maxTy = (screenHeight * (currentZoom - 1)) / (2 * currentZoom)
              const newTx = Math.max(-maxTx, Math.min(maxTx, panStartTranslateXRef.current + dx / currentZoom))
              const newTy = Math.max(-maxTy, Math.min(maxTy, panStartTranslateYRef.current + dy / currentZoom))
              zoomTranslateXRef.current = newTx
              zoomTranslateYRef.current = newTy
              propsRef.current.onZoomChange?.(currentZoom, newTx, newTy)
              return
            }
          }

          // Определяем тип жеста если ещё не определён (обычный режим без зума)
          if (gestureActiveRef.current === 'none' && hasMovedRef.current) {
            const isLeftSide = startXRef.current < screenWidth / 2

            if (Math.abs(dy) > SWIPE_THRESHOLD && Math.abs(dy) > Math.abs(dx) * 1.5) {
              gestureActiveRef.current = isLeftSide ? 'brightness' : 'volume'
              const p = propsRef.current
              gestureStartValueRef.current = isLeftSide ? p.brightness : p.volume + (p.volumeBoost ?? 0) / 100
            } else if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.5) {
              gestureActiveRef.current = 'seek'
              gestureStartValueRef.current = propsRef.current.currentTime
            }
          }

          const p = propsRef.current

          // Обработка активного жеста
          if (gestureActiveRef.current === 'volume') {
            const newVirtual = Math.max(0, Math.min(2, gestureStartValueRef.current - dy * VERTICAL_SENSITIVITY))

            if (newVirtual <= 1) {
              p.onVolumeChange(newVirtual)
              if (p.onVolumeBoostChange && (p.volumeBoost ?? 0) > 0) {
                p.onVolumeBoostChange(0)
              }
              showIndicator(`🔊 ${Math.round(newVirtual * 100)}%`)
            } else {
              if (p.volume < 1) {
                p.onVolumeChange(1)
              }
              const boost = Math.round((newVirtual - 1) * 100)
              if (p.onVolumeBoostChange) {
                p.onVolumeBoostChange(boost)
              }
              showIndicator(`🔊 ${100 + boost}%`)
            }
          } else if (gestureActiveRef.current === 'brightness') {
            const newBrightness = Math.max(0, Math.min(1, gestureStartValueRef.current - dy * VERTICAL_SENSITIVITY))
            p.onBrightnessChange(newBrightness)
            showIndicator(`☀️ ${Math.round(newBrightness * 100)}%`)
          } else if (gestureActiveRef.current === 'seek') {
            // Чувствительность: полный свайп по ширине экрана = 90 сек или 1/4 длительности
            const seekRange = Math.min(90, p.duration / 4)
            const seekDelta = (dx / screenWidth) * seekRange
            const newTime = Math.max(0, Math.min(p.duration, gestureStartValueRef.current + seekDelta))
            const deltaSeconds = Math.round(newTime - gestureStartValueRef.current)
            const sign = deltaSeconds >= 0 ? '+' : ''
            showIndicator(`${formatTime(newTime)} [${sign}${deltaSeconds}с]`)
          }
        },
        onPanResponderRelease: (evt, gestureState) => {
          // Отмена long press
          if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current)
            longPressTimerRef.current = null
          }

          // Завершение pinch
          if (isPinchingRef.current || gestureActiveRef.current === 'pinch') {
            isPinchingRef.current = false
            gestureActiveRef.current = 'none'
            setTimeout(hideIndicator, 500)
            return
          }

          // Завершение zoom-pan
          if (gestureActiveRef.current === 'zoom-pan') {
            gestureActiveRef.current = 'none'
            return
          }

          // Восстановление скорости после long press
          if (isLongPressRef.current) {
            const p = propsRef.current
            if (p.onSpeedChange) {
              p.onSpeedChange(previousSpeedRef.current)
            }
            isLongPressRef.current = false
            hideIndicator()
            return
          }

          const p = propsRef.current

          // Применение seek при отпускании
          if (gestureActiveRef.current === 'seek') {
            const seekRange = Math.min(90, p.duration / 4)
            const seekDelta = (gestureState.dx / screenWidth) * seekRange
            const newTime = Math.max(0, Math.min(p.duration, gestureStartValueRef.current + seekDelta))
            p.onSeek(newTime)
            setTimeout(hideIndicator, 500)
          } else if (gestureActiveRef.current === 'volume' || gestureActiveRef.current === 'brightness') {
            setTimeout(hideIndicator, 500)
          }

          // Обработка тапов (не было движения)
          if (!hasMovedRef.current && gestureActiveRef.current === 'none') {
            const { pageX } = evt.nativeEvent
            const now = Date.now()
            const thirdWidth = screenWidth / 3
            const tapZone: 'left' | 'center' | 'right' =
              pageX < thirdWidth ? 'left' : pageX > thirdWidth * 2 ? 'right' : 'center'
            const timeSinceLastTap = now - lastTapTimeRef.current
            // Определяем зону предыдущего тапа для мульти-тапа
            const lastThird =
              lastTapXRef.current < thirdWidth ? 'left' : lastTapXRef.current > thirdWidth * 2 ? 'right' : 'center'

            // Мульти-тап на той же стороне (кумулятивный ±10с как VLC)
            if (timeSinceLastTap < DOUBLE_TAP_DELAY && tapZone === lastThird) {
              // Отменяем pending single tap
              if (tapTimerRef.current) {
                clearTimeout(tapTimerRef.current)
                tapTimerRef.current = null
              }
              // Отменяем pending hide
              if (multiTapHideTimerRef.current) {
                clearTimeout(multiTapHideTimerRef.current)
                multiTapHideTimerRef.current = null
              }

              if (tapZone === 'center') {
                // Double tap по центру = play/pause
                p.onTogglePlay()
                lastTapTimeRef.current = 0
                multiTapCountRef.current = 0
              } else {
                // Seek: left = -10с, right = +10с (кумулятивный)
                if (multiTapCountRef.current === 0) {
                  multiTapBaseTimeRef.current = p.currentTime
                }
                multiTapCountRef.current++

                const seekDelta = multiTapCountRef.current * SEEK_STEP
                const direction = tapZone === 'left' ? -1 : 1
                const newTime = Math.max(0, Math.min(p.duration, multiTapBaseTimeRef.current + direction * seekDelta))
                p.onSeek(newTime)
                Haptics.light()

                showIndicator(`${seekDelta} сек`, tapZone === 'left' ? 'seek-back' : 'seek-forward')

                // Обновляем время последнего тапа
                lastTapTimeRef.current = now

                // Автоскрытие после завершения серии тапов
                multiTapHideTimerRef.current = setTimeout(() => {
                  hideIndicator()
                  multiTapCountRef.current = 0
                }, 800)
              }
            } else {
              // Single tap — с задержкой для проверки мульти-тапа
              lastTapTimeRef.current = now
              lastTapXRef.current = pageX
              multiTapCountRef.current = 0

              tapTimerRef.current = setTimeout(() => {
                if (Date.now() - lastTapTimeRef.current >= DOUBLE_TAP_DELAY - 50) {
                  propsRef.current.onToggleControls()
                }
              }, DOUBLE_TAP_DELAY)
            }
          }

          gestureActiveRef.current = 'none'
        },
      }),
    [disabled, screenWidth, screenHeight, clearTimers, showIndicator, hideIndicator]
  )

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {indicatorText !== '' && (
        <Animated.View
          style={[styles.indicator, { opacity: indicatorOpacity, transform: [{ scale: indicatorScale }] }]}
        >
          {indicatorType === 'seek-back' && (
            <View style={styles.indicatorRow}>
              <ChevronsLeft size={24} color="#FFFFFF" />
              <Text style={styles.indicatorText}>{indicatorText}</Text>
            </View>
          )}
          {indicatorType === 'seek-forward' && (
            <View style={styles.indicatorRow}>
              <Text style={styles.indicatorText}>{indicatorText}</Text>
              <ChevronsRight size={24} color="#FFFFFF" />
            </View>
          )}
          {indicatorType === 'speed' && (
            <View style={styles.indicatorRow}>
              <FastForward size={20} color="#FFFFFF" />
              <Text style={styles.indicatorText}>{indicatorText}</Text>
            </View>
          )}
          {indicatorType === 'zoom' && <Text style={styles.indicatorText}>{indicatorText}</Text>}
          {indicatorType === 'text' && <Text style={styles.indicatorText}>{indicatorText}</Text>}
        </Animated.View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
  },
  indicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -70,
    marginTop: -25,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  indicatorText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
})

export default GestureOverlay
