import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Box, Button, Container, Heading, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { LuArrowLeft } from 'react-icons/lu'
import { ConnectedAccountsClient } from './_components/connected-accounts-client'

export const metadata = {
  title: 'Связанные аккаунты',
  description: 'Управление способами входа в аккаунт',
}

export default async function ConnectedAccountsPage() {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in')
  }

  const db = getEnhancedPrisma(session.user)

  // Получаем пользователя с аккаунтами
  const userData = await db.user.findUnique({
    where: { id: session.user.id },
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
  const hasPassword = userData.accounts.some((acc) => acc.providerId === 'credential' && acc.password)

  return (
    <Container maxW="container.md" py={8}>
      <VStack gap={6} align="stretch">
        {/* Навигация */}
        <Box>
          <Button asChild variant="ghost" size="sm">
            <Link href="/settings">
              <LuArrowLeft />
              Назад к настройкам
            </Link>
          </Button>
        </Box>

        {/* Заголовок */}
        <Box>
          <Heading size="xl">Связанные аккаунты</Heading>
          <Text color="fg.muted" mt={2}>
            Управление способами входа через OAuth провайдеры
          </Text>
        </Box>

        {/* Список аккаунтов */}
        <ConnectedAccountsClient
          accounts={userData.accounts.map((acc) => ({
            providerId: acc.providerId,
            accountId: acc.accountId,
            createdAt: acc.createdAt,
          }))}
          hasPassword={hasPassword}
          userEmail={userData.email || ''}
        />
      </VStack>
    </Container>
  )
}
