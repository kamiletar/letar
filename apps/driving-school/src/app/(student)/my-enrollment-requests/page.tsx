import { getSession } from '@/lib/auth'
import { Box, Button, Container, Heading, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LuInbox, LuSearch } from 'react-icons/lu'
import { getMyEnrollmentRequestsAction } from './_actions/my-requests.action'
import { MyRequestCard } from './_components/my-request-card'

export const metadata = {
  title: 'Мои заявки на обучение',
  description: 'Заявки на запись к инструкторам',
}

export default async function MyEnrollmentRequestsPage() {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in?callbackUrl=/my-enrollment-requests')
  }

  // Проверяем наличие профиля ученика
  if (!session.user.hasStudentProfile) {
    redirect('/dashboard')
  }

  const result = await getMyEnrollmentRequestsAction()

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
        {/* Заголовок */}
        <Box>
          <Heading size="xl">Мои заявки на обучение</Heading>
          <Text color="fg.muted" mt={2}>
            Здесь вы можете отслеживать статус ваших заявок к инструкторам
          </Text>
        </Box>

        {requests.length === 0 ? (
          // Нет заявок вообще
          <Box textAlign="center" py={12} bg="bg.subtle" borderRadius="lg">
            <VStack gap={4}>
              <Box p={4} borderRadius="full" bg="bg.muted" color="fg.muted">
                <LuInbox size={48} />
              </Box>
              <Heading size="md" color="fg.muted">
                У вас пока нет заявок
              </Heading>
              <Text color="fg.muted" maxW="sm">
                Найдите инструктора в каталоге и отправьте заявку на запись
              </Text>
              <Button asChild colorPalette="brand" mt={4}>
                <Link href="/instructors">
                  <LuSearch size={16} />
                  Найти инструктора
                </Link>
              </Button>
            </VStack>
          </Box>
        ) : (
          <>
            {/* Ожидающие заявки */}
            {pendingRequests.length > 0 && (
              <Box>
                <Heading size="md" mb={4}>
                  Ожидают ответа ({pendingRequests.length})
                </Heading>
                <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                  {pendingRequests.map((request) => (
                    <MyRequestCard key={request.id} request={request} />
                  ))}
                </SimpleGrid>
              </Box>
            )}

            {/* Обработанные заявки */}
            {processedRequests.length > 0 && (
              <Box>
                <Heading size="md" mb={4}>
                  История ({processedRequests.length})
                </Heading>
                <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                  {processedRequests.map((request) => (
                    <MyRequestCard key={request.id} request={request} />
                  ))}
                </SimpleGrid>
              </Box>
            )}
          </>
        )}
      </VStack>
    </Container>
  )
}
