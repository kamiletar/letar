/**
 * @letar/exoplayer-ass
 *
 * React Native компонент для рендеринга ASS/SSA субтитров через libass
 */

import React, { useEffect, useRef } from 'react'
import {
  findNodeHandle,
  type HostComponent,
  Platform,
  requireNativeComponent,
  StyleSheet,
  UIManager,
  View,
} from 'react-native'

import type { NativeAssViewProps } from './types'

export type { NativeAssViewProps } from './types'

/** RN 0.87 типизирует getViewManagerConfig как Object — Commands есть только в рантайме */
type ViewManagerConfig = { Commands: Record<string, number> }

/** Проверка поддержки платформы */
const IS_ANDROID = Platform.OS === 'android'

/** Native View компонент (только Android) */
const RCTAssSubtitleView: HostComponent<NativeAssViewProps> | null = IS_ANDROID
  ? requireNativeComponent<NativeAssViewProps>('AssSubtitleView')
  : null

/**
 * NativeAssView — компонент для отображения ASS/SSA субтитров
 *
 * Использует нативный libass через JNI для рендеринга субтитров.
 * Поддерживает все возможности ASS: стили, позиционирование, анимации.
 *
 * @example
 * ```tsx
 * const [currentTime, setCurrentTime] = useState(0)
 *
 * <Video onProgress={({ currentTime }) => setCurrentTime(currentTime * 1000)} />
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
}: NativeAssViewProps) {
  const viewRef = useRef<View>(null)

  // Отправка команд нативному компоненту
  useEffect(() => {
    if (!IS_ANDROID || !viewRef.current) {
      return
    }

    const nodeHandle = findNodeHandle(viewRef.current)
    if (nodeHandle == null) {
      return
    }

    // Загружаем ASS контент при изменении
    UIManager.dispatchViewManagerCommand(
      nodeHandle,
      (UIManager.getViewManagerConfig('AssSubtitleView') as ViewManagerConfig).Commands.loadContent,
      [assContent],
    )
  }, [assContent])

  // Обновление размера кадра
  useEffect(() => {
    if (!IS_ANDROID || !viewRef.current) {
      return
    }

    const nodeHandle = findNodeHandle(viewRef.current)
    if (nodeHandle == null) {
      return
    }

    UIManager.dispatchViewManagerCommand(
      nodeHandle,
      (UIManager.getViewManagerConfig('AssSubtitleView') as ViewManagerConfig).Commands.setFrameSize,
      [videoWidth, videoHeight],
    )
  }, [videoWidth, videoHeight])

  // На iOS пока не поддерживается
  if (!IS_ANDROID || !RCTAssSubtitleView) {
    // Возвращаем пустой View как placeholder
    return <View style={StyleSheet.flatten([styles.container, style])} pointerEvents={pointerEvents} />
  }

  return (
    <RCTAssSubtitleView
      ref={viewRef as never}
      assContent={assContent}
      currentTimeMs={currentTimeMs}
      videoWidth={videoWidth}
      videoHeight={videoHeight}
      fontDir={fontDir}
      style={StyleSheet.flatten([styles.container, style])}
      pointerEvents={pointerEvents}
    />
  )
}

/**
 * Хук для загрузки ASS файла
 *
 * @param url URL ASS файла
 * @returns Содержимое ASS файла
 */
export function useAssContent(url: string | null): string {
  const [content, setContent] = React.useState('')

  React.useEffect(() => {
    if (!url) {
      setContent('')
      return
    }

    let isMounted = true

    fetch(url)
      .then((response) => response.text())
      .then((text) => {
        if (isMounted) {
          setContent(text)
        }
      })
      .catch((error) => {
        console.error('[exoplayer-ass] Failed to load ASS file:', error)
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
