import { TransformationStage } from '@/generated/prisma'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Badge, Box, Button, Container, Heading, Link, Table, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { redirect } from 'next/navigation'

// Форматирование этапа трансформации
function formatStage(stage: TransformationStage): { label: string; colorPalette: string } {
  switch (stage) {
    case TransformationStage.DIAGNOSTICS:
      return { label: 'Диагностика', colorPalette: 'blue' }
    case TransformationStage.INTEGRATION:
      return { label: 'Интеграция', colorPalette: 'purple' }
    case TransformationStage.STRATEGY:
      return { label: 'Стратегия', colorPalette: 'cyan' }
    case TransformationStage.PRACTICE:
      return { label: 'Практика', colorPalette: 'orange' }
    case TransformationStage.RESULT:
      return { label: 'Результат', colorPalette: 'green' }
    default:
      return { label: stage, colorPalette: 'gray' }
  }
}

// Форматирование даты
function formatDate(date: Date | null): string {
  if (!date) {
    return '—'
  }
  return new Date(date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default async function PlansPage() {
  const session = await getSession()

  // Проверка аутентификации (layout уже проверяет роль)
  if (!session?.user) {
    redirect('/sign-in')
  }

  // Получение enhanced Prisma client с ZenStack политиками
  const db = getEnhancedPrisma(session.user)

  // Получение всех планов трансформации специалиста
  const plans = await db.transformationPlan.findMany({
    where: {
      client: {
        specialistId: session.user.id,
      },
    },
    include: {
      client: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  // Статистика по планам
  const stats = {
    total: plans.length,
    active: plans.filter((p) => p.isActive && !p.isCompleted).length,
    completed: plans.filter((p) => p.isCompleted).length,
    diagnostics: plans.filter((p) => p.currentStage === TransformationStage.DIAGNOSTICS).length,
    practice: plans.filter((p) => p.currentStage === TransformationStage.PRACTICE).length,
  }

  return (
    <Container maxW="7xl" py={8}>
      <VStack gap={8} align="stretch">
        <Box>
          <Link asChild color="fg.muted" fontSize="sm" mb={2}>
            <NextLink href="/dashboard">← Назад к панели управления</NextLink>
          </Link>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
            <Heading size="2xl" textTransform="none">
              Планы трансформации
            </Heading>
            <Button asChild colorPalette="fg">
              <NextLink href="/plans/new">Создать план</NextLink>
            </Button>
          </Box>

          {/* Статистика */}
          <Box display="flex" gap={4} flexWrap="wrap">
            <Box>
              <Text fontSize="sm" color="fg.muted">
                Всего планов
              </Text>
              <Text fontSize="2xl" fontWeight="bold">
                {stats.total}
              </Text>
            </Box>
            <Box>
              <Text fontSize="sm" color="fg.muted">
                Активных
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="blue.500">
                {stats.active}
              </Text>
            </Box>
            <Box>
              <Text fontSize="sm" color="fg.muted">
                Завершено
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="green.500">
                {stats.completed}
              </Text>
            </Box>
            <Box>
              <Text fontSize="sm" color="fg.muted">
                На диагностике
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="purple.500">
                {stats.diagnostics}
              </Text>
            </Box>
            <Box>
              <Text fontSize="sm" color="fg.muted">
                На практике
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="orange.500">
                {stats.practice}
              </Text>
            </Box>
          </Box>
        </Box>

        {plans.length > 0 ? (
          <Box overflowX="auto">
            <Table.Root size="sm" variant="outline">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Клиент</Table.ColumnHeader>
                  <Table.ColumnHeader>Текущий этап</Table.ColumnHeader>
                  <Table.ColumnHeader>Дата начала</Table.ColumnHeader>
                  <Table.ColumnHeader>Планируемое завершение</Table.ColumnHeader>
                  <Table.ColumnHeader>Статус</Table.ColumnHeader>
                  <Table.ColumnHeader>Действия</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {plans.map((plan) => {
                  const stageInfo = formatStage(plan.currentStage)
                  return (
                    <Table.Row key={plan.id}>
                      <Table.Cell>
                        <Link asChild color="fg" fontWeight="medium">
                          <NextLink href={`/clients/${plan.client.id}`}>{plan.client.name}</NextLink>
                        </Link>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge colorPalette={stageInfo.colorPalette}>{stageInfo.label}</Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <Text fontSize="sm">{formatDate(plan.startDate)}</Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text fontSize="sm">{formatDate(plan.expectedEndDate)}</Text>
                      </Table.Cell>
                      <Table.Cell>
                        {plan.isCompleted ? (
                          <Badge colorPalette="green">Завершен</Badge>
                        ) : plan.isActive ? (
                          <Badge colorPalette="blue">Активен</Badge>
                        ) : (
                          <Badge colorPalette="gray">Неактивен</Badge>
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        <Button asChild size="sm" variant="outline">
                          <NextLink href={`/plans/${plan.id}`}>Открыть</NextLink>
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  )
                })}
              </Table.Body>
            </Table.Root>
          </Box>
        ) : (
          <Box textAlign="center" py={12}>
            <Text color="fg.muted" mb={4} fontSize="lg">
              У вас пока нет планов трансформации
            </Text>
            <Text color="fg.muted" mb={6}>
              Создайте первый план трансформации для клиента
            </Text>
            <Button asChild colorPalette="fg">
              <NextLink href="/plans/new">Создать план</NextLink>
            </Button>
          </Box>
        )}
      </VStack>
    </Container>
  )
}
