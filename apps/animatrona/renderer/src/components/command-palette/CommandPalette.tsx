'use client'

import { Box, Dialog, Flex, HStack, Input, Kbd, Text, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { LuCommand, LuSearch } from 'react-icons/lu'

import { NAV_PATHS } from '@/lib/shortcuts'

import { CATEGORY_LABELS, type Command, COMMANDS, filterCommands, groupCommandsByCategory } from './commands'

interface CommandPaletteProps {
  /** Открыта ли палитра */
  open: boolean
  /** Колбэк изменения состояния */
  onOpenChange: (open: boolean) => void
  /** Колбэк для показа горячих клавиш */
  onShowShortcuts?: () => void
  /** Колбэк для импорта */
  onImport?: () => void
}

/**
 * Command Palette — глобальный поиск и быстрые команды
 *
 * Открывается по Ctrl+K
 * Позволяет быстро навигироваться и выполнять действия
 */
export function CommandPalette({ open, onOpenChange, onShowShortcuts, onImport }: CommandPaletteProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Фильтрация команд по запросу
  const filteredCommands = useMemo(() => filterCommands(COMMANDS, query), [query])

  // Группировка по категориям
  const groupedCommands = useMemo(() => groupCommandsByCategory(filteredCommands), [filteredCommands])

  // Плоский список для навигации клавиатурой
  const flatCommands = useMemo(() => {
    const result: Command[] = []
    for (const commands of groupedCommands.values()) {
      result.push(...commands)
    }
    return result
  }, [groupedCommands])

  // Сброс состояния при открытии/закрытии
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
    }
  }, [open])

  // Сброс индекса при изменении результатов
  useEffect(() => {
    setSelectedIndex(0)
  }, [filteredCommands.length])

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
          // CommandPalette глобальный и не имеет контекста аниме
          // Показываем инструкцию как экспортировать
          import('@/components/ui/toaster').then(({ toaster }) => {
            toaster.info({
              title: 'Экспорт аниме',
              description: 'Откройте страницу аниме → меню ⋮ → «Экспорт»',
            })
          })
          break
        case 'action:refresh-metadata':
          // CommandPalette глобальный и не имеет контекста аниме
          // Показываем инструкцию как обновить метаданные
          import('@/components/ui/toaster').then(({ toaster }) => {
            toaster.info({
              title: 'Обновление метаданных',
              description: 'Откройте страницу аниме → меню ⋮ → «Обновить метаданные»',
            })
          })
          break
      }
    },
    [router, onOpenChange, onShowShortcuts, onImport],
  )

  // Обработка клавиатуры
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((i) => (i + 1) % flatCommands.length)
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((i) => (i - 1 + flatCommands.length) % flatCommands.length)
          break
        case 'Enter':
          e.preventDefault()
          if (flatCommands[selectedIndex]) {
            executeCommand(flatCommands[selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          onOpenChange(false)
          break
      }
    },
    [flatCommands, selectedIndex, executeCommand, onOpenChange],
  )

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
            <Box as={LuSearch} color="fg.subtle" flexShrink={0} />
            <Input
              placeholder="Поиск команд..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              variant="flushed"
              fontSize="md"
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

          {/* Список команд */}
          <Box maxH="400px" overflowY="auto" py={2}>
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
              <Box as={LuCommand} />
              <Text fontSize="xs">Command Palette</Text>
            </HStack>
          </Flex>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
