import { RequestHistory } from '@/app/_components/request-history'
import { TransformationStage } from '@/generated/prisma'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Badge, Box, Button, Container, Grid, Heading, Link, Separator, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { LuDownload } from 'react-icons/lu'

type Params = Promise<{ id: string }>

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
    month: 'long',
    year: 'numeric',
  })
}

export default async function PlanDetailPage({ params }: { params: Params }) {
  const { id } = await params
  const session = await getSession()

  // Проверка аутентификации (layout уже проверяет роль)
  if (!session?.user) {
    redirect('/sign-in')
  }

  // Получение enhanced Prisma client
  const db = getEnhancedPrisma(session.user)

  // Получение данных плана
  const plan = await db.transformationPlan.findUnique({
    where: { id },
    include: {
      client: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
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

  const stageInfo = formatStage(plan.currentStage)

  return (
    <Container maxW="5xl" py={8}>
      <VStack gap={8} align="stretch">
        {/* Хедер */}
        <Box>
          <Link asChild color="fg.muted" fontSize="sm" mb={2}>
            <NextLink href="/plans">← Назад к списку планов</NextLink>
          </Link>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Heading size="2xl" textTransform="none">
              План трансформации
            </Heading>
            <Box display="flex" gap={2} alignItems="center">
              {plan.isCompleted ? (
                <Badge colorPalette="green" fontSize="md" px={3} py={1}>
                  Завершен
                </Badge>
              ) : plan.isActive ? (
                <Badge colorPalette="blue" fontSize="md" px={3} py={1}>
                  Активен
                </Badge>
              ) : (
                <Badge colorPalette="gray" fontSize="md" px={3} py={1}>
                  Неактивен
                </Badge>
              )}
              <Link href={`/api/pdf/plan/${plan.id}`} target="_blank">
                <Button colorPalette="fg" size="sm">
                  <LuDownload />
                  Экспорт в PDF
                </Button>
              </Link>
            </Box>
          </Box>
          <Link asChild color="fg" fontWeight="medium" fontSize="lg">
            <NextLink href={`/clients/${plan.client.id}`}>{plan.client.name}</NextLink>
          </Link>
        </Box>

        {/* Основной запрос клиента */}
        <Box p={6} bg="bg.subtle" borderWidth="1px" borderRadius="md">
          <Heading size="md" mb={4}>
            Основной запрос клиента
          </Heading>
          <Box
            p={4}
            bg="bg.emphasized"
            borderWidth="1px"
            borderRadius="md"
            borderLeftWidth="4px"
            borderLeftColor="fg.solid"
            mb={4}
          >
            <Text fontSize="lg" whiteSpace="pre-wrap">
              {plan.primaryRequest || 'Запрос не указан'}
            </Text>
          </Box>

          {/* История изменений запроса */}
          {plan.client.requestHistory.length > 0 && (
            <Box>
              <Heading size="sm" mb={3}>
                История изменений запроса
              </Heading>
              <RequestHistory history={plan.client.requestHistory} currentUserId={session.user.id} />
            </Box>
          )}
        </Box>

        {/* Основная информация */}
        <Box p={6} bg="bg.subtle" borderWidth="1px" borderRadius="md">
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
            <Heading size="md">Основная информация</Heading>
            <Button asChild size="sm" variant="outline">
              <NextLink href={`/plans/${id}/edit`}>Редактировать</NextLink>
            </Button>
          </Box>

          <Grid templateColumns={{ base: '1fr', md: '200px 1fr' }} gap={4}>
            <Text fontWeight="medium" color="fg.muted">
              Клиент:
            </Text>
            <Link asChild color="fg" fontWeight="medium">
              <NextLink href={`/clients/${plan.client.id}`}>{plan.client.name}</NextLink>
            </Link>

            <Text fontWeight="medium" color="fg.muted">
              Текущий этап:
            </Text>
            <Badge colorPalette={stageInfo.colorPalette} width="fit-content">
              {stageInfo.label}
            </Badge>

            <Text fontWeight="medium" color="fg.muted">
              Дата начала:
            </Text>
            <Text>{formatDate(plan.startDate)}</Text>

            <Text fontWeight="medium" color="fg.muted">
              Планируемое завершение:
            </Text>
            <Text>{formatDate(plan.expectedEndDate)}</Text>

            <Text fontWeight="medium" color="fg.muted">
              Создан:
            </Text>
            <Text>{formatDate(plan.createdAt)}</Text>

            <Text fontWeight="medium" color="fg.muted">
              Обновлен:
            </Text>
            <Text>{formatDate(plan.updatedAt)}</Text>
          </Grid>
        </Box>

        {/* Этапы трансформации */}
        <Box p={6} bg="bg.subtle" borderWidth="1px" borderRadius="md">
          <Heading size="md" mb={4}>
            Этапы трансформации
          </Heading>

          <VStack gap={6} align="stretch">
            {/* 1. Диагностика */}
            <Box>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Badge
                  colorPalette={plan.currentStage === TransformationStage.DIAGNOSTICS ? 'blue' : 'gray'}
                  fontSize="sm"
                >
                  1. Диагностика
                </Badge>
                {plan.currentStage === TransformationStage.DIAGNOSTICS && (
                  <Text fontSize="sm" color="blue.500" fontWeight="medium">
                    ← Текущий этап
                  </Text>
                )}
              </Box>
              <Text color="fg.muted" whiteSpace="pre-wrap">
                {plan.diagnosticsDescription || 'Не заполнено'}
              </Text>
            </Box>

            <Separator />

            {/* 2. Интеграция */}
            <Box>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Badge
                  colorPalette={plan.currentStage === TransformationStage.INTEGRATION ? 'purple' : 'gray'}
                  fontSize="sm"
                >
                  2. Интеграция
                </Badge>
                {plan.currentStage === TransformationStage.INTEGRATION && (
                  <Text fontSize="sm" color="purple.500" fontWeight="medium">
                    ← Текущий этап
                  </Text>
                )}
              </Box>
              <Text color="fg.muted" whiteSpace="pre-wrap">
                {plan.integrationDescription || 'Не заполнено'}
              </Text>
            </Box>

            <Separator />

            {/* 3. Стратегия */}
            <Box>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Badge
                  colorPalette={plan.currentStage === TransformationStage.STRATEGY ? 'cyan' : 'gray'}
                  fontSize="sm"
                >
                  3. Стратегия
                </Badge>
                {plan.currentStage === TransformationStage.STRATEGY && (
                  <Text fontSize="sm" color="cyan.500" fontWeight="medium">
                    ← Текущий этап
                  </Text>
                )}
              </Box>
              <Text color="fg.muted" whiteSpace="pre-wrap">
                {plan.strategyDescription || 'Не заполнено'}
              </Text>
            </Box>

            <Separator />

            {/* 4. Практика */}
            <Box>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Badge
                  colorPalette={plan.currentStage === TransformationStage.PRACTICE ? 'orange' : 'gray'}
                  fontSize="sm"
                >
                  4. Практика
                </Badge>
                {plan.currentStage === TransformationStage.PRACTICE && (
                  <Text fontSize="sm" color="orange.500" fontWeight="medium">
                    ← Текущий этап
                  </Text>
                )}
              </Box>
              <Text color="fg.muted" whiteSpace="pre-wrap">
                {plan.practiceDescription || 'Не заполнено'}
              </Text>
            </Box>

            <Separator />

            {/* 5. Ожидаемые результаты */}
            <Box>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Badge colorPalette={plan.currentStage === TransformationStage.RESULT ? 'green' : 'gray'} fontSize="sm">
                  5. Результат
                </Badge>
                {plan.currentStage === TransformationStage.RESULT && (
                  <Text fontSize="sm" color="green.500" fontWeight="medium">
                    ← Текущий этап
                  </Text>
                )}
              </Box>
              <Text color="fg.muted" whiteSpace="pre-wrap">
                {plan.expectedResults || 'Не заполнено'}
              </Text>
            </Box>
          </VStack>
        </Box>

        {/* Дополнительные заметки */}
        {plan.notes && (
          <Box p={6} bg="bg.subtle" borderWidth="1px" borderRadius="md">
            <Heading size="md" mb={4}>
              Дополнительные заметки
            </Heading>
            <Text color="fg.muted" whiteSpace="pre-wrap">
              {plan.notes}
            </Text>
          </Box>
        )}

        {/* Практики (placeholder для будущего) */}
        <Box p={6} bg="bg.subtle" borderWidth="1px" borderRadius="md">
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
            <Heading size="md">Практики</Heading>
            <Button asChild size="sm" colorPalette="fg">
              <NextLink href={`/plans/${id}/practices/new`}>Добавить практику</NextLink>
            </Button>
          </Box>
          <Text color="fg.muted">Практики будут отображаться здесь</Text>
        </Box>
      </VStack>
    </Container>
  )
}
