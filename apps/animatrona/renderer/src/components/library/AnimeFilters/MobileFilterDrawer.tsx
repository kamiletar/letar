'use client'

import {
  Box,
  Button,
  createListCollection,
  Drawer,
  HStack,
  Input,
  Portal,
  Select,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useMemo } from 'react'
import { LuFilter, LuX } from 'react-icons/lu'

import { STATUS_ORDER, WATCH_STATUS_CONFIG } from '../WatchStatusSelector'
import type { SortOption } from './types'

export interface MobileFilterDrawerProps {
  /** Открыт ли drawer */
  open: boolean
  /** Callback закрытия */
  onOpenChange: (open: boolean) => void

  // Фильтры
  status: string
  onStatusChange: (value: string) => void
  yearMin: string
  onYearMinChange: (value: string) => void
  yearMax: string
  onYearMaxChange: (value: string) => void
  genre: string
  onGenreChange: (value: string) => void
  genres: { id: string; name: string }[]
  watchStatus: string
  onWatchStatusChange: (value: string) => void
  studio: string
  onStudioChange: (value: string) => void
  studios: { id: string; name: string }[]
  fandubber: string
  onFandubberChange: (value: string) => void
  fandubbers: { id: string; name: string }[]
  director: string
  onDirectorChange: (value: string) => void
  directors: { id: string; name: string }[]
  episodesMin: string
  onEpisodesMinChange: (value: string) => void
  episodesMax: string
  onEpisodesMaxChange: (value: string) => void
  resolution: string
  onResolutionChange: (value: string) => void
  bitDepth: string
  onBitDepthChange: (value: string) => void
  sortBy: SortOption
  onSortChange: (value: SortOption) => void
  onReset: () => void

  /** Количество результатов */
  resultCount?: number
}

// Статические коллекции
const statusCollection = createListCollection({
  items: [
    { value: '', label: 'Все статусы' },
    { value: 'ONGOING', label: 'Выходит' },
    { value: 'COMPLETED', label: 'Завершён' },
    { value: 'ANNOUNCED', label: 'Анонс' },
  ],
})

const currentYear = new Date().getFullYear()

const resolutionCollection = createListCollection({
  items: [
    { value: '', label: 'Любое' },
    { value: '4k', label: '4K (2160p)' },
    { value: '1080p', label: '1080p' },
    { value: '720p', label: '720p и ниже' },
  ],
})

const bitDepthCollection = createListCollection({
  items: [
    { value: '', label: 'Любая' },
    { value: '10', label: '10-bit' },
    { value: '8', label: '8-bit' },
  ],
})

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
 * Drawer с фильтрами для мобильных устройств
 */
export function MobileFilterDrawer({
  open,
  onOpenChange,
  status,
  onStatusChange,
  yearMin,
  onYearMinChange,
  yearMax,
  onYearMaxChange,
  genre,
  onGenreChange,
  genres,
  watchStatus,
  onWatchStatusChange,
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
  resolution,
  onResolutionChange,
  bitDepth,
  onBitDepthChange,
  sortBy,
  onSortChange,
  onReset,
  resultCount,
}: MobileFilterDrawerProps) {
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

  // Подсчёт активных фильтров
  const activeCount = [
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
  ].filter(Boolean).length

  return (
    <Drawer.Root open={open} onOpenChange={(e) => onOpenChange(e.open)} placement="bottom">
      <Portal>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content borderTopRadius="xl" maxH="85vh">
            {/* Заголовок */}
            <Drawer.Header borderBottomWidth={1}>
              <HStack justify="space-between" w="full">
                <HStack>
                  <LuFilter />
                  <Drawer.Title>Фильтры</Drawer.Title>
                  {activeCount > 0 && (
                    <Text fontSize="sm" color="fg.subtle">
                      ({activeCount})
                    </Text>
                  )}
                </HStack>
                <Drawer.CloseTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <LuX />
                  </Button>
                </Drawer.CloseTrigger>
              </HStack>
            </Drawer.Header>

            {/* Содержимое */}
            <Drawer.Body py={4} overflowY="auto">
              <VStack gap={5} align="stretch">
                {/* Сортировка */}
                <FilterSection label="Сортировка">
                  <Select.Root
                    collection={sortCollection}
                    value={[sortBy]}
                    onValueChange={(d) => onSortChange(d.value[0] as SortOption)}
                    size="sm"
                  >
                    <Select.HiddenSelect />
                    <Select.Control>
                      <Select.Trigger>
                        <Select.ValueText />
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
                </FilterSection>

                {/* Статус аниме */}
                <FilterSection label="Статус аниме">
                  <Select.Root
                    collection={statusCollection}
                    value={[status]}
                    onValueChange={(d) => onStatusChange(d.value[0])}
                    size="sm"
                  >
                    <Select.HiddenSelect />
                    <Select.Control>
                      <Select.Trigger>
                        <Select.ValueText />
                      </Select.Trigger>
                    </Select.Control>
                    <Select.Positioner>
                      <Select.Content>
                        {statusCollection.items.map((item) => (
                          <Select.Item key={item.value} item={item}>
                            {item.label}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Positioner>
                  </Select.Root>
                </FilterSection>

                {/* Статус просмотра — горизонтальные кнопки-табы */}
                <FilterSection label="Статус просмотра">
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
                        {item.icon && <item.icon />}
                        {item.label}
                      </Button>
                    ))}
                  </HStack>
                </FilterSection>

                {/* Год — диапазон от-до (v0.19.0) */}
                <FilterSection label="Год выпуска">
                  <HStack>
                    <Input
                      type="number"
                      placeholder="от"
                      value={yearMin}
                      onChange={(e) => onYearMinChange(e.target.value)}
                      size="sm"
                      min={1970}
                      max={currentYear}
                    />
                    <Text color="fg.subtle">—</Text>
                    <Input
                      type="number"
                      placeholder="до"
                      value={yearMax}
                      onChange={(e) => onYearMaxChange(e.target.value)}
                      size="sm"
                      min={1970}
                      max={currentYear}
                    />
                  </HStack>
                </FilterSection>

                {/* Жанр */}
                <FilterSection label="Жанр">
                  <Select.Root
                    collection={genreCollection}
                    value={[genre]}
                    onValueChange={(d) => onGenreChange(d.value[0])}
                    size="sm"
                  >
                    <Select.HiddenSelect />
                    <Select.Control>
                      <Select.Trigger>
                        <Select.ValueText />
                      </Select.Trigger>
                    </Select.Control>
                    <Select.Positioner>
                      <Select.Content>
                        {genreCollection.items.map((item) => (
                          <Select.Item key={item.value} item={item}>
                            {item.label}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Positioner>
                  </Select.Root>
                </FilterSection>

                {/* Студия */}
                <FilterSection label="Студия">
                  <Select.Root
                    collection={studioCollection}
                    value={[studio]}
                    onValueChange={(d) => onStudioChange(d.value[0])}
                    size="sm"
                  >
                    <Select.HiddenSelect />
                    <Select.Control>
                      <Select.Trigger>
                        <Select.ValueText />
                      </Select.Trigger>
                    </Select.Control>
                    <Select.Positioner>
                      <Select.Content>
                        {studioCollection.items.map((item) => (
                          <Select.Item key={item.value} item={item}>
                            {item.label}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Positioner>
                  </Select.Root>
                </FilterSection>

                {/* Озвучка */}
                <FilterSection label="Озвучка">
                  <Select.Root
                    collection={fandubberCollection}
                    value={[fandubber]}
                    onValueChange={(d) => onFandubberChange(d.value[0])}
                    size="sm"
                  >
                    <Select.HiddenSelect />
                    <Select.Control>
                      <Select.Trigger>
                        <Select.ValueText />
                      </Select.Trigger>
                    </Select.Control>
                    <Select.Positioner>
                      <Select.Content>
                        {fandubberCollection.items.map((item) => (
                          <Select.Item key={item.value} item={item}>
                            {item.label}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Positioner>
                  </Select.Root>
                </FilterSection>

                {/* Режиссёр (v0.19.0) */}
                <FilterSection label="Режиссёр">
                  <Select.Root
                    collection={directorCollection}
                    value={[director]}
                    onValueChange={(d) => onDirectorChange(d.value[0])}
                    size="sm"
                  >
                    <Select.HiddenSelect />
                    <Select.Control>
                      <Select.Trigger>
                        <Select.ValueText />
                      </Select.Trigger>
                    </Select.Control>
                    <Select.Positioner>
                      <Select.Content>
                        {directorCollection.items.map((item) => (
                          <Select.Item key={item.value} item={item}>
                            {item.label}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Positioner>
                  </Select.Root>
                </FilterSection>

                {/* Количество эпизодов */}
                <FilterSection label="Количество эпизодов">
                  <HStack>
                    <Input
                      type="number"
                      placeholder="от"
                      value={episodesMin}
                      onChange={(e) => onEpisodesMinChange(e.target.value)}
                      size="sm"
                    />
                    <Text color="fg.subtle">—</Text>
                    <Input
                      type="number"
                      placeholder="до"
                      value={episodesMax}
                      onChange={(e) => onEpisodesMaxChange(e.target.value)}
                      size="sm"
                    />
                  </HStack>
                </FilterSection>

                {/* Качество */}
                <FilterSection label="Разрешение">
                  <Select.Root
                    collection={resolutionCollection}
                    value={[resolution]}
                    onValueChange={(d) => onResolutionChange(d.value[0])}
                    size="sm"
                  >
                    <Select.HiddenSelect />
                    <Select.Control>
                      <Select.Trigger>
                        <Select.ValueText />
                      </Select.Trigger>
                    </Select.Control>
                    <Select.Positioner>
                      <Select.Content>
                        {resolutionCollection.items.map((item) => (
                          <Select.Item key={item.value} item={item}>
                            {item.label}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Positioner>
                  </Select.Root>
                </FilterSection>

                <FilterSection label="Глубина цвета">
                  <Select.Root
                    collection={bitDepthCollection}
                    value={[bitDepth]}
                    onValueChange={(d) => onBitDepthChange(d.value[0])}
                    size="sm"
                  >
                    <Select.HiddenSelect />
                    <Select.Control>
                      <Select.Trigger>
                        <Select.ValueText />
                      </Select.Trigger>
                    </Select.Control>
                    <Select.Positioner>
                      <Select.Content>
                        {bitDepthCollection.items.map((item) => (
                          <Select.Item key={item.value} item={item}>
                            {item.label}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Positioner>
                  </Select.Root>
                </FilterSection>
              </VStack>
            </Drawer.Body>

            {/* Футер с кнопками */}
            <Drawer.Footer borderTopWidth={1} gap={3}>
              <Button variant="ghost" flex={1} onClick={onReset} disabled={activeCount === 0}>
                Сбросить
              </Button>
              <Button colorPalette="purple" flex={2} onClick={() => onOpenChange(false)}>
                Показать{resultCount !== undefined ? ` (${resultCount})` : ''}
              </Button>
            </Drawer.Footer>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  )
}

/** Секция фильтра с лейблом */
function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Text fontSize="sm" fontWeight="medium" color="fg.muted" mb={2}>
        {label}
      </Text>
      {children}
    </Box>
  )
}
