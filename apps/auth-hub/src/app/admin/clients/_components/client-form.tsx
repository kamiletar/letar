'use client'

import { Button, Card, Checkbox, Field, HStack, Input, NativeSelect, Stack, Text, Textarea } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import type { ClientActionError } from '../_actions/client.action'

interface ClientFormValues {
  name: string
  clientId?: string
  redirectUrls: string
  type: 'web' | 'native' | 'spa'
  skipConsent: boolean
  disabled?: boolean
}

interface ClientFormProps {
  mode: 'create' | 'edit'
  defaultValues?: ClientFormValues
  lockedClientId?: string
  /** Server action для submit — принимает FormData */
  onSubmit: (formData: FormData) => Promise<{ error: ClientActionError } | unknown>
  /** URL для перехода после успешного сохранения */
  successRedirect?: string
}

/** Форма создания/редактирования OIDC-клиента */
export function ClientForm({ mode, defaultValues, lockedClientId, onSubmit, successRedirect }: ClientFormProps) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [error, setError] = useState<ClientActionError | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)

    // Checkbox не попадает в FormData если не отмечен — явно выставляем false
    if (!formData.has('skipConsent')) {
      formData.set('skipConsent', 'false')
    }
    if (mode === 'edit' && !formData.has('disabled')) {
      formData.set('disabled', 'false')
    }

    startTransition(async () => {
      const result = await onSubmit(formData)
      if (result && typeof result === 'object' && 'error' in result) {
        setError((result as { error: ClientActionError }).error)
        return
      }
      if (successRedirect) {
        router.push(successRedirect)
      }
    })
  }

  return (
    <Card.Root>
      <Card.Body>
        <form ref={formRef} onSubmit={handleSubmit}>
          <Stack gap={5}>
            {error && (
              <Text color="red.500" fontSize="sm">
                {error.message}
              </Text>
            )}

            <Field.Root required invalid={!!error?.fields?.name}>
              <Field.Label>Название приложения</Field.Label>
              <Input
                name="name"
                placeholder="Например: Archtest"
                defaultValue={defaultValues?.name}
                autoComplete="off"
              />
              {error?.fields?.name && <Field.ErrorText>{error.fields.name[0]}</Field.ErrorText>}
            </Field.Root>

            {mode === 'create' && (
              <Field.Root required invalid={!!error?.fields?.clientId}>
                <Field.Label>Client ID</Field.Label>
                <Input
                  name="clientId"
                  placeholder="archetest-prod"
                  pattern="[a-z0-9-]+"
                  title="Только строчные буквы, цифры и дефис"
                  defaultValue={defaultValues?.clientId}
                  autoComplete="off"
                />
                <Field.HelperText>Уникальный идентификатор. Нельзя изменить после создания.</Field.HelperText>
                {error?.fields?.clientId && <Field.ErrorText>{error.fields.clientId[0]}</Field.ErrorText>}
              </Field.Root>
            )}

            {mode === 'edit' && lockedClientId && (
              <Field.Root>
                <Field.Label>Client ID</Field.Label>
                <Input value={lockedClientId} disabled />
                <Field.HelperText>Client ID нельзя изменить после создания.</Field.HelperText>
              </Field.Root>
            )}

            <Field.Root required invalid={!!error?.fields?.redirectUrls}>
              <Field.Label>Redirect URLs</Field.Label>
              <Textarea
                name="redirectUrls"
                placeholder={'https://app.example.com/api/auth/callback/letar-auth\nhttps://app.example.com/sign-in'}
                rows={4}
                defaultValue={defaultValues?.redirectUrls?.replace(/,/g, '\n')}
                fontFamily="mono"
                fontSize="sm"
              />
              <Field.HelperText>По одному URL на строку.</Field.HelperText>
              {error?.fields?.redirectUrls && <Field.ErrorText>{error.fields.redirectUrls[0]}</Field.ErrorText>}
            </Field.Root>

            <Field.Root>
              <Field.Label>Тип клиента</Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field name="type" defaultValue={defaultValues?.type ?? 'web'}>
                  <option value="web">Web (confidential)</option>
                  <option value="spa">SPA (public)</option>
                  <option value="native">Native</option>
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>

            <Field.Root>
              <Checkbox.Root name="skipConsent" value="true" defaultChecked={defaultValues?.skipConsent}>
                <Checkbox.HiddenInput />
                <Checkbox.Control />
                <Checkbox.Label>Пропустить экран consent</Checkbox.Label>
              </Checkbox.Root>
              <Field.HelperText>
                <Text fontSize="xs" color="fg.muted">
                  Работает только через trustedClients в конфиге Ключницы (Better Auth v1.6.11 игнорирует это поле из
                  БД).
                </Text>
              </Field.HelperText>
            </Field.Root>

            {mode === 'edit' && (
              <Field.Root>
                <Checkbox.Root name="disabled" value="true" defaultChecked={defaultValues?.disabled}>
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                  <Checkbox.Label>Клиент отключён</Checkbox.Label>
                </Checkbox.Root>
              </Field.Root>
            )}

            <HStack gap={3} pt={2}>
              <Button type="submit" colorPalette="blue" loading={isPending}>
                {mode === 'create' ? 'Создать клиент' : 'Сохранить'}
              </Button>
              <Button variant="ghost" onClick={() => router.back()} disabled={isPending}>
                Отмена
              </Button>
            </HStack>
          </Stack>
        </form>
      </Card.Body>
    </Card.Root>
  )
}
