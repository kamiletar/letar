import { getSession } from '@/lib/auth'
import { isInstructor } from '@/lib/roles'
import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react'
import { redirect } from 'next/navigation'
import { LessonTypeForm } from '../_components/lesson-type-form'

export const metadata = {
  title: 'Новый тип занятия',
  description: 'Создание нового типа занятия',
}

export default async function NewLessonTypePage() {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in?callbackUrl=/lesson-types/new')
  }

  if (!isInstructor(session.user.roles)) {
    redirect('/dashboard')
  }

  return (
    <Container maxW="container.md" py={8}>
      <VStack gap={6} align="stretch">
        {/* Заголовок */}
        <Box>
          <Heading size="xl">Новый тип занятия</Heading>
          <Text color="fg.muted" mt={2}>
            Создайте новый тип занятия с ценой и длительностью
          </Text>
        </Box>

        {/* Форма */}
        <Box bg="bg.panel" p={6} borderRadius="lg" borderWidth="1px">
          <LessonTypeForm submitLabel="Создать тип занятия" />
        </Box>
      </VStack>
    </Container>
  )
}
