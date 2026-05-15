import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Box, Container, Heading, Link, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { PlanForm } from '../../_components/plan-form'
import { updatePlan } from './_actions/update-plan'

type Params = Promise<{ id: string }>

export default async function EditPlanPage({ params }: { params: Params }) {
  const { id } = await params
  const session = await getSession()

  // Проверка аутентификации (layout уже проверяет роль)
  if (!session?.user) {
    redirect('/sign-in')
  }

  // Получение enhanced Prisma client с ZenStack политиками
  const db = getEnhancedPrisma(session.user)

  // Получение данных плана
  const plan = await db.transformationPlan.findUnique({
    where: { id },
    include: {
      client: {
        include: {
          requestHistory: {
            orderBy: {
              version: 'desc',
            },
          },
        },
      },
    },
  })

  // Если план не найден
  if (!plan) {
    notFound()
  }

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

  // Форматирование дат для date input
  const formatDateForInput = (date: Date | null) => {
    if (!date) {
      return undefined
    }
    return new Date(date).toISOString().slice(0, 10)
  }

  return (
    <Container maxW="5xl" py={8}>
      <VStack gap={8} align="stretch">
        <Box>
          <Link asChild color="fg.muted" fontSize="sm" mb={2}>
            <NextLink href={`/plans/${id}`}>← Назад к плану</NextLink>
          </Link>
          <Heading size="2xl" textTransform="none">
            Редактировать план трансформации
          </Heading>
        </Box>

        <Box p={6} bg="bg.subtle" borderWidth="1px" borderRadius="md">
          <PlanForm
            onSubmit={updatePlan.bind(null, id)}
            clients={clients}
            defaultValue={{
              clientId: plan.clientId,
              currentStage: plan.currentStage,
              primaryRequest: plan.primaryRequest || '',
              diagnosticsDescription: plan.diagnosticsDescription || undefined,
              integrationDescription: plan.integrationDescription || undefined,
              strategyDescription: plan.strategyDescription || undefined,
              practiceDescription: plan.practiceDescription || undefined,
              expectedResults: plan.expectedResults || undefined,
              keyPoints: plan.keyPoints || undefined,
              priorities: plan.priorities || undefined,
              startDate: formatDateForInput(plan.startDate),
              expectedEndDate: formatDateForInput(plan.expectedEndDate),
              isActive: plan.isActive,
              isCompleted: plan.isCompleted,
              notes: plan.notes || undefined,
            }}
            requestHistory={plan.client.requestHistory}
            submitLabel="Обновить"
          />
        </Box>
      </VStack>
    </Container>
  )
}
