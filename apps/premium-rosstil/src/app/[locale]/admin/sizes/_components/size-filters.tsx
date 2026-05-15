'use client'

import { Gender } from '@/generated/prisma'
import { useRouter } from '@/i18n/navigation'
import { Box, Button, HStack, Input, Text, VStack } from '@chakra-ui/react'
import { useSearchParams } from 'next/navigation'
import { memo, useCallback, useEffect, useRef, useState, useTransition } from 'react'

/**
 * Memoized search input to prevent focus loss during re-renders
 */
const SearchInput = memo(function SearchInput({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  disabled: boolean
}) {
  return (
    <Input
      id="size-search-input"
      type="text"
      placeholder="Поиск по размерам (RU, International, DE, IT, FR, UK, US)..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      size="lg"
      disabled={disabled}
    />
  )
})

interface SizeFiltersProps {
  totalCount: number
  filteredCount: number
}

/**
 * Client component for filtering and searching ProductSize records.
 * Uses URL searchParams for state management (shareable URLs, browser history).
 *
 * Filters:
 * - gender: 'ALL' | 'FEMALE' | 'MALE'
 * - search: string (searches in RU, international, and other size fields)
 */
export function SizeFilters({ totalCount, filteredCount }: SizeFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const currentGender = searchParams.get('gender') || 'ALL'
  const currentSearch = searchParams.get('search') || ''

  // Local state for search input (prevents focus loss)
  const [searchValue, setSearchValue] = useState(currentSearch)

  // Track if update was initiated by user typing (prevents sync loop)
  const isTypingRef = useRef(false)

  // Sync local state with URL only when NOT typing (e.g., browser back/forward)
  useEffect(() => {
    if (!isTypingRef.current) {
      // Defer state update to avoid synchronous setState in effect
      setTimeout(() => {
        setSearchValue(currentSearch)
      }, 0)
    }
  }, [currentSearch])

  // Memoized change handler to prevent SearchInput re-renders
  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value)
  }, [])

  // Debounce search input - update URL after 300ms of no typing
  useEffect(() => {
    // Mark as typing when searchValue changes
    if (searchValue !== currentSearch) {
      isTypingRef.current = true
    }

    const timer = setTimeout(() => {
      if (searchValue !== currentSearch) {
        const params = new URLSearchParams(searchParams.toString())

        if (searchValue === '') {
          params.delete('search')
        } else {
          params.set('search', searchValue)
        }

        // Use replace instead of push to avoid history pollution
        router.replace(`/admin/sizes?${params.toString()}`)

        // Reset typing flag after a short delay
        setTimeout(() => {
          isTypingRef.current = false
        }, 100)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchValue, currentSearch, router, searchParams])

  /**
   * Updates URL search params with new filter values
   */
  const updateFilters = useCallback(
    (updates: { gender?: string; search?: string }) => {
      const params = new URLSearchParams(searchParams.toString())

      // Update gender filter
      if (updates.gender !== undefined) {
        if (updates.gender === 'ALL') {
          params.delete('gender')
        } else {
          params.set('gender', updates.gender)
        }
      }

      // Update search filter
      if (updates.search !== undefined) {
        if (updates.search === '') {
          params.delete('search')
        } else {
          params.set('search', updates.search)
        }
      }

      // Update URL with transition for better UX
      startTransition(() => {
        router.push(`/admin/sizes?${params.toString()}`)
      })
    },
    [router, searchParams]
  )

  /**
   * Resets all filters
   */
  const resetFilters = useCallback(() => {
    setSearchValue('')
    startTransition(() => {
      router.push('/admin/sizes')
    })
  }, [router])

  const hasActiveFilters = currentGender !== 'ALL' || currentSearch !== ''

  return (
    <VStack gap={4} align="stretch">
      {/* Search input */}
      <Box>
        <SearchInput value={searchValue} onChange={handleSearchChange} disabled={isPending} />
      </Box>

      {/* Gender filters */}
      <HStack gap={2} flexWrap="wrap">
        <Text fontSize="sm" fontWeight="medium" color="fg.muted">
          Пол:
        </Text>
        <Button
          size="sm"
          variant={currentGender === 'ALL' ? 'solid' : 'outline'}
          colorPalette={currentGender === 'ALL' ? 'blue' : 'gray'}
          onClick={() => updateFilters({ gender: 'ALL' })}
          disabled={isPending}
        >
          Все
        </Button>
        <Button
          size="sm"
          variant={currentGender === Gender.FEMALE ? 'solid' : 'outline'}
          colorPalette={currentGender === Gender.FEMALE ? 'pink' : 'gray'}
          onClick={() => updateFilters({ gender: Gender.FEMALE })}
          disabled={isPending}
        >
          Женские
        </Button>
        <Button
          size="sm"
          variant={currentGender === Gender.MALE ? 'solid' : 'outline'}
          colorPalette={currentGender === Gender.MALE ? 'blue' : 'gray'}
          onClick={() => updateFilters({ gender: Gender.MALE })}
          disabled={isPending}
        >
          Мужские
        </Button>

        {hasActiveFilters && (
          <Button size="sm" variant="ghost" colorPalette="red" onClick={resetFilters} disabled={isPending}>
            Сбросить фильтры
          </Button>
        )}
      </HStack>

      {/* Results counter */}
      <Text fontSize="sm" color="fg.muted">
        Показано: {filteredCount} из {totalCount}
      </Text>
    </VStack>
  )
}
