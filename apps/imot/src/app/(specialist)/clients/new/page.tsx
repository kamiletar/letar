import { getSession } from '@/lib/auth'
import { Box, Container, Heading, Link, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { redirect } from 'next/navigation'
import { ClientForm } from '../_components/client-form'
import { createClient } from './_actions/create-client'

export default async function NewClientPage() {
  const session = await getSession()

  // Проверка аутентификации (layout уже проверяет роль)
  if (!session?.user) {
    redirect('/sign-in')
  }

  return (
    <Container maxW="4xl" py={8}>
      <VStack gap={8} align="stretch">
        <Box>
          <Link asChild color="fg.muted" fontSize="sm" mb={2}>
            <NextLink href="/clients">← Назад к списку клиентов</NextLink>
          </Link>
          <Heading size="2xl" textTransform="none">
            Добавить нового клиента
          </Heading>
        </Box>

        <ClientForm onSubmit={createClient} submitLabel="Создать клиента" />
      </VStack>
    </Container>
  )
}
