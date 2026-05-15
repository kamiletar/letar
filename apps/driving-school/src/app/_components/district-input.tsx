'use client'

import { Box, Button, HStack, Input, List, Spinner, Tag, Text } from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LuX } from 'react-icons/lu'

// Административные округа Москвы
const MOSCOW_DISTRICTS = ['ЦАО', 'САО', 'СВАО', 'ВАО', 'ЮВАО', 'ЮАО', 'ЮЗАО', 'ЗАО', 'СЗАО', 'ЗелАО', 'ТАО', 'НАО']

interface DistrictSuggestion {
  value: string
  unrestricted_value: string
  displayName?: string // Добавляем для отображения
  data: {
    city_district: string | null
    city_district_fias_id: string | null
    area: string | null
    settlement: string | null
    settlement_with_type: string | null
  }
}

export interface DistrictInputProps {
  city: string
  values: string[]
  onChange: (districts: string[]) => void
  placeholder?: string
  maxDistricts?: number
  /** Не рендерить теги внутри компонента (для рендеринга снаружи) */
  hideSelectedTags?: boolean
}

/**
 * Компонент выбора районов города с подсказками от DaData
 * Поддерживает множественный выбор
 */
export function DistrictInput({
  city,
  values,
  onChange,
  placeholder = 'Введите район',
  maxDistricts = 20,
  hideSelectedTags = false,
}: DistrictInputProps) {
  const apiKey = process.env.NEXT_PUBLIC_DADATA_API_KEY || ''
  const [inputValue, setInputValue] = useState('')
  const [suggestions, setSuggestions] = useState<DistrictSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)

  // Предустановленные округа для Москвы
  const presetDistricts = useMemo(() => {
    const cityLower = city.toLowerCase()
    if (cityLower.includes('москва')) {
      return { label: 'Округа Москвы', districts: MOSCOW_DISTRICTS }
    }
    return null
  }, [city])

  // Доступные для выбора предустановленные районы (без уже выбранных)
  const availablePresets = useMemo(() => {
    if (!presetDistricts) {
      return []
    }
    return presetDistricts.districts.filter((d) => !values.includes(d))
  }, [presetDistricts, values])

  // Добавить предустановленный район
  const handleAddPreset = (district: string) => {
    if (!values.includes(district) && values.length < maxDistricts) {
      onChange([...values, district])
    }
  }

  // Загрузка подсказок районов
  const fetchSuggestions = useCallback(
    async (query: string) => {
      if (!apiKey || !city || query.length < 2) {
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
            query: `${city} ${query}`,
            count: 15,
            // Ищем только районы города и поселения (без улиц)
            from_bound: { value: 'city_district' },
            to_bound: { value: 'settlement' },
          }),
        })

        if (response.ok) {
          const data = await response.json()
          // Извлекаем уникальные названия районов/микрорайонов
          const seen = new Set<string>()
          const districts: DistrictSuggestion[] = []

          for (const s of data.suggestions || []) {
            // Приоритет: район города > поселение (без улиц)
            const name = s.data.city_district || s.data.settlement_with_type

            if (name && !seen.has(name) && !values.includes(name)) {
              seen.add(name)
              districts.push({ ...s, displayName: name })
            }
          }

          setSuggestions(districts.slice(0, 10))
          setIsOpen(districts.length > 0)
        }
      } catch (error) {
        console.error('Error fetching district suggestions:', error)
      } finally {
        setIsLoading(false)
      }
    },
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- values исключён намеренно, чтобы не перезапрашивать при каждом изменении
    [apiKey, city]
  )

  // Debounce поиска
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue && city) {
        fetchSuggestions(inputValue)
      } else {
        setSuggestions([])
        setIsOpen(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [inputValue, city, fetchSuggestions])

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

  // Добавление района
  const handleSelect = (suggestion: DistrictSuggestion) => {
    const district = suggestion.displayName
    if (district && !values.includes(district) && values.length < maxDistricts) {
      onChange([...values, district])
    }
    setInputValue('')
    setIsOpen(false)
    setSuggestions([])
  }

  // Удаление района
  const handleRemove = (district: string) => {
    onChange(values.filter((d) => d !== district))
  }

  // Навигация клавиатурой
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isOpen && inputValue.trim()) {
      // Добавить введённое значение как есть
      e.preventDefault()
      if (!values.includes(inputValue.trim()) && values.length < maxDistricts) {
        onChange([...values, inputValue.trim()])
        setInputValue('')
      }
      return
    }

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
    <Box ref={containerRef} width="100%">
      {/* Быстрый выбор для Москвы/СПб */}
      {availablePresets.length > 0 && values.length < maxDistricts && (
        <Box mb={3}>
          <Text fontSize="xs" color="fg.muted" mb={1.5}>
            {presetDistricts?.label}:
          </Text>
          <HStack flexWrap="wrap" gap={1.5}>
            {availablePresets.map((district) => (
              <Button key={district} size="xs" variant="outline" onClick={() => handleAddPreset(district)}>
                {district}
              </Button>
            ))}
          </HStack>
        </Box>
      )}

      {/* Поле ввода */}
      <Box position="relative">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={values.length >= maxDistricts ? 'Максимум районов выбрано' : placeholder}
          disabled={values.length >= maxDistricts || !city}
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
            maxH="200px"
            overflowY="auto"
            listStyle="none"
          >
            {suggestions.map((suggestion, index) => (
              <List.Item
                key={`${suggestion.displayName}-${index}`}
                px={4}
                py={2}
                cursor="pointer"
                bg={index === highlightedIndex ? 'bg.muted' : undefined}
                _hover={{ bg: 'bg.muted' }}
                onClick={() => handleSelect(suggestion)}
              >
                {suggestion.displayName}
              </List.Item>
            ))}
          </List.Root>
        )}
      </Box>

      {/* Выбранные районы */}
      {!hideSelectedTags && values.length > 0 && (
        <Box display="flex" flexWrap="wrap" gap={2} mt={2}>
          {values.map((district) => (
            <Tag.Root key={district} size="lg" colorPalette="brand">
              <Tag.Label>{district}</Tag.Label>
              <Tag.CloseTrigger onClick={() => handleRemove(district)}>
                <LuX />
              </Tag.CloseTrigger>
            </Tag.Root>
          ))}
        </Box>
      )}
    </Box>
  )
}
