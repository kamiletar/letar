'use client'

import { Button, CloseButton, Dialog, Portal, Text } from '@chakra-ui/react'

interface WebhookDeleteDialogProps {
  isOpen: boolean
  onClose: () => void
  onDelete: () => Promise<void>
  isDeleting: boolean
}

/**
 * Диалог подтверждения удаления webhook
 */
export function WebhookDeleteDialog({ isOpen, onClose, onDelete, isDeleting }: WebhookDeleteDialogProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Удалить Webhook?</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body>
              <Text>
                Вы уверены, что хотите удалить этот webhook? Все логи доставки также будут удалены. Это действие нельзя
                отменить.
              </Text>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="outline" onClick={onClose}>
                Отмена
              </Button>
              <Button colorPalette="red" onClick={onDelete} loading={isDeleting}>
                Удалить
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
