import { getSession } from '@/lib/auth'
import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react'
import { redirect } from 'next/navigation'
import { CreateSchoolForm } from './_components/create-school-form'

export const metadata = {
  title: 'Создать автошколу',
  description: 'Зарегистрируйте свою автошколу на платформе',
}

export default async function CreateSchoolPage() {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in')
  }

  return (
    <Container maxW="container.md" py={8}>
      <VStack gap={8} align="stretch">
        {/* Заголовок */}
        <VStack gap={2} align="start">
          <Heading size="xl">Создать автошколу</Heading>
          <Text color="fg.muted">
            Зарегистрируйте свою автошколу, чтобы управлять инструкторами, учениками и расписанием
          </Text>
        </VStack>

        {/* Форма */}
        <Box p={8} borderWidth="1px" borderColor="border" borderRadius="xl" bg="bg.panel">
          <CreateSchoolForm />
        </Box>
      </VStack>
    </Container>
  )
}
