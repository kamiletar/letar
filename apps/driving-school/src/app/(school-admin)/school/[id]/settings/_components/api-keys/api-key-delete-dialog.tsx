'use client'

import { Button, CloseButton, Dialog, Portal, Text } from '@chakra-ui/react'

interface ApiKeyDeleteDialogProps {
  isOpen: boolean
  onClose: () => void
  onDelete: () => Promise<void>
  isDeleting: boolean
}

/**
 * Диалог подтверждения удаления API-ключа
 */
export function ApiKeyDeleteDialog({ isOpen, onClose, onDelete, isDeleting }: ApiKeyDeleteDialogProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Удалить API-ключ?</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Text>Ключ будет полностью удалён из системы. Это действие нельзя отменить.</Text>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline">Отмена</Button>
              </Dialog.ActionTrigger>
              <Button colorPalette="red" onClick={onDelete} loading={isDeleting} loadingText="Удаление...">
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
