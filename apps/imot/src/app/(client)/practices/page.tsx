import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Box, Container, Heading, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { redirect } from 'next/navigation'
import { LuListTodo } from 'react-icons/lu'
import { PracticeCard } from './_components'

/**
 * Страница "Практики" для клиентов
 * Отображает назначенные практики с возможностью отметки выполнения и ведения дневника
 */
export default async function PracticesPage() {
  const session = await getSession()

  // Проверка аутентификации
  if (!session?.user) {
    redirect('/sign-in')
  }

  // Проверка роли - только CLIENT
  if (session.user.role !== 'CLIENT') {
    redirect('/dashboard')
  }

  // Получение enhanced Prisma client
  const db = getEnhancedPrisma(session.user)

  // Получение данных клиента с практиками
  const client = await db.client.findUnique({
    where: { userId: session.user.id },
    include: {
      practices: {
        orderBy: [{ isCompleted: 'asc' }, { createdAt: 'desc' }],
      },
    },
  })

  // Если клиент не найден
  if (!client) {
    return (
      <Container maxW="7xl" py={8}>
        <VStack gap={4}>
          <Heading size="2xl" textTransform="none">
            Практики
          </Heading>
          <Text color="fg.muted">Ваш профиль клиента еще не создан. Пожалуйста, обратитесь к вашему специалисту.</Text>
        </VStack>
      </Container>
    )
  }

  // Разделение практик на активные и завершенные
  const activePractices = client.practices.filter((p) => !p.isCompleted)
  const completedPractices = client.practices.filter((p) => p.isCompleted)

  return (
    <Container maxW="7xl" py={8}>
      <VStack gap={8} align="stretch">
        {/* Заголовок */}
        <Box>
          <Heading size="2xl" textTransform="none" mb={2}>
            Практики
          </Heading>
          <Text color="fg.muted" fontSize="lg">
            Ваши индивидуальные практики для трансформации
          </Text>
        </Box>

        {/* Статистика */}
        {client.practices.length > 0 && (
          <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} gap={4}>
            <Box p={4} borderWidth="1px" borderRadius="lg" bg="bg.subtle">
              <Text fontSize="2xl" fontWeight="bold" color="#667eea">
                {client.practices.length}
              </Text>
              <Text fontSize="sm" color="fg.muted">
                Всего практик
              </Text>
            </Box>
            <Box p={4} borderWidth="1px" borderRadius="lg" bg="bg.subtle">
              <Text fontSize="2xl" fontWeight="bold" color="#F7B801">
                {activePractices.length}
              </Text>
              <Text fontSize="sm" color="fg.muted">
                Активных практик
              </Text>
            </Box>
            <Box p={4} borderWidth="1px" borderRadius="lg" bg="bg.subtle">
              <Text fontSize="2xl" fontWeight="bold" color="#00A878">
                {completedPractices.length}
              </Text>
              <Text fontSize="sm" color="fg.muted">
                Завершено
              </Text>
            </Box>
          </SimpleGrid>
        )}

        {/* Если нет практик */}
        {client.practices.length === 0 && (
          <Box p={8} borderWidth="1px" borderRadius="lg" borderColor="border" textAlign="center">
            <LuListTodo size={48} style={{ margin: '0 auto 16px' }} />
            <Text fontSize="lg" fontWeight="medium" mb={2}>
              Практики еще не назначены
            </Text>
            <Text color="fg.muted">
              Ваш специалист назначит индивидуальные практики после создания плана трансформации. Практики будут
              работать на всех 5 уровнях ИМОТ одновременно для достижения максимального эффекта.
            </Text>
          </Box>
        )}

        {/* Активные практики */}
        {activePractices.length > 0 && (
          <Box>
            <Text fontSize="xl" fontWeight="medium" mb={4}>
              Активные практики ({activePractices.length})
            </Text>
            <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6}>
              {activePractices.map((practice) => (
                <PracticeCard key={practice.id} practice={practice} />
              ))}
            </SimpleGrid>
          </Box>
        )}

        {/* Завершенные практики */}
        {completedPractices.length > 0 && (
          <Box>
            <Text fontSize="xl" fontWeight="medium" mb={4}>
              Завершенные практики ({completedPractices.length})
            </Text>
            <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6}>
              {completedPractices.map((practice) => (
                <PracticeCard key={practice.id} practice={practice} />
              ))}
            </SimpleGrid>
          </Box>
        )}
      </VStack>
    </Container>
  )
}
