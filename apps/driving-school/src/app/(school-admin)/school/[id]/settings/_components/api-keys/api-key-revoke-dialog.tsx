'use client'

import { Button, CloseButton, Dialog, Portal, Text } from '@chakra-ui/react'

interface ApiKeyRevokeDialogProps {
  isOpen: boolean
  onClose: () => void
  onRevoke: () => Promise<void>
  isRevoking: boolean
}

/**
 * Диалог подтверждения отзыва API-ключа
 */
export function ApiKeyRevokeDialog({ isOpen, onClose, onRevoke, isRevoking }: ApiKeyRevokeDialogProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Отозвать API-ключ?</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Text>
                После отзыва ключ перестанет работать. Все запросы с этим ключом будут отклонены. Это действие нельзя
                отменить.
              </Text>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline">Отмена</Button>
              </Dialog.ActionTrigger>
              <Button colorPalette="red" onClick={onRevoke} loading={isRevoking} loadingText="Отзыв...">
                Отозвать
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
