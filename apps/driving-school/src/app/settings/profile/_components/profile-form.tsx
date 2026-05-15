'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { DrivingSchoolForm } from '@/driving-school-form'
import { Badge, Box, Button, Field, HStack, Input, Text, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LuCheck, LuMail, LuRefreshCw, LuSave } from 'react-icons/lu'
import { resendVerificationEmailAction } from '../_actions/resend-verification.action'
import { updateProfileAction } from '../_actions/update-profile.action'
import { UpdateProfileSchema } from '../_schemas/profile.schema'
import { AvatarUpload } from './avatar-upload'

interface ProfileFormProps {
  user: {
    id: string
    name: string | null
    email: string
    phone: string | null
    avatarUrl: string | null
    emailVerified: boolean
  }
}

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter()
  const [isResending, setIsResending] = useState(false)

  const handleResendVerification = async () => {
    setIsResending(true)

    try {
      const result = await resendVerificationEmailAction()

      if (result.success) {
        toaster.success({
          title: 'Письмо отправлено',
          description: 'Проверьте вашу почту и перейдите по ссылке для подтверждения email',
        })
      } else {
        switch (result.error) {
          case 'EMAIL_ALREADY_VERIFIED':
            toaster.info({ title: 'Email уже подтверждён' })
            router.refresh()
            break
          case 'RATE_LIMITED':
            toaster.warning({
              title: 'Подождите',
              description: 'Письмо уже было отправлено недавно. Попробуйте через 5 минут.',
            })
            break
          default:
            toaster.error({ title: 'Ошибка при отправке письма' })
        }
      }
    } finally {
      setIsResending(false)
    }
  }

  return (
    <DrivingSchoolForm
      schema={UpdateProfileSchema}
      initialValue={{ name: user.name ?? '', phone: user.phone ?? '' }}
      onSubmit={async (value) => {
        const result = await updateProfileAction(value)

        if (result.success) {
          toaster.success({ title: 'Профиль обновлён' })
        } else {
          toaster.error({ title: result.error })
        }
      }}
    >
      <DrivingSchoolForm.DirtyGuard />
      <HStack gap={8} align="start" flexDir={{ base: 'column', md: 'row' }}>
        {/* Левая колонка - Аватар */}
        <Box flexShrink={0} w={{ base: '100%', md: 'auto' }}>
          <AvatarUpload currentImage={user.avatarUrl} userName={user.name || user.email} />
        </Box>

        {/* Правая колонка - Поля формы */}
        <VStack gap={6} align="stretch" flex={1} w={{ base: '100%', md: 'auto' }}>
          {/* Имя */}
          <DrivingSchoolForm.Field.String name="name" label="Имя" placeholder="Ваше имя" />

          {/* Email (только чтение) */}
          <Field.Root>
            <Field.Label>Email</Field.Label>
            <Input value={user.email} disabled />
            <HStack mt={2} gap={2}>
              {user.emailVerified ? (
                <Badge colorPalette="green" size="sm">
                  <LuCheck size={14} />
                  Подтверждён
                </Badge>
              ) : (
                <>
                  <Badge colorPalette="yellow" size="sm">
                    <LuMail size={14} />
                    Не подтверждён
                  </Badge>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={handleResendVerification}
                    loading={isResending}
                    loadingText="Отправка..."
                  >
                    <LuRefreshCw size={14} />
                    Отправить повторно
                  </Button>
                </>
              )}
            </HStack>
            {!user.emailVerified && (
              <Text fontSize="xs" color="fg.muted" mt={1}>
                Подтвердите email для доступа ко всем функциям платформы
              </Text>
            )}
          </Field.Root>

          {/* Телефон */}
          <DrivingSchoolForm.Field.Phone name="phone" label="Телефон" country="RU" autoUnmask />

          {/* Кнопка сохранения */}
          <DrivingSchoolForm.Button.Submit colorPalette="brand">
            <LuSave />
            Сохранить
          </DrivingSchoolForm.Button.Submit>
        </VStack>
      </HStack>
    </DrivingSchoolForm>
  )
}
