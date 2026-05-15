import { requireAuth } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { VStack } from '@chakra-ui/react'
import { notFound } from 'next/navigation'
import { ConnectedAccountsList } from './_components/connected-accounts-list'

export const metadata = {
  title: 'Связанные аккаунты — Премиум РосСтиль',
  description: 'Управление способами входа в аккаунт',
}

export default async function ConnectedAccountsPage() {
  const user = await requireAuth()

  const db = getEnhancedPrisma(user)

  // Получаем пользователя с аккаунтами
  const userData = await db.user.findUnique({
    where: { id: user.id },
    include: {
      accounts: {
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  })

  if (!userData) {
    notFound()
  }

  // Проверяем, есть ли у пользователя credential аккаунт с паролем
  const hasPassword = userData.accounts.some(
    (acc: (typeof userData.accounts)[number]) => acc.providerId === 'credential' && acc.password
  )

  // Получаем Telegram bot username из env
  const telegramBotUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME

  return (
    <VStack align="stretch" gap={6}>
      <ConnectedAccountsList
        accounts={userData.accounts}
        hasPassword={hasPassword}
        userEmail={userData.email || ''}
        telegramBotUsername={telegramBotUsername}
      />
    </VStack>
  )
}
