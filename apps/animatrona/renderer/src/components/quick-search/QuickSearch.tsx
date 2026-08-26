'use client'

/**
 * Quick Search — объединённый поиск аниме и командная палитра
 *
 * Открывается по Ctrl+K или /
 * - Пустой запрос — показывает команды (навигация, действия)
 * - С текстом — поиск аниме через Fuse.js (клиентский поиск)
 *
 * v0.28.9: Миграция с FTS5 на Fuse.js
 */

import { Box, Dialog, Flex, HStack, Image, Input, Kbd, Spinner, Text, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LuCommand, LuFilm, LuSearch } from 'react-icons/lu'

import type { SearchResult } from '@/app/_actions/search.action'
import { useSearch } from '@/app/_hooks/use-search'
import { toMediaUrl } from '@/lib/media-url'
import { NAV_PATHS } from '@/lib/shortcuts'

import {
  CATEGORY_LABELS,
  type Command,
  COMMANDS,
  filterCommands,
  groupCommandsByCategory,
} from '../command-palette/commands'
import { toaster } from '../ui/toaster'

interface QuickSearchProps {
  /** Открыт ли поиск */
  open: boolean
  /** Колбэк изменения состояния */
  onOpenChange: (open: boolean) => void
  /** Колбэк для показа горячих клавиш */
  onShowShortcuts?: () => void
  /** Колбэк для импорта */
  onImport?: () => void
}

/** Режим отображения */
type DisplayMode = 'commands' | 'search'

/**
 * Quick Search Dialog — поиск аниме + командная палитра
 */
export function QuickSearch({ open, onOpenChange, onShowShortcuts, onImport }: QuickSearchProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  // Клиентский поиск через Fuse.js
  const { query, setQuery, results, isSearching } = useSearch({ debounceMs: 150 })
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Режим: команды (пустой запрос) или поиск (с текстом)
  const displayMode: DisplayMode = query.length === 0 ? 'commands' : 'search'

  // Фильтрация и группировка команд
  const filteredCommands = useMemo(() => filterCommands(COMMANDS, query), [query])
  const groupedCommands = useMemo(() => groupCommandsByCategory(filteredCommands), [filteredCommands])

  // Плоский список команд для навигации
  const flatCommands = useMemo(() => {
    const result: Command[] = []
    for (const commands of groupedCommands.values()) {
      result.push(...commands)
    }
    return result
  }, [groupedCommands])

  // Общее количество элементов для навигации
  const totalItems = displayMode === 'commands' ? flatCommands.length : results.length

  // Сброс индекса при изменении результатов
  useEffect(() => {
    setSelectedIndex(0)
  }, [results])

  // Сброс при открытии
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open, setQuery])

  // Сброс индекса при смене режима
  useEffect(() => {
    setSelectedIndex(0)
  }, [displayMode, flatCommands.length, results.length])

  // Переход к аниме
  const navigateToAnime = useCallback(
    (anime: SearchResult) => {
      onOpenChange(false)
      router.push(`/library/${anime.id}`)
    },
    [router, onOpenChange],
  )

  // Выполнение команды
  const executeCommand = useCallback(
    (command: Command) => {
      onOpenChange(false)

      switch (command.id) {
        // Навигация
        case 'nav:library':
          router.push(NAV_PATHS[0])
          break
        case 'nav:player':
          router.push(NAV_PATHS[1])
          break
        case 'nav:test-encoding':
          router.push(NAV_PATHS[2])
          break
        case 'nav:settings':
          router.push(NAV_PATHS[3])
          break

        // Действия
        case 'action:import':
          onImport?.()
          break
        case 'action:shortcuts':
          onShowShortcuts?.()
          break
        case 'action:export':
          toaster.info({
            title: 'Экспорт аниме',
            description: 'Откройте страницу аниме → меню ⋮ → «Экспорт»',
          })
          break
        case 'action:refresh-metadata':
          toaster.info({
            title: 'Обновление метаданных',
            description: 'Откройте страницу аниме → меню ⋮ → «Обновить метаданные»',
          })
          break
      }
    },
    [router, onOpenChange, onShowShortcuts, onImport],
  )

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((i) => (i + 1) % Math.max(totalItems, 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((i) => (i - 1 + Math.max(totalItems, 1)) % Math.max(totalItems, 1))
          break
        case 'Enter':
          e.preventDefault()
          if (displayMode === 'commands' && flatCommands[selectedIndex]) {
            executeCommand(flatCommands[selectedIndex])
          } else if (displayMode === 'search' && results[selectedIndex]) {
            navigateToAnime(results[selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          onOpenChange(false)
          break
      }
    },
    [displayMode, flatCommands, results, selectedIndex, totalItems, executeCommand, navigateToAnime, onOpenChange],
  )

  // Показывать empty state только после ввода и загрузки
  const showEmptyState = query.length >= 2 && !isSearching && results.length === 0
  const showSearchResults = displayMode === 'search' && results.length > 0
  const showCommands = displayMode === 'commands'

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => onOpenChange(e.open)}
      placement="top"
      motionPreset="slide-in-top"
    >
      <Dialog.Backdrop bg="overlay.backdrop" />
      <Dialog.Positioner pt={20}>
        <Dialog.Content
          data-testid="quick-search-dialog"
          bg="bg.subtle"
          borderColor="border"
          borderWidth={1}
          borderRadius="xl"
          maxW="560px"
          w="full"
          mx={4}
          overflow="hidden"
          boxShadow="2xl"
        >
          {/* Поле поиска */}
          <Flex px={4} py={3} borderBottomWidth={1} borderColor="border.subtle" align="center" gap={3}>
            {isSearching
              ? <Spinner size="sm" color="primary.fg" />
              : <LuSearch color="var(--chakra-colors-fg-subtle)" />}
            <Input
              ref={inputRef}
              data-testid="search-input"
              placeholder={displayMode === 'commands' ? 'Поиск команд или аниме...' : 'Поиск аниме...'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              variant="flushed"
              fontSize="md"
              flex={1}
              autoFocus
              _placeholder={{ color: 'fg.subtle' }}
            />
            <HStack gap={1} flexShrink={0}>
              <Kbd bg="bg.muted" borderColor="border" fontSize="xs">
                ↑↓
              </Kbd>
              <Text fontSize="xs" color="fg.subtle">
                навигация
              </Text>
            </HStack>
          </Flex>

          {/* Контент */}
          <Box maxH="400px" overflowY="auto" py={2}>
            {/* Команды (пустой запрос) */}
            {showCommands && (
              <>
                {flatCommands.length === 0
                  ? (
                    <Flex py={8} justify="center" align="center" color="fg.subtle">
                      <Text>Ничего не найдено</Text>
                    </Flex>
                  )
                  : (
                    Array.from(groupedCommands.entries()).map(([category, commands]) => (
                      <Box key={category} mb={2}>
                        {/* Заголовок категории */}
                        <Text
                          fontSize="xs"
                          fontWeight="semibold"
                          color="fg.subtle"
                          textTransform="uppercase"
                          letterSpacing="wider"
                          px={4}
                          py={1}
                        >
                          {CATEGORY_LABELS[category]}
                        </Text>

                        {/* Команды */}
                        <VStack align="stretch" gap={0}>
                          {commands.map((cmd) => {
                            const isSelected = flatCommands[selectedIndex]?.id === cmd.id

                            return (
                              <Flex
                                key={cmd.id}
                                px={4}
                                py={2}
                                align="center"
                                gap={3}
                                cursor="pointer"
                                bg={isSelected ? 'state.selected.bg' : 'transparent'}
                                _hover={{ bg: 'state.hover' }}
                                _active={{ bg: 'state.active', transform: 'scale(0.99)' }}
                                onClick={() => executeCommand(cmd)}
                                borderLeftWidth={2}
                                borderLeftColor={isSelected ? 'primary.solid' : 'transparent'}
                                transition="all 0.1s ease-out"
                              >
                                {/* Иконка */}
                                <Box as={cmd.icon} color={isSelected ? 'primary.fg' : 'fg.muted'} flexShrink={0} />

                                {/* Текст */}
                                <Box flex={1}>
                                  <Text fontSize="sm" fontWeight="medium" color={isSelected ? 'fg' : 'fg.muted'}>
                                    {cmd.label}
                                  </Text>
                                  {cmd.description && (
                                    <Text fontSize="xs" color="fg.subtle">
                                      {cmd.description}
                                    </Text>
                                  )}
                                </Box>

                                {/* Хоткей */}
                                {cmd.shortcut && (
                                  <HStack gap={1} flexShrink={0}>
                                    {cmd.shortcut.map((key, i) => (
                                      <Kbd key={i} bg="bg.muted" borderColor="border" fontSize="xs" px={1.5}>
                                        {key}
                                      </Kbd>
                                    ))}
                                  </HStack>
                                )}
                              </Flex>
                            )
                          })}
                        </VStack>
                      </Box>
                    ))
                  )}
              </>
            )}

            {/* Результаты поиска аниме */}
            {showSearchResults && (
              <Box>
                {/* Заголовок категории */}
                <HStack px={4} py={1} gap={2}>
                  <LuFilm color="var(--chakra-colors-fg-subtle)" size={12} />
                  <Text
                    fontSize="xs"
                    fontWeight="semibold"
                    color="fg.subtle"
                    textTransform="uppercase"
                    letterSpacing="wider"
                  >
                    Аниме
                  </Text>
                </HStack>

                {/* Список результатов */}
                <VStack align="stretch" gap={0}>
                  {results.map((anime, index) => {
                    const isSelected = index === selectedIndex

                    return (
                      <Flex
                        key={anime.id}
                        px={4}
                        py={2}
                        align="center"
                        gap={3}
                        cursor="pointer"
                        bg={isSelected ? 'state.selected.bg' : 'transparent'}
                        _hover={{ bg: 'state.hover' }}
                        _active={{ bg: 'state.active', transform: 'scale(0.99)' }}
                        onClick={() => navigateToAnime(anime)}
                        borderLeftWidth={2}
                        borderLeftColor={isSelected ? 'primary.solid' : 'transparent'}
                        transition="all 0.1s ease-out"
                      >
                        {/* Постер */}
                        <Box w="40px" h="56px" flexShrink={0} borderRadius="sm" overflow="hidden" bg="bg.emphasized">
                          {anime.posterPath
                            ? (
                              <Image
                                src={toMediaUrl(anime.posterPath) ?? undefined}
                                alt={anime.name}
                                w="full"
                                h="full"
                                objectFit="cover"
                              />
                            )
                            : (
                              <Flex w="full" h="full" align="center" justify="center">
                                <LuFilm color="var(--chakra-colors-fg-subtle)" size={16} />
                              </Flex>
                            )}
                        </Box>

                        {/* Информация */}
                        <Box flex={1} minW={0}>
                          <Text fontSize="sm" fontWeight="medium" color={isSelected ? 'fg' : 'fg.muted'} lineClamp={1}>
                            {anime.name}
                          </Text>
                          {(anime.originalName || anime.year) && (
                            <Text fontSize="xs" color="fg.subtle" lineClamp={1}>
                              {[anime.originalName, anime.year].filter(Boolean).join(' • ')}
                            </Text>
                          )}
                        </Box>
                      </Flex>
                    )
                  })}
                </VStack>
              </Box>
            )}

            {/* Empty state при поиске */}
            {showEmptyState && (
              <Flex py={8} justify="center" align="center" color="fg.subtle">
                <Text>Ничего не найдено</Text>
              </Flex>
            )}

            {/* Placeholder для короткого запроса */}
            {displayMode === 'search' && query.length > 0 && query.length < 2 && !isSearching && (
              <Flex py={8} justify="center" align="center" color="fg.subtle" direction="column" gap={2}>
                <LuSearch size={24} />
                <Text fontSize="sm">Введите минимум 2 символа</Text>
              </Flex>
            )}
          </Box>

          {/* Футер с подсказками */}
          <Flex px={4} py={2} borderTopWidth={1} borderColor="border.subtle" justify="space-between" align="center">
            <HStack gap={4} fontSize="xs" color="fg.subtle">
              <HStack gap={1}>
                <Kbd bg="bg.muted" borderColor="border" px={1}>
                  Enter
                </Kbd>
                <Text>выбрать</Text>
              </HStack>
              <HStack gap={1}>
                <Kbd bg="bg.muted" borderColor="border" px={1}>
                  Esc
                </Kbd>
                <Text>закрыть</Text>
              </HStack>
            </HStack>
            <HStack gap={1} color="fg.muted">
              <LuCommand size={12} />
              <Text fontSize="xs">{displayMode === 'commands' ? 'Command Palette' : 'Quick Search'}</Text>
            </HStack>
          </Flex>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
