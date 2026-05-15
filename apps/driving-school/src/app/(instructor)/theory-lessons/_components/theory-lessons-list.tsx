'use client'

import { Badge, Button, Card, HStack, Icon, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { LuCalendar, LuClock, LuMapPin, LuUsers } from 'react-icons/lu'
import type { TheoryLessonWithDetails } from '../_actions/theory-lesson.action'

interface TheoryLessonsListProps {
  lessons: TheoryLessonWithDetails[]
}

const STATUS_CONFIG: Record<string, { label: string; colorPalette: string }> = {
  SCHEDULED: { label: 'Запланировано', colorPalette: 'blue' },
  IN_PROGRESS: { label: 'Идёт', colorPalette: 'green' },
  COMPLETED: { label: 'Завершено', colorPalette: 'gray' },
  CANCELLED: { label: 'Отменено', colorPalette: 'red' },
  RESCHEDULED: { label: 'Перенесено', colorPalette: 'orange' },
}

export function TheoryLessonsList({ lessons }: TheoryLessonsListProps) {
  return (
    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
      {lessons.map((lesson) => {
        const statusConfig = STATUS_CONFIG[lesson.status] || { label: lesson.status, colorPalette: 'gray' }
        const scheduledAt = new Date(lesson.scheduledAt)

        const dateStr = scheduledAt.toLocaleDateString('ru-RU', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })

        const timeStr = scheduledAt.toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
        })

        // Подсчёт посещаемости
        const totalMembers = lesson.group.members.length
        const presentCount = lesson.attendances.filter((a) => a.isPresent).length

        return (
          <Card.Root key={lesson.id}>
            <Card.Body>
              <VStack align="stretch" gap={3}>
                {/* Статус и группа */}
                <HStack justify="space-between">
                  <Text fontWeight="bold" fontSize="md" lineClamp={1}>
                    {lesson.topic.name}
                  </Text>
                  <Badge colorPalette={statusConfig.colorPalette}>{statusConfig.label}</Badge>
                </HStack>

                {/* Группа */}
                <Text fontSize="sm" color="fg.muted">
                  {lesson.group.name}
                </Text>

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
                {lesson.location && (
                  <HStack gap={1} color="fg.muted" fontSize="sm">
                    <Icon size="sm">
                      <LuMapPin />
                    </Icon>
                    <Text>{lesson.location}</Text>
                  </HStack>
                )}

                {/* Посещаемость */}
                <HStack gap={1} color="fg.muted" fontSize="sm">
                  <Icon size="sm">
                    <LuUsers />
                  </Icon>
                  <Text>
                    Присутствуют: {presentCount} / {totalMembers}
                  </Text>
                </HStack>
              </VStack>
            </Card.Body>

            <Card.Footer>
              <Button asChild colorPalette="brand" size="md" width="100%">
                <Link href={`/theory-lessons/${lesson.id}/attendance`}>Отметить посещаемость</Link>
              </Button>
            </Card.Footer>
          </Card.Root>
        )
      })}
    </SimpleGrid>
  )
}
