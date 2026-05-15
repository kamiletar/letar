'use client'

import { Badge, Box, HStack, IconButton, Text, VStack } from '@chakra-ui/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu'

interface HorizontalDatePickerProps {
  /**
   * Список доступных дат (отсортированных)
   */
  dates: Date[]
  /**
   * Выбранная дата
   */
  selectedDate: Date | null
  /**
   * Колбэк при выборе даты
   */
  onDateSelect: (date: Date) => void
  /**
   * Показывать ли стрелки навигации
   */
  showArrows?: boolean
  /**
   * aria-label для контейнера
   */
  ariaLabel?: string
}

/**
 * Форматирование дня недели
 */
function formatWeekday(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    weekday: 'short',
  }).format(date)
}

/**
 * Форматирование числа месяца
 */
function formatDay(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
  }).format(date)
}

/**
 * Форматирование месяца (короткий)
 */
function formatMonth(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    month: 'short',
  }).format(date)
}

/**
 * Проверка — является ли дата сегодняшней
 */
function isToday(date: Date): boolean {
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

/**
 * Сравнение дат (без времени)
 */
function isSameDay(a: Date, b: Date): boolean {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
}

/**
 * Форматирование полной даты для aria-label
 */
function formatFullDate(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)
}

/**
 * Горизонтальный выбор даты с свайпом.
 * Использует CSS scroll-snap для плавного свайпа на мобильных.
 * Поддерживает keyboard navigation (ArrowLeft/ArrowRight).
 */
export function HorizontalDatePicker({
  dates,
  selectedDate,
  onDateSelect,
  showArrows = true,
  ariaLabel = 'Выбор даты',
}: HorizontalDatePickerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState<number>(-1)

  // Проверка возможности скролла
  const checkScrollability = useCallback(() => {
    if (!scrollRef.current) {
      return
    }
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    setCanScrollLeft(scrollLeft > 0)
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1)
  }, [])

  useEffect(() => {
    checkScrollability()
    const scrollEl = scrollRef.current
    if (!scrollEl) {
      return
    }
    scrollEl.addEventListener('scroll', checkScrollability)
    window.addEventListener('resize', checkScrollability)
    return () => {
      scrollEl.removeEventListener('scroll', checkScrollability)
      window.removeEventListener('resize', checkScrollability)
    }
  }, [checkScrollability, dates])

  // Скролл на один экран
  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) {
      return
    }
    const scrollAmount = scrollRef.current.clientWidth * 0.8
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    })
  }

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (dates.length === 0) {
        return
      }

      let newIndex = focusedIndex

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          newIndex = focusedIndex > 0 ? focusedIndex - 1 : dates.length - 1
          break
        case 'ArrowRight':
          e.preventDefault()
          newIndex = focusedIndex < dates.length - 1 ? focusedIndex + 1 : 0
          break
        case 'Home':
          e.preventDefault()
          newIndex = 0
          break
        case 'End':
          e.preventDefault()
          newIndex = dates.length - 1
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          if (focusedIndex >= 0 && focusedIndex < dates.length) {
            onDateSelect(dates[focusedIndex])
          }
          return
        default:
          return
      }

      setFocusedIndex(newIndex)

      // Скролл к сфокусированному элементу
      if (scrollRef.current) {
        const items = scrollRef.current.querySelectorAll('[data-date-item]')
        const targetItem = items[newIndex] as HTMLElement
        if (targetItem) {
          targetItem.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center',
          })
        }
      }
    },
    [dates, focusedIndex, onDateSelect]
  )

  // Инициализация focusedIndex при выбранной дате
  useEffect(() => {
    if (selectedDate) {
      const index = dates.findIndex((d) => isSameDay(d, selectedDate))
      if (index >= 0) {
        setFocusedIndex(index)
      }
    }
  }, [selectedDate, dates])

  // Автоскролл к выбранной дате при монтировании
  useEffect(() => {
    if (selectedDate && scrollRef.current) {
      const selectedIndex = dates.findIndex((d) => isSameDay(d, selectedDate))
      if (selectedIndex > -1) {
        const items = scrollRef.current.querySelectorAll('[data-date-item]')
        const selectedItem = items[selectedIndex] as HTMLElement
        if (selectedItem) {
          selectedItem.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center',
          })
        }
      }
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- скролл только при монтировании
  }, [])

  if (dates.length === 0) {
    return null
  }

  return (
    <Box position="relative" width="100%">
      {/* Стрелка влево */}
      {showArrows && canScrollLeft && (
        <IconButton
          aria-label="Предыдущие дни"
          position="absolute"
          left={0}
          top="50%"
          transform="translateY(-50%)"
          zIndex={10}
          size="sm"
          variant="ghost"
          bg="bg/80"
          backdropFilter="blur(4px)"
          onClick={() => scroll('left')}
          display={{ base: 'none', md: 'flex' }}
        >
          <LuChevronLeft />
        </IconButton>
      )}

      {/* Контейнер с датами */}
      <HStack
        ref={scrollRef}
        gap={2}
        overflowX="auto"
        scrollSnapType="x mandatory"
        scrollBehavior="smooth"
        px={{ base: 1, md: showArrows ? 10 : 1 }}
        py={2}
        role="listbox"
        aria-label={ariaLabel}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          // При фокусе на контейнер, если нет выбранного индекса, выбираем первый
          if (focusedIndex < 0 && dates.length > 0) {
            const selectedIndex = selectedDate ? dates.findIndex((d) => isSameDay(d, selectedDate)) : 0
            setFocusedIndex(selectedIndex >= 0 ? selectedIndex : 0)
          }
        }}
        _focusVisible={{
          outline: '2px solid',
          outlineColor: 'brand.500',
          outlineOffset: '2px',
          borderRadius: 'lg',
        }}
        css={{
          '&::-webkit-scrollbar': {
            display: 'none',
          },
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {dates.map((date, index) => {
          const selected = selectedDate && isSameDay(date, selectedDate)
          const today = isToday(date)
          const isFocused = index === focusedIndex
          const dateLabel = `${formatFullDate(date)}${today ? ', сегодня' : ''}${selected ? ', выбрано' : ''}`

          return (
            <Box
              key={date.toISOString()}
              data-date-item
              as="button"
              role="option"
              aria-selected={selected ?? undefined}
              aria-label={dateLabel}
              onClick={() => onDateSelect(date)}
              flexShrink={0}
              scrollSnapAlign="center"
              px={4}
              py={3}
              minW="70px"
              borderRadius="lg"
              borderWidth={selected ? 2 : isFocused ? 2 : 1}
              borderColor={selected ? 'fg' : isFocused ? 'brand.500' : 'border'}
              bg={selected ? 'bg.emphasized' : 'bg.panel'}
              cursor="pointer"
              transition="all 0.15s ease-out"
              _hover={{
                bg: selected ? 'bg.emphasized' : 'bg.muted',
                transform: 'scale(1.02)',
              }}
              _active={{
                transform: 'scale(0.98)',
              }}
            >
              <VStack gap={0.5}>
                <Text
                  fontSize="xs"
                  fontWeight={today ? 'bold' : 'medium'}
                  color={selected ? 'fg' : 'fg.muted'}
                  textTransform="uppercase"
                >
                  {formatWeekday(date)}
                </Text>
                <Text fontSize="xl" fontWeight="bold" color={selected ? 'fg' : 'fg'}>
                  {formatDay(date)}
                </Text>
                <Text fontSize="xs" color={selected ? 'fg' : 'fg.muted'}>
                  {formatMonth(date)}
                </Text>
                {/* Улучшенный индикатор "Сегодня" — бейдж вместо точки */}
                {today && (
                  <Badge
                    size="sm"
                    colorPalette={selected ? 'gray' : 'brand'}
                    variant={selected ? 'outline' : 'solid'}
                    mt={1}
                    fontSize="2xs"
                  >
                    Сегодня
                  </Badge>
                )}
              </VStack>
            </Box>
          )
        })}
      </HStack>

      {/* Стрелка вправо */}
      {showArrows && canScrollRight && (
        <IconButton
          aria-label="Следующие дни"
          position="absolute"
          right={0}
          top="50%"
          transform="translateY(-50%)"
          zIndex={10}
          size="sm"
          variant="ghost"
          bg="bg/80"
          backdropFilter="blur(4px)"
          onClick={() => scroll('right')}
          display={{ base: 'none', md: 'flex' }}
        >
          <LuChevronRight />
        </IconButton>
      )}
    </Box>
  )
}
