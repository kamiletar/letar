'use client'

import { ConfirmDialog } from '@letar/ui'

interface DeleteMessageDialogProps {
  isOpen: boolean
  onClose: () => void
  messageId: string | null
  onConfirm: (messageId: string) => void
  isPending?: boolean
}

export function DeleteMessageDialog({ isOpen, onClose, messageId, onConfirm, isPending }: DeleteMessageDialogProps) {
  const handleConfirm = () => {
    if (messageId) {
      onConfirm(messageId)
    }
  }

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      title="Удалить сообщение?"
      description="Это действие нельзя отменить. Сообщение будет удалено для всех участников чата."
      confirmText="Удалить"
      colorPalette="red"
      isPending={isPending}
    />
  )
}
