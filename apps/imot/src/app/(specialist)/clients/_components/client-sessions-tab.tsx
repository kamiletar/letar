import { SessionStatus } from '@/generated/prisma'
import { Badge, Box, Button, Table, Text } from '@chakra-ui/react'
import NextLink from 'next/link'

interface ClientSession {
  id: string
  scheduledAt: Date
  duration: number
  status: SessionStatus
  topic: string | null
}

interface ClientSessionsTabProps {
  clientId: string
  sessions: ClientSession[]
}

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

/**
 * Компонент для отображения истории сессий клиента.
 */
export function ClientSessionsTab({ clientId, sessions }: ClientSessionsTabProps) {
  if (sessions.length === 0) {
    return (
      <Box textAlign="center" py={12}>
        <Text color="fg.muted" mb={4} fontSize="lg">
          Сессий с этим клиентом пока нет
        </Text>
        <Text color="fg.muted" mb={6}>
          Запланируйте первую сессию
        </Text>
        <Button asChild colorPalette="fg">
          <NextLink href={`/sessions/new?clientId=${clientId}`}>Запланировать сессию</NextLink>
        </Button>
      </Box>
    )
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Text fontSize="lg" fontWeight="medium">
          История сессий ({sessions.length})
        </Text>
        <Button asChild size="sm" colorPalette="fg">
          <NextLink href={`/sessions/new?clientId=${clientId}`}>Запланировать сессию</NextLink>
        </Button>
      </Box>

      <Box overflowX="auto">
        <Table.Root size="sm" variant="outline">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Дата и время</Table.ColumnHeader>
              <Table.ColumnHeader>Длительность</Table.ColumnHeader>
              <Table.ColumnHeader>Тема</Table.ColumnHeader>
              <Table.ColumnHeader>Статус</Table.ColumnHeader>
              <Table.ColumnHeader>Действия</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {sessions.map((session) => {
              const statusInfo = formatSessionStatus(session.status)
              return (
                <Table.Row key={session.id}>
                  <Table.Cell>
                    <Text fontSize="sm">{formatDateTime(session.scheduledAt)}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm">{formatDuration(session.duration)}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm" lineClamp={2} maxW="300px">
                      {session.topic || '—'}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge colorPalette={statusInfo.colorPalette}>{statusInfo.label}</Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Button asChild size="sm" variant="outline">
                      <NextLink href={`/sessions/${session.id}`}>Открыть</NextLink>
                    </Button>
                  </Table.Cell>
                </Table.Row>
              )
            })}
          </Table.Body>
        </Table.Root>
      </Box>
    </Box>
  )
}
