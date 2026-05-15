import { SessionStatus } from '@/generated/prisma'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Badge, Box, Button, Container, Grid, Heading, Link, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { notFound, redirect } from 'next/navigation'

type Params = Promise<{ id: string }>

// Форматирование статуса сессии
function formatSessionStatus(status: SessionStatus): { label: string; colorPalette: string } {
  switch (status) {
    case SessionStatus.SCHEDULED:
      return { label: 'Запланирована', colorPalette: 'blue' }
    case SessionStatus.IN_PROGRESS:
      return { label: 'В процессе', colorPalette: 'yellow' }
    case SessionStatus.COMPLETED:
      return { label: 'Завершена', colorPalette: 'green' }
    case SessionStatus.CANCELLED:
      return { label: 'Отменена', colorPalette: 'red' }
    default:
      return { label: status, colorPalette: 'gray' }
  }
}

// Форматирование даты и времени
function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString('ru-RU', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Форматирование длительности
function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0 && mins > 0) {
    return `${hours} ч ${mins} мин`
  }
  if (hours > 0) {
    return `${hours} ч`
  }
  return `${mins} мин`
}

export default async function SessionDetailPage({ params }: { params: Params }) {
  const { id } = await params
  const session = await getSession()

  // Проверка аутентификации (layout уже проверяет роль)
  if (!session?.user) {
    redirect('/sign-in')
  }

  // Получение enhanced Prisma client
  const db = getEnhancedPrisma(session.user)

  // Получение данных сессии
  const therapySession = await db.therapySession.findUnique({
    where: { id },
    include: {
      client: true,
      specialist: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  })

  // Если сессия не найдена
  if (!therapySession) {
    notFound()
  }

  const statusInfo = formatSessionStatus(therapySession.status)

  return (
    <Container maxW="5xl" py={8}>
      <VStack gap={8} align="stretch">
        {/* Хедер */}
        <Box>
          <Link asChild color="fg.muted" fontSize="sm" mb={2}>
            <NextLink href="/sessions">← Назад к списку сессий</NextLink>
          </Link>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Heading size="2xl" textTransform="none">
              Сессия с {therapySession.client.name}
            </Heading>
            <Badge colorPalette={statusInfo.colorPalette} fontSize="md" px={3} py={1}>
              {statusInfo.label}
            </Badge>
          </Box>
          <Text color="fg.muted">{formatDateTime(therapySession.scheduledAt)}</Text>
        </Box>

        {/* Основная информация */}
        <Box p={6} bg="bg.subtle" borderWidth="1px" borderRadius="md">
          <Heading size="md" mb={4}>
            Основная информация
          </Heading>

          <Grid templateColumns={{ base: '1fr', md: '200px 1fr' }} gap={4}>
            <Text fontWeight="medium" color="fg.muted">
              Клиент:
            </Text>
            <Link asChild color="fg" fontWeight="medium">
              <NextLink href={`/clients/${therapySession.client.id}`}>{therapySession.client.name}</NextLink>
            </Link>

            <Text fontWeight="medium" color="fg.muted">
              Email клиента:
            </Text>
            <Text>{therapySession.client.email}</Text>

            <Text fontWeight="medium" color="fg.muted">
              Телефон:
            </Text>
            <Text>{therapySession.client.phone || '—'}</Text>

            <Text fontWeight="medium" color="fg.muted">
              Специалист:
            </Text>
            <Text>{therapySession.specialist.name || therapySession.specialist.email}</Text>

            <Text fontWeight="medium" color="fg.muted">
              Длительность:
            </Text>
            <Text>{formatDuration(therapySession.duration)}</Text>

            <Text fontWeight="medium" color="fg.muted">
              Создано:
            </Text>
            <Text>
              {new Date(therapySession.createdAt).toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </Text>

            <Text fontWeight="medium" color="fg.muted">
              Обновлено:
            </Text>
            <Text>
              {new Date(therapySession.updatedAt).toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </Grid>
        </Box>

        {/* Тема сессии */}
        {therapySession.topic && (
          <Box p={6} bg="bg.subtle" borderWidth="1px" borderRadius="md">
            <Heading size="md" mb={3}>
              Тема сессии
            </Heading>
            <Text>{therapySession.topic}</Text>
          </Box>
        )}

        {/* Заметки специалиста */}
        {therapySession.notes && (
          <Box p={6} bg="bg.subtle" borderWidth="1px" borderRadius="md">
            <Heading size="md" mb={3}>
              Заметки специалиста
            </Heading>
            <Text whiteSpace="pre-wrap">{therapySession.notes}</Text>
          </Box>
        )}

        {/* Домашнее задание */}
        {therapySession.homework && (
          <Box p={6} bg="bg.subtle" borderWidth="1px" borderRadius="md">
            <Heading size="md" mb={3}>
              Домашнее задание
            </Heading>
            <Text whiteSpace="pre-wrap">{therapySession.homework}</Text>
          </Box>
        )}

        {/* Кнопки действий */}
        <Box display="flex" gap={3} flexWrap="wrap">
          <Button asChild colorPalette="fg">
            <NextLink href={`/sessions/${id}/edit`}>Редактировать</NextLink>
          </Button>

          {therapySession.status === SessionStatus.SCHEDULED && (
            <Button variant="outline" colorPalette="blue">
              Начать сессию
            </Button>
          )}

          {therapySession.status === SessionStatus.IN_PROGRESS && (
            <Button variant="outline" colorPalette="green">
              Завершить сессию
            </Button>
          )}

          {therapySession.status !== SessionStatus.CANCELLED && (
            <Button variant="outline" colorPalette="red">
              Отменить сессию
            </Button>
          )}
        </Box>
      </VStack>
    </Container>
  )
}
