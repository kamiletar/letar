'use client'

import { Alert, Box, Button, Checkbox, Stack, Text } from '@chakra-ui/react'
import { useState, useTransition } from 'react'

export interface AuthModeRequestResult {
  error?: string
}

export interface AuthModeRequestFormProps {
  /** Server action — фиксирует informed-consent запрос перехода на Tier 1 */
  onRequest: (acknowledgedRisks: boolean) => Promise<AuthModeRequestResult | { data: null }>
  /** Текст в алерте после успешной фиксации запроса */
  successMessage?: string
}

/**
 * Чекбокс «ознакомлен с рисками» + кнопка запроса перехода на Tier 1.
 * Внутренний блок `AuthModeSettings` — самостоятельно не экспортируется из `@letar/auth/client`.
 */
export function AuthModeRequestForm({
  onRequest,
  successMessage = 'Решение записано. Сам переход не выполняется автоматически — с вами свяжется разработчик для согласования миграции данных.',
}: AuthModeRequestFormProps) {
  const [acknowledged, setAcknowledged] = useState(false)
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleRequest() {
    startTransition(async () => {
      const result = await onRequest(acknowledged)
      if ('error' in result && result.error) {
        setStatus('error')
        setErrorMessage(result.error)
        return
      }
      setStatus('sent')
    })
  }

  if (status === 'sent') {
    return (
      <Alert.Root status="success" variant="subtle">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Запрос зафиксирован</Alert.Title>
          <Alert.Description>{successMessage}</Alert.Description>
        </Alert.Content>
      </Alert.Root>
    )
  }

  return (
    <Stack gap={3}>
      <Checkbox.Root checked={acknowledged} onCheckedChange={(e) => setAcknowledged(!!e.checked)}>
        <Checkbox.HiddenInput />
        <Checkbox.Control />
        <Checkbox.Label fontSize="sm">
          Я ознакомлен(а) с рисками и хочу перейти на авторизацию через letar.best
        </Checkbox.Label>
      </Checkbox.Root>

      {status === 'error' && (
        <Text fontSize="sm" color="red.500">
          {errorMessage}
        </Text>
      )}

      <Box>
        <Button
          size="sm"
          colorPalette="orange"
          variant="outline"
          disabled={!acknowledged}
          loading={isPending}
          onClick={handleRequest}
        >
          Запросить переход на Tier 1
        </Button>
      </Box>
    </Stack>
  )
}
