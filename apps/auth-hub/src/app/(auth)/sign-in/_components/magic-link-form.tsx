'use client'

import { sendMagicLinkAction } from '@/app/(auth)/_actions/send-magic-link.action'
import { AuthHubForm } from '@/auth-hub-form'
import { Button, Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { LuMail } from 'react-icons/lu'
import { z } from 'zod/v4'
import { usePostSignInCallback } from '../../_hooks/use-post-sign-in-callback'

const MagicLinkSchema = z.object({ email: z.email('Некорректный email') }).strip()

type MagicLinkData = z.infer<typeof MagicLinkSchema>

type FormState = 'idle' | 'sent' | 'error'

/**
 * Форма входа по Magic Link
 */
export function MagicLinkForm() {
  // Поддерживает OIDC flow — возвращает /oauth2/authorize?<query> если страница
  // открыта с OIDC параметрами
  const callbackUrl = usePostSignInCallback()

  const [state, setState] = useState<FormState>('idle')
  const [email, setEmail] = useState('')

  async function handleSubmit(data: MagicLinkData) {
    const result = await sendMagicLinkAction(data.email, callbackUrl)

    if (result.success) {
      setEmail(data.email)
      setState('sent')
    } else {
      setState('error')
    }
  }

  if (state === 'sent') {
    return (
      <Stack gap={3} textAlign="center" p={4}>
        <LuMail size={32} style={{ margin: '0 auto' }} />
        <Text fontWeight="bold">Ссылка отправлена!</Text>
        <Text color="fg.muted" fontSize="sm">
          Проверьте почту {email}
        </Text>
        <Button variant="ghost" size="sm" onClick={() => setState('idle')}>
          Отправить ещё раз
        </Button>
      </Stack>
    )
  }

  return (
    <AuthHubForm schema={MagicLinkSchema} initialValue={{ email: '' }} onSubmit={handleSubmit}>
      <Stack gap={4}>
        <AuthHubForm.Field.String name="email" label="Email" placeholder="you@example.com" />

        {state === 'error' && (
          <Text color="fg.error" fontSize="sm">
            Не удалось отправить ссылку. Попробуйте ещё раз.
          </Text>
        )}

        <AuthHubForm.Button.Submit variant="outline" width="full">
          <LuMail />
          Отправить ссылку для входа
        </AuthHubForm.Button.Submit>
      </Stack>
    </AuthHubForm>
  )
}
