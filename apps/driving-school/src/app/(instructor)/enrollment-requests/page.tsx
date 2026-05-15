import { InstructorHeader } from '@/app/(instructor)/_components/instructor-header'
import { getSession } from '@/lib/auth'
import { isInstructor } from '@/lib/roles'
import { Box, Container, Heading, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { redirect } from 'next/navigation'
import { LuInbox } from 'react-icons/lu'
import { getEnrollmentRequestsAction } from './_actions/process-request.action'
import { EnrollmentRequestCard } from './_components/enrollment-request-card'

export const metadata = {
  title: 'Заявки на обучение',
  description: 'Заявки от учеников на запись к вам',
}

export default async function EnrollmentRequestsPage() {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in?callbackUrl=/enrollment-requests')
  }

  if (!isInstructor(session.user.roles)) {
    redirect('/dashboard')
  }

  const result = await getEnrollmentRequestsAction()

  if (!result.success) {
    return (
      <Container maxW="container.lg" py={8}>
        <VStack gap={6} align="stretch">
          <Box layerStyle="panel.error" p={6} textAlign="center">
            <Heading size="lg" color="error.fg">
              Ошибка
            </Heading>
            <Text color="error.fg" mt={2}>
              {result.error || 'Не удалось загрузить заявки'}
            </Text>
          </Box>
        </VStack>
      </Container>
    )
  }

  const requests = result.requests || []
  const pendingRequests = requests.filter((r) => r.status === 'PENDING')
  const processedRequests = requests.filter((r) => r.status !== 'PENDING')

  return (
    <Container maxW="container.lg" py={8}>
      <VStack gap={6} align="stretch">
        <InstructorHeader />

        {/* Заголовок */}
        <Box>
          <Heading size="xl">Заявки на обучение</Heading>
          <Text color="fg.muted" mt={2}>
            Заявки от учеников, которые хотят записаться к вам на занятия
          </Text>
        </Box>

        {/* Новые заявки */}
        {pendingRequests.length > 0 ? (
          <Box>
            <Heading size="md" mb={4}>
              Ожидают ответа ({pendingRequests.length})
            </Heading>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
              {pendingRequests.map((request) => (
                <EnrollmentRequestCard key={request.id} request={request} />
              ))}
            </SimpleGrid>
          </Box>
        ) : (
          <Box textAlign="center" py={12} bg="bg.subtle" borderRadius="lg">
            <VStack gap={4}>
              <Box p={4} borderRadius="full" bg="bg.muted" color="fg.muted">
                <LuInbox size={48} />
              </Box>
              <Heading size="md" color="fg.muted">
                Нет новых заявок
              </Heading>
              <Text color="fg.muted" maxW="sm">
                Когда ученики захотят записаться к вам через каталог инструкторов, их заявки появятся здесь
              </Text>
            </VStack>
          </Box>
        )}

        {/* Обработанные заявки */}
        {processedRequests.length > 0 && (
          <Box>
            <Heading size="md" mb={4}>
              Обработанные ({processedRequests.length})
            </Heading>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
              {processedRequests.map((request) => (
                <EnrollmentRequestCard key={request.id} request={request} />
              ))}
            </SimpleGrid>
          </Box>
        )}
      </VStack>
    </Container>
  )
}
