/**
 * Bulk Actions — массовые действия в таблицах
 *
 * Предоставляет:
 * - useBulkSelection — хук для управления выделением
 * - BulkActionBar — плавающая панель с действиями
 * - SelectAllCheckbox — чекбокс "выбрать всё"
 * - RowCheckbox — чекбокс для строки
 *
 * @module bulk-actions
 */

'use client'

import { Badge, Box, Button, Checkbox, Flex, HStack, Icon, Portal, Spinner, Text } from '@chakra-ui/react'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useMemo, useState } from 'react'
import { LuCheck, LuSquare, LuSquareCheck, LuTrash2, LuX } from 'react-icons/lu'

// === Типы ===

export interface BulkAction<T = unknown> {
  /** Уникальный идентификатор действия */
  id: string
  /** Название действия */
  label: string
  /** Иконка */
  icon?: React.ElementType
  /** Цветовая схема */
  colorPalette?: string
  /** Вариант кнопки */
  variant?: 'solid' | 'outline' | 'ghost'
  /** Опасное действие (красный цвет) */
  destructive?: boolean
  /** Callback при выполнении */
  onExecute: (selectedIds: string[], selectedItems: T[]) => Promise<void> | void
  /** Условие доступности */
  isDisabled?: (selectedItems: T[]) => boolean
}

export interface UseBulkSelectionOptions<T> {
  /** Все элементы для выбора */
  items: T[]
  /** Функция получения ID элемента */
  getItemId: (item: T) => string
  /** Callback при изменении выделения */
  onSelectionChange?: (selectedIds: string[]) => void
}

export interface UseBulkSelectionReturn<T> {
  /** Выбранные ID */
  selectedIds: Set<string>
  /** Выбранные элементы */
  selectedItems: T[]
  /** Количество выбранных */
  selectedCount: number
  /** Все выбраны */
  isAllSelected: boolean
  /** Частично выбраны */
  isIndeterminate: boolean
  /** Ничего не выбрано */
  isEmpty: boolean
  /** Выбрать/снять элемент */
  toggleItem: (id: string) => void
  /** Выбрать все */
  selectAll: () => void
  /** Снять все */
  deselectAll: () => void
  /** Проверить выбран ли элемент */
  isSelected: (id: string) => boolean
}

// === Хук для управления выделением ===

export function useBulkSelection<T>({
  items,
  getItemId,
  onSelectionChange,
}: UseBulkSelectionOptions<T>): UseBulkSelectionReturn<T> {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const itemIds = useMemo(() => items.map(getItemId), [items, getItemId])

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.has(getItemId(item))),
    [items, selectedIds, getItemId]
  )

  const selectedCount = selectedIds.size
  const isAllSelected = selectedCount > 0 && selectedCount === items.length
  const isIndeterminate = selectedCount > 0 && selectedCount < items.length
  const isEmpty = selectedCount === 0

  const toggleItem = useCallback(
    (id: string) => {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        if (next.has(id)) {
          next.delete(id)
        } else {
          next.add(id)
        }
        onSelectionChange?.(Array.from(next))
        return next
      })
    },
    [onSelectionChange]
  )

  const selectAll = useCallback(() => {
    const allIds = new Set(itemIds)
    setSelectedIds(allIds)
    onSelectionChange?.(Array.from(allIds))
  }, [itemIds, onSelectionChange])

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set())
    onSelectionChange?.([])
  }, [onSelectionChange])

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds])

  return {
    selectedIds,
    selectedItems,
    selectedCount,
    isAllSelected,
    isIndeterminate,
    isEmpty,
    toggleItem,
    selectAll,
    deselectAll,
    isSelected,
  }
}

// === Компонент чекбокса "Выбрать всё" ===

interface SelectAllCheckboxProps {
  isAllSelected: boolean
  isIndeterminate: boolean
  onSelectAll: () => void
  onDeselectAll: () => void
  totalCount: number
  selectedCount: number
}

export function SelectAllCheckbox({
  isAllSelected,
  isIndeterminate,
  onSelectAll,
  onDeselectAll,
  totalCount,
  selectedCount,
}: SelectAllCheckboxProps) {
  const handleChange = () => {
    if (isAllSelected || isIndeterminate) {
      onDeselectAll()
    } else {
      onSelectAll()
    }
  }

  return (
    <Checkbox.Root
      checked={isAllSelected ? true : isIndeterminate ? 'indeterminate' : false}
      onCheckedChange={handleChange}
      aria-label={`Выбрать все (${selectedCount} из ${totalCount})`}
    >
      <Checkbox.HiddenInput />
      <Checkbox.Control>
        <Checkbox.Indicator>
          {isIndeterminate ? <Icon as={LuSquare} boxSize={3} /> : <Icon as={LuCheck} boxSize={3} />}
        </Checkbox.Indicator>
      </Checkbox.Control>
    </Checkbox.Root>
  )
}

// === Компонент чекбокса строки ===

interface RowCheckboxProps {
  id: string
  isSelected: boolean
  onToggle: (id: string) => void
  label?: string
}

export function RowCheckbox({ id, isSelected, onToggle, label }: RowCheckboxProps) {
  return (
    <Checkbox.Root
      checked={isSelected}
      onCheckedChange={() => onToggle(id)}
      aria-label={label ?? `Выбрать элемент ${id}`}
    >
      <Checkbox.HiddenInput />
      <Checkbox.Control>
        <Checkbox.Indicator>
          <Icon as={LuCheck} boxSize={3} />
        </Checkbox.Indicator>
      </Checkbox.Control>
    </Checkbox.Root>
  )
}

// === Плавающая панель действий ===

const MotionBox = motion.create(Box)

interface BulkActionBarProps<T> {
  /** Количество выбранных */
  selectedCount: number
  /** Выбранные ID */
  selectedIds: string[]
  /** Выбранные элементы */
  selectedItems: T[]
  /** Доступные действия */
  actions: BulkAction<T>[]
  /** Callback отмены выделения */
  onCancel: () => void
  /** Позиция панели */
  position?: 'bottom' | 'top'
}

export function BulkActionBar<T>({
  selectedCount,
  selectedIds,
  selectedItems,
  actions,
  onCancel,
  position = 'bottom',
}: BulkActionBarProps<T>) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  const handleAction = async (action: BulkAction<T>) => {
    setLoadingAction(action.id)
    try {
      await action.onExecute(selectedIds, selectedItems)
    } finally {
      setLoadingAction(null)
    }
  }

  const positionStyles =
    position === 'bottom'
      ? { bottom: 4, left: '50%', transform: 'translateX(-50%)' }
      : { top: 4, left: '50%', transform: 'translateX(-50%)' }

  return (
    <Portal>
      <AnimatePresence>
        {selectedCount > 0 && (
          <MotionBox
            position="fixed"
            {...positionStyles}
            zIndex={1000}
            initial={{ opacity: 0, y: position === 'bottom' ? 20 : -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: position === 'bottom' ? 20 : -20 }}
            transition={{ duration: 0.2 }}
          >
            <Flex
              bg="bg"
              borderRadius="lg"
              shadow="xl"
              borderWidth="1px"
              borderColor="border"
              px={4}
              py={3}
              gap={4}
              align="center"
            >
              {/* Счётчик */}
              <HStack gap={2}>
                <Icon as={LuSquareCheck} color="brand.500" />
                <Text fontWeight="medium">
                  Выбрано: <Badge colorPalette="brand">{selectedCount}</Badge>
                </Text>
              </HStack>

              {/* Разделитель */}
              <Box h={6} w="1px" bg="border" />

              {/* Действия */}
              <HStack gap={2}>
                {actions.map((action) => {
                  const isDisabled = action.isDisabled?.(selectedItems) ?? false
                  const isLoading = loadingAction === action.id
                  const IconComponent = action.icon

                  return (
                    <Button
                      key={action.id}
                      size="sm"
                      variant={action.variant ?? 'outline'}
                      colorPalette={action.destructive ? 'red' : action.colorPalette}
                      onClick={() => handleAction(action)}
                      disabled={isDisabled || isLoading}
                    >
                      {isLoading ? <Spinner size="sm" /> : IconComponent && <Icon as={IconComponent} />}
                      {action.label}
                    </Button>
                  )
                })}
              </HStack>

              {/* Разделитель */}
              <Box h={6} w="1px" bg="border" />

              {/* Отмена */}
              <Button size="sm" variant="ghost" onClick={onCancel}>
                <Icon as={LuX} />
                Отменить
              </Button>
            </Flex>
          </MotionBox>
        )}
      </AnimatePresence>
    </Portal>
  )
}

// === Пресеты действий ===

export const BULK_ACTION_PRESETS = {
  /** Удаление элементов */
  delete: <T,>(onDelete: (ids: string[], items: T[]) => Promise<void>): BulkAction<T> => ({
    id: 'delete',
    label: 'Удалить',
    icon: LuTrash2,
    destructive: true,
    onExecute: onDelete,
  }),

  /** Экспорт выбранных */
  export: <T,>(onExport: (ids: string[], items: T[]) => Promise<void>): BulkAction<T> => ({
    id: 'export',
    label: 'Экспорт',
    colorPalette: 'blue',
    onExecute: onExport,
  }),
}

// === Хелпер для интеграции с таблицей ===

export interface BulkSelectionTableProps<T> {
  selection: UseBulkSelectionReturn<T>
  actions: BulkAction<T>[]
  position?: 'bottom' | 'top'
}

export function BulkSelectionProvider<T>({ selection, actions, position = 'bottom' }: BulkSelectionTableProps<T>) {
  return (
    <BulkActionBar
      selectedCount={selection.selectedCount}
      selectedIds={Array.from(selection.selectedIds)}
      selectedItems={selection.selectedItems}
      actions={actions}
      onCancel={selection.deselectAll}
      position={position}
    />
  )
}
