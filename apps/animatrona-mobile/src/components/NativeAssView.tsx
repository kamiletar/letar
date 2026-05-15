/**
 * NativeAssView — компонент для отображения ASS/SSA субтитров
 *
 * Использует нативный libass через JNI для рендеринга субтитров.
 * Поддерживает все возможности ASS: стили, позиционирование, анимации.
 */

import React, { useEffect, useRef, useState } from 'react'
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native'

import AssSubtitleViewNative, { Commands } from '@letar/exoplayer-ass/AssSubtitleViewNativeComponent'

/** Props компонента */
export interface NativeAssViewProps {
  /** Содержимое ASS файла */
  assContent: string
  /** Текущее время в миллисекундах */
  currentTimeMs: number
  /** Ширина видео (для корректного позиционирования) */
  videoWidth?: number
  /** Высота видео */
  videoHeight?: number
  /** Путь к папке со шрифтами */
  fontDir?: string | null
  /** Стиль контейнера */
  style?: ViewStyle | ViewStyle[]
  /** Pointer events (по умолчанию 'none' — субтитры не блокируют касания) */
  pointerEvents?: 'none' | 'auto' | 'box-none' | 'box-only'
  /** Масштаб шрифта (1.0 = оригинал) */
  fontScale?: number
}

/** Проверка поддержки платформы */
const IS_ANDROID = Platform.OS === 'android'

/**
 * NativeAssView — компонент для отображения ASS/SSA субтитров
 *
 * @example
 * ```tsx
 * const [currentTime, setCurrentTime] = useState(0)
 *
 * <SyncVideoPlayer onProgress={({ currentTime }) => setCurrentTime(currentTime * 1000)} />
 * <NativeAssView
 *   assContent={assFileContent}
 *   currentTimeMs={currentTime}
 *   style={StyleSheet.absoluteFill}
 *   pointerEvents="none"
 * />
 * ```
 */
export function NativeAssView({
  assContent,
  currentTimeMs,
  videoWidth = 1920,
  videoHeight = 1080,
  fontDir,
  style,
  pointerEvents = 'none',
  fontScale,
}: NativeAssViewProps) {
  const viewRef = useRef<React.ElementRef<typeof AssSubtitleViewNative>>(null)

  // Загружаем ASS контент при изменении
  useEffect(() => {
    if (assContent && viewRef.current) {
      Commands.loadContent(viewRef.current, assContent)
    }
  }, [assContent])

  // Обновление размера кадра
  useEffect(() => {
    if (viewRef.current) {
      Commands.setFrameSize(viewRef.current, videoWidth, videoHeight)
    }
  }, [videoWidth, videoHeight])

  // Обновление масштаба шрифта
  useEffect(() => {
    if (fontScale != null && viewRef.current) {
      Commands.setFontScale(viewRef.current, fontScale)
    }
  }, [fontScale])

  // На iOS пока не поддерживается — возвращаем пустой View
  if (!IS_ANDROID) {
    return <View style={[styles.container, style]} pointerEvents={pointerEvents} />
  }

  return (
    <AssSubtitleViewNative
      ref={viewRef}
      assContent={assContent}
      currentTimeMs={currentTimeMs}
      videoWidth={videoWidth}
      videoHeight={videoHeight}
      fontDir={fontDir ?? undefined}
      style={StyleSheet.flatten([styles.container, style])}
      pointerEvents={pointerEvents}
    />
  )
}

/**
 * Хук для загрузки ASS файла по URL
 *
 * @param url URL ASS файла
 * @returns Содержимое ASS файла
 */
export function useAssContent(url: string | null): string {
  const [content, setContent] = useState('')

  useEffect(() => {
    if (!url) {
      setContent('')
      return
    }

    let isMounted = true

    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        return response.text()
      })
      .then((text) => {
        if (isMounted) {
          setContent(text)
        }
      })
      .catch((error) => {
        console.error('[useAssContent] Не удалось загрузить ASS файл:', error)
        if (isMounted) {
          setContent('')
        }
      })

    return () => {
      isMounted = false
    }
  }, [url])

  return content
}

/**
 * Проверка формата субтитров — ASS или SSA
 */
export function isAssFormat(format: string): boolean {
  const lower = format.toLowerCase()
  return lower === 'ass' || lower === 'ssa'
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
})

export default NativeAssView
