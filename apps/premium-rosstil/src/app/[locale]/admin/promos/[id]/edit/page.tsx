import { requireAdmin } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Box, Container, Heading, Link, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { notFound } from 'next/navigation'
import { PromoForm } from '../../_components/promo-form'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminEditPromoPage({ params }: PageProps) {
  const user = await requireAdmin()
  const db = getEnhancedPrisma(user)
  const { id } = await params

  const promo = await db.promo.findUnique({ where: { id } })

  if (!promo) {
    notFound()
  }

  const defaultValue = {
    id: promo.id,
    code: promo.code,
    type: promo.type as 'PERCENTAGE' | 'FIXED_AMOUNT',
    discount: Number(promo.discount),
    description: promo.description || '',
    isActive: promo.isActive,
    dateFrom: promo.dateFrom,
    dateTo: promo.dateTo,
    minAmount: promo.minAmount ? Number(promo.minAmount) : 0,
    maxUsages: promo.maxUsages || 0,
    perCustomer: promo.perCustomer,
  }

  return (
    <Container maxW="3xl" py={8}>
      <VStack gap={6} align="stretch">
        <Box>
          <Link asChild color="fg.muted" fontSize="sm" mb={2}>
            <NextLink href="/admin/promos">&larr; Все промокоды</NextLink>
          </Link>
          <Heading size="2xl" textTransform="none" mt={2}>
            Редактировать: {promo.code}
          </Heading>
        </Box>

        <PromoForm defaultValue={defaultValue} />
      </VStack>
    </Container>
  )
}
