/**
 * Экран библиотеки — список аниме
 *
 * Функции:
 * - Pull-to-refresh для обновления данных
 * - Поиск с debounce
 * - Фильтрация по статусу просмотра
 * - Сортировка библиотеки
 * - Продолжить просмотр
 */

import { useFocusEffect } from '@react-navigation/native'
import { Download, Play, Settings2 } from 'lucide-react-native'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { getLastWatched, getLibrary, getPosterUrlCached } from '@/api'
import { FranchiseCard } from '@/components/FranchiseCard'
import { ServerSwitcher } from '@/components/ServerSwitcher'
import { useLibraryLayout, useOrientation } from '@/hooks/useOrientation'
import type { LibraryScreenProps } from '@/navigation/types'
import { getPosterMap } from '@/services/cache'
import { Haptics } from '@/services/haptics'
import { cachePostersForLibrary } from '@/services/posterCache'
import { useDownloadsStore } from '@/store/downloads'
import { useOfflineStore } from '@/store/offline'
import { useServersStore } from '@/store/servers'
import type { FranchiseGroup } from '@/utils/franchise'
import { groupByFranchise } from '@/utils/franchise'
import type { AnimeListItem, LastWatched } from '@letar/animatrona-shared'

/** Фильтры по статусу просмотра */
const WATCH_STATUS_FILTERS = [
  { value: 'all', label: 'Все' },
  { value: 'WATCHING', label: 'Смотрю' },
  { value: 'COMPLETED', label: 'Просмотрено' },
  { value: 'PLANNED', label: 'Запланировано' },
  { value: 'NOT_STARTED', label: 'Не начато' },
] as const

/** Опции сортировки */
const _SORT_OPTIONS = [
  { value: 'name', label: 'По названию' },
  { value: 'year', label: 'По году' },
  { value: 'rating', label: 'По рейтингу' },
  { value: 'progress', label: 'По прогрессу' },
  { value: 'lastWatched', label: 'По просмотру' },
] as const

type SortOption = (typeof _SORT_OPTIONS)[number]['value']

export function LibraryScreen({ navigation }: LibraryScreenProps) {
  // Адаптивный layout
  const { isLandscape } = useOrientation()
  const layout = useLibraryLayout()
  const downloadedCount = useDownloadsStore((s) => Object.keys(s.downloaded).length)
  const activeDownloads = useDownloadsStore((s) => s.queue.filter((t) => t.status !== 'completed').length)

  const [anime, setAnime] = useState<AnimeListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [lastWatched, setLastWatched] = useState<LastWatched | null>(null)
  const [sortBy] = useState<SortOption>('lastWatched')
  const [posterMap, setPosterMap] = useState<Record<string, string>>({})
  const [viewMode, setViewMode] = useState<'list' | 'franchise'>('list')
  const activeServerId = useServersStore((state) => state.activeServerId)
  const activeServerType = useServersStore((state) => {
    const server = state.servers.find((s) => s.id === state.activeServerId)
    return server?.type ?? 'desktop'
  })

  // Debounce поиска
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const [searching, setSearching] = useState(false)

  const fetchData = useCallback(async (isRefresh = false, searchQuery?: string) => {
    if (isRefresh) {
      setRefreshing(true)
    } else if (searchQuery) {
      // Поиск — не показываем полноэкранный лоадер, чтобы не сбрасывать фокус
      setSearching(true)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      // Для Tracker: серверный поиск, для Desktop: без параметров (фильтрация клиентская)
      const searchOptions = searchQuery ? { search: searchQuery } : undefined
      const [libraryData, lastWatchedData, cachedPosters] = await Promise.all([
        getLibrary(searchOptions),
        searchQuery ? Promise.resolve(null) : getLastWatched().catch(() => null),
        getPosterMap(),
      ])
      setAnime(libraryData)
      if (!searchQuery) setLastWatched(lastWatchedData)
      setPosterMap(cachedPosters)

      // Фоновое кэширование постеров (не блокирует UI)
      if (!searchQuery && useOfflineStore.getState().isServerReachable) {
        cachePostersForLibrary(libraryData.map((a) => a.id))
          .then(() => getPosterMap())
          .then(setPosterMap)
          .catch(() => undefined)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
    } finally {
      setLoading(false)
      setRefreshing(false)
      setSearching(false)
    }
  }, [])

  // Загрузка при смене сервера
  useEffect(() => {
    fetchData()
  }, [fetchData, activeServerId])

  // Тихий рефетч при возврате на экран (обновляет watchStatus и lastWatched)
  const isFirstFocus = useRef(true)
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false
        return
      }
      fetchData(true)
    }, [fetchData]),
  )

  // Серверный поиск для Tracker (при изменении debouncedSearch)
  useEffect(() => {
    if (activeServerType === 'tracker' && debouncedSearch) {
      fetchData(false, debouncedSearch)
    } else if (activeServerType === 'tracker' && !debouncedSearch) {
      // Очистка поиска — загружаем полный каталог
      fetchData()
    }
  }, [debouncedSearch, activeServerType, fetchData])

  // Фильтрация и сортировка
  const filteredAnime = useMemo(() => {
    let result = anime.filter((item) => {
      // Поиск по названию
      if (debouncedSearch) {
        const query = debouncedSearch.toLowerCase()
        const matchesName = item.name.toLowerCase().includes(query)
        const matchesOriginal = item.originalName?.toLowerCase().includes(query)
        if (!matchesName && !matchesOriginal) {
          return false
        }
      }

      // Фильтр по статусу
      if (statusFilter !== 'all' && item.watchStatus !== statusFilter) {
        return false
      }

      return true
    })

    // Сортировка
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name, 'ru')
        case 'year':
          return (b.year || 0) - (a.year || 0)
        case 'rating':
          return (b.rating || 0) - (a.rating || 0)
        case 'progress': {
          const progressA = a.episodeCount > 0 ? a.watchedEpisodes / a.episodeCount : 0
          const progressB = b.episodeCount > 0 ? b.watchedEpisodes / b.episodeCount : 0
          return progressB - progressA
        }
        case 'lastWatched':
          return (b.lastWatchedEpisode || 0) - (a.lastWatchedEpisode || 0)
        default:
          return 0
      }
    })

    return result
  }, [anime, debouncedSearch, statusFilter, sortBy])

  // Группировка по франшизам
  const franchiseGroups = useMemo(() => {
    if (viewMode !== 'franchise') return []
    return groupByFranchise(filteredAnime)
  }, [filteredAnime, viewMode])

  const handleAnimePress = useCallback(
    (animeId: string) => {
      Haptics.light()
      navigation.navigate('Anime', { animeId })
    },
    [navigation],
  )

  const handleFranchisePress = useCallback(
    (group: FranchiseGroup) => {
      Haptics.light()
      navigation.navigate('Franchise', { group: JSON.stringify(group) })
    },
    [navigation],
  )

  const handleContinueWatching = useCallback(() => {
    if (lastWatched) {
      Haptics.light()
      navigation.navigate('Player', {
        episodeId: lastWatched.episode.id,
        animeId: lastWatched.anime.id,
        startTime: lastWatched.progress.currentTime,
      })
    }
  }, [navigation, lastWatched])

  // Динамические стили для карточки
  const cardStyle = useMemo(
    () => ({
      width: layout.cardWidth,
      marginBottom: layout.cardGap,
      borderRadius: 12,
      backgroundColor: '#1A202C',
      overflow: 'hidden' as const,
      // Тень для глубины
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    }),
    [layout.cardWidth, layout.cardGap],
  )

  const renderAnimeItem = useCallback(
    ({ item }: { item: AnimeListItem }) => {
      const progressPercent = item.episodeCount > 0 ? Math.round((item.watchedEpisodes / item.episodeCount) * 100) : 0

      return (
        <TouchableOpacity style={cardStyle} onPress={() => handleAnimePress(item.id)} activeOpacity={0.7}>
          <Image source={{ uri: getPosterUrlCached(item.id, posterMap) }} style={styles.poster} />

          {/* Прогресс */}
          {progressPercent > 0 && progressPercent < 100 && (
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>
          )}

          {/* Бейдж статуса */}
          {item.watchStatus === 'COMPLETED' && <View style={styles.completedBadge} />}

          <View style={styles.animeInfo}>
            <Text style={[styles.animeName, isLandscape && styles.animeNameLandscape]} numberOfLines={2}>
              {item.name}
            </Text>
            <View style={styles.animeMetaRow}>
              <Text style={styles.animeMeta}>{item.year || '—'}</Text>
              <Text style={styles.animeMeta}>
                {item.watchedEpisodes}/{item.episodeCount} эп.
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      )
    },
    [handleAnimePress, cardStyle, isLandscape, posterMap],
  )

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#805AD5" />
        </View>
      </SafeAreaView>
    )
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchData()}>
            <Text style={styles.retryButtonText}>Повторить</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header — компактный в landscape */}
      <View style={[styles.header, isLandscape && styles.headerLandscape]}>
        {isLandscape
          ? (
            // Landscape: всё в одну строку
            <View style={styles.headerRowLandscape}>
              <TouchableOpacity
                style={styles.settingsButton}
                onPress={() => {
                  Haptics.light()
                  navigation.navigate('Settings')
                }}
              >
                <Settings2 size={20} color="#FFFFFF" />
              </TouchableOpacity>
              {(downloadedCount > 0 || activeDownloads > 0) && (
                <TouchableOpacity
                  style={styles.settingsButton}
                  onPress={() => {
                    Haptics.light()
                    navigation.navigate('Downloads')
                  }}
                >
                  <Download size={20} color="#FFFFFF" />
                  {activeDownloads > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{activeDownloads}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
              <ServerSwitcher onServerChange={() => fetchData(true)} />
              <TextInput
                style={styles.searchInputLandscape}
                placeholder="Поиск..."
                placeholderTextColor="#718096"
                value={search}
                onChangeText={setSearch}
              />
              {/* Фильтры в landscape — горизонтальный скролл */}
              <FlatList
                horizontal
                data={WATCH_STATUS_FILTERS}
                keyExtractor={(item) => item.value}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filtersContainerLandscape}
                renderItem={({ item: filter }) => (
                  <TouchableOpacity
                    style={[styles.filterChipSmall, statusFilter === filter.value && styles.filterChipActive]}
                    onPress={() => {
                      Haptics.light()
                      setStatusFilter(filter.value)
                    }}
                  >
                    <Text
                      style={[styles.filterChipTextSmall, statusFilter === filter.value && styles.filterChipTextActive]}
                    >
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )
          : (
            // Portrait: вертикальный layout
            <>
              <View style={styles.headerRow}>
                <ServerSwitcher onServerChange={() => fetchData(true)} />
                <View style={styles.headerActions}>
                  {(downloadedCount > 0 || activeDownloads > 0) && (
                    <TouchableOpacity
                      style={styles.settingsButton}
                      onPress={() => {
                        Haptics.light()
                        navigation.navigate('Downloads')
                      }}
                    >
                      <Download size={20} color="#FFFFFF" />
                      {activeDownloads > 0 && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{activeDownloads}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  )}
                  {/* Toggle: список / франшизы */}
                  <TouchableOpacity
                    style={[styles.settingsButton, viewMode === 'franchise' && styles.viewModeActive]}
                    onPress={() => {
                      Haptics.light()
                      setViewMode((prev) => (prev === 'list' ? 'franchise' : 'list'))
                    }}
                  >
                    <Text style={styles.viewModeIcon}>{viewMode === 'franchise' ? '📦' : '📋'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.settingsButton}
                    onPress={() => {
                      Haptics.light()
                      navigation.navigate('Settings')
                    }}
                  >
                    <Settings2 size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Поиск */}
              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Поиск аниме..."
                  placeholderTextColor="#718096"
                  value={search}
                  onChangeText={setSearch}
                />
              </View>

              {/* Фильтры */}
              <FlatList
                horizontal
                data={WATCH_STATUS_FILTERS}
                keyExtractor={(item) => item.value}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filtersContainer}
                renderItem={({ item: filter }) => (
                  <TouchableOpacity
                    style={[styles.filterChip, statusFilter === filter.value && styles.filterChipActive]}
                    onPress={() => {
                      Haptics.light()
                      setStatusFilter(filter.value)
                    }}
                  >
                    <Text style={[styles.filterChipText, statusFilter === filter.value && styles.filterChipTextActive]}>
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </>
          )}
      </View>

      {/* Продолжить просмотр */}
      {lastWatched && !search && statusFilter === 'all' && (
        <TouchableOpacity style={styles.continueCard} onPress={handleContinueWatching}>
          <Image source={{ uri: getPosterUrlCached(lastWatched.anime.id, posterMap) }} style={styles.continuePoster} />
          <View style={styles.continueInfo}>
            <Text style={styles.continueLabel}>Продолжить</Text>
            <Text style={styles.continueTitle} numberOfLines={1}>
              {lastWatched.anime.name}
            </Text>
            <Text style={styles.continueEpisode}>Эпизод {lastWatched.episode.number}</Text>
          </View>
          <View style={styles.playButton}>
            <Play size={18} color="#FFFFFF" style={{ marginLeft: 2 }} />
          </View>
        </TouchableOpacity>
      )}

      {/* Список — адаптивный грид или франшизы */}
      {viewMode === 'franchise'
        ? (
          <FlatList
            key={`franchise-${layout.numColumns}`}
            data={franchiseGroups}
            keyExtractor={(item) => item.key}
            numColumns={layout.numColumns}
            columnWrapperStyle={[styles.row, { gap: layout.cardGap }]}
            contentContainerStyle={[styles.listContent, { padding: layout.contentPadding }]}
            renderItem={({ item: group }: { item: FranchiseGroup }) => (
              <FranchiseCard
                group={group}
                posterUrl={getPosterUrlCached(group.items[0].id, posterMap)}
                onAnimePress={handleAnimePress}
                onFranchisePress={handleFranchisePress}
                width={layout.cardWidth}
              />
            )}
            windowSize={5}
            maxToRenderPerBatch={10}
            removeClippedSubviews
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchData(true)}
                colors={['#805AD5']}
                tintColor="#805AD5"
                progressBackgroundColor="#1A202C"
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{debouncedSearch ? 'Ничего не найдено' : 'Библиотека пуста'}</Text>
              </View>
            }
          />
        )
        : (
          <FlatList
            key={`grid-${layout.numColumns}`}
            data={filteredAnime}
            keyExtractor={(item) => item.id}
            numColumns={layout.numColumns}
            columnWrapperStyle={[styles.row, { gap: layout.cardGap }]}
            contentContainerStyle={[styles.listContent, { padding: layout.contentPadding }]}
            renderItem={renderAnimeItem}
            windowSize={5}
            maxToRenderPerBatch={10}
            removeClippedSubviews
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchData(true)}
                colors={['#805AD5']}
                tintColor="#805AD5"
                progressBackgroundColor="#1A202C"
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{debouncedSearch ? 'Ничего не найдено' : 'Библиотека пуста'}</Text>
              </View>
            }
          />
        )}
    </SafeAreaView>
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
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2D3748',
  },
  // Landscape header — компактный, всё в одну строку
  headerLandscape: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  headerRowLandscape: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitleLandscape: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  searchInputLandscape: {
    flex: 1,
    maxWidth: 200,
    height: 40,
    backgroundColor: '#1A202C',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2D3748',
  },
  filtersContainerLandscape: {
    gap: 6,
    alignItems: 'center',
  },
  filterChipSmall: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#1A202C',
    marginRight: 6,
  },
  filterChipTextSmall: {
    fontSize: 12,
    color: '#A0AEC0',
    fontWeight: '500',
  },
  // Portrait header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1A202C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewModeActive: {
    backgroundColor: '#2D3748',
    borderWidth: 1,
    borderColor: '#805AD5',
  },
  viewModeIcon: {
    fontSize: 18,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#805AD5',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  searchContainer: {
    marginBottom: 12,
  },
  searchInput: {
    height: 44,
    backgroundColor: '#1A202C',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2D3748',
  },
  filtersContainer: {
    paddingVertical: 4,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1A202C',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#805AD5',
  },
  filterChipText: {
    fontSize: 14,
    color: '#A0AEC0',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  continueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A202C',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  continuePoster: {
    width: 60,
    height: 90,
    borderRadius: 8,
    backgroundColor: '#2D3748',
  },
  continueInfo: {
    flex: 1,
  },
  continueLabel: {
    fontSize: 12,
    color: '#805AD5',
    fontWeight: '600',
    marginBottom: 4,
  },
  continueTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  continueEpisode: {
    fontSize: 14,
    color: '#A0AEC0',
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#805AD5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 8,
  },
  row: {
    justifyContent: 'flex-start',
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
  animeInfo: {
    padding: 12,
  },
  animeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    minHeight: 36,
  },
  animeNameLandscape: {
    fontSize: 12,
    minHeight: 30,
  },
  animeMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  animeMeta: {
    fontSize: 12,
    color: '#718096',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#718096',
  },
  errorText: {
    fontSize: 16,
    color: '#F56565',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#805AD5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
})
