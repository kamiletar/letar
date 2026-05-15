/**
 * ResumeOverlay — оверлей для продолжения просмотра
 *
 * Показывается при открытии эпизода с сохранённым прогрессом
 *
 * ВАЖНО: Использует условный рендеринг вместо Animated exiting,
 * чтобы избежать перехвата тапов во время анимации выхода.
 */

import { useEffect, useRef, useState } from 'react'
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { Haptics } from '@/services/haptics'
import { formatDuration, type UseWatchProgressResult } from '@letar/animatrona-shared'

interface ResumeOverlayProps {
  progressState: UseWatchProgressResult
}

export function ResumeOverlay({ progressState }: ResumeOverlayProps) {
  const { savedPosition, showResumePrompt, resumeFromSaved, startFromBeginning } = progressState

  // Локальное состояние для управления рендерингом
  const [shouldRender, setShouldRender] = useState(false)
  const opacity = useRef(new Animated.Value(0)).current

  // Управление появлением/исчезновением
  useEffect(() => {
    if (showResumePrompt && savedPosition !== null) {
      setShouldRender(true)
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start()
    } else if (shouldRender) {
      Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(({ finished }) => {
        if (finished) {
          setShouldRender(false)
        }
      })
    }
  }, [showResumePrompt, savedPosition, shouldRender, opacity])

  // Не рендерим если не нужно
  if (!shouldRender) {
    return null
  }

  // КРИТИЧНО: если showResumePrompt=false, значит пользователь уже выбрал
  // В этом случае ставим pointerEvents="none" чтобы тапы проходили сквозь
  const isExiting = !showResumePrompt || savedPosition === null

  const handleResume = () => {
    Haptics.medium()
    resumeFromSaved()
  }

  const handleStartFromBeginning = () => {
    Haptics.light()
    startFromBeginning()
  }

  // КРИТИЧНО: Если isExiting — не рендерим ничего кроме пустого контейнера с анимацией
  if (isExiting) {
    return <Animated.View style={[styles.container, { opacity }]} pointerEvents="none" />
  }

  return (
    <Animated.View style={[styles.container, { opacity }]} pointerEvents="auto">
      {/* Затемнение */}
      <View style={styles.backdrop} />

      {/* Контент */}
      <View style={styles.content}>
        <Text style={styles.title}>Продолжить просмотр?</Text>

        <Text style={styles.description}>Вы остановились на {formatDuration(savedPosition ?? 0)}</Text>

        <View style={styles.buttons}>
          <TouchableOpacity style={styles.resumeButton} onPress={handleResume}>
            <Text style={styles.resumeIcon}>▶</Text>
            <Text style={styles.resumeButtonText}>Продолжить с {formatDuration(savedPosition ?? 0)}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.restartButton} onPress={handleStartFromBeginning}>
            <Text style={styles.restartButtonText}>Сначала</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 900,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  content: {
    backgroundColor: '#1A202C',
    borderRadius: 16,
    padding: 24,
    minWidth: 300,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#A0AEC0',
    marginBottom: 24,
  },
  buttons: {
    width: '100%',
    gap: 12,
  },
  resumeButton: {
    backgroundColor: '#805AD5',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  resumeIcon: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  resumeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  restartButton: {
    backgroundColor: '#2D3748',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
  },
  restartButtonText: {
    fontSize: 16,
    color: '#A0AEC0',
  },
})
