'use client'

import {
  Box,
  Button,
  Card,
  Collapsible,
  createListCollection,
  HStack,
  Icon,
  Input,
  Select,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import { LuChevronDown, LuChevronUp, LuFilter, LuSearch, LuSlidersHorizontal } from 'react-icons/lu'

import { STATUS_ORDER, WATCH_STATUS_CONFIG } from '../WatchStatusSelector'
import { type ActiveFilter, ActiveFilters } from './ActiveFilters'
import { MobileFilterDrawer } from './MobileFilterDrawer'
import { QualityFilterGroup } from './QualityFilterGroup'
import { SearchableSelect } from './SearchableSelect'
import type { AnimeFiltersProps, SortOption } from './types'

// Статические коллекции
const statusCollection = createListCollection({
  items: [
    { value: '', label: 'Все статусы' },
    { value: 'ONGOING', label: 'Выходит' },
    { value: 'COMPLETED', label: 'Завершён' },
    { value: 'ANNOUNCED', label: 'Анонс' },
  ],
})

const watchStatusCollection = createListCollection({
  items: STATUS_ORDER.map((s) => ({ value: s, label: WATCH_STATUS_CONFIG[s].label })),
})

const pinnedStatusCollection = createListCollection({
  items: [
    { value: '', label: 'Все' },
    { value: 'local', label: 'На диске' },
    { value: 'remote', label: 'Облако' },
  ],
})

const reuploadStatusCollection = createListCollection({
  items: [
    { value: '', label: 'Все' },
    { value: 'needs', label: 'Требует перезаливки' },
    { value: 'done', label: 'Перезалито' },
  ],
})

const ageRatingCollection = createListCollection({
  items: [
    { value: '', label: 'Все' },
    { value: 'kids', label: 'До 13' },
    { value: 'teen', label: '13+' },
    { value: 'adult', label: '17+' },
  ],
})

const currentYear = new Date().getFullYear()

const sortCollection = createListCollection({
  items: [
    { value: '-updatedAt', label: 'Недавно обновлённые' },
    { value: '-createdAt', label: 'Недавно добавленные' },
    { value: 'title', label: 'По названию (А-Я)' },
    { value: '-title', label: 'По названию (Я-А)' },
    { value: '-year', label: 'По году (новые)' },
    { value: 'year', label: 'По году (старые)' },
    { value: '-rating', label: 'По рейтингу' },
    { value: '-episodeCount', label: 'По кол-ву эпизодов' },
    { value: '-watchedAt', label: 'По дате просмотра' },
  ],
})

/**
 * Фильтры для каталога аниме
 *
 * Redesign v0.18.0:
 * - ActiveFilters — видимые чипсы активных фильтров
 * - QualityFilterGroup — объединение разрешения и битности
 * - MobileFilterDrawer — bottom sheet для мобильных
 * - Чёткие лейблы вместо "Любой", "Любое..."
 */
export function AnimeFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  yearMin,
  onYearMinChange,
  yearMax,
  onYearMaxChange,
  onYearRangeClear,
  genre,
  onGenreChange,
  genres,
  studio,
  onStudioChange,
  studios,
  fandubber,
  onFandubberChange,
  fandubbers,
  director,
  onDirectorChange,
  directors,
  episodesMin,
  onEpisodesMinChange,
  episodesMax,
  onEpisodesMaxChange,
  onEpisodesRangeClear,
  resolution,
  onResolutionChange,
  bitDepth,
  onBitDepthChange,
  onQualityClear,
  sortBy,
  onSortChange,
  watchStatus,
  onWatchStatusChange,
  pinnedStatus,
  onPinnedStatusChange,
  reuploadStatus,
  onReuploadStatusChange,
  ageRatingFilter,
  onAgeRatingFilterChange,
  onReset,
  resultCount,
  counts,
  isLoadingCounts: _isLoadingCounts,
}: AnimeFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false)

  // Динамические коллекции
  const genreCollection = useMemo(
    () =>
      createListCollection({
        items: [{ value: '', label: 'Все жанры' }, ...genres.map((g) => ({ value: g.id, label: g.name }))],
      }),
    [genres],
  )

  const studioCollection = useMemo(
    () =>
      createListCollection({
        items: [{ value: '', label: 'Все студии' }, ...studios.map((s) => ({ value: s.id, label: s.name }))],
      }),
    [studios],
  )

  const fandubberCollection = useMemo(
    () =>
      createListCollection({
        items: [{ value: '', label: 'Любая озвучка' }, ...fandubbers.map((f) => ({ value: f.id, label: f.name }))],
      }),
    [fandubbers],
  )

  const directorCollection = useMemo(
    () =>
      createListCollection({
        items: [{ value: '', label: 'Любой режиссёр' }, ...directors.map((d) => ({ value: d.id, label: d.name }))],
      }),
    [directors],
  )

  // Собираем активные фильтры для ActiveFilters компонента
  const activeFilters = useMemo(() => {
    const filters: ActiveFilter[] = []

    // Поиск по названию (v0.19.0)
    if (search) {
      filters.push({
        key: 'search',
        category: 'Поиск',
        label: search.length > 20 ? `${search.slice(0, 20)}...` : search,
        onClear: () => onSearchChange(''),
      })
    }

    if (status) {
      const item = statusCollection.items.find((i) => i.value === status)
      if (item) {
        filters.push({
          key: 'status',
          category: 'Статус',
          label: item.label,
          onClear: () => onStatusChange(''),
        })
      }
    }

    if (yearMin || yearMax) {
      const label = yearMin && yearMax ? `${yearMin}–${yearMax}` : yearMin ? `от ${yearMin}` : `до ${yearMax}`
      filters.push({
        key: 'year',
        category: 'Год',
        label,
        // v0.19.0 fix: используем onYearRangeClear для атомарного сброса обоих полей
        onClear: onYearRangeClear
          ?? (() => {
            onYearMinChange('')
            onYearMaxChange('')
          }),
      })
    }

    if (genre) {
      const item = genreCollection.items.find((i) => i.value === genre)
      if (item) {
        filters.push({
          key: 'genre',
          category: 'Жанр',
          label: item.label,
          onClear: () => onGenreChange(''),
        })
      }
    }

    if (watchStatus) {
      const item = watchStatusCollection.items.find((i) => i.value === watchStatus)
      if (item) {
        filters.push({
          key: 'watchStatus',
          category: 'Просмотр',
          label: item.label,
          onClear: () => onWatchStatusChange(''),
        })
      }
    }

    if (pinnedStatus) {
      const item = pinnedStatusCollection.items.find((i) => i.value === pinnedStatus)
      if (item) {
        filters.push({
          key: 'pinnedStatus',
          category: 'Хранение',
          label: item.label,
          onClear: () => onPinnedStatusChange(''),
        })
      }
    }

    if (reuploadStatus) {
      const item = reuploadStatusCollection.items.find((i) => i.value === reuploadStatus)
      if (item) {
        filters.push({
          key: 'reuploadStatus',
          category: 'Перезаливка',
          label: item.label,
          onClear: () => onReuploadStatusChange(''),
        })
      }
    }

    if (ageRatingFilter) {
      const item = ageRatingCollection.items.find((i) => i.value === ageRatingFilter)
      if (item) {
        filters.push({
          key: 'ageRating',
          category: 'Возраст',
          label: item.label,
          onClear: () => onAgeRatingFilterChange(''),
        })
      }
    }

    if (studio) {
      const item = studioCollection.items.find((i) => i.value === studio)
      if (item) {
        filters.push({
          key: 'studio',
          category: 'Студия',
          label: item.label,
          onClear: () => onStudioChange(''),
        })
      }
    }

    if (fandubber) {
      const item = fandubberCollection.items.find((i) => i.value === fandubber)
      if (item) {
        filters.push({
          key: 'fandubber',
          category: 'Озвучка',
          label: item.label,
          onClear: () => onFandubberChange(''),
        })
      }
    }

    if (director) {
      const item = directorCollection.items.find((i) => i.value === director)
      if (item) {
        filters.push({
          key: 'director',
          category: 'Режиссёр',
          label: item.label,
          onClear: () => onDirectorChange(''),
        })
      }
    }

    if (episodesMin || episodesMax) {
      const label = episodesMin && episodesMax
        ? `${episodesMin}–${episodesMax}`
        : episodesMin
        ? `от ${episodesMin}`
        : `до ${episodesMax}`
      filters.push({
        key: 'episodes',
        category: 'Эпизоды',
        label,
        // v0.19.0 fix: используем onEpisodesRangeClear для атомарного сброса
        onClear: onEpisodesRangeClear
          ?? (() => {
            onEpisodesMinChange('')
            onEpisodesMaxChange('')
          }),
      })
    }

    if (resolution) {
      const labels: Record<string, string> = { '4k': '4K', '1080p': '1080p', '720p': '720p' }
      filters.push({
        key: 'resolution',
        category: 'Качество',
        label: labels[resolution] || resolution,
        onClear: () => onResolutionChange(''),
      })
    }

    if (bitDepth) {
      filters.push({
        key: 'bitDepth',
        category: 'Битность',
        label: `${bitDepth}-bit`,
        onClear: () => onBitDepthChange(''),
      })
    }

    return filters
  }, [
    search,
    status,
    yearMin,
    yearMax,
    genre,
    watchStatus,
    studio,
    fandubber,
    director,
    episodesMin,
    episodesMax,
    resolution,
    bitDepth,
    genreCollection,
    studioCollection,
    fandubberCollection,
    directorCollection,
    onSearchChange,
    onStatusChange,
    onYearMinChange,
    onYearMaxChange,
    onGenreChange,
    onWatchStatusChange,
    onStudioChange,
    onFandubberChange,
    onDirectorChange,
    onEpisodesMinChange,
    onEpisodesMaxChange,
    onResolutionChange,
    onBitDepthChange,
    pinnedStatus,
    onPinnedStatusChange,
    reuploadStatus,
    onReuploadStatusChange,
    ageRatingFilter,
    onAgeRatingFilterChange,
  ])

  const hasAdvancedFilters = studio || fandubber || director || episodesMin || episodesMax

  return (
    <>
      <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
        <Card.Body>
          <VStack gap={4} align="stretch">
            {/* Поиск и сортировка */}
            <HStack gap={3}>
              <Box position="relative" flex={1}>
                <Input
                  placeholder="Поиск аниме..."
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                  pl={10}
                  bg="bg.subtle"
                  border="none"
                  _placeholder={{ color: 'fg.muted' }}
                />
                <Icon
                  as={LuSearch}
                  position="absolute"
                  left={3}
                  top="50%"
                  transform="translateY(-50%)"
                  color="fg.subtle"
                />
              </Box>

              {/* Кнопка фильтров для mobile */}
              <Box hideFrom="md">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsMobileFilterOpen(true)}
                  colorPalette={activeFilters.length > 0 ? 'purple' : undefined}
                  minH="44px"
                  minW="44px"
                >
                  <Icon as={LuSlidersHorizontal} mr={1} />
                  Фильтры
                  {activeFilters.length > 0 && ` (${activeFilters.length})`}
                </Button>
              </Box>

              {/* Сортировка (v0.19.0: добавлен лейбл) */}
              <HStack gap={2} hideBelow="md">
                <Text fontSize="sm" color="fg.subtle" flexShrink={0}>
                  Сортировка:
                </Text>
                <Select.Root
                  collection={sortCollection}
                  value={[sortBy]}
                  onValueChange={(details) => onSortChange(details.value[0] as SortOption)}
                  size="sm"
                  w="200px"
                >
                  <Select.HiddenSelect />
                  <Select.Control>
                    <Select.Trigger minH="44px">
                      <Select.ValueText placeholder="Сортировка" />
                    </Select.Trigger>
                  </Select.Control>
                  <Select.Positioner>
                    <Select.Content>
                      {sortCollection.items.map((item) => (
                        <Select.Item key={item.value} item={item}>
                          {item.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Positioner>
                </Select.Root>
              </HStack>
            </HStack>

            {/* Desktop фильтры */}
            <Box hideBelow="md">
              <HStack gap={3} wrap="wrap">
                <HStack gap={2}>
                  <Icon as={LuFilter} color="fg.subtle" />
                  <Text fontSize="sm" color="fg.subtle">
                    Фильтры:
                  </Text>
                </HStack>

                {/* Статус аниме */}
                <Select.Root
                  collection={statusCollection}
                  value={[status]}
                  onValueChange={(details) => onStatusChange(details.value[0])}
                  size="sm"
                  w="150px"
                >
                  <Select.HiddenSelect />
                  <Select.Control>
                    <Select.Trigger {...(status && { colorPalette: 'purple', variant: 'subtle' })} minH="44px">
                      <Select.ValueText placeholder="Статус" />
                      {status && (
                        <Box as="span" color="purple.500" ml={1}>
                          •
                        </Box>
                      )}
                    </Select.Trigger>
                  </Select.Control>
                  <Select.Positioner>
                    <Select.Content>
                      {statusCollection.items.map((item) => (
                        <Select.Item key={item.value} item={item}>
                          <HStack justify="space-between" w="full">
                            <span>{item.label}</span>
                            {item.value && counts?.status?.[item.value] !== undefined && (
                              <Text as="span" fontSize="xs" color="fg.subtle">
                                ({counts.status[item.value]})
                              </Text>
                            )}
                          </HStack>
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Positioner>
                </Select.Root>

                {/* Год — диапазон от-до (v0.19.0) */}
                <HStack gap={1} align="center">
                  <Text fontSize="sm" color="fg.subtle" whiteSpace="nowrap">
                    Год:
                  </Text>
                  <Input
                    type="number"
                    placeholder="от"
                    value={yearMin}
                    onChange={(e) => onYearMinChange(e.target.value)}
                    size="sm"
                    w="70px"
                    min={1970}
                    max={currentYear}
                    {...(yearMin && { colorPalette: 'purple', variant: 'subtle' })}
                  />
                  <Text color="fg.subtle">—</Text>
                  <Input
                    type="number"
                    placeholder="до"
                    value={yearMax}
                    onChange={(e) => onYearMaxChange(e.target.value)}
                    size="sm"
                    w="70px"
                    min={1970}
                    max={currentYear}
                    {...(yearMax && { colorPalette: 'purple', variant: 'subtle' })}
                  />
                </HStack>

                {/* Жанр (v0.19.0: с поиском) */}
                <SearchableSelect
                  items={genreCollection.items}
                  value={genre}
                  onChange={onGenreChange}
                  placeholder="Жанр"
                  searchPlaceholder="Поиск жанра..."
                  width="150px"
                  isActive={!!genre}
                />

                {/* Статус просмотра — горизонтальные кнопки-табы */}
                <HStack gap={1} flexWrap="wrap">
                  {[
                    { value: '', label: 'Все', icon: undefined as React.ElementType | undefined },
                    ...STATUS_ORDER.map((s) => ({
                      value: s,
                      label: WATCH_STATUS_CONFIG[s].label,
                      icon: WATCH_STATUS_CONFIG[s].icon,
                    })),
                  ].map((item) => (
                    <Button
                      key={item.value}
                      size="xs"
                      variant={watchStatus === item.value ? 'solid' : 'outline'}
                      colorPalette={watchStatus === item.value ? 'purple' : 'gray'}
                      onClick={() => onWatchStatusChange(item.value)}
                    >
                      {item.icon && <Icon as={item.icon} />}
                      {item.label}
                      {item.value && counts?.watchStatus?.[item.value] !== undefined && (
                        <Text as="span" fontSize="2xs" opacity={0.7}>
                          {counts.watchStatus[item.value]}
                        </Text>
                      )}
                    </Button>
                  ))}
                </HStack>

                {/* Качество (объединённое) */}
                <QualityFilterGroup
                  resolution={resolution}
                  onResolutionChange={onResolutionChange}
                  bitDepth={bitDepth}
                  onBitDepthChange={onBitDepthChange}
                  onQualityClear={onQualityClear}
                  counts={{
                    resolution: counts?.resolution,
                    bitDepth: counts?.bitDepth,
                  }}
                />

                {/* Хранение */}
                <HStack gap={1}>
                  {pinnedStatusCollection.items.map((item) => (
                    <Button
                      key={item.value}
                      size="xs"
                      variant={pinnedStatus === item.value ? 'solid' : 'outline'}
                      colorPalette={pinnedStatus === item.value ? 'blue' : 'gray'}
                      onClick={() => onPinnedStatusChange(item.value)}
                    >
                      {item.label}
                    </Button>
                  ))}
                </HStack>

                {/* Перезаливка */}
                <HStack gap={1}>
                  {reuploadStatusCollection.items.map((item) => (
                    <Button
                      key={item.value}
                      size="xs"
                      variant={reuploadStatus === item.value ? 'solid' : 'outline'}
                      colorPalette={reuploadStatus === item.value ? 'orange' : 'gray'}
                      onClick={() => onReuploadStatusChange(item.value)}
                    >
                      {item.label}
                    </Button>
                  ))}
                </HStack>

                {/* Возраст */}
                <HStack gap={1}>
                  {ageRatingCollection.items.map((item) => (
                    <Button
                      key={item.value}
                      size="xs"
                      variant={ageRatingFilter === item.value ? 'solid' : 'outline'}
                      colorPalette={ageRatingFilter === item.value ? 'teal' : 'gray'}
                      onClick={() => onAgeRatingFilterChange(item.value)}
                    >
                      {item.label}
                    </Button>
                  ))}
                </HStack>

                {/* Кнопка расширенных фильтров */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  colorPalette={hasAdvancedFilters ? 'purple' : undefined}
                >
                  <Icon as={isExpanded ? LuChevronUp : LuChevronDown} mr={1} />
                  Ещё
                  {hasAdvancedFilters && ' •'}
                </Button>
              </HStack>

              {/* Расширенные фильтры */}
              <Collapsible.Root open={isExpanded}>
                <Collapsible.Content>
                  <HStack gap={3} wrap="wrap" pt={2}>
                    {/* Студия (v0.19.0: с поиском) */}
                    <SearchableSelect
                      items={studioCollection.items}
                      value={studio}
                      onChange={onStudioChange}
                      placeholder="Студия"
                      searchPlaceholder="Поиск студии..."
                      width="180px"
                      isActive={!!studio}
                    />

                    {/* Команда озвучки (v0.19.0: с поиском) */}
                    <SearchableSelect
                      items={fandubberCollection.items}
                      value={fandubber}
                      onChange={onFandubberChange}
                      placeholder="Озвучка"
                      searchPlaceholder="Поиск озвучки..."
                      width="180px"
                      isActive={!!fandubber}
                    />

                    {/* Режиссёр (v0.19.0: с поиском) */}
                    <SearchableSelect
                      items={directorCollection.items}
                      value={director}
                      onChange={onDirectorChange}
                      placeholder="Режиссёр"
                      searchPlaceholder="Поиск режиссёра..."
                      width="180px"
                      isActive={!!director}
                    />

                    {/* Количество эпизодов */}
                    <HStack gap={2}>
                      <Text fontSize="sm" color="fg.subtle">
                        Эпизоды:
                      </Text>
                      <Input
                        type="number"
                        placeholder="от"
                        value={episodesMin}
                        onChange={(e) => onEpisodesMinChange(e.target.value)}
                        size="sm"
                        w="80px"
                        bg="bg.subtle"
                        border="none"
                      />
                      <Text color="fg.subtle">—</Text>
                      <Input
                        type="number"
                        placeholder="до"
                        value={episodesMax}
                        onChange={(e) => onEpisodesMaxChange(e.target.value)}
                        size="sm"
                        w="80px"
                        bg="bg.subtle"
                        border="none"
                      />
                    </HStack>
                  </HStack>
                </Collapsible.Content>
              </Collapsible.Root>

              {/* Активные фильтры */}
              <ActiveFilters filters={activeFilters} onClearAll={onReset} />
            </Box>

            {/* Mobile: показываем активные фильтры если есть */}
            <Box hideFrom="md">
              {activeFilters.length > 0 && <ActiveFilters filters={activeFilters} onClearAll={onReset} />}
            </Box>
          </VStack>
        </Card.Body>
      </Card.Root>

      {/* Mobile Filter Drawer */}
      <MobileFilterDrawer
        open={isMobileFilterOpen}
        onOpenChange={setIsMobileFilterOpen}
        status={status}
        onStatusChange={onStatusChange}
        yearMin={yearMin}
        onYearMinChange={onYearMinChange}
        yearMax={yearMax}
        onYearMaxChange={onYearMaxChange}
        genre={genre}
        onGenreChange={onGenreChange}
        genres={genres}
        watchStatus={watchStatus}
        onWatchStatusChange={onWatchStatusChange}
        studio={studio}
        onStudioChange={onStudioChange}
        studios={studios}
        fandubber={fandubber}
        onFandubberChange={onFandubberChange}
        fandubbers={fandubbers}
        director={director}
        onDirectorChange={onDirectorChange}
        directors={directors}
        episodesMin={episodesMin}
        onEpisodesMinChange={onEpisodesMinChange}
        episodesMax={episodesMax}
        onEpisodesMaxChange={onEpisodesMaxChange}
        resolution={resolution}
        onResolutionChange={onResolutionChange}
        bitDepth={bitDepth}
        onBitDepthChange={onBitDepthChange}
        sortBy={sortBy}
        onSortChange={onSortChange}
        onReset={onReset}
        resultCount={resultCount}
      />
    </>
  )
}

// Re-exports
export { useDebounce } from '@letar/hooks'
export { type ActiveFilter, ActiveFilters } from './ActiveFilters'
export { FilterChip } from './FilterChip'
export { FiltersSkeleton } from './FiltersSkeleton'
export { type FilterParams, useFilterParams } from './hooks/useFilterParams'
export { MobileFilterDrawer } from './MobileFilterDrawer'
export { QualityFilterGroup } from './QualityFilterGroup'
export { SearchableSelect, type SearchableSelectItem, type SearchableSelectProps } from './SearchableSelect'
export { type AnimeFiltersProps, type SortOption } from './types'
