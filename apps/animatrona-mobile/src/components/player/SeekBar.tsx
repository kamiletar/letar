/**
 * SeekBar — сикбар плеера на Reanimated (UI thread, 60fps)
 *
 * Gesture Handler + Reanimated для плавного drag-seek без JS bridge задержек.
 * Тач-зона 36px, визуальная полоска 4px, thumb 20px (24px при drag).
 */

import { useCallback, useEffect, useRef } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'

import { Haptics } from '@/services/haptics'

interface SeekBarProps {
  /** Текущее время воспроизведения (секунды) */
  currentTime: number
  /** Длительность видео (секунды) */
  duration: number
  /** Колбэк seek — вызывается при отпускании */
  onSeek: (time: number) => void
}

/** Форматирование времени мм:сс */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const THUMB_SIZE = 20
const THUMB_ACTIVE_SIZE = 24
const TRACK_HEIGHT = 4
const HIT_HEIGHT = 36
const SPRING_CONFIG = { damping: 15, stiffness: 200 }

export function SeekBar({ currentTime, duration, onSeek }: SeekBarProps) {
  const barWidth = useSharedValue(0)
  const isDragging = useSharedValue(false)
  const dragRatio = useSharedValue(0) // 0-1
  const thumbScale = useSharedValue(1)
  // После seek сохраняем целевую позицию, чтобы не прыгать назад пока плеер не обновит currentTime
  const seekTargetRatio = useSharedValue(-1) // -1 = не активен
  const barRef = useRef<View>(null)
  const barXRef = useRef(0)

  const seekTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Haptic на JS thread — вызывается из UI thread через runOnJS
  const triggerHaptic = useCallback(() => Haptics.light(), [])

  // Сброс seekTarget через таймер — вызывается из UI thread через runOnJS
  const scheduleSeekReset = useCallback(() => {
    if (seekTimerRef.current) clearTimeout(seekTimerRef.current)
    seekTimerRef.current = setTimeout(() => {
      seekTargetRatio.value = -1
    }, 800) // Даём плееру 800ms на seek
  }, [seekTargetRatio])

  // Очистка таймера при размонтировании
  useEffect(() => {
    return () => {
      if (seekTimerRef.current) clearTimeout(seekTimerRef.current)
    }
  }, [])

  const commitSeek = useCallback(
    (ratio: number) => {
      if (duration > 0) onSeek(ratio * duration)
    },
    [duration, onSeek],
  )

  const pan = Gesture.Pan()
    .onBegin((e) => {
      'worklet'
      const ratio = Math.max(0, Math.min(1, e.x / Math.max(barWidth.value, 1)))
      dragRatio.value = ratio
      isDragging.value = true
      seekTargetRatio.value = -1 // Сброс при начале нового drag
      thumbScale.value = withSpring(THUMB_ACTIVE_SIZE / THUMB_SIZE, SPRING_CONFIG)
      runOnJS(triggerHaptic)()
    })
    .onUpdate((e) => {
      'worklet'
      dragRatio.value = Math.max(0, Math.min(1, e.x / Math.max(barWidth.value, 1)))
    })
    .onEnd(() => {
      'worklet'
      thumbScale.value = withSpring(1, SPRING_CONFIG)
      seekTargetRatio.value = dragRatio.value // Залочить позицию пока плеер не seekнет
      isDragging.value = false
      runOnJS(commitSeek)(dragRatio.value)
      runOnJS(scheduleSeekReset)()
    })
    .onFinalize(() => {
      'worklet'
      thumbScale.value = withSpring(1, SPRING_CONFIG)
      isDragging.value = false
    })
    .minDistance(0) // Реагировать на тап без минимального расстояния
    .hitSlop({ top: 10, bottom: 10 })

  // Animated стили для fill (ширина полоски)
  const fillStyle = useAnimatedStyle(() => {
    // Приоритет: drag > seekTarget > currentTime
    const ratio = isDragging.value
      ? dragRatio.value
      : seekTargetRatio.value >= 0
      ? seekTargetRatio.value
      : duration > 0
      ? currentTime / duration
      : 0
    return { width: `${ratio * 100}%` }
  })

  // Animated стили для thumb (позиция + масштаб)
  const thumbStyle = useAnimatedStyle(() => {
    const ratio = isDragging.value
      ? dragRatio.value
      : seekTargetRatio.value >= 0
      ? seekTargetRatio.value
      : duration > 0
      ? currentTime / duration
      : 0
    const size = THUMB_SIZE * thumbScale.value
    return {
      left: `${ratio * 100}%`,
      width: size,
      height: size,
      borderRadius: size / 2,
      marginLeft: -size / 2,
      top: (HIT_HEIGHT - size) / 2,
    }
  })

  // Текст времени — при drag показываем seek-позицию
  // (dragRatio — shared value, нужен animated text)
  const timeTextStyle = useAnimatedStyle(() => {
    return { opacity: 1 } // Для re-render при drag
  })

  return (
    <View style={styles.container}>
      <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
      <GestureDetector gesture={pan}>
        <Animated.View
          ref={barRef}
          style={styles.hitArea}
          onLayout={(e) => {
            barWidth.value = e.nativeEvent.layout.width
            barRef.current?.measureInWindow((x) => {
              barXRef.current = x
            })
          }}
        >
          {/* Визуальная полоска */}
          <View style={styles.track}>
            <Animated.View style={[styles.fill, fillStyle]} />
          </View>
          {/* Ползунок */}
          <Animated.View style={[styles.thumb, thumbStyle]} />
        </Animated.View>
      </GestureDetector>
      <Text style={styles.timeText}>-{formatTime(Math.max(0, duration - currentTime))}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  hitArea: {
    flex: 1,
    height: HIT_HEIGHT,
    justifyContent: 'center',
  },
  track: {
    height: TRACK_HEIGHT,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: TRACK_HEIGHT / 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: '#805AD5',
    borderRadius: TRACK_HEIGHT / 2,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#805AD5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
  },
  timeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontFamily: 'monospace',
    minWidth: 50,
    textAlign: 'center',
  },
})
