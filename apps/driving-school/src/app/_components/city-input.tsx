'use client'

import { Box, Input, List, Spinner } from '@chakra-ui/react'
import { useCallback, useEffect, useRef, useState } from 'react'

interface CitySuggestion {
  value: string
  data: {
    city: string | null
    city_fias_id: string | null
    settlement: string | null
    region: string | null
    region_with_type: string | null
  }
}

export interface CityInputProps {
  value: string
  onChange: (city: string) => void
  onCitySelect?: (suggestion: CitySuggestion) => void
  placeholder?: string
}

/**
 * Компонент выбора города с подсказками от DaData
 */
export function CityInput({ value, onChange, onCitySelect, placeholder = 'Введите город' }: CityInputProps) {
  const apiKey = process.env.NEXT_PUBLIC_DADATA_API_KEY || ''
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const justSelectedRef = useRef(false) // Флаг: только что выбрали город

  // Загрузка подсказок
  const fetchSuggestions = useCallback(
    async (query: string) => {
      if (!apiKey || query.length < 2) {
        setSuggestions([])
        return
      }

      setIsLoading(true)
      try {
        const response = await fetch('https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Token ${apiKey}`,
          },
          body: JSON.stringify({
            query,
            count: 7,
            from_bound: { value: 'city' },
            to_bound: { value: 'settlement' },
          }),
        })

        if (response.ok) {
          const data = await response.json()
          setSuggestions(data.suggestions || [])
          setIsOpen(data.suggestions?.length > 0)
        }
      } catch (error) {
        console.error('Error fetching city suggestions:', error)
      } finally {
        setIsLoading(false)
      }
    },
    [apiKey]
  )

  // Debounce поиска
  useEffect(() => {
    // Пропускаем fetch если только что выбрали город
    if (justSelectedRef.current) {
      justSelectedRef.current = false
      return
    }

    const timer = setTimeout(() => {
      if (value) {
        fetchSuggestions(value)
      } else {
        setSuggestions([])
        setIsOpen(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [value, fetchSuggestions])

  // Закрытие при клике вне
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Выбор города
  const handleSelect = (suggestion: CitySuggestion) => {
    const cityName = suggestion.data.city || suggestion.data.settlement || suggestion.value
    justSelectedRef.current = true // Предотвращаем повторный fetch
    onChange(cityName)
    onCitySelect?.(suggestion)
    setIsOpen(false)
    setSuggestions([])
  }

  // Навигация клавиатурой
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) {
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0) {
          handleSelect(suggestions[highlightedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
    }
  }

  return (
    <Box ref={containerRef} position="relative" width="100%">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />
      {isLoading && (
        <Box position="absolute" right={3} top="50%" transform="translateY(-50%)">
          <Spinner size="sm" />
        </Box>
      )}

      {isOpen && suggestions.length > 0 && (
        <List.Root
          position="absolute"
          top="100%"
          left={0}
          right={0}
          zIndex={1000}
          mt={1}
          bg="bg"
          borderWidth="1px"
          borderColor="border"
          borderRadius="md"
          shadow="lg"
          maxH="250px"
          overflowY="auto"
          listStyle="none"
        >
          {suggestions.map((suggestion, index) => (
            <List.Item
              key={`${suggestion.data.city_fias_id}-${index}`}
              px={4}
              py={2}
              cursor="pointer"
              bg={index === highlightedIndex ? 'bg.muted' : undefined}
              _hover={{ bg: 'bg.muted' }}
              onClick={() => handleSelect(suggestion)}
            >
              {suggestion.value}
            </List.Item>
          ))}
        </List.Root>
      )}
    </Box>
  )
}
