'use client'

import { Badge, Button, Card, HStack, Icon, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { LuCalendar, LuClock, LuMapPin, LuUsers } from 'react-icons/lu'
import type { ExamSessionWithDetails } from '../_actions/exam.action'
import { EXAM_TYPE_LABELS } from '../_constants/exam-types'

interface ExamSessionsListProps {
  sessions: ExamSessionWithDetails[]
}

const STATUS_CONFIG: Record<string, { label: string; colorPalette: string }> = {
  SCHEDULED: { label: 'Запланирован', colorPalette: 'blue' },
  IN_PROGRESS: { label: 'Идёт', colorPalette: 'green' },
  COMPLETED: { label: 'Завершён', colorPalette: 'gray' },
  CANCELLED: { label: 'Отменён', colorPalette: 'red' },
}

export function ExamSessionsList({ sessions }: ExamSessionsListProps) {
  return (
    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
      {sessions.map((session) => {
        const statusConfig = STATUS_CONFIG[session.status] || { label: session.status, colorPalette: 'gray' }
        const scheduledAt = new Date(session.scheduledAt)

        const dateStr = scheduledAt.toLocaleDateString('ru-RU', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })

        const timeStr = scheduledAt.toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
        })

        // Подсчёт результатов
        // ZenStack v3: _count не поддерживается, используем registrationsCount
        const totalRegistrations = session.registrationsCount ?? session.registrations.length
        const passedCount = session.registrations.filter((r) => r.attempt?.result === 'PASSED').length
        const failedCount = session.registrations.filter((r) => r.attempt?.result === 'FAILED').length
        const pendingCount = session.registrations.filter((r) => !r.attempt).length

        return (
          <Card.Root key={session.id}>
            <Card.Body>
              <VStack align="stretch" gap={3}>
                {/* Тип экзамена и статус */}
                <HStack justify="space-between">
                  <Text fontWeight="bold" fontSize="md">
                    {EXAM_TYPE_LABELS[session.type] || session.type}
                  </Text>
                  <Badge colorPalette={statusConfig.colorPalette}>{statusConfig.label}</Badge>
                </HStack>

                {/* Категория */}
                <Badge colorPalette="purple" alignSelf="flex-start">
                  Категория {session.category}
                </Badge>

                {/* Дата и время */}
                <HStack gap={4} color="fg.muted" fontSize="sm">
                  <HStack gap={1}>
                    <Icon size="sm">
                      <LuCalendar />
                    </Icon>
                    <Text>{dateStr}</Text>
                  </HStack>
                  <HStack gap={1}>
                    <Icon size="sm">
                      <LuClock />
                    </Icon>
                    <Text>{timeStr}</Text>
                  </HStack>
                </HStack>

                {/* Место */}
                {session.location && (
                  <HStack gap={1} color="fg.muted" fontSize="sm">
                    <Icon size="sm">
                      <LuMapPin />
                    </Icon>
                    <Text>{session.location}</Text>
                  </HStack>
                )}

                {/* Количество записавшихся */}
                <HStack gap={1} color="fg.muted" fontSize="sm">
                  <Icon size="sm">
                    <LuUsers />
                  </Icon>
                  <Text>
                    Записано: {totalRegistrations} / {session.maxStudents}
                  </Text>
                </HStack>

                {/* Результаты (если есть) */}
                {(passedCount > 0 || failedCount > 0) && (
                  <HStack gap={2} fontSize="sm">
                    <Badge colorPalette="green">Сдали: {passedCount}</Badge>
                    <Badge colorPalette="red">Не сдали: {failedCount}</Badge>
                    {pendingCount > 0 && <Badge colorPalette="yellow">Ожидают: {pendingCount}</Badge>}
                  </HStack>
                )}
              </VStack>
            </Card.Body>

            <Card.Footer>
              <Button asChild colorPalette="brand" size="md" width="100%">
                <Link href={`/exams/${session.id}/results`}>Результаты</Link>
              </Button>
            </Card.Footer>
          </Card.Root>
        )
      })}
    </SimpleGrid>
  )
}
