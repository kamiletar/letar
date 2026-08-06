/**
 * Экран управления загрузками и скачанным контентом
 *
 * Функции:
 * - Активные загрузки с прогресс-баром
 * - Скачанные эпизоды сгруппированные по аниме
 * - Размер файлов, кнопка удаления
 * - Общее занятое место
 */

import { useCallback, useMemo } from 'react'
import { Alert, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useStorageInfo } from '@/hooks/useStorageInfo'
import type { DownloadsScreenProps } from '@/navigation/types'
import { clearMetadataCache } from '@/services/cache'
import { deleteDownloadedEpisode } from '@/services/downloadManager'
import { clearAllStorage, formatBytes } from '@/services/fileStorage'
import { Haptics } from '@/services/haptics'
import { clearPosterCache } from '@/services/posterCache'
import { type DownloadedEpisode, type DownloadTask, useDownloadsStore } from '@/store/downloads'

// --- Типы для списка ---

type ListItem =
  | { type: 'header'; title: string }
  | { type: 'task'; data: DownloadTask }
  | { type: 'anime_header'; animeId: string; animeName: string; totalSize: number; episodeCount: number }
  | { type: 'episode'; data: DownloadedEpisode }
  | { type: 'storage_info' }

export function DownloadsScreen({ navigation }: DownloadsScreenProps) {
  const queue = useDownloadsStore((s) => s.queue)
  const downloaded = useDownloadsStore((s) => s.downloaded)
  const removeFromQueue = useDownloadsStore((s) => s.removeFromQueue)
  const removeAnimeDownloads = useDownloadsStore((s) => s.removeAnimeDownloads)
  const { info: storageInfo, refresh: refreshStorage } = useStorageInfo()

  // Сгруппировать скачанные по аниме
  const groupedDownloads = useMemo(() => {
    const groups: Record<string, DownloadedEpisode[]> = {}
    for (const ep of Object.values(downloaded)) {
      if (!groups[ep.animeId]) {
        groups[ep.animeId] = []
      }
      groups[ep.animeId].push(ep)
    }
    // Сортируем эпизоды внутри группы
    for (const episodes of Object.values(groups)) {
      episodes.sort((a, b) => a.seasonNumber - b.seasonNumber || a.episodeNumber - b.episodeNumber)
    }
    return groups
  }, [downloaded])

  // Построить плоский список для FlatList
  const listData = useMemo<ListItem[]>(() => {
    const items: ListItem[] = []

    // Активные загрузки
    const activeQueue = queue.filter((t) => t.status !== 'completed')
    if (activeQueue.length > 0) {
      items.push({ type: 'header', title: 'Загрузки' })
      for (const task of activeQueue) {
        items.push({ type: 'task', data: task })
      }
    }

    // Скачанные группы
    const animeIds = Object.keys(groupedDownloads)
    if (animeIds.length > 0) {
      items.push({ type: 'header', title: 'Скачано' })

      for (const animeId of animeIds) {
        const episodes = groupedDownloads[animeId]
        const totalSize = episodes.reduce((sum, ep) => sum + ep.totalSizeBytes, 0)
        items.push({
          type: 'anime_header',
          animeId,
          animeName: episodes[0].animeName,
          totalSize,
          episodeCount: episodes.length,
        })
        for (const ep of episodes) {
          items.push({ type: 'episode', data: ep })
        }
      }
    }

    // Информация о хранилище
    items.push({ type: 'storage_info' })

    return items
  }, [queue, groupedDownloads])

  // --- Действия ---

  const handleDeleteEpisode = useCallback(
    (episodeId: string, episodeNumber: number) => {
      Alert.alert('Удалить эпизод', `Удалить эпизод ${episodeNumber}?`, [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            Haptics.heavy()
            await deleteDownloadedEpisode(episodeId)
            refreshStorage()
          },
        },
      ])
    },
    [refreshStorage],
  )

  const handleDeleteAnime = useCallback(
    (animeId: string, animeName: string) => {
      Alert.alert('Удалить все эпизоды', `Удалить все скачанные эпизоды «${animeName}»?`, [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить все',
          style: 'destructive',
          onPress: async () => {
            Haptics.heavy()
            // Удаляем файлы каждого эпизода
            const episodes = groupedDownloads[animeId] ?? []
            for (const ep of episodes) {
              await deleteDownloadedEpisode(ep.episodeId)
            }
            removeAnimeDownloads(animeId)
            refreshStorage()
          },
        },
      ])
    },
    [groupedDownloads, removeAnimeDownloads, refreshStorage],
  )

  const handleCancelTask = useCallback(
    (taskId: string) => {
      removeFromQueue(taskId)
    },
    [removeFromQueue],
  )

  const handlePlayEpisode = useCallback(
    (ep: DownloadedEpisode) => {
      Haptics.light()
      navigation.navigate('Player', {
        episodeId: ep.episodeId,
        animeId: ep.animeId,
      })
    },
    [navigation],
  )

  const handleClearPosterCache = useCallback(() => {
    Alert.alert('Очистить постеры', 'Постеры будут скачаны заново при подключении к серверу.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Очистить',
        onPress: async () => {
          await clearPosterCache()
          refreshStorage()
        },
      },
    ])
  }, [refreshStorage])

  const handleClearMetadata = useCallback(() => {
    Alert.alert(
      'Очистить кэш данных',
      'Кэш библиотеки и деталей аниме будет очищен. Данные обновятся при подключении к серверу.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Очистить',
          onPress: async () => {
            await clearMetadataCache()
            refreshStorage()
          },
        },
      ],
    )
  }, [refreshStorage])

  const handleClearAll = useCallback(() => {
    Alert.alert(
      'Удалить все данные',
      'Будут удалены все скачанные эпизоды, постеры и кэш. Это действие нельзя отменить.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить все',
          style: 'destructive',
          onPress: async () => {
            Haptics.heavy()
            await clearAllStorage()
            await clearMetadataCache()
            // Очистить store загрузок
            useDownloadsStore.getState().clearAll()
            refreshStorage()
          },
        },
      ],
    )
  }, [refreshStorage])

  // --- Рендер элементов ---

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      switch (item.type) {
        case 'header':
          return (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{item.title}</Text>
            </View>
          )

        case 'task':
          return (
            <View style={styles.taskItem}>
              <View style={styles.taskInfo}>
                <Text style={styles.taskName} numberOfLines={1}>
                  {item.data.animeName} — Эп. {item.data.episodeNumber}
                </Text>
                <View style={styles.taskMeta}>
                  <Text style={styles.taskStatus}>
                    {item.data.status === 'queued' && 'В очереди'}
                    {item.data.status === 'downloading'
                      && `Загрузка${
                        item.data.currentItem === 'audio'
                          ? ' аудио'
                          : item.data.currentItem === 'subtitle'
                          ? ' субтитров'
                          : item.data.currentItem === 'font'
                          ? ' шрифтов'
                          : ''
                      }`}
                    {item.data.status === 'paused' && 'Пауза'}
                    {item.data.status === 'error' && `Ошибка: ${item.data.errorMessage}`}
                  </Text>
                  {item.data.totalBytes > 0 && (
                    <Text style={styles.taskSize}>
                      {formatBytes(item.data.downloadedBytes)} / {formatBytes(item.data.totalBytes)}
                    </Text>
                  )}
                </View>
                {/* Прогресс-бар */}
                {(item.data.status === 'downloading' || item.data.status === 'paused') && (
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${Math.round(item.data.progress * 100)}%` }]} />
                  </View>
                )}
              </View>
              <TouchableOpacity style={styles.cancelButton} onPress={() => handleCancelTask(item.data.id)}>
                <Text style={styles.cancelText}>✕</Text>
              </TouchableOpacity>
            </View>
          )

        case 'anime_header':
          return (
            <View style={styles.animeHeader}>
              <View style={styles.animeHeaderInfo}>
                <Text style={styles.animeHeaderName} numberOfLines={1}>
                  {item.animeName}
                </Text>
                <Text style={styles.animeHeaderMeta}>
                  {item.episodeCount} эп. · {formatBytes(item.totalSize)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.deleteAnimeButton}
                onPress={() => handleDeleteAnime(item.animeId, item.animeName)}
              >
                <Text style={styles.deleteText}>Удалить все</Text>
              </TouchableOpacity>
            </View>
          )

        case 'episode':
          return (
            <TouchableOpacity style={styles.episodeItem} onPress={() => handlePlayEpisode(item.data)}>
              <View style={styles.episodeInfo}>
                <Text style={styles.episodeNumber}>
                  S{item.data.seasonNumber}E{item.data.episodeNumber}
                </Text>
                <Text style={styles.episodeSize}>{formatBytes(item.data.totalSizeBytes)}</Text>
              </View>
              <TouchableOpacity
                style={styles.deleteEpisodeButton}
                onPress={() => handleDeleteEpisode(item.data.episodeId, item.data.episodeNumber)}
              >
                <Text style={styles.deleteIconText}>🗑</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )

        case 'storage_info':
          return (
            <View style={styles.storageSection}>
              <Text style={styles.storageSectionTitle}>Хранилище</Text>
              {storageInfo && (
                <>
                  {/* Визуальная полоса использования */}
                  <View style={styles.storageBarContainer}>
                    <View style={styles.storageBarBg}>
                      {storageInfo.downloadedBytes > 0 && (
                        <View
                          style={[
                            styles.storageBarSegment,
                            styles.storageBarDownloads,
                            {
                              width: `${
                                Math.max(
                                  2,
                                  (storageInfo.downloadedBytes
                                    / (storageInfo.totalUsedBytes + storageInfo.availableBytes))
                                    * 100,
                                )
                              }%`,
                            },
                          ]}
                        />
                      )}
                      {storageInfo.posterCacheBytes > 0 && (
                        <View
                          style={[
                            styles.storageBarSegment,
                            styles.storageBarPosters,
                            {
                              width: `${
                                Math.max(
                                  1,
                                  (storageInfo.posterCacheBytes
                                    / (storageInfo.totalUsedBytes + storageInfo.availableBytes))
                                    * 100,
                                )
                              }%`,
                            },
                          ]}
                        />
                      )}
                    </View>
                    <View style={styles.storageBarLegend}>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendDot, styles.storageBarDownloads]} />
                        <Text style={styles.legendText}>Видео</Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendDot, styles.storageBarPosters]} />
                        <Text style={styles.legendText}>Постеры</Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendDot, styles.legendDotFree]} />
                        <Text style={styles.legendText}>Свободно</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.storageRow}>
                    <Text style={styles.storageLabel}>Скачанный контент</Text>
                    <Text style={styles.storageValue}>{formatBytes(storageInfo.downloadedBytes)}</Text>
                  </View>
                  <View style={styles.storageRow}>
                    <Text style={styles.storageLabel}>Кэш постеров</Text>
                    <Text style={styles.storageValue}>{formatBytes(storageInfo.posterCacheBytes)}</Text>
                  </View>
                  <View style={styles.storageRow}>
                    <Text style={styles.storageLabel}>Всего занято</Text>
                    <Text style={[styles.storageValue, styles.storageBold]}>
                      {formatBytes(storageInfo.totalUsedBytes)}
                    </Text>
                  </View>
                  <View style={styles.storageRow}>
                    <Text style={styles.storageLabel}>Свободно на устройстве</Text>
                    <Text style={styles.storageValue}>{formatBytes(storageInfo.availableBytes)}</Text>
                  </View>

                  {/* Кнопки управления кэшем */}
                  <View style={styles.storageActions}>
                    {storageInfo.posterCacheBytes > 0 && (
                      <TouchableOpacity
                        style={styles.storageActionButton}
                        onPress={() => handleClearPosterCache()}
                      >
                        <Text style={styles.storageActionText}>Очистить постеры</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.storageActionButton} onPress={() => handleClearMetadata()}>
                      <Text style={styles.storageActionText}>Очистить кэш данных</Text>
                    </TouchableOpacity>
                    {storageInfo.totalUsedBytes > 0 && (
                      <TouchableOpacity
                        style={[styles.storageActionButton, styles.storageActionDanger]}
                        onPress={() => handleClearAll()}
                      >
                        <Text style={[styles.storageActionText, styles.storageActionDangerText]}>
                          Удалить все данные
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              )}
            </View>
          )

        default:
          return null
      }
    },
    [
      storageInfo,
      handleCancelTask,
      handleDeleteEpisode,
      handleDeleteAnime,
      handlePlayEpisode,
      handleClearPosterCache,
      handleClearMetadata,
      handleClearAll,
    ],
  )

  const keyExtractor = useCallback((item: ListItem, index: number) => {
    switch (item.type) {
      case 'header':
        return `header-${item.title}`
      case 'task':
        return `task-${item.data.id}`
      case 'anime_header':
        return `anime-${item.animeId}`
      case 'episode':
        return `ep-${item.data.episodeId}`
      case 'storage_info':
        return 'storage'
      default:
        return `item-${index}`
    }
  }, [])

  const isEmpty = queue.length === 0 && Object.keys(downloaded).length === 0

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Заголовок */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Загрузки</Text>
        <View style={styles.headerSpacer} />
      </View>

      {isEmpty
        ? (
          <ScrollView contentContainerStyle={styles.emptyScrollContent}>
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📥</Text>
              <Text style={styles.emptyText}>Нет скачанных эпизодов</Text>
              <Text style={styles.emptySubtext}>Скачайте эпизоды для оффлайн просмотра на странице аниме</Text>
            </View>
            {/* Секция хранилища даже при пустых загрузках */}
            {renderItem({ item: { type: 'storage_info' } } as { item: ListItem })}
          </ScrollView>
        )
        : (
          <FlatList
            data={listData}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2D3748',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  listContent: {
    paddingBottom: 32,
  },

  // --- Секции ---
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // --- Задачи загрузки ---
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A202C',
  },
  taskInfo: {
    flex: 1,
  },
  taskName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  taskMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  taskStatus: {
    fontSize: 13,
    color: '#A0AEC0',
  },
  taskSize: {
    fontSize: 13,
    color: '#718096',
  },
  progressBarBg: {
    height: 4,
    backgroundColor: '#2D3748',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#805AD5',
    borderRadius: 2,
  },
  cancelButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  cancelText: {
    fontSize: 18,
    color: '#718096',
  },

  // --- Группа аниме ---
  animeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#171923',
    marginTop: 4,
  },
  animeHeaderInfo: {
    flex: 1,
  },
  animeHeaderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  animeHeaderMeta: {
    fontSize: 13,
    color: '#718096',
  },
  deleteAnimeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#2D3748',
  },
  deleteText: {
    fontSize: 13,
    color: '#F56565',
    fontWeight: '500',
  },

  // --- Эпизод ---
  episodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingLeft: 32,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1A202C',
  },
  episodeInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  episodeNumber: {
    fontSize: 15,
    color: '#E2E8F0',
  },
  episodeSize: {
    fontSize: 13,
    color: '#718096',
  },
  deleteEpisodeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  deleteIconText: {
    fontSize: 16,
  },

  // --- Хранилище ---
  storageSection: {
    margin: 16,
    padding: 16,
    backgroundColor: '#171923',
    borderRadius: 12,
    marginTop: 24,
  },
  storageSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  storageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#2D3748',
  },
  storageRowLast: {
    borderBottomWidth: 0,
  },
  storageLabel: {
    fontSize: 14,
    color: '#A0AEC0',
  },
  storageValue: {
    fontSize: 14,
    color: '#E2E8F0',
  },
  storageBold: {
    fontWeight: '600',
  },

  // --- Полоса использования ---
  storageBarContainer: {
    marginBottom: 16,
  },
  storageBarBg: {
    height: 12,
    backgroundColor: '#2D3748',
    borderRadius: 6,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  storageBarSegment: {
    height: '100%',
  },
  storageBarDownloads: {
    backgroundColor: '#805AD5',
  },
  storageBarPosters: {
    backgroundColor: '#4299E1',
  },
  storageBarLegend: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendDotFree: {
    backgroundColor: '#2D3748',
  },
  legendText: {
    fontSize: 11,
    color: '#718096',
  },

  // --- Кнопки управления ---
  storageActions: {
    marginTop: 16,
    gap: 8,
  },
  storageActionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#2D3748',
    alignItems: 'center',
  },
  storageActionText: {
    fontSize: 14,
    color: '#E2E8F0',
    fontWeight: '500',
  },
  storageActionDanger: {
    backgroundColor: 'rgba(245, 101, 101, 0.15)',
  },
  storageActionDangerText: {
    color: '#F56565',
  },

  // --- Пустое состояние ---
  emptyScrollContent: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
  },
})
