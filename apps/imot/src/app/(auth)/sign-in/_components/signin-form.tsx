/* oxlint-disable no-array-index-key */
'use client'

import { type SignInFormData, SignInSchema } from '@/app/_schemas/email-auth.schema'
import { signIn } from '@/lib/auth-client'
import { Button, Field, Input, Text, VStack } from '@chakra-ui/react'
import { PasswordInput } from '@letar/ui'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function SignInForm() {
  const router = useRouter()
  const [formData, setFormData] = useState<SignInFormData>({
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [showResendVerification, setShowResendVerification] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setErrorMessage('')
    setShowResendVerification(false)
    setResendSuccess(false)
    setIsLoading(true)

    // Клиентская валидация
    const result = SignInSchema.safeParse(formData)

    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.issues.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message
        }
      })
      setErrors(fieldErrors)
      setIsLoading(false)
      return
    }

    // Вход через Better Auth
    try {
      const { error } = await signIn.email({
        email: formData.email,
        password: formData.password,
        callbackURL: '/dashboard',
      })

      if (error) {
        // Обработка ошибки от Better Auth
        if (error.message?.includes('not verified')) {
          setErrorMessage('Пожалуйста, подтвердите ваш email адрес перед входом')
          setShowResendVerification(true)
        } else if (error.message?.includes('rate limit')) {
          setErrorMessage('Слишком много неудачных попыток входа. Аккаунт временно заблокирован. Попробуйте позже.')
        } else if (error.message?.includes('credentials') || error.message?.includes('Invalid')) {
          setErrorMessage('Неверный email или пароль')
        } else {
          setErrorMessage(error.message || 'Ошибка входа')
        }
        setIsLoading(false)
        return
      }

      // Успешный вход - редирект на dashboard
      void router.push('/dashboard')
      router.refresh()
    } catch {
      setErrorMessage('Не удалось выполнить вход. Попробуйте позже.')
      setIsLoading(false)
    }
  }

  const handleResendVerification = async () => {
    setResendLoading(true)
    setResendSuccess(false)

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setErrorMessage(data.error || 'Не удалось отправить письмо')
        setResendLoading(false)
        return
      }

      setResendSuccess(true)
      setErrorMessage('')
    } catch {
      setErrorMessage('Не удалось отправить письмо. Попробуйте позже.')
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <VStack gap={4} align="stretch">
        {errorMessage && (
          <VStack gap={2} align="stretch">
            <Text color="red.500" fontSize="sm">
              {errorMessage}
            </Text>
            {showResendVerification && !resendSuccess && (
              <Button
                size="sm"
                variant="outline"
                colorPalette="purple"
                onClick={handleResendVerification}
                loading={resendLoading}
              >
                Отправить письмо повторно
              </Button>
            )}
          </VStack>
        )}
        {resendSuccess && (
          <Text color="green.500" fontSize="sm">
            Письмо отправлено! Проверьте вашу почту.
          </Text>
        )}

        <Field.Root invalid={!!errors.email}>
          <Field.Label>Email</Field.Label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            disabled={isLoading}
            placeholder="your@email.com"
          />
          {errors.email && <Field.ErrorText>{errors.email}</Field.ErrorText>}
        </Field.Root>

        <Field.Root invalid={!!errors.password}>
          <Field.Label>Пароль</Field.Label>
          <PasswordInput
            value={formData.password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData({ ...formData, password: e.target.value })
            }
            disabled={isLoading}
            placeholder="Ваш пароль"
          />
          {errors.password && <Field.ErrorText>{errors.password}</Field.ErrorText>}
        </Field.Root>

        <Text textAlign="right" fontSize="sm">
          <Link href="/forgot-password" style={{ color: '#9F7AEA' }}>
            Забыли пароль?
          </Link>
        </Text>

        <Button type="submit" colorPalette="purple" loading={isLoading}>
          Войти
        </Button>

        <Text textAlign="center" fontSize="sm" color="fg.muted">
          Нет аккаунта?{' '}
          <Link href="/sign-up" style={{ color: '#9F7AEA' }}>
            Зарегистрироваться
          </Link>
        </Text>
      </VStack>
    </form>
  )
}
