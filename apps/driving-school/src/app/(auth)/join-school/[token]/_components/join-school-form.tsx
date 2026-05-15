'use client'

import { Button, Field, Input, Text, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { LuCheck } from 'react-icons/lu'

import { toaster } from '@/app/_components/ui/toaster'

import { acceptInvitationAction } from '../_actions/accept-invitation.action'

interface JoinSchoolFormProps {
  token: string
  email: string
  organizationId: string
  organizationName: string
  prefillName?: string
  prefillPhone?: string
}

export function JoinSchoolForm({
  token,
  email,
  organizationId: _organizationId,
  organizationName,
  prefillName,
  prefillPhone,
}: JoinSchoolFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [name, setName] = useState(prefillName || '')
  const [phone, setPhone] = useState(prefillPhone || '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Валидация
    const newErrors: Record<string, string> = {}

    if (!name.trim()) {
      newErrors.name = 'Введите ваше имя'
    }

    if (password.length < 8) {
      newErrors.password = 'Пароль должен содержать минимум 8 символов'
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Пароли не совпадают'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors({})

    startTransition(async () => {
      const result = await acceptInvitationAction({
        token,
        name: name.trim(),
        phone: phone.trim() || undefined,
        password,
      })

      if (!result.success) {
        toaster.error({ title: result.error })
        return
      }

      toaster.success({
        title: 'Аккаунт создан!',
        description: `Добро пожаловать в ${organizationName}`,
      })

      // Перенаправляем на страницу входа или на главную
      router.push('/sign-in')
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <VStack align="stretch" gap={4}>
        <Field.Root>
          <Field.Label>Email</Field.Label>
          <Input value={email} disabled bg="bg.subtle" />
          <Field.HelperText>Email нельзя изменить</Field.HelperText>
        </Field.Root>

        <Field.Root invalid={!!errors.name}>
          <Field.Label>Ваше имя</Field.Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Иван Иванов" />
          {errors.name && <Field.ErrorText>{errors.name}</Field.ErrorText>}
        </Field.Root>

        <Field.Root>
          <Field.Label>Телефон (необязательно)</Field.Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 (999) 123-45-67" />
        </Field.Root>

        <Field.Root invalid={!!errors.password}>
          <Field.Label>Пароль</Field.Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Минимум 8 символов"
          />
          {errors.password && <Field.ErrorText>{errors.password}</Field.ErrorText>}
        </Field.Root>

        <Field.Root invalid={!!errors.confirmPassword}>
          <Field.Label>Подтверждение пароля</Field.Label>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Повторите пароль"
          />
          {errors.confirmPassword && <Field.ErrorText>{errors.confirmPassword}</Field.ErrorText>}
        </Field.Root>

        <Button type="submit" colorPalette="blue" size="lg" w="full" loading={isPending}>
          <LuCheck />
          Активировать аккаунт
        </Button>

        <Text fontSize="xs" color="fg.muted" textAlign="center">
          Нажимая кнопку, вы соглашаетесь с условиями использования сервиса
        </Text>
      </VStack>
    </form>
  )
}
