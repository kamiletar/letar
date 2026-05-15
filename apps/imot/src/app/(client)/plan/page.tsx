import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react'
import { redirect } from 'next/navigation'
import { LuBookOpen } from 'react-icons/lu'
import { TransformationPlanView } from './_components'

/**
 * Страница "План трансформации" для клиентов
 * Отображает индивидуальный план по 5 этапам ИМОТ
 */
export default async function PlanPage() {
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

  // Получение данных клиента с планами трансформации
  const client = await db.client.findUnique({
    where: { userId: session.user.id },
    include: {
      transformationPlans: {
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })

  // Если клиент не найден
  if (!client) {
    return (
      <Container maxW="7xl" py={8}>
        <VStack gap={4}>
          <Heading size="2xl" textTransform="none">
            План трансформации
          </Heading>
          <Text color="fg.muted">Ваш профиль клиента еще не создан. Пожалуйста, обратитесь к вашему специалисту.</Text>
        </VStack>
      </Container>
    )
  }

  // Активный план трансформации
  const activePlan = client.transformationPlans[0]

  return (
    <Container maxW="5xl" py={8}>
      <VStack gap={8} align="stretch">
        {/* Заголовок */}
        <Box>
          <Heading size="2xl" textTransform="none" mb={2}>
            План трансформации
          </Heading>
          <Text color="fg.muted" fontSize="lg">
            Индивидуальный путь вашей трансформации по методике ИМОТ
          </Text>
        </Box>

        {/* Если нет активного плана */}
        {!activePlan && (
          <Box p={8} borderWidth="1px" borderRadius="lg" borderColor="border" textAlign="center">
            <LuBookOpen size={48} style={{ margin: '0 auto 16px' }} />
            <Text fontSize="lg" fontWeight="medium" mb={2}>
              План трансформации еще не создан
            </Text>
            <Text color="fg.muted">
              Ваш специалист создаст индивидуальный план после завершения диагностики и определения точек пересечения
              между уровнями. План будет включать 5 этапов трансформации с конкретными шагами и практиками.
            </Text>
          </Box>
        )}

        {/* Отображение плана */}
        {activePlan && <TransformationPlanView plan={activePlan} />}
      </VStack>
    </Container>
  )
}
