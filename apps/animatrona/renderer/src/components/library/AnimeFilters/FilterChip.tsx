'use client'

import { Icon, Tag } from '@chakra-ui/react'
import { LuX } from 'react-icons/lu'

export interface FilterChipProps {
  /** Текст чипа */
  label: string
  /** Категория фильтра (отображается перед значением) */
  category?: string
  /** Callback при удалении */
  onClear: () => void
  /** Цветовая схема (по умолчанию purple) */
  colorPalette?: 'purple' | 'blue' | 'green' | 'orange' | 'red' | 'gray'
}

/**
 * Чип активного фильтра с кнопкой удаления
 *
 * @example
 * ```tsx
 * <FilterChip
 *   category="Статус"
 *   label="Смотрю"
 *   onClear={() => setWatchStatus('')}
 * />
 * ```
 */
export function FilterChip({ label, category, onClear, colorPalette = 'purple' }: FilterChipProps) {
  return (
    <Tag.Root size="sm" colorPalette={colorPalette} variant="subtle" borderRadius="full">
      <Tag.Label>
        {category && <span style={{ opacity: 0.7, marginRight: 4 }}>{category}:</span>}
        {label}
      </Tag.Label>
      <Tag.EndElement>
        <Tag.CloseTrigger
          onClick={(e) => {
            e.stopPropagation()
            onClear()
          }}
          cursor="pointer"
          _hover={{ bg: 'blackAlpha.200' }}
          borderRadius="full"
          p={0.5}
        >
          <Icon as={LuX} boxSize={3} />
        </Tag.CloseTrigger>
      </Tag.EndElement>
    </Tag.Root>
  )
}
