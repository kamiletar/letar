'use client'

import { Box, VStack } from '@chakra-ui/react'
import type { ReactNode } from 'react'

interface AdminResponsiveListProps<T> {
  /** Массив данных для рендеринга карточек */
  items: T[]
  /** Существующая таблица (показывается на md+) */
  tableContent: ReactNode
  /** Рендер карточки для мобильной версии */
  renderCard: (item: T, index: number) => ReactNode
  /** Заглушка при пустом списке */
  emptyState?: ReactNode
}

/**
 * Адаптивный список: таблица на десктопе, карточки на мобильных.
 * Desktop-код остаётся без изменений — карточки добавляются рядом через display.
 */
export function AdminResponsiveList<T>({ items, tableContent, renderCard, emptyState }: AdminResponsiveListProps<T>) {
  if (items.length === 0 && emptyState) {
    return <>{emptyState}</>
  }

  return (
    <>
      {/* Мобильные карточки */}
      <VStack gap={3} align="stretch" display={{ base: 'flex', md: 'none' }}>
        {items.map((item, index) => renderCard(item, index))}
      </VStack>

      {/* Десктопная таблица */}
      <Box display={{ base: 'none', md: 'block' }}>{tableContent}</Box>
    </>
  )
}
