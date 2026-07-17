'use client'

import { Alert, Box, Button, Card, Checkbox, Field, Flex, Input, NativeSelect, Stack, Text } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useState, useTransition } from 'react'

import type { SocialProviderActionResult, SocialProviderInput } from '../../types'

const DEFAULT_ALERT_DESCRIPTION =
  'Это ваше собственное OAuth-приложение — вы несёте риск бана, домен письма верификации остаётся ' +
  'вашим. Client Secret шифруется перед сохранением (AES-256-GCM) и после сохранения не показывается — ' +
  'только последние 4 символа.'

export interface SocialProviderFormProps {
  /** Есть при редактировании, отсутствует при создании */
  id?: string
  initialValue: SocialProviderInput
  /** Маска текущего секрета (••••1234) — только для отображения, не для сабмита */
  secretHint?: string | null
  /** Список провайдеров для Select (набор отличается per-app: google/vk у одних, +yandex у других) */
  providerOptions: Array<{ value: string; label: string }>
  /** Текст предупреждения о владении/рисках (переопределяемо — напр. упоминание Yandex-колбэков) */
  alertDescription?: ReactNode
  onSubmit: (data: SocialProviderInput) => Promise<SocialProviderActionResult>
  onDelete?: (id: string) => Promise<unknown>
  /** Куда перейти после успешного сохранения/удаления */
  successHref: string
  deleteConfirmMessage?: string
}

/**
 * Форма создания/редактирования Tier2 self-service OAuth-провайдера — Select провайдера,
 * Client ID, Client Secret (пароль), чекбокс «включён» (только при редактировании), кнопки
 * сохранить/удалить. Реализована на чистом React (без `@letar/forms`) — библиотека не может
 * зависеть от app-specific `createForm()` инстанса, тот же компромисс, что и у `AuthModeRequestForm`.
 *
 * @example
 * ```tsx
 * <SocialProviderForm
 *   id={id}
 *   initialValue={{ providerId: 'google', clientId: '', enabled: true }}
 *   providerOptions={[{ value: 'google', label: 'Google' }, { value: 'vk', label: 'VK' }]}
 *   onSubmit={id ? (data) => updateSocialProvider(id, data) : createSocialProvider}
 *   onDelete={deleteSocialProvider}
 *   successHref="/admin/social-providers"
 * />
 * ```
 */
export function SocialProviderForm({
  id,
  initialValue,
  secretHint,
  providerOptions,
  alertDescription = DEFAULT_ALERT_DESCRIPTION,
  onSubmit,
  onDelete,
  successHref,
  deleteConfirmMessage = 'Удалить OAuth-провайдер? Соц-вход через него перестанет работать.',
}: SocialProviderFormProps) {
  const router = useRouter()
  const [providerId, setProviderId] = useState(initialValue.providerId)
  const [clientId, setClientId] = useState(initialValue.clientId)
  const [clientSecret, setClientSecret] = useState('')
  const [enabled, setEnabled] = useState(initialValue.enabled ?? true)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const result = await onSubmit({
        providerId,
        clientId,
        clientSecret: clientSecret || undefined,
        enabled,
      })
      if ('error' in result) {
        setError(result.error)
        return
      }
      router.push(successHref)
    })
  }

  function handleDelete() {
    if (!id || !onDelete) {
      return
    }
    if (!confirm(deleteConfirmMessage)) {
      return
    }
    startTransition(async () => {
      await onDelete(id)
      router.push(successHref)
    })
  }

  return (
    <Stack gap={6} maxW="2xl">
      <Alert.Root status="warning" variant="subtle">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Владение и риски (Tier 2)</Alert.Title>
          <Alert.Description>{alertDescription}</Alert.Description>
        </Alert.Content>
      </Alert.Root>

      <Card.Root shadow="sm">
        <Card.Body>
          <Stack gap={4}>
            <Field.Root>
              <Field.Label>Провайдер</Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field value={providerId} onChange={(e) => setProviderId(e.currentTarget.value)}>
                  {providerOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>

            <Field.Root>
              <Field.Label>Client ID</Field.Label>
              <Input
                value={clientId}
                onChange={(e) => setClientId(e.currentTarget.value)}
                placeholder="из консоли OAuth-разработчика"
                required
              />
            </Field.Root>

            <Box>
              <Field.Root>
                <Field.Label>Client Secret</Field.Label>
                <Input
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.currentTarget.value)}
                  placeholder={id ? 'оставьте пустым, чтобы не менять' : undefined}
                  required={!id}
                />
              </Field.Root>
              {secretHint && (
                <Text fontSize="xs" color="fg.muted" mt={1}>
                  Текущий секрет: {secretHint}
                </Text>
              )}
            </Box>

            {id && (
              <Checkbox.Root checked={enabled} onCheckedChange={(e) => setEnabled(!!e.checked)}>
                <Checkbox.HiddenInput />
                <Checkbox.Control />
                <Checkbox.Label>Включён</Checkbox.Label>
              </Checkbox.Root>
            )}

            {error && (
              <Text fontSize="sm" color="red.500">
                {error}
              </Text>
            )}
          </Stack>
        </Card.Body>
      </Card.Root>

      <Flex gap={3}>
        <Button colorPalette="brand" loading={isPending} onClick={handleSubmit}>
          {id ? 'Сохранить' : 'Добавить'}
        </Button>
        {id && onDelete && (
          <Button size="sm" colorPalette="red" variant="outline" onClick={handleDelete}>
            Удалить
          </Button>
        )}
      </Flex>
    </Stack>
  )
}
