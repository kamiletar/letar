import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Box, Container, Heading, Link, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { redirect } from 'next/navigation'
import { PlanForm } from '../_components/plan-form'
import { createPlan } from './_actions/create-plan'

export default async function NewPlanPage({ searchParams }: { searchParams: Promise<{ clientId?: string }> }) {
  const { clientId: preselectedClientId } = await searchParams
  const session = await getSession()

  // Проверка аутентификации (layout уже проверяет роль)
  if (!session?.user) {
    redirect('/sign-in')
  }

  // Получение enhanced Prisma client с ZenStack политиками
  const db = getEnhancedPrisma(session.user)

  // Получение списка клиентов для выбора
  const clients = await db.client.findMany({
    where: {
      specialistId: session.user.id,
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: 'asc',
    },
  })

  // Если нет клиентов, показываем сообщение
  if (clients.length === 0) {
    return (
      <Container maxW="7xl" py={8}>
        <VStack gap={8} align="stretch">
          <Box>
            <Link asChild color="fg.muted" fontSize="sm" mb={2}>
              <NextLink href="/plans">← Назад к планам</NextLink>
            </Link>
            <Heading size="2xl" textTransform="none">
              Создать план трансформации
            </Heading>
          </Box>
          <Box p={6} bg="yellow.subtle" borderWidth="1px" borderColor="yellow.solid" borderRadius="md">
            <Heading size="md" mb={2}>
              У вас пока нет клиентов
            </Heading>
            <p>
              Для создания плана трансформации необходимо сначала добавить клиента.{' '}
              <Link asChild color="fg" fontWeight="medium">
                <NextLink href="/clients/new">Добавить клиента</NextLink>
              </Link>
            </p>
          </Box>
        </VStack>
      </Container>
    )
  }

  // Получаем текущую дату для startDate
  const now = new Date()
  const defaultStartDate = now.toISOString().slice(0, 10) // YYYY-MM-DD

  return (
    <Container maxW="5xl" py={8}>
      <VStack gap={8} align="stretch">
        <Box>
          <Link asChild color="fg.muted" fontSize="sm" mb={2}>
            <NextLink href="/plans">← Назад к планам</NextLink>
          </Link>
          <Heading size="2xl" textTransform="none">
            Создать план трансформации
          </Heading>
        </Box>

        <Box p={6} bg="bg.subtle" borderWidth="1px" borderRadius="md">
          <PlanForm
            onSubmit={createPlan}
            clients={clients}
            defaultValue={{
              clientId: preselectedClientId,
              currentStage: 'DIAGNOSTICS',
              startDate: defaultStartDate,
              isActive: true,
              isCompleted: false,
            }}
            submitLabel="Создать план"
          />
        </Box>
      </VStack>
    </Container>
  )
}
