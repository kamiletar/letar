import { SessionStatus } from '@/generated/prisma'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Badge, Box, Button, Container, Heading, Link, Table, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { redirect } from 'next/navigation'

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
    day: '2-digit',
    month: 'short',
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
    return `${hours}ч ${mins}мин`
  }
  if (hours > 0) {
    return `${hours}ч`
  }
  return `${mins}мин`
}

export default async function SessionsPage() {
  const session = await getSession()

  // Проверка аутентификации (layout уже проверяет, но оставляем для безопасности)
  if (!session?.user) {
    redirect('/sign-in')
  }

  // Получение enhanced Prisma client с ZenStack политиками
  const db = getEnhancedPrisma(session.user)

  // Получение всех сессий специалиста
  const sessions = await db.therapySession.findMany({
    where: {
      specialistId: session.user.id,
    },
    include: {
      client: true,
    },
    orderBy: {
      scheduledAt: 'desc',
    },
  })

  // Статистика по сессиям
  const stats = {
    total: sessions.length,
    scheduled: sessions.filter((s) => s.status === SessionStatus.SCHEDULED).length,
    inProgress: sessions.filter((s) => s.status === SessionStatus.IN_PROGRESS).length,
    completed: sessions.filter((s) => s.status === SessionStatus.COMPLETED).length,
    cancelled: sessions.filter((s) => s.status === SessionStatus.CANCELLED).length,
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
              Сессии
            </Heading>
            <Button asChild colorPalette="fg">
              <NextLink href="/sessions/new">Запланировать сессию</NextLink>
            </Button>
          </Box>

          {/* Статистика */}
          <Box display="flex" gap={4} flexWrap="wrap">
            <Box>
              <Text fontSize="sm" color="fg.muted">
                Всего сессий
              </Text>
              <Text fontSize="2xl" fontWeight="bold">
                {stats.total}
              </Text>
            </Box>
            <Box>
              <Text fontSize="sm" color="fg.muted">
                Запланировано
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="blue.500">
                {stats.scheduled}
              </Text>
            </Box>
            <Box>
              <Text fontSize="sm" color="fg.muted">
                В процессе
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="yellow.500">
                {stats.inProgress}
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
                Отменено
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="red.500">
                {stats.cancelled}
              </Text>
            </Box>
          </Box>
        </Box>

        {sessions.length > 0 ? (
          <Box overflowX="auto">
            <Table.Root size="sm" variant="outline">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Клиент</Table.ColumnHeader>
                  <Table.ColumnHeader>Дата и время</Table.ColumnHeader>
                  <Table.ColumnHeader>Длительность</Table.ColumnHeader>
                  <Table.ColumnHeader>Тема</Table.ColumnHeader>
                  <Table.ColumnHeader>Статус</Table.ColumnHeader>
                  <Table.ColumnHeader>Действия</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {sessions.map((therapySession) => {
                  const statusInfo = formatSessionStatus(therapySession.status)
                  return (
                    <Table.Row key={therapySession.id}>
                      <Table.Cell>
                        <Link asChild color="fg" fontWeight="medium">
                          <NextLink href={`/clients/${therapySession.client.id}`}>
                            {therapySession.client.name}
                          </NextLink>
                        </Link>
                      </Table.Cell>
                      <Table.Cell>
                        <Text fontSize="sm">{formatDateTime(therapySession.scheduledAt)}</Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text fontSize="sm">{formatDuration(therapySession.duration)}</Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text fontSize="sm" lineClamp={2} maxW="300px">
                          {therapySession.topic || '—'}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge colorPalette={statusInfo.colorPalette}>{statusInfo.label}</Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <Button asChild size="sm" variant="outline">
                          <NextLink href={`/sessions/${therapySession.id}`}>Открыть</NextLink>
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
              У вас пока нет запланированных сессий
            </Text>
            <Text color="fg.muted" mb={6}>
              Запланируйте первую сессию с клиентом
            </Text>
            <Button asChild colorPalette="fg">
              <NextLink href="/sessions/new">Запланировать сессию</NextLink>
            </Button>
          </Box>
        )}
      </VStack>
    </Container>
  )
}
