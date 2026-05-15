import type { LoyaltyLevel } from '@/generated/prisma'
import { requireAuth } from '@/lib/auth'
import { getEnhancedPrisma, getPrisma } from '@/lib/db'
import { Heading, VStack } from '@chakra-ui/react'
import { LoyaltyCard } from './_components/loyalty-card'
import { LoyaltyHistory } from './_components/loyalty-history'

export default async function LoyaltyPage() {
  const authUser = await requireAuth()
  const db = getEnhancedPrisma(authUser)
  const systemDb = getPrisma()

  // Получаем или создаём аккаунт лояльности
  let account = await db.loyaltyAccount.findUnique({
    where: { userId: authUser.id },
  })

  if (!account) {
    account = await systemDb.loyaltyAccount.create({
      data: { userId: authUser.id },
    })
  }

  // Получаем историю транзакций
  const [transactions, total] = await Promise.all([
    db.loyaltyTransaction.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    db.loyaltyTransaction.count({
      where: { accountId: account.id },
    }),
  ])

  return (
    <VStack gap={6} align="stretch">
      <Heading size="xl" textTransform="none">
        Программа лояльности
      </Heading>

      <LoyaltyCard balance={account.balance} totalEarned={account.totalEarned} level={account.level as LoyaltyLevel} />

      <LoyaltyHistory transactions={transactions} total={total} />
    </VStack>
  )
}
