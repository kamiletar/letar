'use client'

import { ALL_LICENSE_CATEGORIES, getCategoryDescription } from '@/lib/license-categories/license-categories'
import { Box, Button, HStack, Stack } from '@chakra-ui/react'
import type { LicenseCategory } from '@letar/driving-school-db/prisma'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { LuX } from 'react-icons/lu'

interface SearchParams {
  category?: LicenseCategory
  city?: string
  minRating?: string
}

interface SchoolsFiltersProps {
  searchParams: SearchParams
  availableCities: string[]
}

export function SchoolsFilters({ searchParams, availableCities }: SchoolsFiltersProps) {
  const router = useRouter()
  const currentParams = useSearchParams()

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
      router.push(`/schools?${params.toString()}`)
    },
    [currentParams, router]
  )

  // Сброс всех фильтров
  const resetFilters = useCallback(() => {
    router.push('/schools')
  }, [router])

  // Есть ли активные фильтры
  const hasActiveFilters = searchParams.category || searchParams.city || searchParams.minRating

  return (
    <Box bg="bg.subtle" p={4} borderRadius="lg">
      <Stack gap={4}>
        {/* Первый ряд: поиск по городу и категория */}
        <HStack gap={4} flexWrap="wrap">
          {/* Выбор города */}
          <Box flex={1} minW="200px">
            <select
              value={searchParams.city || ''}
              onChange={(e) => updateParams('city', e.target.value || null)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--chakra-colors-border)',
                background: 'var(--chakra-colors-bg)',
                color: 'var(--chakra-colors-fg)',
              }}
            >
              <option value="">Все города</option>
              {availableCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
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

        {/* Сброс фильтров */}
        {hasActiveFilters && (
          <HStack justify="flex-end">
            <Button variant="ghost" onClick={resetFilters}>
              <LuX />
              Сбросить фильтры
            </Button>
          </HStack>
        )}
      </Stack>
    </Box>
  )
}
