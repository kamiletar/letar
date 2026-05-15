'use client'

import { Button, CloseButton, Dialog, Field, Portal, Textarea } from '@chakra-ui/react'
import { useEffect, useRef, useState } from 'react'

interface EditMessageDialogProps {
  isOpen: boolean
  onClose: () => void
  message: {
    id: string
    content: string
  } | null
  onSave: (messageId: string, newContent: string) => void
  isPending?: boolean
}

export function EditMessageDialog({ isOpen, onClose, message, onSave, isPending }: EditMessageDialogProps) {
  const [content, setContent] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Синхронизация контента при открытии
  useEffect(() => {
    if (isOpen && message) {
      setContent(message.content)
      // Фокус на textarea после рендера
      setTimeout(() => {
        textareaRef.current?.focus()
        textareaRef.current?.select()
      }, 50)
    }
  }, [isOpen, message])

  const handleSave = () => {
    if (message && content.trim() && content !== message.content) {
      onSave(message.id, content.trim())
    }
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Сохранить по Ctrl+Enter или Cmd+Enter
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSave()
    }
    // Отмена по Escape
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  const isChanged = content.trim() !== message?.content
  const isValid = content.trim().length > 0

  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()} size={{ base: 'full', md: 'md' }}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Редактировать сообщение</Dialog.Title>
            </Dialog.Header>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>

            <Dialog.Body>
              <Field.Root>
                <Textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Введите сообщение..."
                  rows={4}
                  resize="vertical"
                  disabled={isPending}
                />
                <Field.HelperText>Ctrl+Enter — сохранить, Escape — отменить</Field.HelperText>
              </Field.Root>
            </Dialog.Body>

            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline" disabled={isPending}>
                  Отмена
                </Button>
              </Dialog.ActionTrigger>
              <Button colorPalette="brand" onClick={handleSave} loading={isPending} disabled={!isValid || !isChanged}>
                Сохранить
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
