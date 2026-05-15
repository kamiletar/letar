/**
 * SkipChapterButton — кнопка пропуска OP/ED
 *
 * Появляется когда текущее время попадает в интро/аутро главу
 */

import { useEffect, useRef, useState } from 'react'
import { Animated, StyleSheet, Text, TouchableOpacity } from 'react-native'

import { Haptics } from '@/services/haptics'

interface Chapter {
  title: string
  startTime: number
  endTime: number
}

interface SkipChapterButtonProps {
  chapters: Chapter[]
  currentTime: number
  onSkip: (endTime: number) => void
}

/** Типы глав, которые можно пропустить */
const SKIPPABLE_TITLES = [
  'op',
  'opening',
  'intro',
  'ed',
  'ending',
  'outro',
  'op/ed',
  'credits',
  'интро',
  'опенинг',
  'эндинг',
  'титры',
]

export function SkipChapterButton({ chapters, currentTime, onSkip }: SkipChapterButtonProps) {
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null)
  const [shouldRender, setShouldRender] = useState(false)
  const opacity = useRef(new Animated.Value(0)).current
  const translateX = useRef(new Animated.Value(50)).current

  // Найти активную главу
  useEffect(() => {
    const chapter = chapters.find((ch) => {
      const isInRange = currentTime >= ch.startTime && currentTime < ch.endTime
      const isSkippable = SKIPPABLE_TITLES.some((t) => ch.title.toLowerCase().includes(t))
      return isInRange && isSkippable
    })

    setActiveChapter(chapter || null)
  }, [chapters, currentTime])

  // Анимация появления/скрытия
  useEffect(() => {
    if (activeChapter) {
      setShouldRender(true)
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start()
    } else if (shouldRender) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: 50, duration: 200, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) {
          setShouldRender(false)
        }
      })
    }
  }, [activeChapter, shouldRender, opacity, translateX])

  if (!shouldRender || !activeChapter) {
    return null
  }

  return (
    <Animated.View style={[styles.container, { opacity, transform: [{ translateX }] }]}>
      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          Haptics.light()
          onSkip(activeChapter.endTime)
        }}
      >
        <Text style={styles.buttonText}>Пропустить</Text>
        <Text style={styles.chapterName}>{activeChapter.title}</Text>
      </TouchableOpacity>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 16,
    bottom: 80, // Над контролами
    zIndex: 300, // Выше GestureOverlay (100) и контролов (200)
    elevation: 5, // Android: z-order для тачей (не слишком большой, чтобы не было тени)
  },
  button: {
    backgroundColor: 'rgba(128, 90, 213, 0.9)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  chapterName: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
})
