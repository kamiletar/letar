'use client'

import { Box, Field, HStack, IconButton, Textarea } from '@chakra-ui/react'
import { useEffect, useRef, useState, useTransition } from 'react'
import { LuPaperclip, LuSend, LuX } from 'react-icons/lu'

import { sendMessageAction } from '../_actions/chat.action'

interface SendMessageFormProps {
  chatId: string
  replyTo?: {
    id: string
    content: string
    authorName: string
  } | null
  onCancelReply?: () => void
  onEditLastMessage?: () => void
  // WebSocket callbacks (опционально)
  onSendMessage?: (content: string, replyToId?: string) => void
  onTyping?: () => void
  onStopTyping?: () => void
}

export function SendMessageForm({
  chatId,
  replyTo,
  onCancelReply,
  onEditLastMessage,
  onSendMessage,
  onTyping,
  onStopTyping,
}: SendMessageFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Фокус на textarea при ответе
  useEffect(() => {
    if (replyTo) {
      textareaRef.current?.focus()
    }
  }, [replyTo])

  // Отправка сообщения через server action
  const submitMessage = async (content: string, replyToId?: string) => {
    setError(null)
    startTransition(async () => {
      const result = await sendMessageAction({
        chatId,
        content,
        replyToId,
      })

      if (result.success) {
        formRef.current?.reset()
        onCancelReply?.()
      } else {
        setError(result.error)
      }
    })
  }

  // Обработка Enter (отправка), Shift+Enter (новая строка), ArrowUp (редактировать последнее)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const content = e.currentTarget.value.trim()
      if (!content) {
        return
      }

      // Если используем WebSocket, отправляем через него
      if (onSendMessage) {
        onSendMessage(content, replyTo?.id)
        e.currentTarget.value = ''
        onCancelReply?.()
        onStopTyping?.()
      } else {
        submitMessage(content, replyTo?.id)
      }
    }
    // Клавиша вверх в пустом поле — редактировать последнее сообщение
    if (e.key === 'ArrowUp' && onEditLastMessage) {
      const textarea = e.currentTarget
      // Проверяем что поле пустое и курсор в начале
      if (textarea.value.trim() === '' && textarea.selectionStart === 0) {
        e.preventDefault()
        onEditLastMessage()
      }
    }
  }

  // Обработка отправки формы
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const content = (formData.get('content') as string)?.trim()

    if (!content) {
      return
    }

    // Если есть WebSocket callback, используем его вместо server action
    if (onSendMessage) {
      onSendMessage(content, replyTo?.id)
      e.currentTarget.reset()
      onCancelReply?.()
      onStopTyping?.()
    } else {
      submitMessage(content, replyTo?.id)
    }
  }

  return (
    <Box borderTopWidth={1} p={4}>
      {/* Цитата при ответе */}
      {replyTo && (
        <HStack
          bg="bg.subtle"
          p={2}
          mb={2}
          borderRadius="md"
          borderLeftWidth={2}
          borderLeftColor="colorPalette.solid"
          colorPalette="brand"
        >
          <Box flex={1}>
            <Box fontSize="xs" fontWeight="medium" color="colorPalette.fg">
              Ответ на сообщение {replyTo.authorName}
            </Box>
            <Box fontSize="sm" color="fg.muted" truncate>
              {replyTo.content}
            </Box>
          </Box>
          <IconButton aria-label="Отменить ответ" size="xs" variant="ghost" onClick={onCancelReply}>
            <LuX />
          </IconButton>
        </HStack>
      )}

      <form ref={formRef} onSubmit={handleSubmit} noValidate>
        <HStack gap={2} align="end">
          {/* Прикрепление файлов (заглушка) */}
          <IconButton aria-label="Прикрепить файл" variant="ghost" disabled title="Скоро будет доступно">
            <LuPaperclip />
          </IconButton>

          {/* Поле ввода */}
          <Field.Root flex={1} invalid={!!error}>
            <Textarea
              ref={textareaRef}
              name="content"
              defaultValue=""
              placeholder="Написать сообщение..."
              resize="none"
              rows={1}
              minH="40px"
              maxH="120px"
              onKeyDown={handleKeyDown}
              disabled={isPending}
              onChange={onTyping}
              css={{
                '&::-webkit-scrollbar': {
                  width: '6px',
                },
                '&::-webkit-scrollbar-thumb': {
                  borderRadius: '3px',
                  backgroundColor: 'var(--chakra-colors-bg-emphasized)',
                },
              }}
            />
            {error && <Field.ErrorText>{error}</Field.ErrorText>}
          </Field.Root>

          {/* Кнопка отправки */}
          <IconButton type="submit" aria-label="Отправить" colorPalette="brand" loading={isPending}>
            <LuSend />
          </IconButton>
        </HStack>
      </form>
    </Box>
  )
}
