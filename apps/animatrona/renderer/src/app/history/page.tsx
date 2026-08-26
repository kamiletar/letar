'use client'

/**
 * Страница истории просмотра
 * Показывает историю из библиотеки и историю папок
 */

import { Badge, Box, Button, Card, Heading, HStack, Spinner, Tabs, Text, VStack } from '@chakra-ui/react'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { LuArrowLeft, LuEye, LuFolderOpen, LuLibrary, LuPlay, LuTrash2 } from 'react-icons/lu'

import {
  findWatchedAnime,
  findWatchHistory,
  type WatchedAnimeResult,
  type WatchHistoryResult,
} from '@/app/_actions/watch-progress.action'
import type { FolderHistoryEntry } from '@/app/player/types'
import { Header } from '@/components/layout'

/** Ключ для localStorage */
const FOLDER_HISTORY_STORAGE_KEY = 'animatrona-folder-history'

/**
 * Загрузка истории папок из localStorage
 */
function loadFolderHistory(): FolderHistoryEntry[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const raw = localStorage.getItem(FOLDER_HISTORY_STORAGE_KEY)
    if (raw) {
      return JSON.parse(raw) as FolderHistoryEntry[]
    }
  } catch (error) {
    console.error('[History] Ошибка загрузки истории папок:', error)
  }
  return []
}

/**
 * Удаление папки из истории
 */
function removeFolderFromHistory(folderPath: string): FolderHistoryEntry[] {
  try {
    const history = loadFolderHistory()
    const updated = history.filter((entry) => entry.folderPath !== folderPath)
    localStorage.setItem(FOLDER_HISTORY_STORAGE_KEY, JSON.stringify(updated))
    return updated
  } catch (error) {
    console.error('[History] Ошибка удаления из истории:', error)
    return []
  }
}

/**
 * Форматирует время в минуты:секунды
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Окончание для "эпизод"
 */
function getEpisodeSuffix(count: number): string {
  const lastTwo = count % 100
  const lastOne = count % 10

  if (lastTwo >= 11 && lastTwo <= 14) {
    return 'ов'
  }
  if (lastOne === 1) {
    return ''
  }
  if (lastOne >= 2 && lastOne <= 4) {
    return 'а'
  }
  return 'ов'
}

/**
 * Страница истории
 */
export default function HistoryPage() {
  // Состояние для библиотечной истории (эпизоды)
  const [libraryHistory, setLibraryHistory] = useState<WatchHistoryResult | null>(null)
  const [libraryLoading, setLibraryLoading] = useState(true)
  const [libraryPage, setLibraryPage] = useState(0)

  // Состояние для истории папок
  const [folderHistory, setFolderHistory] = useState<FolderHistoryEntry[]>([])

  // Состояние для раздела "Смотрел" (аниме)
  const [watchedAnime, setWatchedAnime] = useState<WatchedAnimeResult | null>(null)
  const [watchedLoading, setWatchedLoading] = useState(true)
  const [watchedPage, setWatchedPage] = useState(0)

  // Загрузка истории библиотеки
  useEffect(() => {
    const loadLibraryHistory = async () => {
      setLibraryLoading(true)
      try {
        const result = await findWatchHistory({ page: libraryPage, limit: 20 })
        setLibraryHistory(result)
      } catch (error) {
        console.error('[History] Ошибка загрузки истории библиотеки:', error)
      } finally {
        setLibraryLoading(false)
      }
    }
    loadLibraryHistory()
  }, [libraryPage])

  // Загрузка истории папок
  useEffect(() => {
    setFolderHistory(loadFolderHistory())
  }, [])

  // Загрузка раздела "Смотрел"
  useEffect(() => {
    const loadWatchedAnime = async () => {
      setWatchedLoading(true)
      try {
        const result = await findWatchedAnime({ page: watchedPage, limit: 20 })
        setWatchedAnime(result)
      } catch (error) {
        console.error('[History] Ошибка загрузки просмотренных аниме:', error)
      } finally {
        setWatchedLoading(false)
      }
    }
    loadWatchedAnime()
  }, [watchedPage])

  // Удаление папки из истории
  const handleRemoveFolder = useCallback((folderPath: string) => {
    setFolderHistory(removeFolderFromHistory(folderPath))
  }, [])

  // Загрузка следующей страницы библиотеки
  const handleLoadMore = useCallback(() => {
    setLibraryPage((prev) => prev + 1)
  }, [])

  // Загрузка следующей страницы "Смотрел"
  const handleLoadMoreWatched = useCallback(() => {
    setWatchedPage((prev) => prev + 1)
  }, [])

  return (
    <Box minH="100vh" bg="bg" color="fg" display="flex" flexDirection="column">
      <Header title="История просмотра" />

      {/* Навигация */}
      <HStack px={6} py={2}>
        <Link href="/">
          <Button variant="ghost" size="sm">
            <LuArrowLeft size={16} style={{ marginRight: 8 }} />
            На главную
          </Button>
        </Link>
      </HStack>

      {/* Контент */}
      <Box flex={1} p={6}>
        <Tabs.Root defaultValue="library" variant="enclosed">
          <Tabs.List mb={4}>
            <Tabs.Trigger value="library">
              <LuLibrary size={16} style={{ marginRight: 8 }} />
              Библиотека
              {libraryHistory && libraryHistory.total > 0 && (
                <Badge ml={2} colorPalette="purple">
                  {libraryHistory.total}
                </Badge>
              )}
            </Tabs.Trigger>
            <Tabs.Trigger value="folders">
              <LuFolderOpen size={16} style={{ marginRight: 8 }} />
              Папки
              {folderHistory.length > 0 && (
                <Badge ml={2} colorPalette="blue">
                  {folderHistory.length}
                </Badge>
              )}
            </Tabs.Trigger>
            <Tabs.Trigger value="watched">
              <LuEye size={16} style={{ marginRight: 8 }} />
              Смотрел
              {watchedAnime && watchedAnime.total > 0 && (
                <Badge ml={2} colorPalette="green">
                  {watchedAnime.total}
                </Badge>
              )}
            </Tabs.Trigger>
          </Tabs.List>

          {/* История библиотеки */}
          <Tabs.Content value="library">
            {libraryLoading && libraryPage === 0
              ? (
                <VStack py={12}>
                  <Spinner size="xl" color="purple.500" />
                  <Text color="fg.muted">Загрузка истории...</Text>
                </VStack>
              )
              : libraryHistory && libraryHistory.items.length > 0
              ? (
                <VStack gap={3} align="stretch">
                  {libraryHistory.items.map((item) => {
                    const durationSec = item.durationMs ? item.durationMs / 1000 : 0
                    const progressPercent = durationSec > 0 ? Math.min(100, (item.currentTime / durationSec) * 100) : 0

                    return (
                      <Link key={item.id} href={`/watch/${item.episodeId}`}>
                        <Card.Root
                          bg="bg.panel"
                          border="1px"
                          borderColor="border"
                          _hover={{ borderColor: 'primary.muted', bg: 'state.hover' }}
                          transition="all 0.15s ease-out"
                          cursor="pointer"
                        >
                          <Card.Body p={4}>
                            <HStack gap={4}>
                              {/* Информация */}
                              <VStack flex={1} align="start" gap={1} minW={0}>
                                <Text fontWeight="medium" lineClamp={1}>
                                  {item.animeName}
                                </Text>
                                <Text fontSize="sm" color="fg.muted">
                                  Эпизод {item.episodeNumber}
                                  {item.episodeName ? ` — ${item.episodeName}` : ''}
                                </Text>
                                <HStack fontSize="xs" color="fg.subtle" gap={2}>
                                  <Text>
                                    {formatTime(item.currentTime)}
                                    {durationSec > 0 && ` / ${formatTime(durationSec)}`}
                                  </Text>
                                  <Text>•</Text>
                                  <Text>
                                    {formatDistanceToNow(new Date(item.lastWatchedAt), {
                                      addSuffix: true,
                                      locale: ru,
                                    })}
                                  </Text>
                                </HStack>
                              </VStack>

                              {/* Прогресс и кнопка */}
                              <VStack gap={2} align="end">
                                {item.completed
                                  ? <Badge colorPalette="green">Просмотрено</Badge>
                                  : <Badge colorPalette="blue">{Math.round(progressPercent)}%</Badge>}
                                <Button size="sm" colorPalette="purple">
                                  <LuPlay size={16} style={{ marginRight: 4 }} />
                                  Продолжить
                                </Button>
                              </VStack>
                            </HStack>

                            {/* Прогресс бар */}
                            {!item.completed && (
                              <Box mt={3}>
                                <Box h="3px" bg="bg.emphasized" borderRadius="full" overflow="hidden">
                                  <Box
                                    w={`${progressPercent}%`}
                                    h="full"
                                    bg="primary.solid"
                                    transition="width 0.3s ease"
                                  />
                                </Box>
                              </Box>
                            )}
                          </Card.Body>
                        </Card.Root>
                      </Link>
                    )
                  })}

                  {/* Кнопка загрузки ещё */}
                  {libraryHistory.hasMore && (
                    <Button
                      variant="outline"
                      onClick={handleLoadMore}
                      loading={libraryLoading}
                      alignSelf="center"
                      mt={4}
                    >
                      Загрузить ещё
                    </Button>
                  )}
                </VStack>
              )
              : (
                <VStack py={12} gap={4}>
                  <LuLibrary size={64} color="var(--chakra-colors-fg-subtle)" />
                  <Heading size="md" color="fg.muted">
                    История пуста
                  </Heading>
                  <Text color="fg.subtle">Начните смотреть аниме из библиотеки</Text>
                  <Link href="/library">
                    <Button colorPalette="purple">Перейти в библиотеку</Button>
                  </Link>
                </VStack>
              )}
          </Tabs.Content>

          {/* История папок */}
          <Tabs.Content value="folders">
            {folderHistory.length > 0
              ? (
                <VStack gap={3} align="stretch">
                  {folderHistory.map((entry) => (
                    <Card.Root
                      key={entry.folderPath}
                      bg="bg.panel"
                      border="1px"
                      borderColor="border"
                      _hover={{ borderColor: 'primary.muted', bg: 'state.hover' }}
                      transition="all 0.15s ease-out"
                    >
                      <Card.Body p={4}>
                        <HStack gap={4}>
                          {/* Иконка */}
                          <Box p={3} borderRadius="md" bg="bg.muted">
                            <LuFolderOpen size={24} color="var(--chakra-colors-primary-solid)" />
                          </Box>

                          {/* Информация */}
                          <VStack flex={1} align="start" gap={1} minW={0}>
                            <Text fontWeight="medium" lineClamp={1} title={entry.folderName}>
                              {entry.folderName}
                            </Text>
                            <HStack fontSize="sm" color="fg.muted" gap={2}>
                              <Text>
                                {entry.episodeCount} эпизод{getEpisodeSuffix(entry.episodeCount)}
                              </Text>
                              <Text>•</Text>
                              <Text>
                                {formatDistanceToNow(new Date(entry.lastOpenedAt), {
                                  addSuffix: true,
                                  locale: ru,
                                })}
                              </Text>
                            </HStack>
                            <Text fontSize="xs" color="fg.subtle" lineClamp={1} title={entry.folderPath}>
                              {entry.folderPath}
                            </Text>
                          </VStack>

                          {/* Кнопки */}
                          <HStack gap={2}>
                            <Link href={`/player?folder=${encodeURIComponent(entry.folderPath)}`}>
                              <Button size="sm" colorPalette="purple">
                                <LuPlay size={16} style={{ marginRight: 4 }} />
                                Открыть
                              </Button>
                            </Link>
                            <Button
                              size="sm"
                              variant="ghost"
                              colorPalette="red"
                              onClick={() => handleRemoveFolder(entry.folderPath)}
                            >
                              <LuTrash2 size={16} />
                            </Button>
                          </HStack>
                        </HStack>
                      </Card.Body>
                    </Card.Root>
                  ))}
                </VStack>
              )
              : (
                <VStack py={12} gap={4}>
                  <LuFolderOpen size={64} color="var(--chakra-colors-fg-subtle)" />
                  <Heading size="md" color="fg.muted">
                    История пуста
                  </Heading>
                  <Text color="fg.subtle">Откройте папку с видео в плеере</Text>
                  <Link href="/player">
                    <Button colorPalette="purple">Открыть плеер</Button>
                  </Link>
                </VStack>
              )}
          </Tabs.Content>

          {/* Раздел "Смотрел" — аниме с прогрессом */}
          <Tabs.Content value="watched">
            {watchedLoading && watchedPage === 0
              ? (
                <VStack py={12}>
                  <Spinner size="xl" color="green.500" />
                  <Text color="fg.muted">Загрузка...</Text>
                </VStack>
              )
              : watchedAnime && watchedAnime.items.length > 0
              ? (
                <VStack gap={3} align="stretch">
                  {watchedAnime.items.map((item) => (
                    <Link key={item.animeId} href={`/library/${item.animeId}`}>
                      <Card.Root
                        bg="bg.panel"
                        border="1px"
                        borderColor="border"
                        _hover={{ borderColor: 'green.muted', bg: 'state.hover' }}
                        transition="all 0.15s ease-out"
                        cursor="pointer"
                      >
                        <Card.Body p={4}>
                          <HStack gap={4}>
                            {/* Информация */}
                            <VStack flex={1} align="start" gap={1} minW={0}>
                              <Text fontWeight="medium" lineClamp={1}>
                                {item.animeName}
                              </Text>
                              <HStack fontSize="sm" color="fg.muted" gap={2}>
                                <Text>
                                  {item.watchedEpisodes} / {item.totalEpisodes} эпизод
                                  {getEpisodeSuffix(item.totalEpisodes)}
                                </Text>
                                {item.inProgressEpisodes > 0 && (
                                  <Badge colorPalette="blue" size="sm">
                                    +{item.inProgressEpisodes} в процессе
                                  </Badge>
                                )}
                              </HStack>
                              <HStack fontSize="xs" color="fg.subtle" gap={2}>
                                <Text>Эпизод {item.lastEpisodeNumber}</Text>
                                <Text>•</Text>
                                <Text>
                                  {formatDistanceToNow(new Date(item.lastWatchedAt), {
                                    addSuffix: true,
                                    locale: ru,
                                  })}
                                </Text>
                              </HStack>
                            </VStack>

                            {/* Прогресс и статус */}
                            <VStack gap={2} align="end">
                              <Badge
                                colorPalette={item.watchStatus === 'COMPLETED'
                                  ? 'green'
                                  : item.watchStatus === 'WATCHING'
                                  ? 'blue'
                                  : item.watchStatus === 'ON_HOLD'
                                  ? 'yellow'
                                  : item.watchStatus === 'DROPPED'
                                  ? 'red'
                                  : 'gray'}
                              >
                                {item.watchStatus === 'NOT_STARTED'
                                  ? 'Не начато'
                                  : item.watchStatus === 'WATCHING'
                                  ? 'Смотрю'
                                  : item.watchStatus === 'COMPLETED'
                                  ? 'Просмотрено'
                                  : item.watchStatus === 'ON_HOLD'
                                  ? 'Отложено'
                                  : item.watchStatus === 'DROPPED'
                                  ? 'Брошено'
                                  : 'Запланировано'}
                              </Badge>
                              <Badge colorPalette="purple">{item.overallProgress}%</Badge>
                              <Button size="sm" colorPalette="green">
                                <LuPlay size={16} style={{ marginRight: 4 }} />
                                Продолжить
                              </Button>
                            </VStack>
                          </HStack>

                          {/* Прогресс бар */}
                          {item.overallProgress < 100 && (
                            <Box mt={3}>
                              <Box h="3px" bg="bg.emphasized" borderRadius="full" overflow="hidden">
                                <Box
                                  w={`${item.overallProgress}%`}
                                  h="full"
                                  bg="green.solid"
                                  transition="width 0.3s ease"
                                />
                              </Box>
                            </Box>
                          )}
                        </Card.Body>
                      </Card.Root>
                    </Link>
                  ))}

                  {/* Кнопка загрузки ещё */}
                  {watchedAnime.hasMore && (
                    <Button
                      variant="outline"
                      onClick={handleLoadMoreWatched}
                      loading={watchedLoading}
                      alignSelf="center"
                      mt={4}
                    >
                      Загрузить ещё
                    </Button>
                  )}
                </VStack>
              )
              : (
                <VStack py={12} gap={4}>
                  <LuEye size={64} color="var(--chakra-colors-fg-subtle)" />
                  <Heading size="md" color="fg.muted">
                    Список пуст
                  </Heading>
                  <Text color="fg.subtle">Начните смотреть аниме из библиотеки</Text>
                  <Link href="/library">
                    <Button colorPalette="green">Перейти в библиотеку</Button>
                  </Link>
                </VStack>
              )}
          </Tabs.Content>
        </Tabs.Root>
      </Box>
    </Box>
  )
}
