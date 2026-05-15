'use client'

import { Button, HStack, Icon, Text } from '@chakra-ui/react'
import { LuX } from 'react-icons/lu'

import { FilterChip } from './FilterChip'

/** Описание активного фильтра */
export interface ActiveFilter {
  /** Уникальный ключ фильтра */
  key: string
  /** Категория фильтра */
  category: string
  /** Отображаемое значение */
  label: string
  /** Callback для сброса этого фильтра */
  onClear: () => void
}

export interface ActiveFiltersProps {
  /** Список активных фильтров */
  filters: ActiveFilter[]
  /** Callback для сброса всех фильтров */
  onClearAll: () => void
}

/**
 * Строка с активными фильтрами
 *
 * Отображает чипсы активных фильтров и кнопку "Сбросить все"
 *
 * @example
 * ```tsx
 * const activeFilters = [
 *   { key: 'status', category: 'Статус', label: 'Выходит', onClear: () => setStatus('') },
 *   { key: 'year', category: 'Год', label: '2024', onClear: () => setYear('') },
 * ]
 *
 * <ActiveFilters filters={activeFilters} onClearAll={handleReset} />
 * ```
 */
export function ActiveFilters({ filters, onClearAll }: ActiveFiltersProps) {
  if (filters.length === 0) {
    return null
  }

  return (
    <HStack gap={2} wrap="wrap" py={2}>
      <Text fontSize="sm" color="fg.subtle" flexShrink={0}>
        Активные ({filters.length}):
      </Text>

      {filters.map((filter) => (
        <FilterChip key={filter.key} category={filter.category} label={filter.label} onClear={filter.onClear} />
      ))}

      <Button
        variant="ghost"
        size="xs"
        onClick={onClearAll}
        color="fg.subtle"
        _hover={{ color: 'fg', bg: 'state.hover' }}
        flexShrink={0}
      >
        <Icon as={LuX} mr={1} />
        Сбросить все
      </Button>
    </HStack>
  )
}
