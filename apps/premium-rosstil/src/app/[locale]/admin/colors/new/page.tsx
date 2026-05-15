import { requireAdmin } from '@/lib/auth'
import { Box, Container, Heading, Link, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { ColorForm } from '../_components/color-form'

export default async function NewColorPage() {
  await requireAdmin()

  return (
    <Container maxW="2xl" py={8}>
      <VStack gap={6} align="stretch">
        <Box>
          <Link asChild color="fg.muted" fontSize="sm" mb={2}>
            <NextLink href="/admin/colors">← Вернуться к списку цветов</NextLink>
          </Link>
          <Heading size="xl" textTransform="none">
            Новый цвет
          </Heading>
        </Box>

        <ColorForm mode="create" />
      </VStack>
    </Container>
  )
}
