'use client'

import { Badge, Box, Heading, Icon, Text } from '@chakra-ui/react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { LuCircle, LuCircleCheck, LuClock } from 'react-icons/lu'

export interface TimelineEvent {
  /**
   * ID события
   */
  id: string

  /**
   * Заголовок события
   */
  title: string

  /**
   * Описание события
   */
  description?: string

  /**
   * Дата события
   */
  date: Date

  /**
   * Тип события
   */
  type: 'diagnostics' | 'integration' | 'strategy' | 'practice' | 'result' | 'session' | 'note'

  /**
   * Статус события
   */
  status?: 'completed' | 'in_progress' | 'planned'

  /**
   * Дополнительная информация
   */
  // oxlint-disable-next-line no-explicit-any
  metadata?: Record<string, unknown>
}

/**
 * Цвета для типов событий
 */
const eventColors = {
  diagnostics: '#FF6B6B',
  integration: '#667eea',
  strategy: '#4ECDC4',
  practice: '#FFE66D',
  result: '#95E1D3',
  session: '#F38181',
  note: '#A8A8A8',
} as const

/**
 * Названия типов событий
 */
const eventLabels = {
  diagnostics: 'Диагностика',
  integration: 'Интеграция',
  strategy: 'Стратегия',
  practice: 'Практика',
  result: 'Результат',
  session: 'Сессия',
  note: 'Заметка',
} as const

export interface TransformationTimelineProps {
  /**
   * События таймлайна
   */
  events: TimelineEvent[]

  /**
   * Показывать ли даты
   */
  showDates?: boolean
}

/**
 * Таймлайн трансформации для отображения истории изменений и прогресса
 */
export function TransformationTimeline({ events, showDates = true }: TransformationTimelineProps) {
  // Сортировка событий по дате (новые сверху)
  const sortedEvents = [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <Box position="relative">
      {/* Вертикальная линия */}
      <Box position="absolute" left="16px" top="8px" bottom="8px" width="2px" bg="gray.200" zIndex={0} />

      {/* События */}
      <Box display="flex" flexDirection="column" gap={6}>
        {sortedEvents.map((event) => {
          const color = eventColors[event.type]
          const label = eventLabels[event.type]

          return (
            <Box key={event.id} display="flex" gap={4} position="relative" zIndex={1}>
              {/* Иконка события */}
              <Box
                flexShrink={0}
                width="32px"
                height="32px"
                borderRadius="full"
                bg={color}
                display="flex"
                alignItems="center"
                justifyContent="center"
                border="3px solid white"
                boxShadow="sm"
              >
                <Icon color="white" fontSize="md">
                  {event.status === 'completed' ? (
                    <LuCircleCheck />
                  ) : event.status === 'in_progress' ? (
                    <LuClock />
                  ) : (
                    <LuCircle />
                  )}
                </Icon>
              </Box>

              {/* Содержимое события */}
              <Box
                flex="1"
                p={4}
                bg="white"
                borderRadius="md"
                border="1px solid"
                borderColor="gray.200"
                _hover={{
                  shadow: 'sm',
                  borderColor: color,
                }}
                transition="all 0.2s ease"
              >
                <Box display="flex" flexDirection="column" gap={2}>
                  {/* Заголовок и тип */}
                  <Box display="flex" alignItems="center" justifyContent="space-between" gap={3}>
                    <Heading size="sm" color={color}>
                      {event.title}
                    </Heading>
                    <Badge colorPalette={event.status === 'completed' ? 'green' : 'gray'} variant="subtle">
                      {label}
                    </Badge>
                  </Box>

                  {/* Описание */}
                  {event.description && (
                    <Text fontSize="sm" color="gray.600">
                      {event.description}
                    </Text>
                  )}

                  {/* Дата */}
                  {showDates && (
                    <Text fontSize="xs" color="gray.400">
                      {format(new Date(event.date), 'dd MMMM yyyy, HH:mm', { locale: ru })}
                    </Text>
                  )}

                  {/* Метаданные (опционально) */}
                  {event.metadata && Object.keys(event.metadata).length > 0 && (
                    <Box mt={2} fontSize="xs" color="gray.500">
                      {Object.entries(event.metadata).map(([key, value]) => (
                        <Box key={key}>
                          <Text as="span" fontWeight="medium">
                            {key}:
                          </Text>{' '}
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          )
        })}
      </Box>

      {/* Пустое состояние */}
      {events.length === 0 && (
        <Box textAlign="center" py={8}>
          <Text color="gray.500">История событий пока пуста</Text>
        </Box>
      )}
    </Box>
  )
}
