'use client'

import { HStack, Input, NativeSelect } from '@chakra-ui/react'
import type { LicenseCategory } from '@letar/driving-school-db/prisma'
import type { ChangeEvent } from 'react'

import type { InstructorOption, KanbanFilters } from '../_actions/kanban.action'

// Опции категорий
const CATEGORY_OPTIONS: { label: string; value: LicenseCategory | '' }[] = [
  { label: 'Все категории', value: '' },
  { label: 'M', value: 'M' },
  { label: 'A', value: 'A' },
  { label: 'A1', value: 'A1' },
  { label: 'B', value: 'B' },
  { label: 'B1', value: 'B1' },
  { label: 'C', value: 'C' },
  { label: 'C1', value: 'C1' },
  { label: 'D', value: 'D' },
  { label: 'D1', value: 'D1' },
]

interface KanbanFiltersBarProps {
  filters: KanbanFilters
  instructors: InstructorOption[]
  onFilterChange: (filters: KanbanFilters) => void
}

/**
 * Панель фильтров для Kanban-доски
 */
export function KanbanFiltersBar({ filters, instructors, onFilterChange }: KanbanFiltersBarProps) {
  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    onFilterChange({
      ...filters,
      search: e.target.value || undefined,
    })
  }

  const handleCategoryChange = (e: ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({
      ...filters,
      category: (e.target.value as LicenseCategory) || undefined,
    })
  }

  const handleInstructorChange = (e: ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({
      ...filters,
      instructorId: e.target.value || undefined,
    })
  }

  return (
    <HStack gap={3} wrap="wrap">
      {/* Поиск */}
      <Input
        size="sm"
        placeholder="Поиск по имени, email, телефону..."
        value={filters.search || ''}
        onChange={handleSearchChange}
        maxW="300px"
        minW="200px"
      />

      {/* Категория */}
      <NativeSelect.Root size="sm" minW="150px">
        <NativeSelect.Field value={filters.category || ''} onChange={handleCategoryChange}>
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </NativeSelect.Field>
      </NativeSelect.Root>

      {/* Инструктор */}
      <NativeSelect.Root size="sm" minW="200px">
        <NativeSelect.Field value={filters.instructorId || ''} onChange={handleInstructorChange}>
          <option value="">Все инструкторы</option>
          {instructors.map((instructor) => (
            <option key={instructor.id} value={instructor.id}>
              {instructor.name} ({instructor.studentsCount})
            </option>
          ))}
        </NativeSelect.Field>
      </NativeSelect.Root>
    </HStack>
  )
}
