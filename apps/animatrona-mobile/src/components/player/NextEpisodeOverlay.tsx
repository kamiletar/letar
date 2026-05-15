/**
 * NextEpisodeOverlay — оверлей для перехода к следующему эпизоду
 *
 * Показывается в конце эпизода с обратным отсчётом до автоперехода
 */

import { useEffect, useRef, useState } from 'react'
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { Haptics } from '@/services/haptics'
import type { Episode } from '@letar/animatrona-shared'

/** Время обратного отсчёта (секунды) */
const COUNTDOWN_SECONDS = 10

interface NextEpisodeOverlayProps {
  visible: boolean
  nextEpisode: Episode | null
  onPlayNext: () => void
  onCancel: () => void
}

export function NextEpisodeOverlay({ visible, nextEpisode, onPlayNext, onCancel }: NextEpisodeOverlayProps) {
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS)
  const [shouldRender, setShouldRender] = useState(false)
  const opacity = useRef(new Animated.Value(0)).current

  // Ref для callback — чтобы таймер не перезапускался при смене ссылки на onPlayNext
  const onPlayNextRef = useRef(onPlayNext)
  onPlayNextRef.current = onPlayNext

  // Анимация появления/скрытия
  useEffect(() => {
    if (visible && nextEpisode) {
      setShouldRender(true)
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }).start()
    } else if (shouldRender) {
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(({ finished }) => {
        if (finished) {
          setShouldRender(false)
        }
      })
    }
  }, [visible, nextEpisode, shouldRender, opacity])

  // Обратный отсчёт
  useEffect(() => {
    if (!visible) {
      setCountdown(COUNTDOWN_SECONDS)
      return
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          onPlayNextRef.current()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [visible])

  if (!shouldRender || !nextEpisode) {
    return null
  }

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <View style={styles.content}>
        <Text style={styles.label}>Следующий эпизод через {countdown}...</Text>

        <View style={styles.episodeInfo}>
          <Text style={styles.episodeNumber}>Эпизод {nextEpisode.number}</Text>
          {nextEpisode.name && <Text style={styles.episodeName}>{nextEpisode.name}</Text>}
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.playButton}
            onPress={() => {
              Haptics.medium()
              onPlayNext()
            }}
          >
            <Text style={styles.playButtonText}>▶ Смотреть</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              Haptics.light()
              onCancel()
            }}
          >
            <Text style={styles.cancelButtonText}>Отмена</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 300,
  },
  content: {
    backgroundColor: '#1A202C',
    borderRadius: 16,
    padding: 24,
    minWidth: 280,
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    color: '#A0AEC0',
    marginBottom: 16,
  },
  episodeInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  episodeNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  episodeName: {
    fontSize: 14,
    color: '#CBD5E0',
    textAlign: 'center',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  playButton: {
    backgroundColor: '#805AD5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  playButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButton: {
    backgroundColor: '#2D3748',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#A0AEC0',
  },
})
