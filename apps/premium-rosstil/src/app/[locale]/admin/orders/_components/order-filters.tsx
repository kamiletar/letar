'use client'

import type { OrderStatus } from '@/generated/prisma'
import { useRouter } from '@/i18n/navigation'
import { Box, Button, Field, HStack, Input, Link, Text, VStack } from '@chakra-ui/react'
import { useSearchParams } from 'next/navigation'
import { memo, useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { FaFileExcel } from 'react-icons/fa'

// Colors for status buttons
const STATUS_COLORS: Record<OrderStatus | 'ALL', string> = {
  ALL: 'gray',
  NEW: 'blue',
  CONFIRMED: 'cyan',
  PROCESSING: 'yellow',
  PREORDER: 'orange',
  SHIPPED: 'purple',
  DELIVERED: 'green',
  CANCELLED: 'red',
}

// Date preset helpers
function getDatePreset(preset: 'today' | 'week' | 'month'): { from: string; to: string } {
  const today = new Date()
  const to = today.toISOString().split('T')[0]

  let from: Date
  switch (preset) {
    case 'today':
      from = today
      break
    case 'week':
      from = new Date(today)
      from.setDate(today.getDate() - 7)
      break
    case 'month':
      from = new Date(today)
      from.setMonth(today.getMonth() - 1)
      break
  }

  return { from: from.toISOString().split('T')[0], to }
}

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
      id="order-search-input"
      type="text"
      placeholder="Поиск по номеру заказа, имени, телефону, email..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      size="lg"
      disabled={disabled}
    />
  )
})

interface OrderFiltersProps {
  totalCount: number
  filteredCount: number
  statusLabels: Record<OrderStatus, string>
}

/**
 * Client component for filtering and searching Order records.
 * Uses URL searchParams for state management (shareable URLs, browser history).
 *
 * Filters:
 * - status: 'ALL' | OrderStatus
 * - search: string (searches in orderNumber, customerName, customerPhone, customerEmail)
 */
export function OrderFilters({ totalCount, filteredCount, statusLabels }: OrderFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const currentStatus = searchParams.get('status') || 'ALL'
  const currentSearch = searchParams.get('search') || ''
  const currentDateFrom = searchParams.get('dateFrom') || ''
  const currentDateTo = searchParams.get('dateTo') || ''

  // Local state for search input (prevents focus loss)
  const [searchValue, setSearchValue] = useState(currentSearch)

  // Local state for date inputs
  const [dateFrom, setDateFrom] = useState(currentDateFrom)
  const [dateTo, setDateTo] = useState(currentDateTo)

  // Track if update was initiated by user typing (prevents sync loop)
  const isTypingRef = useRef(false)

  // Active date preset detection
  const activePreset = useMemo(() => {
    if (!currentDateFrom || !currentDateTo) {
      return null
    }
    const presets = ['today', 'week', 'month'] as const
    for (const preset of presets) {
      const { from, to } = getDatePreset(preset)
      if (from === currentDateFrom && to === currentDateTo) {
        return preset
      }
    }
    return null
  }, [currentDateFrom, currentDateTo])

  // Sync local state with URL only when NOT typing (e.g., browser back/forward)
  useEffect(() => {
    if (!isTypingRef.current) {
      setTimeout(() => {
        setSearchValue(currentSearch)
      }, 0)
    }
  }, [currentSearch])

  // Sync date inputs with URL
  useEffect(() => {
    setDateFrom(currentDateFrom)
    setDateTo(currentDateTo)
  }, [currentDateFrom, currentDateTo])

  // Memoized change handler to prevent SearchInput re-renders
  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value)
  }, [])

  // Debounce search input - update URL after 300ms of no typing
  useEffect(() => {
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

        router.replace(`/admin/orders?${params.toString()}`)

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
    (updates: { status?: string; dateFrom?: string; dateTo?: string }) => {
      const params = new URLSearchParams(searchParams.toString())

      if (updates.status !== undefined) {
        if (updates.status === 'ALL') {
          params.delete('status')
        } else {
          params.set('status', updates.status)
        }
      }

      if (updates.dateFrom !== undefined) {
        if (updates.dateFrom === '') {
          params.delete('dateFrom')
        } else {
          params.set('dateFrom', updates.dateFrom)
        }
      }

      if (updates.dateTo !== undefined) {
        if (updates.dateTo === '') {
          params.delete('dateTo')
        } else {
          params.set('dateTo', updates.dateTo)
        }
      }

      startTransition(() => {
        router.push(`/admin/orders?${params.toString()}`)
      })
    },
    [router, searchParams]
  )

  /**
   * Applies a date preset
   */
  const applyDatePreset = useCallback(
    (preset: 'today' | 'week' | 'month') => {
      const { from, to } = getDatePreset(preset)
      updateFilters({ dateFrom: from, dateTo: to })
    },
    [updateFilters]
  )

  /**
   * Clears date filters
   */
  const clearDateFilters = useCallback(() => {
    updateFilters({ dateFrom: '', dateTo: '' })
  }, [updateFilters])

  /**
   * Resets all filters
   */
  const resetFilters = useCallback(() => {
    setSearchValue('')
    setDateFrom('')
    setDateTo('')
    startTransition(() => {
      router.push('/admin/orders')
    })
  }, [router])

  const hasActiveFilters =
    currentStatus !== 'ALL' || currentSearch !== '' || currentDateFrom !== '' || currentDateTo !== ''

  const hasDateFilters = currentDateFrom !== '' || currentDateTo !== ''

  // Build export URL with current filters
  const exportUrl = useMemo(() => {
    const params = new URLSearchParams()
    if (currentStatus !== 'ALL') {
      params.set('status', currentStatus)
    }
    if (currentSearch) {
      params.set('search', currentSearch)
    }
    if (currentDateFrom) {
      params.set('dateFrom', currentDateFrom)
    }
    if (currentDateTo) {
      params.set('dateTo', currentDateTo)
    }
    const queryString = params.toString()
    return `/api/admin/orders/export${queryString ? `?${queryString}` : ''}`
  }, [currentStatus, currentSearch, currentDateFrom, currentDateTo])

  return (
    <VStack gap={4} align="stretch">
      {/* Search input */}
      <Box>
        <SearchInput value={searchValue} onChange={handleSearchChange} disabled={isPending} />
      </Box>

      {/* Status filters */}
      <HStack gap={2} flexWrap="wrap">
        <Text fontSize="sm" fontWeight="medium" color="fg.muted" minW="50px">
          Статус:
        </Text>
        <Button
          size="sm"
          variant={currentStatus === 'ALL' ? 'solid' : 'outline'}
          colorPalette={STATUS_COLORS.ALL}
          onClick={() => updateFilters({ status: 'ALL' })}
          disabled={isPending}
        >
          Все
        </Button>
        {Object.entries(statusLabels).map(([status, label]) => (
          <Button
            key={status}
            size="sm"
            variant={currentStatus === status ? 'solid' : 'outline'}
            colorPalette={STATUS_COLORS[status as OrderStatus]}
            onClick={() => updateFilters({ status })}
            disabled={isPending}
          >
            {label}
          </Button>
        ))}
      </HStack>

      {/* Date filters */}
      <VStack gap={2} align="stretch">
        <HStack gap={2} flexWrap="wrap" alignItems="center">
          <Text fontSize="sm" fontWeight="medium" color="fg.muted" minW="50px">
            Период:
          </Text>
          <Button
            size="sm"
            variant={activePreset === 'today' ? 'solid' : 'outline'}
            colorPalette={activePreset === 'today' ? 'fg' : 'gray'}
            onClick={() => applyDatePreset('today')}
            disabled={isPending}
          >
            Сегодня
          </Button>
          <Button
            size="sm"
            variant={activePreset === 'week' ? 'solid' : 'outline'}
            colorPalette={activePreset === 'week' ? 'fg' : 'gray'}
            onClick={() => applyDatePreset('week')}
            disabled={isPending}
          >
            Неделя
          </Button>
          <Button
            size="sm"
            variant={activePreset === 'month' ? 'solid' : 'outline'}
            colorPalette={activePreset === 'month' ? 'fg' : 'gray'}
            onClick={() => applyDatePreset('month')}
            disabled={isPending}
          >
            Месяц
          </Button>
          {hasDateFilters && (
            <Button size="sm" variant="ghost" colorPalette="red" onClick={clearDateFilters} disabled={isPending}>
              Очистить
            </Button>
          )}
        </HStack>
        <HStack gap={2} flexWrap="wrap" alignItems="flex-end">
          <Field.Root maxW="180px">
            <Field.Label fontSize="xs" color="fg.muted">
              С даты
            </Field.Label>
            <Input
              type="date"
              size="sm"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value)
                updateFilters({ dateFrom: e.target.value })
              }}
              disabled={isPending}
            />
          </Field.Root>
          <Field.Root maxW="180px">
            <Field.Label fontSize="xs" color="fg.muted">
              По дату
            </Field.Label>
            <Input
              type="date"
              size="sm"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value)
                updateFilters({ dateTo: e.target.value })
              }}
              disabled={isPending}
            />
          </Field.Root>
        </HStack>
      </VStack>

      {/* Reset button, export button and results counter */}
      <HStack justifyContent="space-between">
        <Text fontSize="sm" color="fg.muted">
          Показано: {filteredCount} из {totalCount}
        </Text>
        <HStack gap={2}>
          <Button asChild size="sm" variant="outline" colorPalette="green">
            <Link href={exportUrl} download>
              <FaFileExcel />
              Экспорт в Excel
            </Link>
          </Button>
          {hasActiveFilters && (
            <Button size="sm" variant="ghost" colorPalette="red" onClick={resetFilters} disabled={isPending}>
              Сбросить фильтры
            </Button>
          )}
        </HStack>
      </HStack>
    </VStack>
  )
}
