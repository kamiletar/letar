import { Box, Button, Container, Heading, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LuArrowLeft } from 'react-icons/lu'

import { getSession } from '@/lib/auth'

import { CreateTicketForm } from '../_components/create-ticket-form'

export const metadata = {
  title: 'Новое обращение',
  description: 'Создать обращение в поддержку',
}

export default async function NewTicketPage() {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in?callbackUrl=/support/new')
  }

  return (
    <Container maxW="container.md" py={8}>
      <VStack gap={6} align="stretch">
        {/* Навигация */}
        <Button asChild variant="ghost" alignSelf="flex-start">
          <Link href="/support">
            <LuArrowLeft />
            Назад к обращениям
          </Link>
        </Button>

        {/* Заголовок */}
        <Box>
          <Heading size="xl">Новое обращение</Heading>
          <Text color="fg.muted" mt={2}>
            Опишите проблему или предложение, и мы ответим в ближайшее время
          </Text>
        </Box>

        {/* Форма */}
        <Box bg="bg.subtle" p={6} borderRadius="lg">
          <CreateTicketForm />
        </Box>
      </VStack>
    </Container>
  )
}
