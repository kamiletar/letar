import { requireAdmin } from '@/lib/auth'
import { Box, Container, Heading, Link, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { PromoForm } from '../_components/promo-form'

export default async function AdminNewPromoPage() {
  await requireAdmin()

  return (
    <Container maxW="3xl" py={8}>
      <VStack gap={6} align="stretch">
        <Box>
          <Link asChild color="fg.muted" fontSize="sm" mb={2}>
            <NextLink href="/admin/promos">&larr; Все промокоды</NextLink>
          </Link>
          <Heading size="2xl" textTransform="none" mt={2}>
            Новый промокод
          </Heading>
        </Box>

        <PromoForm />
      </VStack>
    </Container>
  )
}
