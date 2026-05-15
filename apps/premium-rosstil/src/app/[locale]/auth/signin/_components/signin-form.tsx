'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Link, useRouter } from '@/i18n/navigation'
import { authClient } from '@/lib/auth-client'
import { PremiumRosstilForm } from '@/premium-rosstil-form'
import { Button, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { type SignInFormData, SignInSchema } from '../../_schemas/email-auth.schema'

interface ResendState {
  show: boolean
  email: string
  loading: boolean
  success: boolean
}

const INITIAL_RESEND: ResendState = { show: false, email: '', loading: false, success: false }

export function SignInForm() {
  const router = useRouter()
  const [resend, setResend] = useState<ResendState>(INITIAL_RESEND)

  const handleSubmit = async (data: SignInFormData) => {
    setResend(INITIAL_RESEND)

    const response = await authClient.signIn.email({
      email: data.email,
      password: data.password,
    })

    if (response.error) {
      const code = response.error.code

      if (code === 'EMAIL_NOT_VERIFIED') {
        setResend({ show: true, email: data.email, loading: false, success: false })
        toaster.error({ title: 'Пожалуйста, подтвердите ваш email адрес перед входом' })
        return
      }
      if (code === 'TOO_MANY_REQUESTS') {
        toaster.error({ title: 'Слишком много неудачных попыток входа. Попробуйте позже.' })
        return
      }
      if (code === 'INVALID_EMAIL_OR_PASSWORD') {
        toaster.error({ title: 'Неверный email или пароль' })
        return
      }
      toaster.error({ title: response.error.message || 'Не удалось выполнить вход' })
      return
    }

    // Успешный вход — редирект на главную
    router.push('/')
    router.refresh()
  }

  const handleResendVerification = async () => {
    setResend((prev) => ({ ...prev, loading: true }))

    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resend.email }),
      })

      if (!res.ok) {
        const data = await res.json()
        toaster.error({ title: data.error || 'Не удалось отправить письмо' })
        setResend((prev) => ({ ...prev, loading: false }))
        return
      }

      setResend((prev) => ({ ...prev, loading: false, success: true }))
      toaster.success({ title: 'Письмо отправлено! Проверьте вашу почту.' })
    } catch {
      toaster.error({ title: 'Не удалось отправить письмо. Попробуйте позже.' })
      setResend((prev) => ({ ...prev, loading: false }))
    }
  }

  return (
    <PremiumRosstilForm initialValue={{ email: '', password: '' }} schema={SignInSchema} onSubmit={handleSubmit}>
      <VStack align="stretch" gap={4}>
        <PremiumRosstilForm.Errors />

        {resend.show && !resend.success && (
          <Button
            size="sm"
            variant="outline"
            colorPalette="fg"
            onClick={handleResendVerification}
            loading={resend.loading}
          >
            Отправить письмо подтверждения повторно
          </Button>
        )}

        <PremiumRosstilForm.Field.String
          name="email"
          label="Email"
          type="email"
          placeholder="your@email.com"
          required
        />

        <PremiumRosstilForm.Field.Password name="password" label="Пароль" placeholder="Ваш пароль" required />

        <Text textAlign="right" fontSize="sm">
          <Link href="/auth/forgot-password" style={{ color: '#CA9E67' }}>
            Забыли пароль?
          </Link>
        </Text>

        <PremiumRosstilForm.Button.Submit colorPalette="fg">Войти</PremiumRosstilForm.Button.Submit>

        <Text textAlign="center" fontSize="sm" color="gray.600">
          Нет аккаунта?{' '}
          <Link href="/auth/register" style={{ color: '#CA9E67' }}>
            Зарегистрироваться
          </Link>
        </Text>
      </VStack>
    </PremiumRosstilForm>
  )
}
