import { Badge, Box, Button, Card, Heading, HStack, Icon, Table, Text } from '@chakra-ui/react'
import { Calendar, Clock, Plus, Trash } from 'lucide-react'
import Link from 'next/link'

/** Названия дней недели */
const dayNames = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота']

/** Форматирует минуты в HH:MM */
function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

interface AvailabilityRule {
  id: string
  dayOfWeek: number | null
  startTime: number
  endTime: number
  slotDuration: number
  breakDuration: number
  isActive: boolean
}

interface AvailabilityRulesTableProps {
  /** Локаль для ссылок */
  locale: string
  /** Список правил доступности */
  rules: AvailabilityRule[]
}

/**
 * Таблица правил доступности для админки слотов
 */
export function AvailabilityRulesTable({ locale, rules }: AvailabilityRulesTableProps) {
  return (
    <Card.Root>
      <Card.Header>
        <HStack justify="space-between">
          <Heading size="md">Расписание доступности</Heading>
          <Button asChild variant="outline" size="sm">
            <Link href={`/${locale}/admin/slots/rules/new`}>
              <Icon>
                <Plus />
              </Icon>
              Добавить правило
            </Link>
          </Button>
        </HStack>
      </Card.Header>
      <Card.Body>
        {rules.length === 0 ? (
          <Text color="fg.muted">Правила доступности не настроены</Text>
        ) : (
          <Box overflowX="auto">
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>День</Table.ColumnHeader>
                  <Table.ColumnHeader>Время</Table.ColumnHeader>
                  <Table.ColumnHeader>Слот</Table.ColumnHeader>
                  <Table.ColumnHeader>Статус</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">Действия</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {rules.map((rule) => (
                  <Table.Row key={rule.id}>
                    <Table.Cell>
                      <HStack gap={2}>
                        <Icon boxSize={4} color="fg.muted">
                          <Calendar />
                        </Icon>
                        <Text>{rule.dayOfWeek !== null ? dayNames[rule.dayOfWeek] : 'Разовое правило'}</Text>
                      </HStack>
                    </Table.Cell>
                    <Table.Cell>
                      <HStack gap={2}>
                        <Icon boxSize={4} color="fg.muted">
                          <Clock />
                        </Icon>
                        <Text>
                          {formatTime(rule.startTime)} — {formatTime(rule.endTime)}
                        </Text>
                      </HStack>
                    </Table.Cell>
                    <Table.Cell>
                      <Text fontSize="sm" color="fg.muted">
                        {rule.slotDuration} мин + {rule.breakDuration} мин перерыв
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge variant="subtle" colorPalette={rule.isActive ? 'green' : 'gray'}>
                        {rule.isActive ? 'Активно' : 'Неактивно'}
                      </Badge>
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
