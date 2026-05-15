/**
 * TVAnimeScreen — экран деталей аниме
 *
 * Показывает информацию об аниме и список эпизодов
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Animated, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native'

import { getAnimeDetails, getPosterUrl } from '@/api/client'
import { useTVFocusAnimation } from '@/hooks/useTVFocusAnimation'
import type { TVStackParamList } from '@/navigation/TVNavigator'
import type { AnimeDetails, Episode } from '@letar/animatrona-shared'

type Props = NativeStackScreenProps<TVStackParamList, 'Anime'>

/** Экран деталей аниме */
export function TVAnimeScreen({ navigation, route }: Props): React.JSX.Element {
  const { animeId } = route.params

  const [anime, setAnime] = useState<AnimeDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /** Загрузка данных */
  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await getAnimeDetails(animeId)
      setAnime(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки')
    } finally {
      setIsLoading(false)
    }
  }, [animeId])

  // Загружаем при монтировании
  useEffect(() => {
    loadData()
  }, [loadData])

  /** Запуск эпизода */
  const handleEpisodePress = useCallback(
    (episode: Episode) => {
      navigation.navigate('Player', {
        animeId,
        episodeId: episode.id,
      })
    },
    [animeId, navigation]
  )

  // Загрузка
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    )
  }

  // Ошибка или нет данных
  if (error || !anime) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error || 'Аниме не найдено'}</Text>
        <View style={styles.errorButtons}>
          <Pressable
            style={({ focused }) => [styles.retryButton, focused && styles.retryButtonFocused]}
            onPress={loadData}
            hasTVPreferredFocus
          >
            <Text style={styles.retryButtonText}>Повторить</Text>
          </Pressable>
          <Pressable
            style={({ focused }) => [
              styles.retryButton,
              styles.retryButtonSecondary,
              focused && styles.retryButtonFocused,
            ]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Назад</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  const posterUrl = getPosterUrl(anime.id)

  return (
    <View style={styles.container}>
      {/* Информация об аниме (левая часть) */}
      <View style={styles.infoSection}>
        {/* Постер */}
        <Image source={{ uri: posterUrl }} style={styles.poster} resizeMode="cover" />

        {/* Метаданные */}
        <View style={styles.metadata}>
          <Text style={styles.title} numberOfLines={2}>
            {anime.name}
          </Text>

          {anime.originalName && (
            <Text style={styles.originalName} numberOfLines={1}>
              {anime.originalName}
            </Text>
          )}

          <View style={styles.stats}>
            {anime.year && <Text style={styles.stat}>{anime.year}</Text>}
            <Text style={styles.stat}>{anime.episodeCount} эп.</Text>
            <Text style={styles.stat}>{anime.status}</Text>
          </View>

          {anime.genres.length > 0 && (
            <Text style={styles.genres} numberOfLines={2}>
              {anime.genres.join(', ')}
            </Text>
          )}

          {anime.description && (
            <Text style={styles.description} numberOfLines={6}>
              {anime.description}
            </Text>
          )}
        </View>
      </View>

      {/* Список эпизодов (правая часть) */}
      <View style={styles.episodesSection}>
        <Text style={styles.episodesTitle}>Эпизоды</Text>

        <FlatList
          data={anime.episodes}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.episodesList}
          renderItem={({ item, index }) => (
            <EpisodeItem episode={item} onPress={() => handleEpisodePress(item)} hasTVPreferredFocus={index === 0} />
          )}
        />
      </View>
    </View>
  )
}

/** Элемент списка эпизодов */
function EpisodeItem({
  episode,
  onPress,
  hasTVPreferredFocus,
}: {
  episode: Episode
  onPress: () => void
  hasTVPreferredFocus?: boolean
}): React.JSX.Element {
  const { scale, focusOpacity, onFocus, onBlur } = useTVFocusAnimation({ focusScale: 1.05 })

  // Прогресс просмотра
  const progress = episode.progress
  const isWatched = progress?.completed
  const progressPercent =
    progress && episode.durationMs ? (progress.currentTime / (episode.durationMs / 1000)) * 100 : 0

  return (
    <Animated.View style={[styles.episodeItemWrapper, { transform: [{ scale }] }]}>
      <Pressable
        style={styles.episodeItem}
        onPress={onPress}
        onFocus={onFocus}
        onBlur={onBlur}
        hasTVPreferredFocus={hasTVPreferredFocus}
      >
        {/* Номер эпизода */}
        <View style={styles.episodeNumber}>
          <Text style={[styles.episodeNumberText, isWatched && styles.episodeWatched]}>{episode.number}</Text>
        </View>

        {/* Информация */}
        <View style={styles.episodeInfo}>
          <Text style={styles.episodeName} numberOfLines={1}>
            {episode.name || `Эпизод ${episode.number}`}
          </Text>

          {episode.durationMs && (
            <Text style={styles.episodeDuration}>{Math.floor(episode.durationMs / 1000 / 60)} мин.</Text>
          )}
        </View>

        {/* Прогресс бар */}
        {progressPercent > 0 && progressPercent < 100 && (
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
        )}

        {/* Галочка для просмотренных */}
        {isWatched && (
          <View style={styles.watchedBadge}>
            <Text style={styles.watchedText}>✓</Text>
          </View>
        )}
      </Pressable>

      {/* Анимированная рамка фокуса */}
      <Animated.View style={[styles.episodeFocusBorder, { opacity: focusOpacity }]} pointerEvents="none" />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#0a0a0a',
    padding: 48,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
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
  retryButtonSecondary: {
    backgroundColor: '#333',
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
  errorText: {
    fontSize: 18,
    color: '#ef4444',
  },

  // Информация
  infoSection: {
    width: 400,
    marginRight: 48,
  },
  poster: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
  },
  metadata: {
    marginTop: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    lineHeight: 34,
  },
  originalName: {
    fontSize: 18,
    color: '#888',
    marginTop: 4,
  },
  stats: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
  },
  stat: {
    fontSize: 16,
    color: '#7c3aed',
    fontWeight: '600',
  },
  genres: {
    fontSize: 18,
    color: '#666',
    marginTop: 12,
    lineHeight: 24,
  },
  description: {
    fontSize: 18,
    color: '#aaa',
    marginTop: 16,
    lineHeight: 26,
  },

  // Эпизоды
  episodesSection: {
    flex: 1,
  },
  episodesTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  episodesList: {
    gap: 8,
  },

  // Элемент эпизода
  episodeItemWrapper: {
    marginBottom: 4,
  },
  episodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
  },
  episodeFocusBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    borderWidth: 4,
    borderColor: '#7c3aed',
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
  },
  episodeNumber: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  episodeNumberText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  episodeWatched: {
    color: '#7c3aed',
  },
  episodeInfo: {
    flex: 1,
  },
  episodeName: {
    fontSize: 18,
    color: '#fff',
  },
  episodeDuration: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#333',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#7c3aed',
  },
  watchedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
  },
  watchedText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
})
