/**
 * Страница аниме — детали и список эпизодов
 *
 * Функции:
 * - Pull-to-refresh для обновления данных
 * - Expandable description для длинных описаний
 * - Sticky season headers с backdrop blur
 * - Collapsible episode groups по сезонам
 * - Прогресс просмотра на эпизодах
 */

import {
  Badge,
  Box,
  Container,
  Flex,
  Heading,
  HStack,
  IconButton,
  Image,
  Skeleton,
  SkeletonText,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { LuArrowLeft, LuCheck, LuChevronUp, LuPlay } from 'react-icons/lu'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { type AnimeDetails, type Episode, getAnimeDetails, getPosterUrl } from '../api'
import { ErrorState } from '../components/ErrorState'
import { ExpandableText } from '../components/ExpandableText'
import { PullToRefreshContainer } from '../components/PullToRefresh'
import { usePullToRefresh } from '../hooks/usePullToRefresh'

/** Статусы аниме */
const ANIME_STATUS_MAP: Record<string, { label: string; color: string }> = {
  ONGOING: { label: 'Онгоинг', color: 'green' },
  COMPLETED: { label: 'Завершён', color: 'blue' },
  ANNOUNCED: { label: 'Анонс', color: 'purple' },
}

/** Статусы просмотра */
const WATCH_STATUS_MAP: Record<string, { label: string; color: string }> = {
  NOT_STARTED: { label: 'Не начато', color: 'gray' },
  WATCHING: { label: 'Смотрю', color: 'blue' },
  COMPLETED: { label: 'Просмотрено', color: 'green' },
  ON_HOLD: { label: 'Отложено', color: 'yellow' },
  DROPPED: { label: 'Брошено', color: 'red' },
  PLANNED: { label: 'Запланировано', color: 'purple' },
}

export function AnimePage() {
  const { animeId } = useParams<{ animeId: string }>()
  const navigate = useNavigate()
  const [anime, setAnime] = useState<AnimeDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [collapsedSeasons, setCollapsedSeasons] = useState<Set<number>>(new Set())

  const fetchData = useCallback(async () => {
    if (!animeId) {
      return
    }

    try {
      const data = await getAnimeDetails(animeId)
      setAnime(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
    } finally {
      setLoading(false)
    }
  }, [animeId])

  // Pull-to-refresh
  const pullToRefresh = usePullToRefresh({
    onRefresh: fetchData,
    disabled: loading,
  })

  useEffect(() => {
    setLoading(true)
    fetchData()
  }, [fetchData])

  // Toggle свёрнутости сезона
  const toggleSeason = useCallback((seasonNumber: number) => {
    setCollapsedSeasons((prev) => {
      const next = new Set(prev)
      if (next.has(seasonNumber)) {
        next.delete(seasonNumber)
      } else {
        next.add(seasonNumber)
      }
      return next
    })
  }, [])

  if (error) {
    return (
      <Container py={8}>
        <ErrorState type="network" title="Ошибка загрузки" message={error} onRetry={fetchData} />
        <Box
          as="button"
          display="flex"
          alignItems="center"
          gap={2}
          mx="auto"
          mt={4}
          color="gray.400"
          minH="44px"
          px={4}
          onClick={() => navigate('/')}
        >
          <LuArrowLeft size={18} />
          Назад к библиотеке
        </Box>
      </Container>
    )
  }

  if (loading || !anime) {
    return <AnimePageSkeleton />
  }

  // Группируем эпизоды по сезонам
  const episodesBySeason = anime.episodes.reduce(
    (acc, ep) => {
      const key = ep.seasonNumber
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(ep)
      return acc
    },
    {} as Record<number, Episode[]>
  )

  const animeStatus = ANIME_STATUS_MAP[anime.status] || { label: anime.status, color: 'gray' }
  const watchStatus = WATCH_STATUS_MAP[anime.watchStatus] || { label: anime.watchStatus, color: 'gray' }

  // Определяем, нужны ли collapsible сезоны (если больше одного сезона)
  const hasMultipleSeasons = anime.seasons.length > 1

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
        {/* Header с постером */}
        <Box position="relative">
          {/* Фоновый blur постера */}
          <Box
            position="absolute"
            inset={0}
            overflow="hidden"
            _after={{
              content: '""',
              position: 'absolute',
              inset: 0,
              bg: 'linear-gradient(to bottom, transparent 0%, gray.950 100%)',
            }}
          >
            <Image
              src={getPosterUrl(anime.id)}
              alt=""
              w="100%"
              h="100%"
              objectFit="cover"
              filter="blur(20px)"
              opacity={0.3}
              transform="scale(1.1)"
            />
          </Box>

          {/* Safe area для notch */}
          <Box position="absolute" top={0} left={0} right={0} pt="env(safe-area-inset-top)" zIndex={11} />

          {/* Кнопка назад */}
          <Box position="absolute" top={4} left={4} zIndex={10} pt="env(safe-area-inset-top)">
            <Link to="/">
              <IconButton
                aria-label="Назад"
                variant="ghost"
                bg="gray.900/80"
                color="white"
                borderRadius="full"
                minW="44px"
                minH="44px"
              >
                <LuArrowLeft size={24} />
              </IconButton>
            </Link>
          </Box>

          {/* Контент */}
          <Container position="relative" pt="calc(env(safe-area-inset-top) + 64px)" pb={6}>
            <Flex gap={4}>
              {/* Постер */}
              <Box flexShrink={0} w="120px">
                <Image
                  src={getPosterUrl(anime.id)}
                  alt={anime.name}
                  borderRadius="lg"
                  shadow="xl"
                  w="100%"
                  aspectRatio={2 / 3}
                  objectFit="cover"
                />
              </Box>

              {/* Инфо */}
              <VStack align="start" gap={2} flex={1}>
                <Heading size="md" lineClamp={2}>
                  {anime.name}
                </Heading>

                {anime.originalName && (
                  <Text color="gray.400" fontSize="sm" lineClamp={1}>
                    {anime.originalName}
                  </Text>
                )}

                <HStack gap={2} flexWrap="wrap">
                  <Badge colorPalette={animeStatus.color}>{animeStatus.label}</Badge>
                  <Badge colorPalette={watchStatus.color}>{watchStatus.label}</Badge>
                </HStack>

                <HStack gap={3} color="gray.400" fontSize="sm">
                  {anime.year && <Text>{anime.year}</Text>}
                  <Text>{anime.episodeCount} эп.</Text>
                  {anime.rating && <Text>★ {anime.rating.toFixed(1)}</Text>}
                </HStack>
              </VStack>
            </Flex>
          </Container>
        </Box>

        {/* Жанры */}
        {anime.genres.length > 0 && (
          <Container pb={4}>
            <HStack gap={2} flexWrap="wrap">
              {anime.genres.map((genre) => (
                <Badge key={genre} variant="subtle" colorPalette="gray">
                  {genre}
                </Badge>
              ))}
            </HStack>
          </Container>
        )}

        {/* Описание с expandable */}
        {anime.description && (
          <Container pb={4}>
            <ExpandableText text={anime.description} maxLines={3} color="gray.300" fontSize="sm" />
          </Container>
        )}

        {/* Эпизоды */}
        <Container pb={8}>
          <Heading size="sm" mb={4}>
            Эпизоды
          </Heading>

          <VStack gap={0} align="stretch">
            {Object.entries(episodesBySeason).map(([seasonNumStr, episodes]) => {
              const seasonNum = Number(seasonNumStr)
              const isCollapsed = collapsedSeasons.has(seasonNum)
              const seasonName = episodes[0]?.seasonName
              const watchedInSeason = episodes.filter((ep) => ep.progress?.completed).length

              return (
                <Box key={seasonNum}>
                  {/* Sticky season header */}
                  {hasMultipleSeasons && (
                    <Box
                      position="sticky"
                      top="calc(env(safe-area-inset-top) + 0px)"
                      zIndex={5}
                      bg="gray.950/90"
                      backdropFilter="blur(8px)"
                      mx={-4}
                      px={4}
                      py={3}
                      mb={2}
                      borderBottom="1px solid"
                      borderColor="gray.800"
                    >
                      <Box
                        as="button"
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                        w="100%"
                        minH="44px"
                        onClick={() => toggleSeason(seasonNum)}
                        transition="all 0.2s"
                        _active={{ opacity: 0.7 }}
                      >
                        <VStack align="start" gap={0}>
                          <Text fontWeight="semibold" color="white">
                            Сезон {seasonNum}
                            {seasonName && ` — ${seasonName}`}
                          </Text>
                          <Text fontSize="xs" color="gray.500">
                            {watchedInSeason}/{episodes.length} эпизодов просмотрено
                          </Text>
                        </VStack>

                        <Box
                          color="gray.400"
                          transition="transform 0.2s"
                          transform={isCollapsed ? 'rotate(0)' : 'rotate(180deg)'}
                        >
                          <LuChevronUp size={20} />
                        </Box>
                      </Box>
                    </Box>
                  )}

                  {/* Эпизоды сезона */}
                  <Box
                    overflow="hidden"
                    style={{
                      maxHeight: isCollapsed ? 0 : `${episodes.length * 100}px`,
                      opacity: isCollapsed ? 0 : 1,
                      transition: 'max-height 0.3s ease-out, opacity 0.2s ease-out',
                    }}
                  >
                    {episodes.map((ep) => (
                      <EpisodeRow key={ep.id} episode={ep} animeId={anime.id} />
                    ))}
                  </Box>
                </Box>
              )
            })}
          </VStack>
        </Container>

        {/* Safe area снизу */}
        <Box pb="env(safe-area-inset-bottom)" />
      </Box>
    </PullToRefreshContainer>
  )
}

/** Строка эпизода */
function EpisodeRow({ episode, animeId }: { episode: Episode; animeId: string }) {
  const isWatched = episode.progress?.completed
  const hasProgress = episode.progress && episode.progress.currentTime > 0

  // Процент просмотра
  const progressPercent =
    hasProgress && episode.durationMs
      ? Math.round((episode.progress!.currentTime / (episode.durationMs / 1000)) * 100)
      : 0

  // Форматирование длительности
  const formatDuration = (ms: number | null) => {
    if (!ms) {
      return ''
    }
    const minutes = Math.floor(ms / 60000)
    return `${minutes} мин`
  }

  const canPlay = !!(episode.videoCid || episode.videoPath)

  // Вызвать fullscreen при клике — в том же user gesture перед навигацией
  const handleClick = () => {
    if (canPlay) {
      document.documentElement.requestFullscreen?.().catch(() => {
        // Игнорируем ошибки — fullscreen может быть недоступен
      })
    }
  }

  return (
    <Link
      to={canPlay ? `/player/${episode.id}?anime=${animeId}` : '#'}
      style={{ pointerEvents: canPlay ? 'auto' : 'none' }}
      onClick={handleClick}
    >
      <Box
        bg="gray.900"
        borderRadius="lg"
        p={3}
        mb={2}
        opacity={canPlay ? 1 : 0.5}
        transition="all 0.2s"
        _hover={canPlay ? { bg: 'gray.800' } : {}}
        _active={canPlay ? { transform: 'scale(0.98)' } : {}}
      >
        <Flex justify="space-between" align="center">
          <HStack gap={3}>
            {/* Номер */}
            <Box
              w="44px"
              h="44px"
              borderRadius="lg"
              bg={isWatched ? 'green.900' : 'gray.800'}
              display="flex"
              alignItems="center"
              justifyContent="center"
              fontWeight="bold"
              color={isWatched ? 'green.300' : 'white'}
            >
              {isWatched ? <LuCheck size={20} /> : episode.number}
            </Box>

            {/* Название */}
            <VStack align="start" gap={0}>
              <Text fontWeight="medium" fontSize="sm">
                Эпизод {episode.number}
                {episode.name && `: ${episode.name}`}
              </Text>
              <Text color="gray.500" fontSize="xs">
                {formatDuration(episode.durationMs)}
                {!canPlay && ' • Нет видео'}
              </Text>
            </VStack>
          </HStack>

          {/* Кнопка воспроизведения */}
          {canPlay && (
            <Box
              w="44px"
              h="44px"
              borderRadius="full"
              bg="purple.600"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <LuPlay size={20} color="white" fill="white" />
            </Box>
          )}
        </Flex>

        {/* Прогресс-бар */}
        {hasProgress && !isWatched && (
          <Box mt={2} h="2px" bg="gray.700" borderRadius="full">
            <Box h="100%" bg="purple.500" borderRadius="full" w={`${progressPercent}%`} />
          </Box>
        )}
      </Box>
    </Link>
  )
}

/** Скелетон страницы */
function AnimePageSkeleton() {
  return (
    <Box minH="100vh" bg="gray.950">
      {/* Safe area */}
      <Box pt="env(safe-area-inset-top)" />

      <Container pt={16} pb={6}>
        <Flex gap={4}>
          <Skeleton w="120px" h="180px" borderRadius="lg" />
          <VStack align="start" gap={2} flex={1}>
            <SkeletonText noOfLines={2} gap={2} w="100%" />
            <Skeleton h={6} w="40%" />
          </VStack>
        </Flex>
      </Container>
      <Container>
        <SkeletonText noOfLines={4} gap={2} />
      </Container>
    </Box>
  )
}
