'use client'

import { sendMagicLinkAction } from '@/app/(auth)/_actions/send-magic-link.action'
import { Button, Field, Input, Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { LuMail } from 'react-icons/lu'
import { usePostSignInCallback } from '../../_hooks/use-post-sign-in-callback'

type FormState = 'idle' | 'loading' | 'sent' | 'error'

/**
 * Форма входа по Magic Link
 */
export function MagicLinkForm() {
  // Поддерживает OIDC flow — возвращает /oauth2/authorize?<query> если страница
  // открыта с OIDC параметрами
  const callbackUrl = usePostSignInCallback()

  const [state, setState] = useState<FormState>('idle')
  const [email, setEmail] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!email) {
      return
    }

    setState('loading')
    const result = await sendMagicLinkAction(email, callbackUrl)

    if (result.success) {
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
    <form onSubmit={handleSubmit}>
      <Stack gap={4}>
        <Field.Root>
          <Field.Label>Email</Field.Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </Field.Root>

        <Button type="submit" variant="outline" loading={state === 'loading'} w="full">
          <LuMail />
          Отправить ссылку для входа
        </Button>
      </Stack>
    </form>
  )
}
