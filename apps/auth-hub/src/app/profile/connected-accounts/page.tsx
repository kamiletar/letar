import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Box, Button, Heading, HStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { LuArrowLeft } from 'react-icons/lu'
import { ConnectedAccountsWrapper } from './_components/connected-accounts-wrapper'

export const metadata: Metadata = {
  title: 'Связанные аккаунты',
}

/**
 * Страница управления связанными аккаунтами
 */
export default async function ConnectedAccountsPage() {
  const session = await requireAuth()

  const accounts = await prisma.account.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'asc' },
  })

  const hasPassword = accounts.some((acc) => acc.providerId === 'credential' && acc.password)

  return (
    <Box maxW="3xl" mx="auto" p={6}>
      <HStack mb={6}>
        <Button variant="ghost" size="sm" asChild>
          <a href="/profile">
            <LuArrowLeft />
            Профиль
          </a>
        </Button>
      </HStack>
      <Heading size="xl" mb={6}>
        Связанные аккаунты
      </Heading>
      <ConnectedAccountsWrapper
        accounts={accounts.map((a) => ({
          providerId: a.providerId,
          accountId: a.accountId,
          createdAt: a.createdAt,
        }))}
        hasPassword={hasPassword}
        userEmail={session.user.email}
      />
    </Box>
  )
}
