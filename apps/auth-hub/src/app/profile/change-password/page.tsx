import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Box, Button, Heading, HStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { LuArrowLeft } from 'react-icons/lu'
import { ChangePasswordForm } from './_components/change-password-form'

export const metadata: Metadata = {
  title: 'Смена пароля',
}

/**
 * Страница смены/установки пароля
 */
export default async function ChangePasswordPage() {
  const session = await requireAuth()

  // Проверяем наличие credential аккаунта с паролем
  const credentialAccount = await prisma.account.findFirst({
    where: {
      userId: session.user.id,
      providerId: 'credential',
    },
    select: { password: true },
  })

  const hasPassword = !!credentialAccount?.password

  return (
    <Box maxW="md" mx="auto" p={6}>
      <HStack mb={6}>
        <Button variant="ghost" size="sm" asChild>
          <a href="/profile">
            <LuArrowLeft />
            Профиль
          </a>
        </Button>
      </HStack>
      <Heading size="xl" mb={6}>
        {hasPassword ? 'Изменить пароль' : 'Установить пароль'}
      </Heading>
      <ChangePasswordForm hasCurrentPassword={hasPassword} />
    </Box>
  )
}
