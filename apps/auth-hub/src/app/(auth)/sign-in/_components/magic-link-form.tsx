'use client'

import { sendMagicLinkAction } from '@/app/(auth)/_actions/send-magic-link.action'
import { AuthHubForm } from '@/auth-hub-form'
import { Button, Heading, Stack, Text } from '@chakra-ui/react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LuMail } from 'react-icons/lu'
import { z } from 'zod/v4'
import { usePostSignInCallback } from '../../_hooks/use-post-sign-in-callback'
import { usePasskeyConditionalAuth } from '../_hooks/use-passkey-conditional-auth'

const MagicLinkSchema = z.object({ email: z.email('Проверьте адрес почты') }).strip()
type MagicLinkData = z.infer<typeof MagicLinkSchema>

/** Вход и создание аккаунта подтверждаются одной ссылкой, пароль не требуется. */
export function MagicLinkForm(
  { initialEmail = '', onEmailChange }: { initialEmail?: string; onEmailChange?: (email: string) => void },
) {
  const callbackUrl = usePostSignInCallback()
  const searchParams = useSearchParams()
  const [sent, setSent] = useState(false)
  const [sentEmail, setSentEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [resending, setResending] = useState(false)
  const [remaining, setRemaining] = useState(0)
  usePasskeyConditionalAuth(callbackUrl)

  useEffect(() => {
    if (remaining <= 0) { return }
    const timer = setTimeout(() => setRemaining((value) => Math.max(0, value - 1)), 1000)
    return () => clearTimeout(timer)
  }, [remaining])

  async function handleSubmit(data: MagicLinkData) {
    setError(null)
    onEmailChange?.(data.email)
    const query = new URLSearchParams(searchParams.toString())
    query.delete('error')
    const errorCallbackUrl = `${window.location.origin}/sign-in${query.size ? `?${query}` : ''}`
    try {
      const result = await sendMagicLinkAction(data.email, callbackUrl, errorCallbackUrl)
      if (result.success) {
        setSentEmail(data.email)
        setSent(true)
        setRemaining(60)
      } else {
        setError(result.error ?? 'Не удалось отправить письмо. Попробуйте ещё раз.')
      }
    } catch {
      setError('Не удалось связаться с сервером. Проверьте соединение и попробуйте ещё раз.')
    }
  }

  if (sent) {
    return (
      <Stack gap={4}>
        <Stack gap={2} role="status" aria-live="polite">
          <LuMail size={28} aria-hidden="true" />
          <Heading size="md">Проверьте почту</Heading>
          <Text fontSize="sm" overflowWrap="anywhere">Мы отправили ссылку на {sentEmail}.</Text>
          <Text color="fg.muted" fontSize="sm">
            Откройте её в этом браузере, чтобы продолжить здесь. Ссылка действует 15 минут. Если вы использовали
            дополнительный адрес аккаунта, проверьте основную почту.
          </Text>
        </Stack>
        <Text color="fg.muted" fontSize="sm">Нет письма? Проверьте папку «Спам» и правильность адреса.</Text>
        {error && <Text role="alert" color="fg.error" fontSize="sm">{error}</Text>}
        <Button
          variant="outline"
          minH="48px"
          disabled={remaining > 0}
          loading={resending}
          onClick={async () => {
            setResending(true)
            try {
              await handleSubmit({ email: sentEmail })
            } finally {
              setResending(false)
            }
          }}
        >
          {remaining > 0 ? `Отправить повторно через ${remaining} с` : 'Отправить повторно'}
        </Button>
        <Button
          variant="plain"
          minH="44px"
          onClick={() => {
            setSent(false)
            setError(null)
          }}
        >
          Изменить адрес
        </Button>
      </Stack>
    )
  }

  return (
    <AuthHubForm schema={MagicLinkSchema} initialValue={{ email: initialEmail }} onSubmit={handleSubmit}>
      <Stack gap={4}>
        <AuthHubForm.Watch field="email" onChange={(value) => onEmailChange?.(String(value ?? ''))} />
        <AuthHubForm.Field.String
          name="email"
          label="Почта"
          type="email"
          inputMode="email"
          autoComplete="username webauthn"
          placeholder="you@example.com"
        />
        <Text color="fg.muted" fontSize="sm">Пришлём письмо со ссылкой. Нажмите на неё, чтобы войти без пароля.</Text>
        {error && <Text role="alert" color="fg.error" fontSize="sm">{error}</Text>}
        <AuthHubForm.Button.Submit width="full" size="lg">Получить ссылку</AuthHubForm.Button.Submit>
      </Stack>
    </AuthHubForm>
  )
}
