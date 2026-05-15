/**
 * TVNextEpisodeOverlay — overlay "Следующий эпизод через N сек"
 *
 * Показывается при окончании эпизода, если есть следующий.
 * Обратный отсчёт 10 секунд, кнопки "Смотреть" и "Отмена".
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native'

import { useTVFocusAnimation } from '@/hooks/useTVFocusAnimation'

interface TVNextEpisodeOverlayProps {
  /** Номер следующего эпизода */
  nextEpisodeNumber: number
  /** Название следующего эпизода */
  nextEpisodeName: string | null
  /** Callback — перейти к следующему эпизоду */
  onPlayNext: () => void
  /** Callback — отменить автопереход */
  onCancel: () => void
}

/** Время автоперехода (секунды) */
const COUNTDOWN_SECONDS = 10

/** Overlay следующего эпизода */
export function TVNextEpisodeOverlay({
  nextEpisodeNumber,
  nextEpisodeName,
  onPlayNext,
  onCancel,
}: TVNextEpisodeOverlayProps): React.JSX.Element {
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { scale, focusOpacity, onFocus, onBlur } = useTVFocusAnimation({ focusScale: 1.08 })

  // Прогресс для визуального countdown
  const progressPercent = (countdown / COUNTDOWN_SECONDS) * 100

  // Запускаем таймер
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  // Автопереход при 0
  useEffect(() => {
    if (countdown === 0) {
      onPlayNext()
    }
  }, [countdown, onPlayNext])

  /** Остановить таймер и отменить */
  const handleCancel = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    onCancel()
  }, [onCancel])

  /** Сразу перейти */
  const handlePlayNow = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    onPlayNext()
  }, [onPlayNext])

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <Text style={styles.title}>Следующий эпизод</Text>
        <Text style={styles.episodeInfo}>
          Эпизод {nextEpisodeNumber}
          {nextEpisodeName ? ` — ${nextEpisodeName}` : ''}
        </Text>
        <Text style={styles.countdown}>Через {countdown} сек.</Text>

        {/* Прогресс бар обратного отсчёта */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>

        {/* Кнопки */}
        <View style={styles.buttons}>
          <Animated.View style={{ transform: [{ scale }] }}>
            <Pressable
              style={styles.playButton}
              onPress={handlePlayNow}
              hasTVPreferredFocus
              onFocus={onFocus}
              onBlur={onBlur}
            >
              <Text style={styles.playButtonText}>▶ Смотреть</Text>
            </Pressable>
            <Animated.View style={[styles.buttonFocusBorder, { opacity: focusOpacity }]} pointerEvents="none" />
          </Animated.View>

          <Pressable
            style={({ focused }) => [styles.cancelButton, focused && styles.cancelButtonFocused]}
            onPress={handleCancel}
          >
            <Text style={styles.cancelButtonText}>Отмена</Text>
          </Pressable>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    minWidth: 400,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  episodeInfo: {
    fontSize: 20,
    color: '#aaa',
    marginBottom: 16,
  },
  countdown: {
    fontSize: 24,
    color: '#7c3aed',
    fontWeight: '600',
    marginBottom: 16,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 24,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#7c3aed',
    borderRadius: 2,
  },
  buttons: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  playButton: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonFocusBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    borderWidth: 4,
    borderColor: '#fff',
  },
  playButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  cancelButton: {
    backgroundColor: '#333',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 4,
    borderColor: 'transparent',
  },
  cancelButtonFocused: {
    borderColor: '#fff',
    backgroundColor: '#444',
    transform: [{ scale: 1.08 }],
    elevation: 8,
  },
  cancelButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
})
