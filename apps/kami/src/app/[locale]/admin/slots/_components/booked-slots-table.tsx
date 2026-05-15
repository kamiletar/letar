import { Badge, Box, Button, Card, Heading, HStack, Icon, Table, Text, VStack } from '@chakra-ui/react'
import { Calendar, Lock, Trash, User } from 'lucide-react'
import Link from 'next/link'

interface BookedSlot {
  id: string
  startAt: Date
  endAt: Date
  type: string
  note: string | null
  calendarEventId: string | null
  request: {
    name: string
    email: string
    serviceType: string | null
  } | null
}

interface BookedSlotsTableProps {
  /** Локаль для ссылок */
  locale: string
  /** Список забронированных слотов */
  slots: BookedSlot[]
}

/**
 * Таблица забронированных слотов для админки
 */
export function BookedSlotsTable({ locale, slots }: BookedSlotsTableProps) {
  return (
    <Card.Root>
      <Card.Header>
        <HStack justify="space-between">
          <Heading size="md">Предстоящие слоты</Heading>
          <Button asChild variant="outline" size="sm">
            <Link href={`/${locale}/admin/slots/block`}>
              <Icon>
                <Lock />
              </Icon>
              Заблокировать время
            </Link>
          </Button>
        </HStack>
      </Card.Header>
      <Card.Body>
        {slots.length === 0 ? (
          <Text color="fg.muted">Нет предстоящих слотов</Text>
        ) : (
          <Box overflowX="auto">
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Дата и время</Table.ColumnHeader>
                  <Table.ColumnHeader>Тип</Table.ColumnHeader>
                  <Table.ColumnHeader>Клиент</Table.ColumnHeader>
                  <Table.ColumnHeader>Синхронизация</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">Действия</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {slots.map((slot) => (
                  <Table.Row key={slot.id}>
                    <Table.Cell>
                      <SlotDateTime startAt={slot.startAt} endAt={slot.endAt} />
                    </Table.Cell>
                    <Table.Cell>
                      <SlotTypeBadge type={slot.type} />
                    </Table.Cell>
                    <Table.Cell>
                      <SlotClientInfo request={slot.request} note={slot.note} />
                    </Table.Cell>
                    <Table.Cell>
                      <SyncStatusBadge calendarEventId={slot.calendarEventId} />
                    </Table.Cell>
                    <Table.Cell textAlign="right">
                      <Button variant="ghost" size="sm" colorPalette="red">
                        <Icon>
                          <Trash />
                        </Icon>
                      </Button>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Box>
        )}
      </Card.Body>
    </Card.Root>
  )
}

/** Дата и время слота */
function SlotDateTime({ startAt, endAt }: { startAt: Date; endAt: Date }) {
  return (
    <VStack align="start" gap={0}>
      <Text fontWeight="medium">
        {new Date(startAt).toLocaleDateString('ru-RU', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })}
      </Text>
      <Text fontSize="sm" color="fg.muted">
        {new Date(startAt).toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
        })}
        {' — '}
        {new Date(endAt).toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </VStack>
  )
}

/** Бейдж типа слота */
function SlotTypeBadge({ type }: { type: string }) {
  return (
    <Badge variant="subtle" colorPalette={type === 'booked' ? 'purple' : 'gray'}>
      <Icon boxSize={3}>{type === 'booked' ? <User /> : <Lock />}</Icon>
      {type === 'booked' ? 'Забронирован' : 'Заблокирован'}
    </Badge>
  )
}

/** Информация о клиенте */
function SlotClientInfo({ request, note }: { request: { name: string; email: string } | null; note: string | null }) {
  if (request) {
    return (
      <VStack align="start" gap={0}>
        <Text fontSize="sm">{request.name}</Text>
        <Text fontSize="xs" color="fg.muted">
          {request.email}
        </Text>
      </VStack>
    )
  }

  if (note) {
    return (
      <Text fontSize="sm" color="fg.muted">
        {note}
      </Text>
    )
  }

  return <Text color="fg.muted">—</Text>
}

/** Статус синхронизации с календарём */
function SyncStatusBadge({ calendarEventId }: { calendarEventId: string | null }) {
  if (calendarEventId) {
    return (
      <Badge variant="subtle" colorPalette="green">
        <Icon boxSize={3}>
          <Calendar />
        </Icon>
        Синхронизирован
      </Badge>
    )
  }

  return (
    <Badge variant="subtle" colorPalette="gray">
      Не синхронизирован
    </Badge>
  )
}
