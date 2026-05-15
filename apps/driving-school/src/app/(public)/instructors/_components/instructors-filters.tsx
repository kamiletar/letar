'use client'

import { ALL_LICENSE_CATEGORIES, getCategoryDescription } from '@/lib/license-categories/license-categories'
import { Box, Button, HStack, Input, Stack } from '@chakra-ui/react'
import type { LicenseCategory } from '@letar/driving-school-db/prisma/enums'
import { TransmissionType } from '@letar/driving-school-db/prisma/enums'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { LuSearch, LuX } from 'react-icons/lu'

interface SearchParams {
  category?: LicenseCategory
  transmission?: TransmissionType
  city?: string
  minRating?: string
  teachesOnStudentCar?: string
  brand?: string
  model?: string
  sortBy?: string
}

interface InstructorsFiltersProps {
  searchParams: SearchParams
}

// Хук для загрузки марок
function useBrandSuggestions(search: string) {
  const [brands, setBrands] = useState<string[]>([])

  useEffect(() => {
    if (!search || search.length < 1) {
      setBrands([])
      return
    }

    const controller = new AbortController()
    fetch(`/api/vehicles/brands?search=${encodeURIComponent(search)}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data: Array<{ id: string; label: string }>) => {
        setBrands(data.map((d) => d.label))
      })
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      .catch(() => {})

    return () => controller.abort()
  }, [search])

  return brands
}

// Хук для загрузки моделей
function useModelSuggestions(brand: string, search: string) {
  const [models, setModels] = useState<string[]>([])

  useEffect(() => {
    if (!brand) {
      setModels([])
      return
    }

    const controller = new AbortController()
    const params = new URLSearchParams({ brand })
    if (search) {
      params.set('search', search)
    }

    fetch(`/api/vehicles/models?${params.toString()}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data: Array<{ id: string; label: string }>) => {
        setModels(data.map((d) => d.label))
      })
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      .catch(() => {})

    return () => controller.abort()
  }, [brand, search])

  return models
}

export function InstructorsFilters({ searchParams }: InstructorsFiltersProps) {
  const router = useRouter()
  const currentParams = useSearchParams()

  // Локальные состояния для полей ввода
  const [cityInput, setCityInput] = useState(searchParams.city || '')
  const [brandInput, setBrandInput] = useState(searchParams.brand || '')
  const [modelInput, setModelInput] = useState(searchParams.model || '')

  // Автокомплит
  const brandSuggestions = useBrandSuggestions(brandInput)
  const modelSuggestions = useModelSuggestions(searchParams.brand || brandInput, modelInput)

  // Обновление URL с параметрами
  const updateParams = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(currentParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      // Сбрасываем страницу при изменении фильтров
      params.delete('page')
      router.push(`/instructors?${params.toString()}`)
    },
    [currentParams, router]
  )

  // Сброс всех фильтров
  const resetFilters = useCallback(() => {
    router.push('/instructors')
    setCityInput('')
    setBrandInput('')
    setModelInput('')
  }, [router])

  // Обновить несколько параметров сразу
  const updateMultipleParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(currentParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value)
        } else {
          params.delete(key)
        }
      }
      params.delete('page')
      router.push(`/instructors?${params.toString()}`)
    },
    [currentParams, router]
  )

  // Есть ли активные фильтры
  const hasActiveFilters =
    searchParams.category ||
    searchParams.transmission ||
    searchParams.city ||
    searchParams.minRating ||
    searchParams.teachesOnStudentCar ||
    searchParams.brand ||
    searchParams.model

  return (
    <Box bg="bg.subtle" p={4} borderRadius="lg">
      <Stack gap={4}>
        {/* Первый ряд: поиск по городу и категория */}
        <HStack gap={4} flexWrap="wrap">
          {/* Поиск по городу */}
          <Box flex={1} minW="200px">
            <Input
              placeholder="Город"
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  updateParams('city', cityInput || null)
                }
              }}
              onBlur={() => {
                if (cityInput !== searchParams.city) {
                  updateParams('city', cityInput || null)
                }
              }}
            />
          </Box>

          {/* Категория прав */}
          <Box flex={1} minW="200px">
            <select
              value={searchParams.category || ''}
              onChange={(e) => updateParams('category', e.target.value || null)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--chakra-colors-border)',
                background: 'var(--chakra-colors-bg)',
                color: 'var(--chakra-colors-fg)',
              }}
            >
              <option value="">Все категории</option>
              {ALL_LICENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat} — {getCategoryDescription(cat)}
                </option>
              ))}
            </select>
          </Box>

          {/* КПП */}
          <Box flex={1} minW="150px">
            <select
              value={searchParams.transmission || ''}
              onChange={(e) => updateParams('transmission', e.target.value || null)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--chakra-colors-border)',
                background: 'var(--chakra-colors-bg)',
                color: 'var(--chakra-colors-fg)',
              }}
            >
              <option value="">Любая КПП</option>
              <option value={TransmissionType.MANUAL}>Механика</option>
              <option value={TransmissionType.AUTOMATIC}>Автомат</option>
            </select>
          </Box>

          {/* Минимальный рейтинг */}
          <Box flex={1} minW="150px">
            <select
              value={searchParams.minRating || ''}
              onChange={(e) => updateParams('minRating', e.target.value || null)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--chakra-colors-border)',
                background: 'var(--chakra-colors-bg)',
                color: 'var(--chakra-colors-fg)',
              }}
            >
              <option value="">Любой рейтинг</option>
              <option value="4.5">4.5+ ⭐</option>
              <option value="4.0">4.0+ ⭐</option>
              <option value="3.5">3.5+ ⭐</option>
              <option value="3.0">3.0+ ⭐</option>
            </select>
          </Box>
        </HStack>

        {/* Второй ряд: марка и модель автомобиля */}
        <HStack gap={4} flexWrap="wrap">
          {/* Марка автомобиля */}
          <Box flex={1} minW="180px">
            <Input
              placeholder="Марка авто"
              value={brandInput}
              onChange={(e) => setBrandInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  updateMultipleParams({
                    brand: brandInput || null,
                    model: null, // Сбрасываем модель при смене марки
                  })
                  setModelInput('')
                }
              }}
              onBlur={() => {
                if (brandInput !== searchParams.brand) {
                  updateMultipleParams({
                    brand: brandInput || null,
                    model: null,
                  })
                  setModelInput('')
                }
              }}
              list="brand-suggestions"
            />
            <datalist id="brand-suggestions">
              {brandSuggestions.map((brand) => (
                <option key={brand} value={brand} />
              ))}
            </datalist>
          </Box>

          {/* Модель автомобиля */}
          <Box flex={1} minW="180px">
            <Input
              placeholder="Модель авто"
              value={modelInput}
              onChange={(e) => setModelInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  updateParams('model', modelInput || null)
                }
              }}
              onBlur={() => {
                if (modelInput !== searchParams.model) {
                  updateParams('model', modelInput || null)
                }
              }}
              disabled={!searchParams.brand && !brandInput}
              list="model-suggestions"
            />
            <datalist id="model-suggestions">
              {modelSuggestions.map((model) => (
                <option key={model} value={model} />
              ))}
            </datalist>
          </Box>

          {/* Сортировка */}
          <Box flex={1} minW="180px">
            <select
              value={searchParams.sortBy || 'rating'}
              onChange={(e) => updateParams('sortBy', e.target.value || null)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--chakra-colors-border)',
                background: 'var(--chakra-colors-bg)',
                color: 'var(--chakra-colors-fg)',
              }}
            >
              <option value="rating">По рейтингу</option>
              <option value="experience">По стажу</option>
              <option value="price">По цене</option>
            </select>
          </Box>
        </HStack>

        {/* Третий ряд: дополнительные фильтры и кнопки */}
        <HStack gap={4} justify="space-between" flexWrap="wrap">
          <HStack gap={4}>
            {/* Обучение на авто ученика */}
            <Button
              size="sm"
              variant={searchParams.teachesOnStudentCar === 'true' ? 'solid' : 'outline'}
              colorPalette={searchParams.teachesOnStudentCar === 'true' ? 'fg' : 'gray'}
              onClick={() =>
                updateParams('teachesOnStudentCar', searchParams.teachesOnStudentCar === 'true' ? null : 'true')
              }
            >
              На моём авто
            </Button>
          </HStack>

          <HStack gap={2}>
            {/* Кнопка поиска */}
            <Button
              colorPalette="brand"
              onClick={() => {
                if (cityInput !== searchParams.city) {
                  updateParams('city', cityInput || null)
                }
              }}
            >
              <LuSearch />
              Найти
            </Button>

            {/* Сброс фильтров */}
            {hasActiveFilters && (
              <Button variant="ghost" onClick={resetFilters}>
                <LuX />
                Сбросить
              </Button>
            )}
          </HStack>
        </HStack>
      </Stack>
    </Box>
  )
}
