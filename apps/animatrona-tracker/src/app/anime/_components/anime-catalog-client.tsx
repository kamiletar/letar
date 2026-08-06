'use client'

import {
  Badge,
  Box,
  Button,
  Collapsible,
  Container,
  Flex,
  Grid,
  Heading,
  HStack,
  Icon,
  Input,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  LuChevronDown,
  LuChevronLeft,
  LuChevronRight,
  LuChevronUp,
  LuFilm,
  LuFilter,
  LuGrid3X3,
  LuLayers,
  LuPlay,
  LuRss,
  LuSearch,
  LuX,
} from 'react-icons/lu'

import { AnimeCard, type AnimeCardItem } from '@/app/_components/anime-card'
import { Breadcrumbs } from '@/app/_components/breadcrumbs'
import type { WatchProgressSummaryItem } from '@/app/api/watch-progress/summary/route'
import { VOICE_ACTING_LABELS } from '@/lib/voice-acting-labels'

interface GenreCount {
  genre: string
  count: number
}

interface StudioCount {
  studio: string
  count: number
}

interface DirectorCount {
  director: string
  count: number
}

interface WatchStatusCount {
  watchStatus: string
  count: number
}

/** Карта WatchStatus → отображение */
const WATCH_STATUS_MAP: Record<string, { label: string; color: string }> = {
  NOT_STARTED: { label: 'Не начато', color: 'gray' },
  WATCHING: { label: 'Смотрю', color: 'blue' },
  COMPLETED: { label: 'Просмотрено', color: 'green' },
  ON_HOLD: { label: 'Отложено', color: 'yellow' },
  DROPPED: { label: 'Брошено', color: 'red' },
  PLANNED: { label: 'Запланировано', color: 'purple' },
}

/** Группировка возрастных рейтингов для UI */
const RATING_GROUPS = [
  { value: '', label: 'Все' },
  { value: 'g', label: '0+' },
  { value: 'pg', label: 'PG' },
  { value: 'pg_13', label: '13+' },
  { value: 'r', label: '17+' },
  { value: 'rx', label: '18+' },
] as const

/** Опции сортировки */
const SORT_OPTIONS = [
  { value: '', label: 'Недавние' },
  { value: 'popular', label: 'Популярные' },
  { value: 'rating', label: 'По рейтингу' },
  { value: 'title', label: 'По названию' },
] as const

interface AnimeCatalogClientProps {
  animeList: AnimeCardItem[]
  total: number
  page: number
  totalPages: number
  query: string
  genre: string
  year: string
  yearFrom: string
  yearTo: string
  sort: string
  view: string
  rating: string
  studio: string
  director: string
  epFrom: string
  epTo: string
  watchStatus: string
  /** Список voiceActing кодов через запятую: DUB_RU,SUB_EN */
  voice: string
  genreCounts: GenreCount[]
  studios: StudioCount[]
  directors: DirectorCount[]
  franchiseCounts: Record<string, number>
  watchStatusCounts: WatchStatusCount[]
  isAuthenticated: boolean
  allowedRatings: string[] | null
  ageGroup: string
}

export function AnimeCatalogClient({
  animeList,
  total,
  page,
  totalPages,
  query: initialQuery,
  genre: initialGenre,
  year: initialYear,
  yearFrom: initialYearFrom,
  yearTo: initialYearTo,
  sort: initialSort,
  view: initialView,
  rating: initialRating,
  studio: initialStudio,
  director: initialDirector,
  epFrom: initialEpFrom,
  epTo: initialEpTo,
  watchStatus: initialWatchStatus,
  voice: initialVoice,
  genreCounts,
  studios,
  directors,
  franchiseCounts,
  watchStatusCounts,
  isAuthenticated,
  allowedRatings,
}: AnimeCatalogClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [query, setQuery] = useState(initialQuery)
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(
    !!(initialStudio || initialDirector || initialEpFrom || initialEpTo),
  )
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [progressMap, setProgressMap] = useState<Record<string, WatchProgressSummaryItem>>({})

  // Загружаем прогресс просмотра для залогиненных пользователей
  useEffect(() => {
    fetch('/api/watch-progress/summary')
      .then((res) => res.json())
      .then((json) => {
        if (json.data) {
          setProgressMap(json.data)
        }
      })
      .catch(() => {
        // Молча игнорируем — прогресс опциональный
      })
  }, [])

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  // Количество активных фильтров (не считая поиск и сортировку)
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (initialGenre) {
      count++
    }
    if (initialYear || initialYearFrom || initialYearTo) {
      count++
    }
    if (initialRating) {
      count++
    }
    if (initialStudio) {
      count++
    }
    if (initialDirector) {
      count++
    }
    if (initialEpFrom || initialEpTo) {
      count++
    }
    if (initialWatchStatus) {
      count++
    }
    if (initialVoice) {
      count++
    }
    if (initialView === 'franchise') {
      count++
    }
    return count
  }, [
    initialGenre,
    initialYear,
    initialYearFrom,
    initialYearTo,
    initialRating,
    initialStudio,
    initialDirector,
    initialEpFrom,
    initialEpTo,
    initialWatchStatus,
    initialVoice,
    initialView,
  ])

  // Выбранные коды voiceActing в виде массива (для toggle в UI)
  const selectedVoiceCodes = useMemo(
    () => (initialVoice ? initialVoice.split(',').filter(Boolean) : []),
    [initialVoice],
  )

  // Доступные рейтинги для фильтра (с учётом ограничений по возрасту)
  const availableRatings = useMemo(() => {
    return RATING_GROUPS.filter((r) => r.value === '' || !allowedRatings || allowedRatings.includes(r.value))
  }, [allowedRatings])

  // Обновление URL с фильтрами
  const updateFilters = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString())

    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })

    if (!updates.page) {
      params.delete('page')
    }

    router.push(`/anime?${params.toString()}`)
  }

  // Сбросить все фильтры
  const resetFilters = () => {
    router.push('/anime')
    setQuery('')
  }

  // Переключить код озвучки/субтитров в фильтре
  const toggleVoiceCode = (code: string) => {
    const set = new Set(selectedVoiceCodes)
    if (set.has(code)) {
      set.delete(code)
    } else {
      set.add(code)
    }
    const next = Array.from(set).sort().join(',')
    updateFilters({ voice: next })
  }

  // Debounced поиск
  useEffect(() => {
    if (query === initialQuery) {
      return
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      updateFilters({ q: query })
    }, 400)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query])

  /** Общий контент фильтров (переиспользуется desktop + mobile) */
  const filterContent = (
    <VStack align="stretch" gap={4}>
      {/* Статус просмотра — только для авторизованных */}
      {isAuthenticated && watchStatusCounts.length > 0 && (
        <Box>
          <Text fontWeight="semibold" mb={2} fontSize="sm">
            Статус просмотра
          </Text>
          <HStack gap={1} flexWrap="wrap">
            <Button
              size="xs"
              variant={initialWatchStatus === '' ? 'solid' : 'outline'}
              colorPalette={initialWatchStatus === '' ? 'brand' : 'gray'}
              onClick={() => updateFilters({ watchStatus: '' })}
            >
              Все
            </Button>
            {Object.entries(WATCH_STATUS_MAP).map(([status, { label, color }]) => {
              const statusCount = watchStatusCounts.find((s) => s.watchStatus === status)
              if (!statusCount) {
                return null
              }
              return (
                <Button
                  key={status}
                  size="xs"
                  variant={initialWatchStatus === status ? 'solid' : 'outline'}
                  colorPalette={initialWatchStatus === status ? color : 'gray'}
                  onClick={() => updateFilters({ watchStatus: status })}
                >
                  {label}
                  <Badge ml={1} colorPalette={color} variant="subtle" borderRadius="full" fontSize="2xs">
                    {statusCount.count}
                  </Badge>
                </Button>
              )
            })}
          </HStack>
        </Box>
      )}

      {/* Жанры */}
      {genreCounts.length > 0 && (
        <Box>
          <Text fontWeight="semibold" mb={2} fontSize="sm">
            Жанры
          </Text>
          <HStack gap={1} flexWrap="wrap">
            <Button
              size="xs"
              variant={initialGenre === '' ? 'solid' : 'outline'}
              colorPalette={initialGenre === '' ? 'brand' : 'gray'}
              onClick={() => updateFilters({ genre: '' })}
            >
              Все
            </Button>
            {genreCounts.map(({ genre: g, count }) => (
              <Button
                key={g}
                size="xs"
                variant={initialGenre === g ? 'solid' : 'outline'}
                colorPalette={initialGenre === g ? 'brand' : 'gray'}
                onClick={() => updateFilters({ genre: g })}
              >
                {g}
                <Badge ml={1} colorPalette="gray" variant="subtle" borderRadius="full" fontSize="2xs">
                  {count}
                </Badge>
              </Button>
            ))}
          </HStack>
        </Box>
      )}

      {/* Год + Возрастной рейтинг + Вид */}
      <Flex gap={4} flexWrap="wrap" align="flex-end">
        {/* Год: диапазон */}
        <Box>
          <Text fontWeight="semibold" mb={2} fontSize="sm">
            Год
          </Text>
          <HStack gap={1}>
            <Input
              type="number"
              placeholder="от"
              size="xs"
              w="80px"
              value={initialYearFrom || initialYear}
              onChange={(e) => updateFilters({ yearFrom: e.target.value, yearTo: initialYearTo, year: '' })}
            />
            <Text color="fg.muted" fontSize="sm">
              —
            </Text>
            <Input
              type="number"
              placeholder="до"
              size="xs"
              w="80px"
              value={initialYearTo}
              onChange={(e) =>
                updateFilters({ yearTo: e.target.value, yearFrom: initialYearFrom || initialYear, year: '' })}
            />
          </HStack>
        </Box>

        {/* Возрастной рейтинг */}
        <Box>
          <Text fontWeight="semibold" mb={2} fontSize="sm">
            Рейтинг
          </Text>
          <HStack gap={1}>
            {availableRatings.map(({ value, label }) => (
              <Button
                key={value}
                size="xs"
                variant={initialRating === value ? 'solid' : 'outline'}
                colorPalette={initialRating === value ? 'brand' : 'gray'}
                onClick={() => updateFilters({ rating: value })}
              >
                {label}
              </Button>
            ))}
          </HStack>
        </Box>

        {/* Вид: Все / Франшизы */}
        <Box>
          <Text fontWeight="semibold" mb={2} fontSize="sm">
            Вид
          </Text>
          <HStack gap={1} bg="bg.muted" borderRadius="md" p={0.5}>
            <Button
              size="xs"
              variant={initialView !== 'franchise' ? 'solid' : 'ghost'}
              colorPalette={initialView !== 'franchise' ? 'brand' : 'gray'}
              onClick={() => updateFilters({ view: '' })}
            >
              <Icon as={LuGrid3X3} />
              Все
            </Button>
            <Button
              size="xs"
              variant={initialView === 'franchise' ? 'solid' : 'ghost'}
              colorPalette={initialView === 'franchise' ? 'brand' : 'gray'}
              onClick={() => updateFilters({ view: 'franchise' })}
            >
              <Icon as={LuLayers} />
              Франшизы
            </Button>
          </HStack>
        </Box>
      </Flex>

      {/* Озвучка и субтитры */}
      <Box>
        <Text fontWeight="semibold" mb={2} fontSize="sm">
          Озвучка и субтитры
        </Text>
        <HStack gap={1} flexWrap="wrap">
          {VOICE_ACTING_LABELS.map(({ code, label }) => {
            const active = selectedVoiceCodes.includes(code)
            return (
              <Button
                key={code}
                size="xs"
                variant={active ? 'solid' : 'outline'}
                colorPalette={active ? 'brand' : 'gray'}
                onClick={() => toggleVoiceCode(code)}
              >
                {label}
              </Button>
            )
          })}
          {selectedVoiceCodes.length > 0 && (
            <Button
              size="xs"
              variant="ghost"
              colorPalette="gray"
              onClick={() => updateFilters({ voice: '' })}
            >
              <Icon as={LuX} />
              Сбросить
            </Button>
          )}
        </HStack>
      </Box>

      {/* Ещё фильтры (свёрнуто) */}
      <Collapsible.Root open={moreFiltersOpen} onOpenChange={(d) => setMoreFiltersOpen(d.open)}>
        <Collapsible.Trigger asChild>
          <Button variant="ghost" size="xs" colorPalette="gray">
            <Icon as={moreFiltersOpen ? LuChevronUp : LuChevronDown} />
            Ещё фильтры
            {(initialStudio || initialDirector || initialEpFrom || initialEpTo) && (
              <Badge ml={1} colorPalette="brand" variant="subtle" borderRadius="full" fontSize="2xs">
                {[initialStudio, initialDirector, initialEpFrom || initialEpTo].filter(Boolean).length}
              </Badge>
            )}
          </Button>
        </Collapsible.Trigger>
        <Collapsible.Content>
          <Flex gap={4} flexWrap="wrap" align="flex-end" pt={3}>
            {/* Студия */}
            <Box>
              <Text fontWeight="semibold" mb={2} fontSize="sm">
                Студия
              </Text>
              <Box position="relative">
                <Input
                  size="xs"
                  w="180px"
                  placeholder="Все студии"
                  list="studio-list"
                  value={initialStudio}
                  onChange={(e) => updateFilters({ studio: e.target.value })}
                />
                <datalist id="studio-list">
                  {studios.map(({ studio: s, count }) => (
                    <option key={s} value={s}>
                      {s} ({count})
                    </option>
                  ))}
                </datalist>
              </Box>
            </Box>

            {/* Режиссёр */}
            <Box>
              <Text fontWeight="semibold" mb={2} fontSize="sm">
                Режиссёр
              </Text>
              <Box position="relative">
                <Input
                  size="xs"
                  w="180px"
                  placeholder="Любой режиссёр"
                  list="director-list"
                  value={initialDirector}
                  onChange={(e) => updateFilters({ director: e.target.value })}
                />
                <datalist id="director-list">
                  {directors.map(({ director: d, count }) => (
                    <option key={d} value={d}>
                      {d} ({count})
                    </option>
                  ))}
                </datalist>
              </Box>
            </Box>

            {/* Эпизоды: диапазон */}
            <Box>
              <Text fontWeight="semibold" mb={2} fontSize="sm">
                Эпизоды
              </Text>
              <HStack gap={1}>
                <Input
                  type="number"
                  placeholder="от"
                  size="xs"
                  w="70px"
                  value={initialEpFrom}
                  onChange={(e) => updateFilters({ epFrom: e.target.value })}
                />
                <Text color="fg.muted" fontSize="sm">
                  —
                </Text>
                <Input
                  type="number"
                  placeholder="до"
                  size="xs"
                  w="70px"
                  value={initialEpTo}
                  onChange={(e) => updateFilters({ epTo: e.target.value })}
                />
              </HStack>
            </Box>
          </Flex>
        </Collapsible.Content>
      </Collapsible.Root>
    </VStack>
  )

  return (
    <Box minH="100vh" bg="bg">
      {/* Header */}
      <Box bg="bg.panel" borderBottomWidth="1px" py={3}>
        <Container maxW="container.xl">
          <Flex justify="space-between" align="center" gap={4} flexWrap="wrap">
            <VStack align="flex-start" gap={1}>
              <Breadcrumbs items={[{ label: 'Каталог аниме' }]} />
              <HStack gap={2}>
                <Heading as="h1" size="lg">
                  <Icon as={LuPlay} mr={2} />
                  Каталог аниме
                </Heading>
                <a href="/api/rss/feed.xml" target="_blank" rel="noopener noreferrer" title="RSS фид новых релизов">
                  <Icon as={LuRss} boxSize={5} color="orange.500" _hover={{ color: 'orange.400' }} />
                </a>
              </HStack>
            </VStack>

            {/* Поиск + Сортировка */}
            <HStack gap={3} flex={1} maxW="600px" justify="flex-end">
              <Flex gap={2} flex={1} maxW="300px" align="center">
                <Icon as={LuSearch} color="fg.muted" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Поиск аниме..."
                  size="sm"
                />
              </Flex>

              {/* Сортировка */}
              <HStack gap={1}>
                <Text fontSize="xs" color="fg.muted" whiteSpace="nowrap">
                  Сортировка:
                </Text>
                <HStack gap={0.5} bg="bg.muted" borderRadius="md" p={0.5}>
                  {SORT_OPTIONS.map(({ value, label }) => (
                    <Button
                      key={value}
                      size="xs"
                      variant={initialSort === value ? 'solid' : 'ghost'}
                      colorPalette={initialSort === value ? 'brand' : 'gray'}
                      onClick={() => updateFilters({ sort: value })}
                    >
                      {label}
                    </Button>
                  ))}
                </HStack>
              </HStack>
            </HStack>
          </Flex>
        </Container>
      </Box>

      <Container maxW="container.xl" py={4}>
        {/* Фильтры — desktop: горизонтальные ряды */}
        <Box hideBelow="lg" mb={6}>
          {filterContent}

          {/* Итого + сброс */}
          <Flex justify="space-between" align="center" mt={3}>
            <Text fontSize="sm" color="fg.muted">
              Найдено: <strong>{total}</strong> аниме
            </Text>
            {activeFilterCount > 0 && (
              <Button size="xs" variant="ghost" colorPalette="red" onClick={resetFilters}>
                <Icon as={LuX} />
                Сбросить фильтры ({activeFilterCount})
              </Button>
            )}
          </Flex>
        </Box>

        {/* Фильтры — mobile: в сворачиваемом блоке */}
        <Box hideFrom="lg" mb={4}>
          <Collapsible.Root open={mobileFiltersOpen} onOpenChange={(d) => setMobileFiltersOpen(d.open)}>
            <Flex gap={2} mb={2}>
              <Collapsible.Trigger asChild>
                <Button variant="outline" flex={1}>
                  <HStack>
                    <Icon as={LuFilter} />
                    <Text>Фильтры</Text>
                    {activeFilterCount > 0 && (
                      <Badge colorPalette="brand" borderRadius="full">
                        {activeFilterCount}
                      </Badge>
                    )}
                    <Icon as={mobileFiltersOpen ? LuChevronUp : LuChevronDown} />
                  </HStack>
                </Button>
              </Collapsible.Trigger>
              {activeFilterCount > 0 && (
                <Button size="sm" variant="ghost" colorPalette="red" onClick={resetFilters}>
                  <Icon as={LuX} />
                </Button>
              )}
            </Flex>
            <Collapsible.Content>
              <Box pb={4} borderBottomWidth="1px" mb={4}>
                {filterContent}
              </Box>
            </Collapsible.Content>
          </Collapsible.Root>

          <Text fontSize="sm" color="fg.muted">
            Найдено: <strong>{total}</strong> аниме
          </Text>
        </Box>

        {/* Контент */}
        {animeList.length === 0
          ? (
            <Box textAlign="center" py={16}>
              <Icon as={LuFilm} boxSize={12} color="fg.muted" mb={4} />
              <Heading size="lg" mb={2}>
                Ничего не найдено
              </Heading>
              <Text color="fg.muted" mb={4}>
                Попробуйте изменить параметры поиска
              </Text>
              {activeFilterCount > 0 && (
                <Button variant="outline" onClick={resetFilters}>
                  Сбросить фильтры
                </Button>
              )}
            </Box>
          )
          : (
            <>
              <Grid
                templateColumns={{
                  base: '1fr',
                  sm: 'repeat(2, 1fr)',
                  md: 'repeat(3, 1fr)',
                  lg: 'repeat(4, 1fr)',
                  xl: 'repeat(5, 1fr)',
                }}
                gap={6}
              >
                {animeList.map((anime) => (
                  <AnimeCard
                    key={anime.id}
                    anime={anime}
                    progress={progressMap[anime.id]}
                    franchiseCount={franchiseCounts[anime.id]}
                  />
                ))}
              </Grid>

              {/* Пагинация */}
              {totalPages > 1 && (
                <Flex justify="center" gap={2} mt={8}>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => updateFilters({ page: String(page - 1) })}
                  >
                    <Icon as={LuChevronLeft} />
                  </Button>

                  <HStack gap={1}>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (page <= 3) {
                        pageNum = i + 1
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = page - 2 + i
                      }
                      return (
                        <Button
                          key={pageNum}
                          size="sm"
                          variant={page === pageNum ? 'solid' : 'outline'}
                          colorPalette={page === pageNum ? 'brand' : 'gray'}
                          onClick={() => updateFilters({ page: String(pageNum) })}
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </HStack>

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= totalPages}
                    onClick={() => updateFilters({ page: String(page + 1) })}
                  >
                    <Icon as={LuChevronRight} />
                  </Button>
                </Flex>
              )}
            </>
          )}
      </Container>
    </Box>
  )
}

// AnimeCard импортирован из @/app/_components/anime-card
