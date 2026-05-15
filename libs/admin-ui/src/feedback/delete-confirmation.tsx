'use client'

import { Button, CloseButton, Dialog, Portal, Text } from '@chakra-ui/react'
import { type ReactNode, useState } from 'react'
import { LuTrash2 } from 'react-icons/lu'

interface DeleteConfirmationProps {
  /** Название удаляемого объекта (для отображения в сообщении) */
  itemName: string
  /** Callback при подтверждении удаления */
  onConfirm: () => Promise<void> | void
  /** Триггер (кнопка открытия) */
  children: ReactNode
}

/**
 * Модальное окно подтверждения удаления
 *
 * @example
 * ```tsx
 * <DeleteConfirmation
 *   itemName="Товар «Мандала Солнца»"
 *   onConfirm={async () => await deleteProduct(id)}
 * >
 *   <IconButton aria-label="Удалить" variant="ghost" colorPalette="red" size="sm">
 *     <LuTrash2 />
 *   </IconButton>
 * </DeleteConfirmation>
 * ```
 */
export function DeleteConfirmation({ itemName, onConfirm, children }: DeleteConfirmationProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      await onConfirm()
      setIsOpen(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog.Root lazyMount open={isOpen} onOpenChange={(e) => setIsOpen(e.open)} role="alertdialog">
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
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
                Вы уверены, что хотите удалить <strong>{itemName}</strong>?
              </Text>
              <Text color="fg.muted" fontSize="sm" mt={2}>
                Это действие нельзя отменить.
              </Text>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline" disabled={isLoading}>
                  Отмена
                </Button>
              </Dialog.ActionTrigger>
              <Button colorPalette="red" onClick={handleConfirm} loading={isLoading}>
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
  )
}
