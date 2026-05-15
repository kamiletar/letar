/**
 * Command Palette — глобальный поиск и навигация
 *
 * Открывается по Cmd+K (Mac) или Ctrl+K (Windows/Linux).
 * Позволяет быстро переходить между страницами, искать учеников,
 * инструкторов и выполнять быстрые действия.
 *
 * @module command-palette
 */

'use client'

import { Box, Dialog, Flex, HStack, Icon, Input, Kbd, Portal, Spinner, Text, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  LuArrowRight,
  LuBook,
  LuBuilding2,
  LuCalendar,
  LuCreditCard,
  LuFileText,
  LuGauge,
  LuHouse,
  LuMessageSquare,
  LuSearch,
  LuSettings,
  LuUsers,
} from 'react-icons/lu'

// === Типы ===

export interface CommandItem {
  id: string
  title: string
  description?: string
  icon?: React.ElementType
  href?: string
  action?: () => void
  keywords?: string[]
  section: 'navigation' | 'recent' | 'actions' | 'search'
}

interface CommandPaletteProps {
  /** Дополнительные элементы для поиска */
  additionalItems?: CommandItem[]
  /** Callback при закрытии */
  onClose?: () => void
}

// === Навигационные элементы по умолчанию ===

const defaultNavigationItems: CommandItem[] = [
  // Общие
  {
    id: 'nav-dashboard',
    title: 'Личный кабинет',
    href: '/dashboard',
    icon: LuHouse,
    section: 'navigation',
    keywords: ['главная', 'home'],
  },
  {
    id: 'nav-chats',
    title: 'Чаты',
    href: '/chats',
    icon: LuMessageSquare,
    section: 'navigation',
    keywords: ['сообщения', 'messages'],
  },
  {
    id: 'nav-settings',
    title: 'Настройки',
    href: '/profile',
    icon: LuSettings,
    section: 'navigation',
    keywords: ['профиль', 'profile'],
  },

  // Инструктор
  {
    id: 'nav-schedule',
    title: 'Расписание',
    href: '/schedule',
    icon: LuCalendar,
    section: 'navigation',
    keywords: ['календарь', 'calendar'],
  },
  {
    id: 'nav-students',
    title: 'Ученики',
    href: '/students',
    icon: LuUsers,
    section: 'navigation',
    keywords: ['students'],
  },
  {
    id: 'nav-lessons',
    title: 'Занятия',
    href: '/lessons',
    icon: LuBook,
    section: 'navigation',
    keywords: ['уроки', 'lessons'],
  },
  {
    id: 'nav-stats',
    title: 'Статистика',
    href: '/stats',
    icon: LuGauge,
    section: 'navigation',
    keywords: ['analytics', 'аналитика'],
  },

  // Owner
  {
    id: 'nav-owner',
    title: 'Панель владельца',
    href: '/owner',
    icon: LuBuilding2,
    section: 'navigation',
    keywords: ['admin', 'админ'],
  },
  {
    id: 'nav-owner-users',
    title: 'Пользователи',
    href: '/owner/users',
    icon: LuUsers,
    section: 'navigation',
    keywords: ['users'],
  },
  {
    id: 'nav-owner-schools',
    title: 'Автошколы',
    href: '/owner/schools',
    icon: LuBuilding2,
    section: 'navigation',
    keywords: ['schools', 'организации'],
  },
  {
    id: 'nav-owner-tickets',
    title: 'Обращения',
    href: '/owner/tickets',
    icon: LuMessageSquare,
    section: 'navigation',
    keywords: ['support', 'поддержка'],
  },
  {
    id: 'nav-owner-audit',
    title: 'Аудит',
    href: '/owner/audit',
    icon: LuFileText,
    section: 'navigation',
    keywords: ['logs', 'логи'],
  },
  {
    id: 'nav-owner-plans',
    title: 'Тарифы',
    href: '/owner/plans',
    icon: LuCreditCard,
    section: 'navigation',
    keywords: ['pricing', 'цены'],
  },
]

// === Command Item компонент ===

interface CommandItemComponentProps {
  item: CommandItem
  isSelected: boolean
  onClick: () => void
}

function CommandItemComponent({ item, isSelected, onClick }: CommandItemComponentProps) {
  const IconComponent = item.icon || LuArrowRight

  return (
    <Box
      asChild
      w="full"
      px={3}
      py={2}
      textAlign="left"
      borderRadius="md"
      bg={isSelected ? 'bg.muted' : 'transparent'}
      _hover={{ bg: 'bg.muted' }}
      transition="background 0.1s"
    >
      <button type="button" onClick={onClick}>
        <HStack gap={3}>
          <Icon as={IconComponent} boxSize={4} color="fg.muted" />
          <VStack gap={0} align="flex-start" flex={1}>
            <Text fontSize="sm" fontWeight={isSelected ? 'medium' : 'normal'}>
              {item.title}
            </Text>
            {item.description && (
              <Text fontSize="xs" color="fg.muted" lineClamp={1}>
                {item.description}
              </Text>
            )}
          </VStack>
          {item.href && <Icon as={LuArrowRight} boxSize={3} color="fg.subtle" />}
        </HStack>
      </button>
    </Box>
  )
}

// === Section Header компонент ===

function SectionHeader({ title }: { title: string }) {
  return (
    <Text
      fontSize="xs"
      fontWeight="medium"
      color="fg.muted"
      textTransform="uppercase"
      letterSpacing="wider"
      px={3}
      py={2}
    >
      {title}
    </Text>
  )
}

// === Основной компонент ===

export function CommandPalette({ additionalItems = [], onClose }: CommandPaletteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Все элементы для поиска
  const allItems = useMemo(() => [...defaultNavigationItems, ...additionalItems], [additionalItems])

  // Фильтрация по запросу
  const filteredItems = useMemo(() => {
    if (!query.trim()) {
      // Показываем только навигацию когда нет запроса
      return allItems.filter((item) => item.section === 'navigation').slice(0, 8)
    }

    const lowerQuery = query.toLowerCase()
    return allItems.filter((item) => {
      const titleMatch = item.title.toLowerCase().includes(lowerQuery)
      const descMatch = item.description?.toLowerCase().includes(lowerQuery)
      const keywordsMatch = item.keywords?.some((k) => k.toLowerCase().includes(lowerQuery))
      return titleMatch || descMatch || keywordsMatch
    })
  }, [allItems, query])

  // Группировка по секциям
  const groupedItems = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {
      navigation: [],
      recent: [],
      actions: [],
      search: [],
    }

    filteredItems.forEach((item) => {
      groups[item.section].push(item)
    })

    return groups
  }, [filteredItems])

  // Открытие/закрытие по Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K (Mac) или Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }

      // Escape для закрытия
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Фокус на input при открытии
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setSelectedIndex(0)
    }
  }, [isOpen])

  // Обработка выбора элемента
  const handleSelect = useCallback(
    (item: CommandItem) => {
      setIsOpen(false)
      onClose?.()

      if (item.action) {
        item.action()
      } else if (item.href) {
        router.push(item.href)
      }
    },
    [router, onClose]
  )

  // Навигация по списку
  const handleKeyNavigation = useCallback(
    (e: React.KeyboardEvent) => {
      const totalItems = filteredItems.length

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % totalItems)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const selected = filteredItems[selectedIndex]
        if (selected) {
          handleSelect(selected)
        }
      }
    },
    [filteredItems, selectedIndex, handleSelect]
  )

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(details) => {
        setIsOpen(details.open)
        if (!details.open) {
          onClose?.()
        }
      }}
    >
      <Portal>
        <Dialog.Backdrop bg="blackAlpha.600" />
        <Dialog.Positioner>
          <Dialog.Content
            maxW="500px"
            w="90vw"
            mt="15vh"
            mx="auto"
            bg="bg"
            borderRadius="lg"
            shadow="xl"
            overflow="hidden"
          >
            {/* Поисковое поле */}
            <Flex px={4} py={3} borderBottomWidth="1px" borderColor="border" align="center" gap={3}>
              <Icon as={LuSearch} color="fg.muted" boxSize={5} />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setSelectedIndex(0)
                }}
                onKeyDown={handleKeyNavigation}
                placeholder="Поиск страниц, учеников, действий..."
                variant="flushed"
                size="lg"
                borderBottomWidth={0}
                _placeholder={{ color: 'fg.subtle' }}
                _focus={{ boxShadow: 'none' }}
              />
              {isLoading && <Spinner size="sm" />}
              <Kbd size="sm">esc</Kbd>
            </Flex>

            {/* Результаты */}
            <Box maxH="400px" overflowY="auto" py={2}>
              {filteredItems.length === 0 ? (
                <VStack py={8} gap={2}>
                  <Text color="fg.muted">Ничего не найдено</Text>
                  <Text fontSize="sm" color="fg.subtle">
                    Попробуйте другой запрос
                  </Text>
                </VStack>
              ) : (
                <>
                  {groupedItems.navigation.length > 0 && (
                    <Box>
                      <SectionHeader title="Навигация" />
                      <VStack gap={0} align="stretch" px={2}>
                        {groupedItems.navigation.map((item, index) => (
                          <CommandItemComponent
                            key={item.id}
                            item={item}
                            isSelected={index === selectedIndex}
                            onClick={() => handleSelect(item)}
                          />
                        ))}
                      </VStack>
                    </Box>
                  )}

                  {groupedItems.actions.length > 0 && (
                    <Box mt={2}>
                      <SectionHeader title="Действия" />
                      <VStack gap={0} align="stretch" px={2}>
                        {groupedItems.actions.map((item, index) => (
                          <CommandItemComponent
                            key={item.id}
                            item={item}
                            isSelected={index + groupedItems.navigation.length === selectedIndex}
                            onClick={() => handleSelect(item)}
                          />
                        ))}
                      </VStack>
                    </Box>
                  )}

                  {groupedItems.search.length > 0 && (
                    <Box mt={2}>
                      <SectionHeader title="Результаты поиска" />
                      <VStack gap={0} align="stretch" px={2}>
                        {groupedItems.search.map((item, index) => (
                          <CommandItemComponent
                            key={item.id}
                            item={item}
                            isSelected={
                              index + groupedItems.navigation.length + groupedItems.actions.length === selectedIndex
                            }
                            onClick={() => handleSelect(item)}
                          />
                        ))}
                      </VStack>
                    </Box>
                  )}
                </>
              )}
            </Box>

            {/* Футер с подсказками */}
            <Flex
              px={4}
              py={2}
              borderTopWidth="1px"
              borderColor="border"
              bg="bg.subtle"
              gap={4}
              fontSize="xs"
              color="fg.muted"
            >
              <HStack gap={1}>
                <Kbd size="sm">↑↓</Kbd>
                <Text>навигация</Text>
              </HStack>
              <HStack gap={1}>
                <Kbd size="sm">↵</Kbd>
                <Text>выбрать</Text>
              </HStack>
              <HStack gap={1}>
                <Kbd size="sm">esc</Kbd>
                <Text>закрыть</Text>
              </HStack>
            </Flex>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

// === Хук для использования Command Palette ===

export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])

  return { isOpen, open, close, toggle }
}

// === Кнопка для открытия Command Palette ===

export function CommandPaletteButton() {
  return (
    <Flex
      asChild
      align="center"
      gap={2}
      px={3}
      py={1.5}
      borderRadius="md"
      borderWidth="1px"
      borderColor="border"
      bg="bg"
      color="fg.muted"
      fontSize="sm"
      _hover={{ bg: 'bg.muted' }}
    >
      <button
        type="button"
        onClick={() => {
          // Эмулируем нажатие Cmd+K
          const event = new KeyboardEvent('keydown', {
            key: 'k',
            metaKey: true,
            bubbles: true,
          })
          document.dispatchEvent(event)
        }}
      >
        <Icon as={LuSearch} boxSize={4} />
        <Text display={{ base: 'none', md: 'block' }}>Поиск...</Text>
        <HStack gap={0.5} display={{ base: 'none', md: 'flex' }}>
          <Kbd size="sm">⌘</Kbd>
          <Kbd size="sm">K</Kbd>
        </HStack>
      </button>
    </Flex>
  )
}
