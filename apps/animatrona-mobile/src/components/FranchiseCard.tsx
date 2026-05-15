/**
 * Collapsible карточка франшизы
 *
 * Свёрнуто: одна карточка с постером + название + badge "N тайтлов"
 * Развёрнуто: список аниме внутри с мини-карточками
 */

import { useCallback } from 'react'
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import type { FranchiseGroup } from '@/utils/franchise'

interface FranchiseCardProps {
  group: FranchiseGroup
  /** URL постера (может быть file:// из кэша) */
  posterUrl: string
  /** Нажатие на аниме (одиночные) */
  onAnimePress: (animeId: string) => void
  /** Нажатие на франшизу (открыть отдельную страницу) */
  onFranchisePress: (group: FranchiseGroup) => void
  /** Ширина карточки */
  width: number
}

export function FranchiseCard({ group, posterUrl, onAnimePress, onFranchisePress, width }: FranchiseCardProps) {
  const handlePress = useCallback(() => {
    if (!group.expandable) {
      // Одиночное аниме — сразу открываем детали
      onAnimePress(group.items[0].id)
      return
    }
    // Франшиза — открываем отдельную страницу
    onFranchisePress(group)
  }, [group, onAnimePress, onFranchisePress])

  const progressPercent = group.totalEpisodes > 0 ? Math.round((group.totalWatched / group.totalEpisodes) * 100) : 0

  return (
    <View style={[styles.container, { width }]}>
      {/* Основная карточка */}
      <TouchableOpacity style={styles.mainCard} onPress={handlePress} activeOpacity={0.7}>
        <Image source={{ uri: posterUrl }} style={styles.poster} resizeMode="cover" />

        {/* Overlay с информацией */}
        <View style={styles.overlay}>
          <Text style={styles.name} numberOfLines={2}>
            {group.name}
          </Text>

          <View style={styles.meta}>
            {group.expandable && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {group.items.length} тайтл{group.items.length > 4 ? 'ов' : group.items.length > 1 ? 'а' : ''}
                </Text>
              </View>
            )}
            <Text style={styles.episodes}>
              {group.totalWatched}/{group.totalEpisodes} эп.
            </Text>
          </View>

          {/* Прогресс-бар */}
          {progressPercent > 0 && (
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>
          )}
        </View>

        {/* Иконка ">" для мульти-тайтлов */}
        {group.expandable && (
          <View style={styles.expandIndicator}>
            <Text style={styles.expandArrow}>›</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  mainCard: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1A202C',
  },
  poster: {
    width: '100%',
    aspectRatio: 2 / 3,
    backgroundColor: '#2D3748',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    paddingTop: 32,
    // Градиент снизу
    backgroundColor: 'transparent',
    // Фоллбэк: полупрозрачный фон
    // (настоящий градиент через LinearGradient если добавим библиотеку)
  },
  name: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  badge: {
    backgroundColor: '#805AD5',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  episodes: {
    color: '#CBD5E0',
    fontSize: 11,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  progressBar: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 1.5,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#805AD5',
    borderRadius: 1.5,
  },
  expandIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandArrow: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
})
