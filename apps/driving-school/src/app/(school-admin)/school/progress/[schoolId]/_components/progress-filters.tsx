'use client'

import { HStack, NativeSelect } from '@chakra-ui/react'
import type { DocumentsStatus, LicenseCategory, ProgressStatus, TheoryStatus } from '@letar/driving-school-db/prisma'
import type { ChangeEvent } from 'react'

import type { ProgressFilters } from '../../_actions/progress.action'

// Локализация статусов
const PROGRESS_STATUS_OPTIONS: { label: string; value: ProgressStatus | '' }[] = [
  { label: 'Все статусы', value: '' },
  { label: 'Активный', value: 'ACTIVE' },
  { label: 'Завершено', value: 'COMPLETED' },
  { label: 'Отчислен', value: 'EXPELLED' },
  { label: 'Приостановлен', value: 'SUSPENDED' },
]

const DOCUMENTS_STATUS_OPTIONS: { label: string; value: DocumentsStatus | '' }[] = [
  { label: 'Все документы', value: '' },
  { label: 'Не начато', value: 'NOT_STARTED' },
  { label: 'В процессе', value: 'IN_PROGRESS' },
  { label: 'Готовы', value: 'READY' },
]

const THEORY_STATUS_OPTIONS: { label: string; value: TheoryStatus | '' }[] = [
  { label: 'Вся теория', value: '' },
  { label: 'Не начато', value: 'NOT_STARTED' },
  { label: 'В процессе', value: 'IN_PROGRESS' },
  { label: 'Завершено', value: 'COMPLETED' },
  { label: 'Не сдано', value: 'FAILED' },
]

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

interface ProgressFiltersBarProps {
  filters: ProgressFilters
  onFilterChange: (filters: ProgressFilters) => void
}

export function ProgressFiltersBar({ filters, onFilterChange }: ProgressFiltersBarProps) {
  const handleStatusChange = (e: ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({
      ...filters,
      status: (e.target.value as ProgressStatus) || undefined,
    })
  }

  const handleDocsChange = (e: ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({
      ...filters,
      documentsStatus: (e.target.value as DocumentsStatus) || undefined,
    })
  }

  const handleTheoryChange = (e: ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({
      ...filters,
      theoryStatus: (e.target.value as TheoryStatus) || undefined,
    })
  }

  const handleCategoryChange = (e: ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({
      ...filters,
      category: (e.target.value as LicenseCategory) || undefined,
    })
  }

  return (
    <HStack gap={3} wrap="wrap">
      <NativeSelect.Root size="sm" minW="150px">
        <NativeSelect.Field value={filters.status || ''} onChange={handleStatusChange}>
          {PROGRESS_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </NativeSelect.Field>
      </NativeSelect.Root>

      <NativeSelect.Root size="sm" minW="150px">
        <NativeSelect.Field value={filters.documentsStatus || ''} onChange={handleDocsChange}>
          {DOCUMENTS_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </NativeSelect.Field>
      </NativeSelect.Root>

      <NativeSelect.Root size="sm" minW="150px">
        <NativeSelect.Field value={filters.theoryStatus || ''} onChange={handleTheoryChange}>
          {THEORY_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </NativeSelect.Field>
      </NativeSelect.Root>

      <NativeSelect.Root size="sm" minW="150px">
        <NativeSelect.Field value={filters.category || ''} onChange={handleCategoryChange}>
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </NativeSelect.Field>
      </NativeSelect.Root>
    </HStack>
  )
}
