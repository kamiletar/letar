'use client'

import { SearchInput } from '@/app/_components/search-input'
import { useSearchSuggestions } from '@/hooks/use-search-suggestions'
import { useRouter } from '@/i18n/navigation'
import { Box, Icon, IconButton, Spinner, Text, VStack } from '@chakra-ui/react'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { LuSearch, LuX } from 'react-icons/lu'

interface HeaderSearchProps {
  /** Режим отображения: desktop (всегда видно) или mobile (иконка → поле) */
  mode: 'desktop' | 'mobile'
}

/**
 * Компонент поиска для Header с подсказками.
 * Desktop: всегда видимое поле поиска.
 * Mobile: иконка, при клике открывается полноэкранное поле.
 */
export function HeaderSearch({ mode }: HeaderSearchProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Текущее значение из URL
  const currentQuery = searchParams.get('q') || ''

  // Локальное состояние для input
  const [searchValue, setSearchValue] = useState(currentQuery)
  const [isOpen, setIsOpen] = useState(false) // для mobile
  const [isFocused, setIsFocused] = useState(false)

  // Ref для отслеживания пользовательского ввода
  const isTypingRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Подсказки
  const { suggestions, isLoading: isSuggestionsLoading } = useSearchSuggestions(searchValue)

  // Показывать dropdown: есть фокус и есть подсказки (или загрузка)
  const showDropdown = isFocused && searchValue.trim().length >= 2 && (suggestions.length > 0 || isSuggestionsLoading)

  // Синхронизация с URL при навигации (browser back/forward)
  useEffect(() => {
    if (!isTypingRef.current) {
      setTimeout(() => setSearchValue(currentQuery), 0)
    }
  }, [currentQuery])

  // Закрытие dropdown при клике вне
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Закрытие dropdown по Escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsFocused(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Обработчик изменения
  const handleChange = useCallback((value: string) => {
    setSearchValue(value)
    setIsFocused(true)
  }, [])

  // Очистка поиска
  const handleClear = useCallback(() => {
    setSearchValue('')
    setIsFocused(false)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('q')
    params.delete('page')
    startTransition(() => {
      router.push(`/catalog?${params.toString()}`)
    })
    if (mode === 'mobile') {
      setIsOpen(false)
    }
  }, [router, searchParams, mode])

  // Выбор подсказки
  const handleSuggestionClick = useCallback(
    (suggestion: { id: string; name: string }) => {
      setSearchValue(suggestion.name)
      setIsFocused(false)
      startTransition(() => {
        router.push(`/catalog?q=${encodeURIComponent(suggestion.name)}`)
      })
    },
    [router]
  )

  // Debounced навигация (300ms)
  useEffect(() => {
    if (searchValue !== currentQuery) {
      isTypingRef.current = true
    }

    const timer = setTimeout(() => {
      if (searchValue !== currentQuery) {
        const params = new URLSearchParams(searchParams.toString())

        if (searchValue === '') {
          params.delete('q')
        } else {
          params.set('q', searchValue)
        }
        params.delete('page') // сброс пагинации при новом поиске

        startTransition(() => {
          router.push(`/catalog?${params.toString()}`)
        })

        setTimeout(() => {
          isTypingRef.current = false
        }, 100)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchValue, currentQuery, router, searchParams])

  // Dropdown компонент
  const dropdown = showDropdown ? (
    <Box
      position="absolute"
      top="100%"
      left={0}
      right={0}
      mt={1}
      bg="bg"
      borderRadius="md"
      shadow="lg"
      borderWidth="1px"
      borderColor="border"
      zIndex={50}
      maxH="300px"
      overflowY="auto"
    >
      {isSuggestionsLoading && suggestions.length === 0 ? (
        <Box p={3} textAlign="center">
          <Spinner size="sm" />
        </Box>
      ) : (
        <VStack align="stretch" gap={0}>
          {suggestions.map((suggestion) => (
            <Box
              key={suggestion.id}
              px={3}
              py={2}
              cursor="pointer"
              _hover={{ bg: 'bg.muted' }}
              onMouseDown={(e) => {
                e.preventDefault() // Не терять фокус с инпута
                handleSuggestionClick(suggestion)
              }}
            >
              <Text fontSize="sm" lineClamp={1}>
                {suggestion.name}
              </Text>
            </Box>
          ))}
        </VStack>
      )}
    </Box>
  ) : null

  // Mobile: иконка или открытое поле
  if (mode === 'mobile') {
    if (!isOpen) {
      return (
        <IconButton rounded="full" variant="subtle" color="fg" onClick={() => setIsOpen(true)} aria-label="Поиск">
          <Icon size="xl">
            <LuSearch />
          </Icon>
        </IconButton>
      )
    }

    return (
      <Box
        ref={containerRef}
        position="fixed"
        top={0}
        left={0}
        right={0}
        bg="bg"
        p={3}
        zIndex={30}
        display="flex"
        gap={2}
        alignItems="center"
        shadow="md"
      >
        <Box flex={1} position="relative">
          <SearchInput
            value={searchValue}
            onChange={handleChange}
            onClear={handleClear}
            disabled={isPending}
            placeholder="Поиск товаров..."
            size="lg"
            autoFocus
            onFocus={() => setIsFocused(true)}
          />
          {dropdown}
        </Box>
        <IconButton
          variant="ghost"
          aria-label="Закрыть поиск"
          onClick={() => {
            setIsOpen(false)
            setIsFocused(false)
          }}
        >
          <LuX />
        </IconButton>
      </Box>
    )
  }

  // Desktop: всегда видимое поле
  return (
    <Box ref={containerRef} width="220px" position="relative">
      <SearchInput
        value={searchValue}
        onChange={handleChange}
        onClear={handleClear}
        disabled={isPending}
        placeholder="Поиск..."
        size="sm"
        onFocus={() => setIsFocused(true)}
      />
      {dropdown}
    </Box>
  )
}
