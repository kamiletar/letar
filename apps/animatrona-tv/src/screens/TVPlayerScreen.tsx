/**
 * TVPlayerScreen — полноэкранный видеоплеер для TV
 *
 * Особенности TV:
 * - Управление D-Pad / пультом
 * - Автоскрытие контролов
 * - Увеличенные элементы UI
 * - Поддержка субтитров ASS/SRT
 * - Выбор аудио/субтитров
 */

import { isAssFormat, NativeAssView, useAssContent } from '@letar/exoplayer-ass'
import { type OnErrorData, SyncVideoPlayer, type SyncVideoPlayerRef } from '@letar/exoplayer-sync'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, BackHandler, Pressable, StyleSheet, Text, View } from 'react-native'

import { getAnimeDetails, getAudioCidUrl, getEpisodeVideoUrl, getSubtitleUrlFromCid, saveProgress } from '@/api/client'
import { TVNextEpisodeOverlay } from '@/components/tv/TVNextEpisodeOverlay'
import { TVPlayerControls } from '@/components/tv/TVPlayerControls'
import { audioTracksToItems, subtitleTracksToItems, TVTrackSelector } from '@/components/tv/TVTrackSelector'
import type { TVStackParamList } from '@/navigation/TVNavigator'
import type { TVPressableState } from '@/types/react-native'
import {
  type AnimeDetails,
  type AudioTrack,
  type Episode,
  formatDuration,
  type SubtitleTrack,
  useWatchProgress,
} from '@letar/animatrona-shared'

type Props = NativeStackScreenProps<TVStackParamList, 'Player'>

/** Время автоскрытия контролов (ms) */
const CONTROLS_HIDE_DELAY = 5000

/** Экран плеера */
export function TVPlayerScreen({ navigation, route }: Props): React.JSX.Element {
  const { animeId, episodeId, startTime } = route.params

  // Refs
  const playerRef = useRef<SyncVideoPlayerRef>(null)
  const hideControlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // State
  const [anime, setAnime] = useState<AnimeDetails | null>(null)
  const [episode, setEpisode] = useState<Episode | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Player state
  const [isPlaying, setIsPlaying] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showControls, setShowControls] = useState(true)

  // Audio & Subtitles
  const [selectedAudio, setSelectedAudio] = useState<AudioTrack | null>(null)
  const [selectedSubtitle, setSelectedSubtitle] = useState<SubtitleTrack | null>(null)

  // Track selector modals
  const [showAudioSelector, setShowAudioSelector] = useState(false)
  const [showSubtitleSelector, setShowSubtitleSelector] = useState(false)

  // Next episode overlay
  const [showNextEpisode, setShowNextEpisode] = useState(false)

  // Watch progress hook (с серверной синхронизацией fire-and-forget)
  const watchProgress = useWatchProgress({
    episodeId,
    currentTime,
    duration,
    isReady,
    skipResumePrompt: startTime !== undefined,
    storageKeyPrefix: '@animatrona-tv/watch_progress/',
    onSave: (id, data) => {
      // fire-and-forget — ошибки сохранения игнорируем
      saveProgress(id, data).catch(() => {
        /* игнорируем */
      })
    },
  })

  // Загрузка ASS контента
  const subtitleUrl = useMemo(() => {
    if (!selectedSubtitle) {
      return null
    }
    return getSubtitleUrlFromCid(selectedSubtitle)
  }, [selectedSubtitle])

  const assContent = useAssContent(selectedSubtitle && isAssFormat(selectedSubtitle.format) ? subtitleUrl : null)

  /** Загрузка данных */
  useEffect(() => {
    async function loadData() {
      try {
        const animeData = await getAnimeDetails(animeId)
        setAnime(animeData)

        const ep = animeData.episodes.find((e) => e.id === episodeId)
        if (!ep) {
          throw new Error('Эпизод не найден')
        }
        setEpisode(ep)

        // Выбираем дефолтную аудиодорожку
        const defaultAudio = ep.audioTracks.find((t) => t.isDefault) || ep.audioTracks[0]
        if (defaultAudio) {
          setSelectedAudio(defaultAudio)
        }

        // Выбираем дефолтные субтитры
        const defaultSub = ep.subtitleTracks.find((t) => t.isDefault)
        if (defaultSub) {
          setSelectedSubtitle(defaultSub)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки')
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [animeId, episodeId])

  /** Показать контролы и сбросить таймер скрытия */
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true)

    // Сбрасываем предыдущий таймер
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current)
    }

    // Запускаем новый таймер
    hideControlsTimerRef.current = setTimeout(() => {
      if (isPlaying && !showAudioSelector && !showSubtitleSelector) {
        setShowControls(false)
      }
    }, CONTROLS_HIDE_DELAY)
  }, [isPlaying, showAudioSelector, showSubtitleSelector])

  /** Обработка кнопки Back */
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Сначала закрываем модальные окна
      if (showAudioSelector) {
        setShowAudioSelector(false)
        return true
      }
      if (showSubtitleSelector) {
        setShowSubtitleSelector(false)
        return true
      }
      navigation.goBack()
      return true
    })

    return () => backHandler.remove()
  }, [navigation, showAudioSelector, showSubtitleSelector])

  /** Пауза/воспроизведение */
  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      playerRef.current?.pause()
    } else {
      playerRef.current?.play()
    }
    setIsPlaying(!isPlaying)
  }, [isPlaying])

  /** Перемотка */
  const handleSeek = useCallback(
    (position: number) => {
      const clampedPosition = Math.max(0, Math.min(duration, position))
      playerRef.current?.seek(clampedPosition)
      setCurrentTime(clampedPosition)
      showControlsTemporarily()
    },
    [duration, showControlsTemporarily],
  )

  /** Загрузка видео */
  const handleLoad = useCallback(
    (data: { duration: number }) => {
      setDuration(data.duration)
      setIsReady(true)

      // Если есть startTime из route или saved position
      if (startTime) {
        handleSeek(startTime)
      } else if (watchProgress.savedPosition) {
        handleSeek(watchProgress.savedPosition)
      }

      // Автостарт
      playerRef.current?.play()
      setIsPlaying(true)
    },
    [startTime, watchProgress.savedPosition, handleSeek],
  )

  /** Прогресс воспроизведения */
  const handleProgress = useCallback((data: { currentTime: number }) => {
    setCurrentTime(data.currentTime)
  }, [])

  /** Следующий эпизод (если есть) */
  const nextEpisode = useMemo(() => {
    if (!anime || !episode) {
      return null
    }
    const currentIndex = anime.episodes.findIndex((e) => e.id === episode.id)
    if (currentIndex === -1 || currentIndex >= anime.episodes.length - 1) {
      return null
    }
    return anime.episodes[currentIndex + 1]
  }, [anime, episode])

  /** Окончание видео */
  const handleEnd = useCallback(() => {
    setIsPlaying(false)
    setShowControls(true)
    watchProgress.clearProgress()

    // Показать overlay следующего эпизода
    if (nextEpisode) {
      setShowNextEpisode(true)
    }
  }, [watchProgress, nextEpisode])

  /** Перейти к следующему эпизоду */
  const handlePlayNextEpisode = useCallback(() => {
    if (!nextEpisode) {
      return
    }
    setShowNextEpisode(false)
    navigation.replace('Player', {
      animeId,
      episodeId: nextEpisode.id,
    })
  }, [nextEpisode, navigation, animeId])

  /** Отменить автопереход */
  const handleCancelNextEpisode = useCallback(() => {
    setShowNextEpisode(false)
  }, [])

  /** Ошибка */
  const handleError = useCallback((err: OnErrorData) => {
    setError(err.message)
    setIsPlaying(false)
  }, [])

  /** Выбор аудио */
  const handleAudioSelect = useCallback(
    (audioId: string | null) => {
      if (!episode || !audioId) {
        return
      }
      const audio = episode.audioTracks.find((t) => t.id === audioId)
      if (audio) {
        setSelectedAudio(audio)
      }
      setShowAudioSelector(false)
    },
    [episode],
  )

  /** Выбор субтитров */
  const handleSubtitleSelect = useCallback(
    (subtitleId: string | null) => {
      if (!episode) {
        return
      }
      if (subtitleId === null) {
        setSelectedSubtitle(null)
      } else {
        const sub = episode.subtitleTracks.find((t) => t.id === subtitleId)
        if (sub) {
          setSelectedSubtitle(sub)
        }
      }
      setShowSubtitleSelector(false)
    },
    [episode],
  )

  // Очистка таймера при размонтировании
  useEffect(() => {
    return () => {
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current)
      }
    }
  }, [])

  // Загрузка
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    )
  }

  // Ошибка
  if (error || !episode) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error || 'Эпизод не найден'}</Text>
        <View style={styles.errorButtons}>
          <Pressable
            style={({ focused }: TVPressableState) => [styles.retryButton, focused && styles.retryButtonFocused]}
            onPress={() => navigation.goBack()}
            hasTVPreferredFocus
          >
            <Text style={styles.retryButtonText}>Назад</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  // URLs
  const videoUrl = getEpisodeVideoUrl(episode)
  const audioUrl = selectedAudio?.audioCid ? getAudioCidUrl(selectedAudio.audioCid) : undefined

  if (!videoUrl) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Видео недоступно</Text>
        <View style={styles.errorButtons}>
          <Pressable
            style={({ focused }: TVPressableState) => [styles.retryButton, focused && styles.retryButtonFocused]}
            onPress={() => navigation.goBack()}
            hasTVPreferredFocus
          >
            <Text style={styles.retryButtonText}>Назад</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  // Определяем, показывать ли ASS субтитры
  const showAssSubtitles = selectedSubtitle && isAssFormat(selectedSubtitle.format) && assContent

  return (
    <View style={styles.container}>
      {/* Видеоплеер */}
      <SyncVideoPlayer
        ref={playerRef}
        videoSource={videoUrl}
        audioSource={audioUrl}
        paused={!isPlaying}
        style={styles.player}
        onLoad={handleLoad}
        onProgress={handleProgress}
        onEnd={handleEnd}
        onError={handleError}
      />

      {/* ASS субтитры */}
      {showAssSubtitles && (
        <NativeAssView
          assContent={assContent}
          currentTimeMs={currentTime * 1000}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      )}

      {/* Невидимый Pressable — ловит D-Pad center когда контролы скрыты */}
      {!showControls && (
        <Pressable style={StyleSheet.absoluteFill} onPress={showControlsTemporarily} hasTVPreferredFocus />
      )}

      {/* Overlay контролов */}
      {showControls && (
        <View style={styles.overlay}>
          {/* Верхний gradient */}
          <View style={styles.topGradient}>
            <View style={styles.topBar}>
              <View style={styles.titleRow}>
                <View style={styles.titleInfo}>
                  <Text style={styles.animeTitle} numberOfLines={1}>
                    {anime?.name}
                  </Text>
                  <Text style={styles.episodeTitle}>
                    Эпизод {episode.number}
                    {episode.name ? ` — ${episode.name}` : ''}
                  </Text>
                </View>

                {/* Кнопки настроек */}
                <View style={styles.settingsButtons}>
                  {/* Аудио */}
                  {episode.audioTracks.length > 1 && (
                    <Pressable
                      style={(
                        { focused }: TVPressableState,
                      ) => [styles.settingsButton, focused && styles.settingsButtonFocused]}
                      onPress={() => setShowAudioSelector(true)}
                    >
                      <Text style={styles.settingsButtonText}>🔊 Аудио</Text>
                    </Pressable>
                  )}

                  {/* Субтитры */}
                  {episode.subtitleTracks.length > 0 && (
                    <Pressable
                      style={(
                        { focused }: TVPressableState,
                      ) => [styles.settingsButton, focused && styles.settingsButtonFocused]}
                      onPress={() => setShowSubtitleSelector(true)}
                    >
                      <Text style={styles.settingsButtonText}>💬 Субтитры</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* Средняя прозрачная область — видео видно лучше */}
          <View style={styles.middleArea} />

          {/* Нижний gradient + контролы */}
          <View style={styles.bottomGradient}>
            <TVPlayerControls
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              onPlayPause={handlePlayPause}
              onSeek={handleSeek}
            />
          </View>
        </View>
      )}

      {/* Resume Overlay */}
      {watchProgress.showResumePrompt && (
        <View style={styles.resumeOverlay}>
          <View style={styles.resumeDialog}>
            <Text style={styles.resumeTitle}>Продолжить просмотр?</Text>
            <Text style={styles.resumeText}>Вы остановились на {formatDuration(watchProgress.savedPosition || 0)}</Text>
            <View style={styles.resumeButtons}>
              <Pressable
                style={({ focused }: TVPressableState) => [styles.resumeButton, focused && styles.resumeButtonFocused]}
                onPress={() => {
                  const pos = watchProgress.resumeFromSaved()
                  handleSeek(pos)
                }}
                hasTVPreferredFocus
              >
                <Text style={styles.resumeButtonText}>Продолжить</Text>
              </Pressable>
              <Pressable
                style={({ focused }: TVPressableState) => [
                  styles.resumeButton,
                  styles.resumeButtonSecondary,
                  focused && styles.resumeButtonFocused,
                ]}
                onPress={watchProgress.startFromBeginning}
              >
                <Text style={styles.resumeButtonText}>Сначала</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Audio Selector */}
      <TVTrackSelector
        visible={showAudioSelector}
        title="Выберите аудио"
        tracks={audioTracksToItems(episode.audioTracks, selectedAudio?.id || null)}
        onSelect={handleAudioSelect}
        onClose={() => setShowAudioSelector(false)}
      />

      {/* Subtitle Selector */}
      <TVTrackSelector
        visible={showSubtitleSelector}
        title="Выберите субтитры"
        tracks={subtitleTracksToItems(episode.subtitleTracks, selectedSubtitle?.id || null)}
        onSelect={handleSubtitleSelect}
        onClose={() => setShowSubtitleSelector(false)}
        showDisableOption
      />

      {/* Next Episode Overlay */}
      {showNextEpisode && nextEpisode && (
        <TVNextEpisodeOverlay
          nextEpisodeNumber={nextEpisode.number}
          nextEpisodeName={nextEpisode.name}
          onPlayNext={handlePlayNextEpisode}
          onCancel={handleCancelNextEpisode}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
  },
  errorButtons: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 24,
  },
  retryButton: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 4,
    borderColor: 'transparent',
  },
  retryButtonFocused: {
    borderColor: '#fff',
    backgroundColor: '#8b5cf6',
    transform: [{ scale: 1.08 }],
    elevation: 8,
  },
  retryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  player: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
  },
  topGradient: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  middleArea: {
    flex: 1,
  },
  bottomGradient: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },

  // Верхняя панель
  topBar: {
    padding: 32,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleInfo: {
    flex: 1,
  },
  animeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  episodeTitle: {
    fontSize: 18,
    color: '#aaa',
    marginTop: 4,
  },
  settingsButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  settingsButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 4,
    borderColor: 'transparent',
  },
  settingsButtonFocused: {
    borderColor: '#fff',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    transform: [{ scale: 1.1 }],
    elevation: 8,
  },
  settingsButtonText: {
    fontSize: 18,
    color: '#fff',
  },

  // Resume overlay
  resumeOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumeDialog: {
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
  },
  resumeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  resumeText: {
    fontSize: 18,
    color: '#aaa',
    marginBottom: 24,
  },
  resumeButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  resumeButton: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 4,
    borderColor: 'transparent',
  },
  resumeButtonSecondary: {
    backgroundColor: '#333',
  },
  resumeButtonFocused: {
    borderColor: '#fff',
    backgroundColor: '#8b5cf6',
    transform: [{ scale: 1.1 }],
    elevation: 8,
  },
  resumeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
})
