'use client'

import { Alert, Card, Heading, Stack } from '@chakra-ui/react'
import { useState } from 'react'
import { z } from 'zod/v4'

import { AuthHubForm } from '@/auth-hub-form'
import { requestAddEmail } from '../_actions/emails.action'

const AddEmailSchema = z.object({ email: z.email().meta({ ui: { title: 'Новый email' } }) }).strip()

type AddEmailFormData = z.infer<typeof AddEmailSchema>

export function AddEmailForm() {
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(data: AddEmailFormData) {
    setError(null)
    const result = await requestAddEmail(data)
    if ('error' in result && result.error) {
      setError(result.error)
      return
    }
    setSentTo(data.email)
  }

  if (sentTo) {
    return (
      <Alert.Root status="success" variant="subtle">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Письмо отправлено</Alert.Title>
          <Alert.Description>
            Перейдите по ссылке в письме на {sentTo}, чтобы подтвердить адрес. Ссылка действует 24 часа.
          </Alert.Description>
        </Alert.Content>
      </Alert.Root>
    )
  }

  return (
    <Card.Root>
      <Card.Body>
        <Stack gap={4}>
          <Heading size="sm">Добавить email</Heading>

          {error && (
            <Alert.Root status="error" variant="subtle">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>{error}</Alert.Description>
              </Alert.Content>
            </Alert.Root>
          )}

          <AuthHubForm schema={AddEmailSchema} initialValue={{ email: '' }} onSubmit={handleSubmit}>
            <AuthHubForm.Field.String name="email" />
            <AuthHubForm.Button.Submit>Отправить подтверждение</AuthHubForm.Button.Submit>
          </AuthHubForm>
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}
