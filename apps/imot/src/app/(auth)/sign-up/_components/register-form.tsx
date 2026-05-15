'use client'

import { type RegisterFormInput, RegisterSchema } from '@/app/_schemas/email-auth.schema'
import { signUp } from '@/lib/auth-client'
import { Button, Field, Input, Text, VStack } from '@chakra-ui/react'
import { PasswordInput, PasswordStrengthMeter } from '@letar/ui'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

export function RegisterForm() {
  const router = useRouter()
  const [formData, setFormData] = useState<RegisterFormInput>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Расчет силы пароля
  const passwordStrength = useMemo(() => {
    const pwd = formData.password
    if (!pwd) {
      return 0
    }
    if (pwd.length < 8) {
      return 1
    }

    let strength = 2 // >= 8 символов
    const hasLower = /[a-z]/.test(pwd)
    const hasUpper = /[A-Z]/.test(pwd)
    const hasDigit = /\d/.test(pwd)
    const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd)

    if (hasLower && hasUpper && hasDigit) {
      strength = 3
    }
    if (hasLower && hasUpper && hasDigit && hasSpecial && pwd.length >= 12) {
      strength = 4
    }

    return strength
  }, [formData.password])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setErrorMessage('')
    setSuccessMessage('')
    setIsLoading(true)

    // Клиентская валидация
    const result = RegisterSchema.safeParse(formData)

    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.issues.forEach((issue) => {
        const key = issue.path[0]
        if (key !== undefined) {
          fieldErrors[String(key)] = issue.message
        }
      })
      setErrors(fieldErrors)
      setIsLoading(false)
      return
    }

    // Регистрация через Better Auth
    try {
      const { error } = await signUp.email({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        callbackURL: '/dashboard',
      })

      if (error) {
        if (error.message?.includes('unique') || error.message?.includes('already exists')) {
          setErrorMessage('Пользователь с таким email уже существует')
        } else {
          setErrorMessage(error.message || 'Ошибка регистрации')
        }
        setIsLoading(false)
        return
      }

      setSuccessMessage('Регистрация успешна! Перенаправление...')

      // Редирект на dashboard
      setTimeout(() => {
        void router.push('/dashboard')
        router.refresh()
      }, 1000)
    } catch (registrationError) {
      console.error('Registration error:', registrationError)
      setErrorMessage('Не удалось выполнить регистрацию. Попробуйте позже.')
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <VStack gap={4} align="stretch">
        {errorMessage && (
          <Text color="red.500" fontSize="sm">
            {errorMessage}
          </Text>
        )}
        {successMessage && (
          <Text color="green.500" fontSize="sm">
            {successMessage}
          </Text>
        )}

        <Field.Root invalid={!!errors.name}>
          <Field.Label>Имя</Field.Label>
          <Input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            disabled={isLoading}
            placeholder="Ваше имя"
          />
          {errors.name && <Field.ErrorText>{errors.name}</Field.ErrorText>}
        </Field.Root>

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
            placeholder="Минимум 8 символов"
          />
          {formData.password && <PasswordStrengthMeter value={passwordStrength} max={4} mt={2} />}
          {errors.password && <Field.ErrorText>{errors.password}</Field.ErrorText>}
          <Field.HelperText>
            Пароль должен содержать минимум 8 символов, заглавные и строчные буквы, цифры
          </Field.HelperText>
        </Field.Root>

        <Field.Root invalid={!!errors.confirmPassword}>
          <Field.Label>Подтвердите пароль</Field.Label>
          <PasswordInput
            value={formData.confirmPassword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData({ ...formData, confirmPassword: e.target.value })
            }
            disabled={isLoading}
            placeholder="Повторите пароль"
          />
          {errors.confirmPassword && <Field.ErrorText>{errors.confirmPassword}</Field.ErrorText>}
        </Field.Root>

        <Button type="submit" colorPalette="purple" loading={isLoading}>
          Зарегистрироваться
        </Button>
      </VStack>
    </form>
  )
}
