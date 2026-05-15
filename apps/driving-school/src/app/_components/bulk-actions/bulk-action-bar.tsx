'use client'

import { Badge, Box, Button, HStack, Icon, Portal, Text } from '@chakra-ui/react'
import { useState } from 'react'
import type { IconType } from 'react-icons'
import { LuX } from 'react-icons/lu'

/**
 * Описание массового действия
 */
export interface BulkAction<T> {
  /** Уникальный ID действия */
  id: string
  /** Текст кнопки */
  label: string
  /** Иконка */
  icon?: IconType
  /** Цветовая палитра */
  colorPalette?: string
  /** Опасное действие (красный цвет) */
  destructive?: boolean
  /** Условие отключения кнопки */
  isDisabled?: (items: T[]) => boolean
  /** Обработчик выполнения */
  onExecute: (ids: string[], items: T[]) => Promise<void>
}

interface BulkActionBarProps<T> {
  /** Количество выбранных элементов */
  selectedCount: number
  /** ID выбранных элементов */
  selectedIds: string[]
  /** Выбранные элементы (полные объекты) */
  selectedItems: T[]
  /** Доступные действия */
  actions: BulkAction<T>[]
  /** Обработчик отмены выбора */
  onCancel: () => void
}

/**
 * Плавающая панель массовых действий
 *
 * Появляется внизу экрана при выборе элементов в таблице.
 *
 * @example
 * <BulkActionBar
 *   selectedCount={selection.selectedCount}
 *   selectedIds={Array.from(selection.selectedIds)}
 *   selectedItems={selection.selectedItems}
 *   actions={bulkActions}
 *   onCancel={selection.deselectAll}
 * />
 */
export function BulkActionBar<T>({
  selectedCount,
  selectedIds,
  selectedItems,
  actions,
  onCancel,
}: BulkActionBarProps<T>) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  const handleExecute = async (action: BulkAction<T>) => {
    setLoadingAction(action.id)
    try {
      await action.onExecute(selectedIds, selectedItems)
    } finally {
      setLoadingAction(null)
    }
  }

  if (selectedCount === 0) {
    return null
  }

  return (
    <Portal>
      <Box
        position="fixed"
        bottom={6}
        left="50%"
        transform="translateX(-50%)"
        zIndex="overlay"
        animation="slideUp 0.2s ease-out"
        css={{
          '@keyframes slideUp': {
            from: { transform: 'translateX(-50%) translateY(100%)', opacity: 0 },
            to: { transform: 'translateX(-50%) translateY(0)', opacity: 1 },
          },
        }}
      >
        <Box bg="bg.panel" borderRadius="xl" shadow="xl" borderWidth="1px" px={4} py={3}>
          <HStack gap={4}>
            {/* Счётчик выбранных */}
            <HStack gap={2}>
              <Badge colorPalette="brand" size="lg">
                {selectedCount}
              </Badge>
              <Text fontWeight="medium">{getSelectedText(selectedCount)}</Text>
            </HStack>

            {/* Разделитель */}
            <Box h={6} w="1px" bg="border.subtle" />

            {/* Кнопки действий */}
            <HStack gap={2}>
              {actions.map((action) => {
                const isDisabled = action.isDisabled?.(selectedItems) ?? false
                const isLoading = loadingAction === action.id
                const colorPalette = action.destructive ? 'red' : (action.colorPalette ?? 'gray')

                return (
                  <Button
                    key={action.id}
                    size="sm"
                    variant="ghost"
                    colorPalette={colorPalette}
                    disabled={isDisabled || loadingAction !== null}
                    loading={isLoading}
                    onClick={() => handleExecute(action)}
                  >
                    {action.icon && <Icon as={action.icon} />}
                    {action.label}
                  </Button>
                )
              })}
            </HStack>

            {/* Разделитель */}
            <Box h={6} w="1px" bg="border.subtle" />

            {/* Кнопка отмены */}
            <Button size="sm" variant="ghost" onClick={onCancel} aria-label="Отменить выбор">
              <LuX />
            </Button>
          </HStack>
        </Box>
      </Box>
    </Portal>
  )
}

/**
 * Склонение слова "выбрано" по количеству
 */
function getSelectedText(count: number): string {
  const lastDigit = count % 10
  const lastTwoDigits = count % 100

  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return 'выбрано'
  }

  if (lastDigit === 1) {
    return 'выбран'
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'выбрано'
  }

  return 'выбрано'
}
