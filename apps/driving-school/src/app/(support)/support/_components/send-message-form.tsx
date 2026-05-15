'use client'

import { Box, Button, Field, HStack, Text, Textarea } from '@chakra-ui/react'
import { useRef, useState, useTransition } from 'react'
import { LuSend } from 'react-icons/lu'

import { sendSupportMessageAction } from '../_actions/support.action'

interface SendMessageFormProps {
  ticketId: string
  disabled?: boolean
}

export function SendMessageForm({ ticketId, disabled }: SendMessageFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const content = (formData.get('content') as string)?.trim()

    if (!content) {
      setError('Введите сообщение')
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await sendSupportMessageAction({ ticketId, content })

      if (result.success) {
        formRef.current?.reset()
      } else {
        setError(result.error)
      }
    })
  }

  if (disabled) {
    return (
      <Box bg="bg.muted" p={4} borderRadius="md" textAlign="center">
        <Text color="fg.muted">Обращение закрыто. Отправка сообщений невозможна.</Text>
      </Box>
    )
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate>
      {/* Ошибки формы */}
      {error && (
        <Box bg="red.subtle" p={3} borderRadius="md" mb={3}>
          <Text color="red.fg" fontSize="sm">
            {error}
          </Text>
        </Box>
      )}

      <HStack gap={3} align="end">
        <Field.Root flex={1} invalid={!!error}>
          <Textarea name="content" defaultValue="" placeholder="Напишите сообщение..." rows={2} resize="none" />
        </Field.Root>

        <Button type="submit" colorPalette="brand" loading={isPending} loadingText="" aria-label="Отправить">
          <LuSend />
        </Button>
      </HStack>
    </form>
  )
}
