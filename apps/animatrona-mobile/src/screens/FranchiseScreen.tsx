/**
 * Экран франшизы — сетка аниме внутри франшизы
 *
 * Открывается при нажатии на карточку франшизы в библиотеке.
 * Показывает все тайтлы франшизы с постерами и прогрессом.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { getPosterUrlCached } from '@/api'
import { useLibraryLayout } from '@/hooks/useOrientation'
import type { FranchiseScreenProps } from '@/navigation/types'
import { getPosterMap } from '@/services/cache'
import { Haptics } from '@/services/haptics'
import type { FranchiseGroup } from '@/utils/franchise'
import type { AnimeListItem } from '@letar/animatrona-shared'

export function FranchiseScreen({ route, navigation }: FranchiseScreenProps) {
  const group: FranchiseGroup = useMemo(() => JSON.parse(route.params.group), [route.params.group])
  const layout = useLibraryLayout()
  const [posterMap, setPosterMap] = useState<Record<string, string>>({})

  // Загружаем кэшированные постеры
  useEffect(() => {
    getPosterMap().then(setPosterMap)
  }, [])

  const handleAnimePress = useCallback(
    (animeId: string) => {
      Haptics.light()
      navigation.navigate('Anime', { animeId })
    },
    [navigation],
  )

  const progressPercent = group.totalEpisodes > 0 ? Math.round((group.totalWatched / group.totalEpisodes) * 100) : 0

  const renderAnimeItem = useCallback(
    ({ item }: { item: AnimeListItem }) => {
      const itemProgress = item.episodeCount > 0 ? Math.round((item.watchedEpisodes / item.episodeCount) * 100) : 0

      return (
        <TouchableOpacity
          style={[styles.card, { width: layout.cardWidth }]}
          onPress={() => handleAnimePress(item.id)}
          activeOpacity={0.7}
        >
          <Image source={{ uri: getPosterUrlCached(item.id, posterMap) }} style={styles.poster} />

          {/* Прогресс-бар */}
          {itemProgress > 0 && itemProgress < 100 && (
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${itemProgress}%` }]} />
            </View>
          )}

          {/* Бейдж завершённого */}
          {item.watchStatus === 'COMPLETED' && <View style={styles.completedBadge} />}

          <View style={styles.cardInfo}>
            <Text style={styles.cardName} numberOfLines={2}>
              {item.name}
            </Text>
            <View style={styles.cardMetaRow}>
              <Text style={styles.cardMeta}>{item.year || '—'}</Text>
              <Text style={styles.cardMeta}>
                {item.watchedEpisodes}/{item.episodeCount} эп.
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      )
    },
    [handleAnimePress, layout.cardWidth, posterMap],
  )

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Заголовок */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Назад</Text>
        </TouchableOpacity>

        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {group.name}
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {group.items.length} тайтл{group.items.length > 4 ? 'ов' : group.items.length > 1 ? 'а' : ''}
            </Text>
          </View>
        </View>

        {/* Общий прогресс франшизы */}
        {progressPercent > 0 && (
          <View style={styles.franchiseProgress}>
            <View style={styles.franchiseProgressBar}>
              <View style={[styles.franchiseProgressFill, { width: `${progressPercent}%` }]} />
            </View>
            <Text style={styles.franchiseProgressText}>
              {group.totalWatched}/{group.totalEpisodes} эп. ({progressPercent}%)
            </Text>
          </View>
        )}
      </View>

      {/* Сетка аниме */}
      <FlatList
        key={`grid-${layout.numColumns}`}
        data={group.items}
        keyExtractor={(item) => item.id}
        numColumns={layout.numColumns}
        {...(layout.numColumns > 1 ? { columnWrapperStyle: [styles.row, { gap: layout.cardGap }] } : {})}
        contentContainerStyle={[styles.listContent, { padding: layout.contentPadding }]}
        renderItem={renderAnimeItem}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1117',
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2D3748',
  },
  backButton: {
    paddingVertical: 8,
  },
  backText: {
    color: '#805AD5',
    fontSize: 16,
    fontWeight: '600',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  badge: {
    backgroundColor: '#805AD5',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  franchiseProgress: {
    marginTop: 8,
  },
  franchiseProgressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  franchiseProgressFill: {
    height: '100%',
    backgroundColor: '#805AD5',
    borderRadius: 2,
  },
  franchiseProgressText: {
    color: '#718096',
    fontSize: 12,
    marginTop: 4,
  },
  listContent: {
    padding: 8,
  },
  row: {
    justifyContent: 'flex-start',
  },
  card: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#1A202C',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  poster: {
    width: '100%',
    aspectRatio: 2 / 3,
    backgroundColor: '#2D3748',
  },
  progressBar: {
    position: 'absolute',
    bottom: 68,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#2D3748',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#805AD5',
  },
  completedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#48BB78',
  },
  cardInfo: {
    padding: 12,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    minHeight: 36,
  },
  cardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardMeta: {
    fontSize: 12,
    color: '#718096',
  },
})
