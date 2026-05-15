'use client'

import { Box, Button, CloseButton, Dialog, HStack, Portal, Text } from '@chakra-ui/react'
import { useState, useTransition } from 'react'
import { LuCheck, LuEyeOff, LuTrash2, LuX } from 'react-icons/lu'
import type { BulkAction } from '../types'

interface BulkActionsBarProps {
  /** Количество выбранных элементов */
  selectedCount: number
  /** Массив выбранных ID */
  selectedIds: string[]
  /** Доступные действия */
  actions: BulkAction[]
  /** Callback для очистки выбора */
  onClear: () => void
  /** Цветовая палитра (по умолчанию 'purple') */
  colorPalette?: string
}

/**
 * Панель массовых действий над выбранными элементами
 *
 * Появляется когда выбран хотя бы один элемент.
 * Для действий с `requiresConfirmation: true` показывает диалог подтверждения.
 *
 * @example
 * ```tsx
 * <BulkActionsBar
 *   selectedCount={selection.selectedCount}
 *   selectedIds={selection.selectedArray}
 *   onClear={selection.clear}
 *   actions={[
 *     commonBulkActions.publish((ids) => handleBulkAction(() => bulkPublish(ids))),
 *     commonBulkActions.delete((ids) => handleBulkAction(() => bulkDelete(ids))),
 *   ]}
 * />
 * ```
 */
export function BulkActionsBar({
  selectedCount,
  selectedIds,
  actions,
  onClear,
  colorPalette = 'purple',
}: BulkActionsBarProps) {
  const [isPending, startTransition] = useTransition()
  const [confirmAction, setConfirmAction] = useState<BulkAction | null>(null)

  if (selectedCount === 0) {
    return null
  }

  const handleAction = (action: BulkAction) => {
    // Если требуется подтверждение — открываем диалог
    if (action.requiresConfirmation) {
      setConfirmAction(action)
      return
    }

    // Иначе выполняем сразу
    executeAction(action)
  }

  const executeAction = (action: BulkAction) => {
    startTransition(async () => {
      const executor = action.onClick || action.onExecute
      if (executor) {
        await executor(selectedIds)
      }
      onClear()
    })
  }

  const handleConfirmDelete = () => {
    if (confirmAction) {
      executeAction(confirmAction)
      setConfirmAction(null)
    }
  }

  return (
    <>
      <Box
        position="sticky"
        bottom={4}
        bg={`${colorPalette}.900`}
        borderRadius="lg"
        px={4}
        py={3}
        shadow="lg"
        borderWidth="1px"
        borderColor={`${colorPalette}.700`}
      >
        <HStack justify="space-between" flexWrap="wrap" gap={3}>
          <HStack gap={3}>
            <Text fontWeight="medium" color={`${colorPalette}.100`}>
              Выбрано: {selectedCount}
            </Text>
            <Button variant="ghost" size="sm" colorPalette="gray" onClick={onClear} disabled={isPending}>
              <LuX />
              Отменить
            </Button>
          </HStack>

          <HStack gap={2}>
            {actions.map((action) => (
              <Button
                key={action.key}
                size="sm"
                colorPalette={action.colorPalette || colorPalette}
                onClick={() => handleAction(action)}
                disabled={isPending}
                loading={isPending}
              >
                {action.icon}
                {action.label}
              </Button>
            ))}
          </HStack>
        </HStack>
      </Box>

      {/* Диалог подтверждения удаления */}
      <Dialog.Root
        lazyMount
        open={confirmAction !== null}
        onOpenChange={(e) => {
          if (!e.open) {
            setConfirmAction(null)
          }
        }}
        role="alertdialog"
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title display="flex" alignItems="center" gap={2}>
                  <LuTrash2 />
                  Подтверждение удаления
                </Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Text>
                  Вы уверены, что хотите удалить <strong>{selectedCount}</strong> элемент(ов)?
                </Text>
                <Text color="fg.muted" fontSize="sm" mt={2}>
                  Это действие нельзя отменить.
                </Text>
              </Dialog.Body>
              <Dialog.Footer>
                <Button variant="outline" onClick={() => setConfirmAction(null)} disabled={isPending}>
                  Отмена
                </Button>
                <Button colorPalette="red" onClick={handleConfirmDelete} loading={isPending}>
                  <LuTrash2 />
                  Удалить
                </Button>
              </Dialog.Footer>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </>
  )
}

/** Предустановленные действия */
export const commonBulkActions = {
  publish: (onClick: (ids: string[]) => Promise<void>): BulkAction => ({
    key: 'publish',
    label: 'Опубликовать',
    icon: <LuCheck />,
    colorPalette: 'green',
    onClick,
  }),

  unpublish: (onClick: (ids: string[]) => Promise<void>): BulkAction => ({
    key: 'unpublish',
    label: 'Скрыть',
    icon: <LuEyeOff />,
    colorPalette: 'gray',
    onClick,
  }),

  delete: (onClick: (ids: string[]) => Promise<void>): BulkAction => ({
    key: 'delete',
    label: 'Удалить',
    icon: <LuTrash2 />,
    colorPalette: 'red',
    onClick,
    requiresConfirmation: true,
  }),
}
