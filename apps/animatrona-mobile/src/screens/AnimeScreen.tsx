/**
 * Экран деталей аниме
 *
 * Показывает информацию об аниме и список эпизодов по сезонам
 */

import { useFocusEffect } from '@react-navigation/native'
import { ArrowLeft, Check, Download, Play, RotateCcw } from 'lucide-react-native'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { getAnimeDetails, getPosterUrl } from '@/api'
import { useAnimeLayout, useOrientation } from '@/hooks/useOrientation'
import type { AnimeScreenProps } from '@/navigation/types'
import { enqueueEpisodeDownload } from '@/services/downloadManager'
import { Haptics } from '@/services/haptics'
import { useDownloadsStore } from '@/store/downloads'
import { useOfflineStore } from '@/store/offline'
import type { AnimeDetails, Episode } from '@letar/animatrona-shared'
import { getStoredProgress, type WatchProgressData } from '@letar/animatrona-shared'

interface SeasonSection {
  title: string
  data: Episode[]
  seasonNumber: number
}

/** Форматирование времени для отображения (мм:сс) */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function AnimeScreen({ navigation, route }: AnimeScreenProps) {
  const { animeId } = route.params

  // Адаптивный layout
  const { isLandscape } = useOrientation()
  const layout = useAnimeLayout()

  const [anime, setAnime] = useState<AnimeDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const downloaded = useDownloadsStore((s) => s.downloaded)
  const downloadQueue = useDownloadsStore((s) => s.queue)
  const isOffline = useOfflineStore((s) => !s.isServerReachable)

  useEffect(() => {
    setLoading(true)
    setError(null)

    getAnimeDetails(animeId)
      .then(setAnime)
      .catch((err) => setError(err instanceof Error ? err.message : 'Ошибка'))
      .finally(() => setLoading(false))
  }, [animeId, retryCount])

  // Группировка эпизодов по сезонам
  const sections: SeasonSection[] = useMemo(() => {
    if (!anime) {
      return []
    }

    const seasonMap = new Map<number, Episode[]>()
    const seasonNames = new Map<number, string | null>()

    for (const episode of anime.episodes) {
      const episodes = seasonMap.get(episode.seasonNumber) || []
      episodes.push(episode)
      seasonMap.set(episode.seasonNumber, episodes)
      if (episode.seasonName) {
        seasonNames.set(episode.seasonNumber, episode.seasonName)
      }
    }

    return Array.from(seasonMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([seasonNumber, episodes]) => ({
        title: seasonNames.get(seasonNumber) || `Сезон ${seasonNumber}`,
        data: episodes.sort((a, b) => a.number - b.number),
        seasonNumber,
      }))
  }, [anime])

  // Последний просмотренный незавершённый эпизод для кнопки "Продолжить"
  // Используем локальный AsyncStorage, т.к. API может не иметь актуального прогресса
  const [lastWatchedEpisode, setLastWatchedEpisode] = useState<
    {
      episode: Episode
      progress: WatchProgressData
    } | null
  >(null)

  // Прогресс просмотра для всех эпизодов (из AsyncStorage)
  const [episodeProgress, setEpisodeProgress] = useState<Map<string, WatchProgressData>>(new Map())

  // Загружаем прогресс из AsyncStorage для всех эпизодов
  const loadAllProgress = useCallback(async () => {
    if (!anime) {
      return
    }

    let lastWatched: { episode: Episode; progress: WatchProgressData; savedAt: number } | null = null
    const progressMap = new Map<string, WatchProgressData>()

    for (const episode of anime.episodes) {
      const progress = await getStoredProgress(episode.id)
      if (progress) {
        // Сохраняем прогресс для отображения в списке
        progressMap.set(episode.id, progress)

        // Ищем самый последний по времени сохранения
        if (!lastWatched || progress.savedAt > lastWatched.savedAt) {
          lastWatched = { episode, progress, savedAt: progress.savedAt }
        }
      }
    }

    setEpisodeProgress(progressMap)

    if (lastWatched) {
      setLastWatchedEpisode({ episode: lastWatched.episode, progress: lastWatched.progress })
    } else {
      setLastWatchedEpisode(null)
    }
  }, [anime])

  // Обновляем данные при каждом фокусе экрана (в т.ч. при возврате с PlayerScreen)
  useFocusEffect(
    useCallback(() => {
      // Рефетч деталей аниме с сервера (обновляет watchStatus, episodeCount и т.д.)
      getAnimeDetails(animeId)
        .then(setAnime)
        .catch(() => undefined) // Тихо — оффлайн покажет кэш
      // Обновляем прогресс из AsyncStorage (прогресс-бары эпизодов)
      loadAllProgress()
    }, [animeId, loadAllProgress]),
  )

  const handleEpisodePress = useCallback(
    (episode: Episode) => {
      if (!episode.videoCid && !episode.videoPath) {
        return // Нет видео
      }
      Haptics.light()
      navigation.navigate('Player', {
        episodeId: episode.id,
        animeId,
        startTime: episode.progress?.currentTime,
      })
    },
    [navigation, animeId],
  )

  const handleBack = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  // Продолжить просмотр — автоматически переходит на сохранённую позицию
  const handleContinueWatching = useCallback(() => {
    if (!lastWatchedEpisode) {
      return
    }
    Haptics.light()
    navigation.navigate('Player', {
      episodeId: lastWatchedEpisode.episode.id,
      animeId,
      startTime: lastWatchedEpisode.progress.position,
    })
  }, [navigation, animeId, lastWatchedEpisode])

  const handleDownloadEpisode = useCallback(
    (episode: Episode) => {
      if (!anime) {
        return
      }
      Haptics.light()
      enqueueEpisodeDownload(animeId, anime.name, episode)
    },
    [anime, animeId],
  )

  const handleDownloadSeason = useCallback(
    (section: SeasonSection) => {
      if (!anime) {
        return
      }
      const episodesToDownload = section.data.filter(
        (ep) => ep.videoCid && !(ep.id in downloaded) && !downloadQueue.find((t) => t.episodeId === ep.id),
      )
      if (episodesToDownload.length === 0) {
        return
      }
      Haptics.medium()
      for (const ep of episodesToDownload) {
        enqueueEpisodeDownload(animeId, anime.name, ep)
      }
    },
    [anime, animeId, downloaded, downloadQueue],
  )

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#805AD5" />
        </View>
      </SafeAreaView>
    )
  }

  if (error || !anime) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error || 'Аниме не найдено'}</Text>
          <View style={styles.errorActions}>
            <TouchableOpacity style={styles.retryButton} onPress={() => setRetryCount((c) => c + 1)}>
              <RotateCcw size={16} color="#FFFFFF" />
              <Text style={styles.retryButtonText}>Повторить</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Text style={styles.backButtonText}>Назад</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  const renderEpisodeItem = ({ item: episode }: { item: Episode }) => {
    const isDownloaded = episode.id in downloaded
    const task = downloadQueue.find((t) => t.episodeId === episode.id)
    const hasVideo = episode.videoCid || episode.videoPath || isDownloaded

    // Используем локальный прогресс из AsyncStorage (приоритет) или из API
    const localProgress = episodeProgress.get(episode.id)
    const progressPercent = localProgress
      ? Math.round((localProgress.position / localProgress.duration) * 100)
      : episode.progress && episode.durationMs
      ? Math.round((episode.progress.currentTime / (episode.durationMs / 1000)) * 100)
      : 0
    // Считаем просмотренным если прогресс > 90%
    const isCompleted = progressPercent >= 90 || episode.progress?.completed

    return (
      <TouchableOpacity
        style={[styles.episodeRow, !hasVideo && styles.episodeRowDisabled]}
        onPress={() => handleEpisodePress(episode)}
        disabled={!hasVideo}
        activeOpacity={0.7}
      >
        <View style={styles.episodeNumber}>
          <Text style={[styles.episodeNumberText, isCompleted && styles.episodeCompleted]}>{episode.number}</Text>
        </View>

        <View style={styles.episodeInfo}>
          <Text style={[styles.episodeTitle, !hasVideo && styles.episodeTitleDisabled]} numberOfLines={1}>
            {episode.name || `Эпизод ${episode.number}`}
          </Text>
          {episode.durationMs && (
            <Text style={styles.episodeDuration}>{Math.round(episode.durationMs / 60000)} мин</Text>
          )}
        </View>

        {/* Прогресс */}
        {progressPercent > 0 && progressPercent < 100 && (
          <View style={styles.episodeProgress}>
            <View style={[styles.episodeProgressFill, { width: `${progressPercent}%` }]} />
          </View>
        )}

        {isCompleted && <View style={styles.completedIndicator} />}

        {/* Кнопка скачивания */}
        {isDownloaded
          ? (
            <View style={styles.downloadedBadge}>
              <Check size={14} color="#FFFFFF" />
            </View>
          )
          : task
          ? (
            <View style={styles.downloadingBadge}>
              <Text style={styles.downloadingBadgeText}>
                {task.status === 'downloading' ? `${Math.round(task.progress * 100)}%` : '…'}
              </Text>
            </View>
          )
          : episode.videoCid && !isOffline
          ? (
            <TouchableOpacity
              style={styles.downloadButton}
              onPress={() => handleDownloadEpisode(episode)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Download size={14} color="#805AD5" />
            </TouchableOpacity>
          )
          : null}
      </TouchableOpacity>
    )
  }

  const renderSectionHeader = ({ section }: { section: SeasonSection }) => {
    // Считаем, сколько эпизодов можно скачать
    const downloadableCount = section.data.filter(
      (ep) => ep.videoCid && !(ep.id in downloaded) && !downloadQueue.find((t) => t.episodeId === ep.id),
    ).length

    return (
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionCount}>{section.data.length} эп.</Text>
        </View>
        {downloadableCount > 0 && !isOffline && (
          <TouchableOpacity
            style={styles.downloadSeasonButton}
            onPress={() => handleDownloadSeason(section)}
          >
            <Download size={12} color="#805AD5" />
            <Text style={styles.downloadSeasonText}>Скачать все</Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  // Левая панель (постер + метаданные) — для split-view
  const LeftPanel = () => (
    <View style={[styles.leftPanel, { width: layout.leftPanelWidth }]}>
      <Image
        source={{ uri: anime.posterPath || getPosterUrl(animeId) }}
        style={[styles.posterLarge, { width: layout.posterWidth, height: layout.posterHeight }]}
      />
      <View style={styles.metaContainer}>
        <Text style={styles.animeTitleSplit} numberOfLines={3}>
          {anime.name}
        </Text>
        {anime.originalName && (
          <Text style={styles.animeOriginalTitle} numberOfLines={1}>
            {anime.originalName}
          </Text>
        )}
        <View style={styles.animeMeta}>
          {anime.year && <Text style={styles.animeMetaText}>{anime.year}</Text>}
          {anime.rating && <Text style={styles.animeMetaText}>★ {anime.rating.toFixed(1)}</Text>}
          <Text style={styles.animeMetaText}>{anime.episodeCount} эп.</Text>
        </View>
        {/* Жанры */}
        {anime.genres.length > 0 && (
          <View style={styles.genresWrap}>
            {anime.genres.slice(0, 4).map((genre) => (
              <View key={genre} style={styles.genreChip}>
                <Text style={styles.genreText}>{genre}</Text>
              </View>
            ))}
          </View>
        )}
        {/* Описание */}
        {anime.description && (
          <Text style={styles.descriptionSplit} numberOfLines={isLandscape ? 6 : 4}>
            {anime.description}
          </Text>
        )}
        {/* Кнопка "Продолжить" в landscape */}
        {lastWatchedEpisode && (
          <TouchableOpacity style={styles.continueButtonSplit} onPress={handleContinueWatching} activeOpacity={0.8}>
            <Play size={20} color="#FFFFFF" style={{ marginLeft: 2 }} />
            <View style={styles.continueTextContainer}>
              <Text style={styles.continueTitle}>Продолжить</Text>
              <Text style={styles.continueSubtitleSplit}>
                Эп. {lastWatchedEpisode.episode.number} • {formatTime(lastWatchedEpisode.progress.position)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )

  // Landscape: Split-view layout
  if (layout.useSplitView) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.headerContainerLandscape}>
          <TouchableOpacity style={styles.backButtonHeader} onPress={handleBack}>
            <ArrowLeft size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitleLandscape} numberOfLines={1}>
            {anime.name}
          </Text>
          {/* Кнопка "Продолжить" в header для landscape */}
          {lastWatchedEpisode && (
            <TouchableOpacity style={styles.continueButtonHeader} onPress={handleContinueWatching}>
              <Play size={12} color="#FFFFFF" style={{ marginLeft: 1 }} />
              <Text style={styles.continueTextHeader}>
                Эп. {lastWatchedEpisode.episode.number} • {formatTime(lastWatchedEpisode.progress.position)}
              </Text>
            </TouchableOpacity>
          )}
        </SafeAreaView>

        <View style={styles.splitContainer}>
          <LeftPanel />
          {/* Правая панель — список эпизодов */}
          <SectionList
            style={styles.rightPanel}
            sections={sections}
            keyExtractor={(item) => item.id}
            renderItem={renderEpisodeItem}
            renderSectionHeader={renderSectionHeader}
            stickySectionHeadersEnabled
            contentContainerStyle={styles.episodesListLandscape}
          />
        </View>
      </View>
    )
  }

  // Portrait: Вертикальный layout
  return (
    <View style={styles.container}>
      {/* Простой header без градиента */}
      <SafeAreaView edges={['top']} style={styles.headerContainer}>
        {/* Кнопка назад */}
        <TouchableOpacity style={styles.backButtonHeader} onPress={handleBack}>
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Инфо об аниме */}
        <View style={styles.animeHeader}>
          <Image source={{ uri: anime.posterPath || getPosterUrl(animeId) }} style={styles.posterSmall} />
          <View style={styles.animeHeaderInfo}>
            <Text style={styles.animeTitle} numberOfLines={2}>
              {anime.name}
            </Text>
            {anime.originalName && (
              <Text style={styles.animeOriginalTitle} numberOfLines={1}>
                {anime.originalName}
              </Text>
            )}
            <View style={styles.animeMeta}>
              {anime.year && <Text style={styles.animeMetaText}>{anime.year}</Text>}
              {anime.rating && <Text style={styles.animeMetaText}>★ {anime.rating.toFixed(1)}</Text>}
              <Text style={styles.animeMetaText}>{anime.episodeCount} эп.</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>

      {/* Кнопка "Продолжить просмотр" — если есть незавершённый эпизод */}
      {lastWatchedEpisode && (
        <TouchableOpacity style={styles.continueButton} onPress={handleContinueWatching} activeOpacity={0.8}>
          <View style={styles.continueButtonContent}>
            <Play size={20} color="#FFFFFF" style={{ marginLeft: 2 }} />
            <View style={styles.continueTextContainer}>
              <Text style={styles.continueTitle}>Продолжить просмотр</Text>
              <Text style={styles.continueSubtitle}>
                Эпизод {lastWatchedEpisode.episode.number}
                {lastWatchedEpisode.episode.name ? ` • ${lastWatchedEpisode.episode.name}` : ''}
                {' • '}
                {formatTime(lastWatchedEpisode.progress.position)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      )}

      {/* Описание и жанры */}
      <View style={styles.descriptionContainer}>
        {anime.genres.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.genresContainer}>
            {anime.genres.map((genre) => (
              <View key={genre} style={styles.genreChip}>
                <Text style={styles.genreText}>{genre}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {anime.description && (
          <Text style={styles.description} numberOfLines={4}>
            {anime.description}
          </Text>
        )}
      </View>

      {/* Список эпизодов */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderEpisodeItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled
        contentContainerStyle={styles.episodesList}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1117',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  // Landscape split-view
  splitContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  leftPanel: {
    padding: 16,
    borderRightWidth: 1,
    borderRightColor: '#2D3748',
  },
  rightPanel: {
    flex: 1,
  },
  posterLarge: {
    borderRadius: 12,
    backgroundColor: '#2D3748',
    marginBottom: 16,
    // Тень
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  metaContainer: {
    flex: 1,
  },
  animeTitleSplit: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  genresWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  descriptionSplit: {
    fontSize: 13,
    color: '#CBD5E0',
    lineHeight: 18,
    marginTop: 12,
  },
  headerContainerLandscape: {
    backgroundColor: '#171923',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 12,
  },
  headerTitleLandscape: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  continueButtonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#805AD5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  continueTextHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  episodesListLandscape: {
    paddingBottom: 16,
  },
  // Portrait header
  headerContainer: {
    backgroundColor: '#171923',
    paddingBottom: 16,
  },
  backButtonHeader: {
    marginLeft: 16,
    marginTop: 8,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2D3748',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  animeHeader: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
    paddingHorizontal: 16,
  },
  posterSmall: {
    width: 100,
    height: 150,
    borderRadius: 8,
    backgroundColor: '#2D3748',
  },
  animeHeaderInfo: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  animeTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  animeOriginalTitle: {
    fontSize: 14,
    color: '#A0AEC0',
    marginBottom: 8,
  },
  animeMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  animeMetaText: {
    fontSize: 14,
    color: '#A0AEC0',
  },
  descriptionContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2D3748',
  },
  genresContainer: {
    gap: 8,
    marginBottom: 12,
  },
  genreChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#2D3748',
    marginRight: 8,
  },
  genreText: {
    fontSize: 12,
    color: '#A0AEC0',
  },
  description: {
    fontSize: 14,
    color: '#CBD5E0',
    lineHeight: 20,
  },
  episodesList: {
    paddingBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0D1117',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2D3748',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sectionCount: {
    fontSize: 14,
    color: '#718096',
  },
  downloadSeasonButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#2D3748',
  },
  downloadSeasonText: {
    fontSize: 12,
    color: '#805AD5',
    fontWeight: '600',
  },
  episodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1A202C',
    minHeight: 56,
  },
  episodeRowDisabled: {
    opacity: 0.5,
  },
  episodeNumber: {
    width: 40,
    alignItems: 'center',
  },
  episodeNumberText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  episodeCompleted: {
    color: '#48BB78',
  },
  episodeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  episodeTitle: {
    fontSize: 15,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  episodeTitleDisabled: {
    color: '#718096',
  },
  episodeDuration: {
    fontSize: 12,
    color: '#718096',
  },
  episodeProgress: {
    position: 'absolute',
    bottom: 0,
    left: 52,
    right: 16,
    height: 2,
    backgroundColor: '#2D3748',
  },
  episodeProgressFill: {
    height: '100%',
    backgroundColor: '#805AD5',
  },
  completedIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#48BB78',
    marginLeft: 8,
  },
  downloadButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2D3748',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  downloadedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#48BB78',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  downloadingBadge: {
    minWidth: 32,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#805AD5',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    paddingHorizontal: 6,
  },
  downloadingBadgeText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: '#F56565',
    textAlign: 'center',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#2D3748',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  errorActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#805AD5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  // Кнопка "Продолжить просмотр"
  continueButton: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#805AD5',
    borderRadius: 12,
    padding: 16,
  },
  continueButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  continueTextContainer: {
    flex: 1,
  },
  continueTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  continueSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  // Кнопка "Продолжить" в split view (landscape)
  continueButtonSplit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    backgroundColor: '#805AD5',
    borderRadius: 10,
    padding: 12,
  },
  continueSubtitleSplit: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 1,
  },
})
