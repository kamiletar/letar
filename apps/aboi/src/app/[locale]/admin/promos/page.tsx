import { Heading, Stack } from '@chakra-ui/react'
import { prismaAuth } from '@/lib/prisma'
import { PromosManager } from './_components/promos-manager'

export default async function AdminPromosPage() {
  const promos = await prismaAuth.promo.findMany({ orderBy: { createdAt: 'desc' } })

  return (
    <Stack gap={6}>
      <Heading as="h1" size="2xl">
        Промокоды
      </Heading>
      <PromosManager
        promos={promos.map((p) => ({
          id: p.id,
          code: p.code,
          type: p.type as 'PERCENT' | 'FIXED',
          value: p.value,
          minOrderAmount: p.minOrderAmount,
          maxUses: p.maxUses,
          usedCount: p.usedCount,
          validUntil: p.validUntil ? p.validUntil.toISOString().slice(0, 10) : null,
          isActive: p.isActive,
        }))}
      />
    </Stack>
  )
}
