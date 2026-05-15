'use client'

/**
 * Диалог подтверждения удаления игрока из состава.
 * Используется в админке и кабинете тренера.
 */

import { Button, Dialog, Flex, Portal, Text } from '@chakra-ui/react'

interface RemovePlayerDialogProps {
  playerName: string
  open: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  loading?: boolean
}

export function RemovePlayerDialog({ playerName, open, onClose, onConfirm, loading }: RemovePlayerDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(e) => !e.open && onClose()}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Убрать {playerName}?</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Text color="fg.muted">Игрок будет убран из активного состава.</Text>
            </Dialog.Body>
            <Dialog.Footer>
              <Flex gap={3}>
                <Button variant="outline" onClick={onClose} disabled={loading}>
                  Отмена
                </Button>
                <Button colorPalette="red" onClick={onConfirm} loading={loading}>
                  Убрать
                </Button>
              </Flex>
            </Dialog.Footer>
            <Dialog.CloseTrigger />
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
