'use client'

import { Badge, Box, Button, Card, Heading, Icon, Text } from '@chakra-ui/react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import Link from 'next/link'
import { LuCalendar, LuClock, LuUser } from 'react-icons/lu'

export interface SessionCardProps {
  /**
   * ID сессии
   */
  id: string

  /**
   * Заголовок сессии
   */
  title: string

  /**
   * Дата и время сессии
   */
  scheduledAt: Date

  /**
   * Длительность сессии (минуты)
   */
  duration?: number

  /**
   * Статус сессии
   */
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

  /**
   * Имя клиента
   */
  clientName?: string

  /**
   * Заметки (первые 100 символов)
   */
  notes?: string | null

  /**
   * Показывать ли кнопку "Подробнее"
   */
  showDetailsButton?: boolean
}

/**
 * Цвета для статусов сессий
 */
const statusColors = {
  SCHEDULED: { color: 'blue', label: 'Запланирована' },
  IN_PROGRESS: { color: 'orange', label: 'Идет' },
  COMPLETED: { color: 'green', label: 'Завершена' },
  CANCELLED: { color: 'red', label: 'Отменена' },
} as const

/**
 * Карточка сессии для списков и таймлайнов
 */
export function SessionCard({
  id,
  title,
  scheduledAt,
  duration = 60,
  status,
  clientName,
  notes,
  showDetailsButton = true,
}: SessionCardProps) {
  const statusInfo = statusColors[status]

  return (
    <Card.Root
      borderLeft="4px solid"
      borderColor={`${statusInfo.color}.500`}
      transition="all 0.2s ease"
      _hover={{
        shadow: 'md',
      }}
    >
      <Card.Body>
        <Box display="flex" flexDirection="column" gap={3}>
          {/* Заголовок и статус */}
          <Box display="flex" alignItems="start" justifyContent="space-between" gap={3}>
            <Heading size="sm" flex="1">
              {title}
            </Heading>
            <Badge colorPalette={statusInfo.color} variant="solid">
              {statusInfo.label}
            </Badge>
          </Box>

          {/* Информация о сессии */}
          <Box display="flex" flexDirection="column" gap={2}>
            {/* Дата */}
            <Box display="flex" alignItems="center" gap={2} fontSize="sm" color="gray.600">
              <Icon fontSize="md">
                <LuCalendar />
              </Icon>
              <Text>{format(new Date(scheduledAt), 'dd MMMM yyyy', { locale: ru })}</Text>
            </Box>

            {/* Время */}
            <Box display="flex" alignItems="center" gap={2} fontSize="sm" color="gray.600">
              <Icon fontSize="md">
                <LuClock />
              </Icon>
              <Text>
                {format(new Date(scheduledAt), 'HH:mm', { locale: ru })} ({duration} мин)
              </Text>
            </Box>

            {/* Клиент */}
            {clientName && (
              <Box display="flex" alignItems="center" gap={2} fontSize="sm" color="gray.600">
                <Icon fontSize="md">
                  <LuUser />
                </Icon>
                <Text>{clientName}</Text>
              </Box>
            )}
          </Box>

          {/* Заметки (превью) */}
          {notes && (
            <Text fontSize="sm" color="gray.500" lineClamp={2}>
              {notes}
            </Text>
          )}

          {/* Кнопка "Подробнее" */}
          {showDetailsButton && (
            <Box display="flex" justifyContent="flex-end" mt={2}>
              <Button asChild size="sm" variant="outline" colorPalette="fg">
                <Link href={`/sessions/${id}`}>Подробнее</Link>
              </Button>
            </Box>
          )}
        </Box>
      </Card.Body>
    </Card.Root>
  )
}
