import { requireAuth } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Card, VStack } from '@chakra-ui/react'
import { ChangePasswordForm } from './_components/change-password-form'

export const metadata = {
  title: 'Смена пароля — Премиум РосСтиль',
  description: 'Изменение пароля для входа',
}

export default async function ChangePasswordPage() {
  const user = await requireAuth()

  const db = getEnhancedPrisma(user)

  // Проверяем, есть ли у пользователя credential аккаунт с паролем
  // Better Auth хранит пароль в Account с providerId='credential'
  const credentialAccount = await db.account.findFirst({
    where: {
      userId: user.id,
      providerId: 'credential',
    },
    select: { password: true },
  })

  const hasPassword = !!credentialAccount?.password

  return (
    <VStack align="stretch" gap={6}>
      <Card.Root>
        <Card.Body>
          <ChangePasswordForm hasPassword={hasPassword} />
        </Card.Body>
      </Card.Root>
    </VStack>
  )
}
