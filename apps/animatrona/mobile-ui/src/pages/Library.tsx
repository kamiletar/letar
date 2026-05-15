/**
 * Страница библиотеки — список аниме
 *
 * Функции:
 * - Pull-to-refresh для обновления данных
 * - Debounced поиск через useDeferredValue
 * - Фильтрация по статусу просмотра
 * - Сортировка библиотеки
 * - Продолжить просмотр
 */

import {
  Box,
  Container,
  Flex,
  Grid,
  Heading,
  HStack,
  Image,
  Input,
  Skeleton,
  SkeletonText,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { LuArrowDownUp, LuCheck, LuSearch } from 'react-icons/lu'
import { Link } from 'react-router-dom'

import { type AnimeListItem, getLastWatched, getLibrary, getPosterUrl, type LastWatched } from '../api'
import { ContinueWatchingCard } from '../components/ContinueWatchingCard'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { PullToRefreshContainer } from '../components/PullToRefresh'
import { usePullToRefresh } from '../hooks/usePullToRefresh'

/** Фильтры по статусу просмотра */
const WATCH_STATUS_FILTERS = [
  { value: 'all', label: 'Все' },
  { value: 'WATCHING', label: 'Смотрю' },
  { value: 'COMPLETED', label: 'Просмотрено' },
  { value: 'PLANNED', label: 'Запланировано' },
  { value: 'NOT_STARTED', label: 'Не начато' },
] as const

/** Опции сортировки */
const SORT_OPTIONS = [
  { value: 'name', label: 'По названию' },
  { value: 'year', label: 'По году' },
  { value: 'rating', label: 'По рейтингу' },
  { value: 'progress', label: 'По прогрессу' },
  { value: 'lastWatched', label: 'По просмотру' },
] as const

type SortOption = (typeof SORT_OPTIONS)[number]['value']

export function LibraryPage() {
  const [anime, setAnime] = useState<AnimeListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [lastWatched, setLastWatched] = useState<LastWatched | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>('lastWatched')
  const [sortMenuOpen, setSortMenuOpen] = useState(false)

  // Debounced поиск через useDeferredValue (React 19)
  const deferredSearch = useDeferredValue(search)
  const isSearching = search !== deferredSearch

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [libraryData, lastWatchedData] = await Promise.all([
        getLibrary(),
        getLastWatched().catch(() => null), // Не критично если не загрузится
      ])
      setAnime(libraryData)
      setLastWatched(lastWatchedData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
    } finally {
      setLoading(false)
    }
  }, [])

  // Pull-to-refresh
  const pullToRefresh = usePullToRefresh({
    onRefresh: fetchData,
    disabled: loading,
  })

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Фильтрация и сортировка
  const filteredAnime = useMemo(() => {
    let result = anime.filter((item) => {
      // Поиск по названию (используем deferred value для оптимизации)
      if (deferredSearch) {
        const query = deferredSearch.toLowerCase()
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
          // По последнему просмотренному эпизоду (desc)
          return (b.lastWatchedEpisode || 0) - (a.lastWatchedEpisode || 0)
        default:
          return 0
      }
    })

    return result
  }, [anime, deferredSearch, statusFilter, sortBy])

  // Показываем пустое состояние только если не loading и не поиск
  const showEmptyState = !loading && anime.length === 0 && !error

  if (error) {
    return (
      <Container py={8}>
        <ErrorState type="network" title="Ошибка загрузки" message={error} onRetry={fetchData} />
      </Container>
    )
  }

  return (
    <PullToRefreshContainer
      show={pullToRefresh.showIndicator}
      state={pullToRefresh.state}
      pullDistance={pullToRefresh.pullDistance}
      progress={pullToRefresh.progress}
      contentStyle={pullToRefresh.contentStyle}
      handlers={pullToRefresh.handlers}
    >
      <Box minH="100vh" bg="gray.950">
        {/* Header */}
        <Box
          position="sticky"
          top={0}
          bg="gray.950/80"
          backdropFilter="blur(10px)"
          borderBottom="1px solid"
          borderColor="gray.800"
          zIndex={10}
        >
          {/* Safe area для notch */}
          <Box pt="env(safe-area-inset-top)" />

          <Container py={4}>
            <Flex justify="space-between" align="center" mb={4}>
              <Heading size="lg">Библиотека</Heading>

              {/* Кнопка сортировки */}
              <Box position="relative">
                <Box
                  as="button"
                  px={3}
                  py={2}
                  minH="44px"
                  display="flex"
                  alignItems="center"
                  gap={2}
                  borderRadius="lg"
                  bg="gray.800"
                  color="gray.300"
                  fontSize="sm"
                  onClick={() => setSortMenuOpen(!sortMenuOpen)}
                  transition="all 0.2s"
                  _hover={{ bg: 'gray.700' }}
                  _active={{ transform: 'scale(0.98)' }}
                >
                  <LuArrowDownUp size={16} />
                  {SORT_OPTIONS.find((o) => o.value === sortBy)?.label}
                </Box>

                {/* Dropdown меню */}
                {sortMenuOpen && (
                  <>
                    {/* Backdrop для закрытия */}
                    <Box position="fixed" inset={0} zIndex={20} onClick={() => setSortMenuOpen(false)} />

                    <Box
                      position="absolute"
                      top="100%"
                      right={0}
                      mt={2}
                      bg="gray.800"
                      borderRadius="lg"
                      border="1px solid"
                      borderColor="gray.700"
                      shadow="xl"
                      overflow="hidden"
                      zIndex={30}
                      minW="180px"
                      animation="fadeIn 0.15s ease-out"
                      css={{
                        '@keyframes fadeIn': {
                          from: { opacity: 0, transform: 'translateY(-8px)' },
                          to: { opacity: 1, transform: 'translateY(0)' },
                        },
                      }}
                    >
                      {SORT_OPTIONS.map((option) => (
                        <Box
                          key={option.value}
                          as="button"
                          display="block"
                          w="100%"
                          px={4}
                          py={3}
                          textAlign="left"
                          fontSize="sm"
                          color={sortBy === option.value ? 'purple.400' : 'gray.300'}
                          bg={sortBy === option.value ? 'gray.700' : 'transparent'}
                          _hover={{ bg: 'gray.700' }}
                          transition="all 0.15s"
                          onClick={() => {
                            setSortBy(option.value)
                            setSortMenuOpen(false)
                          }}
                        >
                          {option.label}
                        </Box>
                      ))}
                    </Box>
                  </>
                )}
              </Box>
            </Flex>

            {/* Поиск */}
            <Box position="relative" mb={3}>
              <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" color="gray.500" zIndex={1}>
                <LuSearch size={18} />
              </Box>
              <Input
                placeholder="Поиск аниме..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                bg="gray.900"
                border="1px solid"
                borderColor="gray.700"
                pl={10}
                _placeholder={{ color: 'gray.500' }}
                _focus={{ borderColor: 'purple.500', boxShadow: '0 0 0 1px var(--chakra-colors-purple-500)' }}
              />
              {/* Индикатор поиска */}
              {isSearching && (
                <Box
                  position="absolute"
                  right={3}
                  top="50%"
                  transform="translateY(-50%)"
                  w="16px"
                  h="16px"
                  borderRadius="full"
                  border="2px solid"
                  borderColor="purple.500"
                  borderTopColor="transparent"
                  animation="spin 0.6s linear infinite"
                  css={{ '@keyframes spin': { to: { transform: 'translateY(-50%) rotate(360deg)' } } }}
                />
              )}
            </Box>

            {/* Фильтры */}
            <HStack gap={2} overflowX="auto" pb={1} css={{ '&::-webkit-scrollbar': { display: 'none' } }}>
              {WATCH_STATUS_FILTERS.map((filter) => (
                <Box
                  key={filter.value}
                  as="button"
                  px={4}
                  py={2}
                  minH="44px"
                  display="flex"
                  alignItems="center"
                  borderRadius="full"
                  fontSize="sm"
                  fontWeight="medium"
                  whiteSpace="nowrap"
                  bg={statusFilter === filter.value ? 'purple.600' : 'gray.800'}
                  color={statusFilter === filter.value ? 'white' : 'gray.300'}
                  onClick={() => setStatusFilter(filter.value)}
                  transition="all 0.2s"
                  _hover={{ bg: statusFilter === filter.value ? 'purple.500' : 'gray.700' }}
                  _active={{ transform: 'scale(0.98)' }}
                >
                  {filter.label}
                </Box>
              ))}
            </HStack>
          </Container>
        </Box>

        {/* Продолжить просмотр */}
        {lastWatched && !search && statusFilter === 'all' && (
          <Container py={4} pb={0}>
            <ContinueWatchingCard data={lastWatched} />
          </Container>
        )}

        {/* Список */}
        <Container py={4}>
          {loading ? (
            <Grid templateColumns={['1fr', 'repeat(2, 1fr)', 'repeat(3, 1fr)']} gap={4}>
              {[...Array(6)].map((_, i) => (
                <AnimeCardSkeleton key={i} />
              ))}
            </Grid>
          ) : showEmptyState ? (
            <EmptyState />
          ) : filteredAnime.length === 0 ? (
            <VStack py={12} gap={2}>
              <Text color="gray.500">Ничего не найдено</Text>
              {search && (
                <Text color="gray.600" fontSize="sm">
                  Попробуйте изменить запрос
                </Text>
              )}
            </VStack>
          ) : (
            <Grid templateColumns={['1fr', 'repeat(2, 1fr)', 'repeat(3, 1fr)']} gap={4}>
              {filteredAnime.map((item) => (
                <AnimeCard key={item.id} anime={item} />
              ))}
            </Grid>
          )}
        </Container>

        {/* Safe area снизу */}
        <Box pb="env(safe-area-inset-bottom)" />
      </Box>
    </PullToRefreshContainer>
  )
}

/** Карточка аниме */
function AnimeCard({ anime }: { anime: AnimeListItem }) {
  const [imageLoaded, setImageLoaded] = useState(false)

  // Процент просмотра
  const progressPercent = anime.episodeCount > 0 ? Math.round((anime.watchedEpisodes / anime.episodeCount) * 100) : 0

  return (
    <Link to={`/anime/${anime.id}`}>
      <Box
        bg="gray.900"
        borderRadius="lg"
        overflow="hidden"
        transition="transform 0.2s"
        _hover={{ transform: 'scale(1.02)' }}
        _active={{ transform: 'scale(0.98)' }}
      >
        {/* Постер */}
        <Box position="relative" aspectRatio={2 / 3}>
          {!imageLoaded && <Skeleton position="absolute" inset={0} />}
          <Image
            src={getPosterUrl(anime.id)}
            alt={anime.name}
            w="100%"
            h="100%"
            objectFit="cover"
            onLoad={() => setImageLoaded(true)}
            opacity={imageLoaded ? 1 : 0}
            transition="opacity 0.3s"
          />

          {/* Прогресс */}
          {progressPercent > 0 && progressPercent < 100 && (
            <Box position="absolute" bottom={0} left={0} right={0} h="3px" bg="gray.700">
              <Box h="100%" bg="purple.500" w={`${progressPercent}%`} />
            </Box>
          )}

          {/* Бейдж статуса */}
          {anime.watchStatus === 'COMPLETED' && (
            <Box
              position="absolute"
              top={2}
              right={2}
              bg="green.500"
              color="white"
              p={1}
              borderRadius="full"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <LuCheck size={14} />
            </Box>
          )}
        </Box>

        {/* Инфо */}
        <Box p={3}>
          <Text fontWeight="semibold" fontSize="sm" lineClamp={2} minH="2.5em">
            {anime.name}
          </Text>
          <Flex justify="space-between" align="center" mt={1}>
            <Text color="gray.500" fontSize="xs">
              {anime.year || '—'}
            </Text>
            <Text color="gray.500" fontSize="xs">
              {anime.watchedEpisodes}/{anime.episodeCount} эп.
            </Text>
          </Flex>
        </Box>
      </Box>
    </Link>
  )
}

/** Скелетон карточки */
function AnimeCardSkeleton() {
  return (
    <Box bg="gray.900" borderRadius="lg" overflow="hidden">
      <Skeleton aspectRatio={2 / 3} />
      <Box p={3}>
        <SkeletonText noOfLines={2} gap={2} />
      </Box>
    </Box>
  )
}
