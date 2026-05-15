'use client'

import { Button, Dialog, Flex, Portal, Text } from '@chakra-ui/react'
import { useState } from 'react'

interface DeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Название сущности для отображения */
  entityName: string
  /** Callback удаления */
  onDelete: () => Promise<void>
}

/**
 * Диалог подтверждения удаления
 */
export function DeleteDialog({ open, onOpenChange, entityName, onDelete }: DeleteDialogProps) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    try {
      await onDelete()
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(e) => onOpenChange(e.open)}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Удалить {entityName}?</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Text color="fg.muted">Это действие нельзя отменить. {entityName} будет удалён навсегда.</Text>
            </Dialog.Body>
            <Dialog.Footer>
              <Flex gap={3}>
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                  Отмена
                </Button>
                <Button colorPalette="red" onClick={handleDelete} loading={loading}>
                  Удалить
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
