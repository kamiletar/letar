/**
 * TVHomeScreen — главный экран с библиотекой аниме
 *
 * Leanback-стиль с горизонтальными рядами:
 * - Продолжить просмотр
 * - Недавно добавленные
 * - Вся библиотека
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { getLastWatched, getLibrary, getPosterUrl } from '@/api/client'
import { TVHeroBanner } from '@/components/tv/TVHeroBanner'
import { TVRow } from '@/components/tv/TVRow'
import { SkeletonRow } from '@/components/tv/TVSkeleton'
import type { TVStackParamList } from '@/navigation/TVNavigator'
import { useConnectionStore } from '@/store/connection'
import type { AnimeListItem, LastWatched } from '@letar/animatrona-shared'

type Props = NativeStackScreenProps<TVStackParamList, 'Home'>

/** Главный экран */
export function TVHomeScreen({ navigation }: Props): React.JSX.Element {
  const { disconnect } = useConnectionStore()

  const [library, setLibrary] = useState<AnimeListItem[]>([])
  const [lastWatched, setLastWatched] = useState<LastWatched | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Focus memory — запоминаем последний выбранный анимеId
  const lastFocusedAnimeIdRef = useRef<string | null>(null)

  /** Загрузка данных */
  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [libraryData, lastWatchedData] = await Promise.all([getLibrary(), getLastWatched()])

      setLibrary(libraryData)
      setLastWatched(lastWatchedData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Загружаем при монтировании
  useEffect(() => {
    loadData()
  }, [loadData])

  /** Навигация к аниме (с запоминанием для focus memory) */
  const handleAnimePress = useCallback(
    (animeId: string) => {
      lastFocusedAnimeIdRef.current = animeId
      navigation.navigate('Anime', { animeId })
    },
    [navigation],
  )

  /** Продолжить просмотр */
  const handleContinueWatching = useCallback(() => {
    if (!lastWatched) {
      return
    }

    navigation.navigate('Player', {
      animeId: lastWatched.anime.id,
      episodeId: lastWatched.episode.id,
      startTime: lastWatched.progress.currentTime,
    })
  }, [lastWatched, navigation])

  /** Отключение */
  const handleDisconnect = useCallback(() => {
    disconnect()
    navigation.replace('Connect')
  }, [disconnect, navigation])

  /** Переход в настройки */
  const handleSettings = useCallback(() => {
    navigation.navigate('Settings')
  }, [navigation])

  // Загрузка — skeleton placeholders
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Animatrona</Text>
          </View>
        </View>
        <ScrollView style={styles.content}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </ScrollView>
      </View>
    )
  }

  // Ошибка
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>Ошибка</Text>
        <Text style={styles.errorText}>{error}</Text>
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
            onPress={handleDisconnect}
          >
            <Text style={styles.retryButtonText}>Отключиться</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  // Фильтруем аниме по статусу просмотра
  const watchingAnime = library.filter((a) => a.watchStatus === 'WATCHING')
  const recentAnime = [...library].sort((a, b) => (b.year || 0) - (a.year || 0)).slice(0, 10)

  return (
    <View style={styles.container}>
      {/* Заголовок */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Animatrona</Text>
          <Text style={styles.subtitle}>{library.length} аниме</Text>
        </View>
        <Pressable
          style={({ focused }) => [styles.settingsButton, focused && styles.settingsButtonFocused]}
          onPress={handleSettings}
        >
          <Text style={styles.settingsButtonText}>⚙ Настройки</Text>
        </Pressable>
      </View>

      {/* Контент */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero баннер — продолжить просмотр */}
        {lastWatched && (
          <TVHeroBanner
            animeName={lastWatched.anime.name}
            episodeNumber={lastWatched.episode.number}
            episodeName={lastWatched.episode.name}
            posterUrl={getPosterUrl(lastWatched.anime.id)}
            currentTime={lastWatched.progress.currentTime}
            durationMs={lastWatched.episode.durationMs}
            onContinue={handleContinueWatching}
            hasTVPreferredFocus
          />
        )}

        {/* Смотрю сейчас */}
        {watchingAnime.length > 0 && (
          <TVRow
            title="Смотрю сейчас"
            items={watchingAnime.map((anime) => ({
              id: anime.id,
              title: anime.name,
              subtitle: `${anime.watchedEpisodes}/${anime.episodeCount} эп.`,
              imageUrl: getPosterUrl(anime.id),
              progress: anime.episodeCount > 0 ? Math.round((anime.watchedEpisodes / anime.episodeCount) * 100) : 0,
            }))}
            onItemPress={handleAnimePress}
            hasTVPreferredFocus={!lastWatched}
            focusedItemId={lastFocusedAnimeIdRef.current}
          />
        )}

        {/* Недавние */}
        <TVRow
          title="Недавно добавленные"
          items={recentAnime.map((anime) => ({
            id: anime.id,
            title: anime.name,
            subtitle: anime.year ? `${anime.year}` : undefined,
            imageUrl: getPosterUrl(anime.id),
          }))}
          onItemPress={handleAnimePress}
          hasTVPreferredFocus={!lastWatched && watchingAnime.length === 0}
        />

        {/* Вся библиотека */}
        <TVRow
          title="Вся библиотека"
          items={library.map((anime) => ({
            id: anime.id,
            title: anime.name,
            subtitle: anime.year ? `${anime.year}` : undefined,
            imageUrl: getPosterUrl(anime.id),
          }))}
          onItemPress={handleAnimePress}
          focusedItemId={lastFocusedAnimeIdRef.current}
        />

        {/* Отступ внизу */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 48,
    paddingTop: 32,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginLeft: 16,
  },
  settingsButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 4,
    borderColor: 'transparent',
  },
  settingsButtonFocused: {
    borderColor: '#fff',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    transform: [{ scale: 1.08 }],
    elevation: 8,
  },
  settingsButtonText: {
    fontSize: 18,
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 18,
    color: '#888',
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
  bottomSpacer: {
    height: 48,
  },
})
