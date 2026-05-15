/**
 * SyncVideoPlayer — компонент для синхронного воспроизведения видео + аудио
 *
 * Использует ExoPlayer с MergingMediaSource для атомарной синхронизации
 * видео и внешнего аудио потоков.
 */

import React, { forwardRef, useCallback, useImperativeHandle, useRef } from 'react'
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native'

import SyncVideoViewNative, { Commands } from '@letar/exoplayer-sync/SyncVideoViewNativeComponent'

/** Режим масштабирования */
export type ResizeMode = 'contain' | 'cover' | 'stretch'

/** Данные события загрузки */
export interface OnLoadData {
  duration: number
  naturalWidth: number
  naturalHeight: number
}

/** Данные события прогресса */
export interface OnProgressData {
  currentTime: number
  playableDuration: number
}

/** Данные события ошибки */
export interface OnErrorData {
  code: string
  message: string
}

/** Данные события seek */
export interface OnSeekData {
  currentTime: number
  seekTime: number
}

/** Данные события тапа */
export interface OnTapData {
  x: number
  y: number
}

/** Props компонента */
export interface SyncVideoPlayerProps {
  videoSource: string
  audioSource?: string | null
  paused?: boolean
  volume?: number
  muted?: boolean
  /** Усиление громкости: 0 = 100%, 100 = 200% */
  volumeBoost?: number
  resizeMode?: ResizeMode
  /** Скорость воспроизведения: 1.0 = нормальная, 2.0 = двойная и т.д. */
  rate?: number
  style?: ViewStyle | ViewStyle[]
  onLoad?: (data: OnLoadData) => void
  onProgress?: (data: OnProgressData) => void
  onError?: (data: OnErrorData) => void
  onEnd?: () => void
  onSeek?: (data: OnSeekData) => void
  /** Тап по видео — используется для toggle контролов */
  onTap?: (data: OnTapData) => void
}

/** Ref методы */
export interface SyncVideoPlayerRef {
  seek: (positionSeconds: number) => void
  play: () => void
  pause: () => void
  setResizeMode: (mode: ResizeMode) => void
}

/** Проверка поддержки платформы */
const IS_ANDROID = Platform.OS === 'android'

/**
 * SyncVideoPlayer — компонент для синхронного воспроизведения видео + аудио
 */
export const SyncVideoPlayer = forwardRef<SyncVideoPlayerRef, SyncVideoPlayerProps>(
  function SyncVideoPlayer(props, ref) {
    const {
      videoSource,
      audioSource,
      paused = false,
      volume = 1.0,
      muted = false,
      volumeBoost = 0,
      resizeMode = 'contain',
      rate = 1.0,
      style,
      onLoad,
      onProgress,
      onError,
      onEnd,
      onSeek,
      onTap,
    } = props

    const nativeRef = useRef<React.ElementRef<typeof SyncVideoViewNative>>(null)

    /** Императивные методы через ref — используют Fabric Commands */
    useImperativeHandle(
      ref,
      () => ({
        seek: (positionSeconds: number) => {
          if (nativeRef.current) {
            Commands.seek(nativeRef.current, positionSeconds)
          }
        },
        play: () => {
          if (nativeRef.current) {
            Commands.play(nativeRef.current)
          }
        },
        pause: () => {
          if (nativeRef.current) {
            Commands.pause(nativeRef.current)
          }
        },
        setResizeMode: (mode: ResizeMode) => {
          if (nativeRef.current) {
            Commands.setResizeMode(nativeRef.current, mode)
          }
        },
      }),
      []
    )

    /** Обработчик загрузки */
    const handleLoad = useCallback(
      (event: { nativeEvent: OnLoadData }) => {
        onLoad?.(event.nativeEvent)
      },
      [onLoad]
    )

    /** Обработчик прогресса */
    const handleProgress = useCallback(
      (event: { nativeEvent: OnProgressData }) => {
        onProgress?.(event.nativeEvent)
      },
      [onProgress]
    )

    /** Обработчик ошибки */
    const handleError = useCallback(
      (event: { nativeEvent: OnErrorData }) => {
        console.error('[SyncVideoPlayer] onError:', event.nativeEvent)
        onError?.(event.nativeEvent)
      },
      [onError]
    )

    /** Обработчик окончания */
    const handleEnd = useCallback(() => {
      onEnd?.()
    }, [onEnd])

    /** Обработчик seek */
    const handleSeek = useCallback(
      (event: { nativeEvent: OnSeekData }) => {
        onSeek?.(event.nativeEvent)
      },
      [onSeek]
    )

    /** Обработчик тапа */
    const handleTap = useCallback(
      (event: { nativeEvent: OnTapData }) => {
        onTap?.(event.nativeEvent)
      },
      [onTap]
    )

    // На iOS пока не поддерживается — возвращаем placeholder
    if (!IS_ANDROID) {
      console.warn('[SyncVideoPlayer] Platform not supported')
      return (
        <View style={[styles.container, style]}>
          <View style={styles.placeholder} />
        </View>
      )
    }

    return (
      <SyncVideoViewNative
        ref={nativeRef}
        videoSource={videoSource}
        audioSource={audioSource ?? undefined}
        paused={paused}
        volume={volume}
        muted={muted}
        volumeBoost={volumeBoost}
        resizeMode={resizeMode}
        rate={rate}
        style={StyleSheet.flatten([styles.container, style])}
        onSyncVideoLoad={handleLoad}
        onSyncVideoProgress={handleProgress}
        onSyncVideoError={handleError}
        onSyncVideoEnd={handleEnd}
        onSyncVideoSeek={handleSeek}
        onSyncVideoTap={handleTap}
      />
    )
  }
)

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
  },
  placeholder: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
})

export default SyncVideoPlayer
