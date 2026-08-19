/**
 * @letar/exoplayer-sync
 *
 * React Native компонент для синхронного воспроизведения видео + внешнего аудио
 * через ExoPlayer MergingMediaSource.
 *
 * MergingMediaSource объединяет видео и аудио потоки в единый MediaSource,
 * обеспечивая атомарную синхронизацию на уровне фреймов.
 *
 * @example
 * ```tsx
 * const playerRef = useRef<SyncVideoPlayerRef>(null)
 *
 * <SyncVideoPlayer
 *   ref={playerRef}
 *   videoSource="http://example.com/video.mp4"
 *   audioSource="http://example.com/audio.m4a"
 *   paused={false}
 *   onProgress={({ currentTime }) => console.log(currentTime)}
 *   onLoad={({ duration }) => console.log('Duration:', duration)}
 *   style={{ flex: 1 }}
 * />
 *
 * // Управление через ref
 * playerRef.current?.seek(30)
 * playerRef.current?.pause()
 * ```
 */

import React from 'react'
import {
  findNodeHandle,
  type HostComponent,
  Platform,
  requireNativeComponent,
  StyleSheet,
  UIManager,
  View,
} from 'react-native'

import type {
  NativeSyncVideoViewProps,
  OnErrorData,
  OnLoadData,
  OnProgressData,
  OnSeekData,
  SyncVideoPlayerProps,
  SyncVideoPlayerRef,
} from './types'

export type {
  OnErrorData,
  OnLoadData,
  OnProgressData,
  OnSeekData,
  ResizeMode,
  SyncVideoPlayerProps,
  SyncVideoPlayerRef,
} from './types'

/** RN 0.87 типизирует getViewManagerConfig как Object — Commands есть только в рантайме */
type ViewManagerConfig = { Commands: Record<string, number> }

/** Проверка поддержки платформы */
const IS_ANDROID = Platform.OS === 'android'

/** Native View компонент (только Android) */
const RCTSyncVideoView: HostComponent<NativeSyncVideoViewProps> | null = IS_ANDROID
  ? requireNativeComponent<NativeSyncVideoViewProps>('SyncVideoView')
  : null

/** Имя View Manager для отправки команд */
const VIEW_MANAGER_NAME = 'SyncVideoView'

/**
 * SyncVideoPlayer — компонент для синхронного воспроизведения видео + аудио
 *
 * Использует ExoPlayer с MergingMediaSource для атомарной синхронизации
 * видео и внешнего аудио потоков. Поддерживает:
 * - Синхронный seek/pause/play
 * - Буферизацию обоих потоков
 * - Автоматическое выравнивание длительности
 */
export const SyncVideoPlayer = React.forwardRef<SyncVideoPlayerRef, SyncVideoPlayerProps>(
  function SyncVideoPlayer(props, ref) {
    const {
      videoSource,
      audioSource,
      paused = false,
      volume = 1.0,
      muted = false,
      resizeMode = 'contain',
      style,
      onLoad,
      onProgress,
      onError,
      onEnd,
      onSeek,
    } = props

    const nativeRef = React.useRef<View>(null)

    /** Отправка команды нативному компоненту */
    const dispatchCommand = React.useCallback((commandName: string, args: (string | number)[]) => {
      if (!IS_ANDROID || !nativeRef.current) {
        return
      }

      const nodeHandle = findNodeHandle(nativeRef.current)
      if (nodeHandle == null) {
        return
      }

      const config = UIManager.getViewManagerConfig(VIEW_MANAGER_NAME) as ViewManagerConfig | undefined
      if (!config?.Commands?.[commandName]) {
        console.warn(`[exoplayer-sync] Command ${commandName} not found`)
        return
      }

      UIManager.dispatchViewManagerCommand(nodeHandle, config.Commands[commandName], args)
    }, [])

    /** Императивные методы через ref */
    React.useImperativeHandle(
      ref,
      () => ({
        seek: (positionSeconds: number) => {
          dispatchCommand('seek', [positionSeconds])
        },
        play: () => {
          dispatchCommand('play', [])
        },
        pause: () => {
          dispatchCommand('pause', [])
        },
      }),
      [dispatchCommand],
    )

    /** Обработчик загрузки */
    const handleLoad = React.useCallback(
      (event: { nativeEvent: OnLoadData }) => {
        onLoad?.(event.nativeEvent)
      },
      [onLoad],
    )

    /** Обработчик прогресса */
    const handleProgress = React.useCallback(
      (event: { nativeEvent: OnProgressData }) => {
        onProgress?.(event.nativeEvent)
      },
      [onProgress],
    )

    /** Обработчик ошибки */
    const handleError = React.useCallback(
      (event: { nativeEvent: OnErrorData }) => {
        onError?.(event.nativeEvent)
      },
      [onError],
    )

    /** Обработчик окончания */
    const handleEnd = React.useCallback(() => {
      onEnd?.()
    }, [onEnd])

    /** Обработчик seek */
    const handleSeek = React.useCallback(
      (event: { nativeEvent: OnSeekData }) => {
        onSeek?.(event.nativeEvent)
      },
      [onSeek],
    )

    // На iOS пока не поддерживается — возвращаем placeholder
    if (!IS_ANDROID || !RCTSyncVideoView) {
      return (
        <View style={StyleSheet.flatten([styles.container, style])}>
          <View style={styles.placeholder} />
        </View>
      )
    }

    return (
      <RCTSyncVideoView
        ref={nativeRef as never}
        videoSource={videoSource}
        audioSource={audioSource}
        paused={paused}
        volume={volume}
        muted={muted}
        resizeMode={resizeMode}
        style={StyleSheet.flatten([styles.container, style])}
        onSyncVideoLoad={handleLoad}
        onSyncVideoProgress={handleProgress}
        onSyncVideoError={handleError}
        onSyncVideoEnd={handleEnd}
        onSyncVideoSeek={handleSeek}
      />
    )
  },
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
