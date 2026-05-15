'use client'

/**
 * Панель уроков для сплитскрин-режима
 *
 * Отображает ближайшие занятия между текущим пользователем
 * и собеседником в приватном чате.
 */

import { Avatar, Badge, Box, Button, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { use } from 'react'
import { LuCalendar, LuCar, LuClock, LuPlus } from 'react-icons/lu'

import { getPanelLessonsAction, type PanelLesson } from '../_actions/split-panel.action'

// Хелперы форматирования дат
function formatDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
  return date.toLocaleDateString('ru-RU', options)
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

interface LessonsPanelProps {
  /** ID текущего пользователя */
  userId: string
  /** ID собеседника (для фильтрации совместных уроков) */
  otherUserId?: string
}

export function LessonsPanel({ userId, otherUserId }: LessonsPanelProps) {
  // Загружаем уроки через React 19 use()
  const result = use(getPanelLessonsAction({ userId, otherUserId, limit: 5 }))

  if (!result.success) {
    return (
      <VStack p={4} gap={4}>
        <Text color="fg.muted">Не удалось загрузить уроки</Text>
      </VStack>
    )
  }

  const { lessons } = result

  return (
    <VStack p={4} gap={3} align="stretch">
      <HStack justify="space-between">
        <HStack gap={2}>
          <Icon color="fg.muted">
            <LuCalendar />
          </Icon>
          <Text fontWeight="medium">Ближайшие уроки</Text>
        </HStack>
        <Button asChild size="xs" variant="ghost">
          <Link href="/lessons/new">
            <LuPlus size={14} />
          </Link>
        </Button>
      </HStack>

      {lessons.length === 0 ? (
        <Box py={6} textAlign="center">
          <Text color="fg.muted" fontSize="sm">
            Нет запланированных занятий
          </Text>
          <Button asChild size="sm" variant="outline" mt={3}>
            <Link href="/lessons/new">
              <LuPlus size={14} />
              Запланировать
            </Link>
          </Button>
        </Box>
      ) : (
        <VStack gap={2} align="stretch">
          {lessons.map((lesson) => (
            <LessonCard key={lesson.id} lesson={lesson} />
          ))}

          {lessons.length >= 5 && (
            <Button asChild size="sm" variant="ghost" w="full">
              <Link href="/lessons">Все занятия →</Link>
            </Button>
          )}
        </VStack>
      )}
    </VStack>
  )
}

interface LessonCardProps {
  lesson: PanelLesson
}

function LessonCard({ lesson }: LessonCardProps) {
  const statusColors: Record<string, 'blue' | 'green' | 'gray'> = {
    PENDING: 'blue',
    CONFIRMED: 'green',
    COMPLETED: 'gray',
    CANCELLED: 'gray',
    NO_SHOW: 'gray',
    NEEDS_RESCHEDULE: 'gray',
    RESCHEDULED: 'gray',
  }

  const statusLabels: Record<string, string> = {
    PENDING: 'Ожидает',
    CONFIRMED: 'Подтверждено',
    COMPLETED: 'Завершено',
    CANCELLED: 'Отменено',
    NO_SHOW: 'Неявка',
    NEEDS_RESCHEDULE: 'Перенос',
    RESCHEDULED: 'Перенесено',
  }

  const startDate = new Date(lesson.startTime)
  const endDate = new Date(lesson.endTime)

  return (
    <Box borderWidth="1px" borderRadius="md" p={3} _hover={{ bg: 'bg.subtle' }} transition="background 0.2s">
      <Link href={`/lessons/${lesson.id}`}>
        <VStack gap={2} align="stretch">
          {/* Дата и статус */}
          <HStack justify="space-between">
            <Text fontSize="sm" fontWeight="medium">
              {formatDate(startDate, { weekday: 'short', day: 'numeric', month: 'short' })}
            </Text>
            <Badge colorPalette={statusColors[lesson.status]} size="sm">
              {statusLabels[lesson.status]}
            </Badge>
          </HStack>

          {/* Время */}
          <HStack gap={2} color="fg.muted">
            <Icon size="sm">
              <LuClock />
            </Icon>
            <Text fontSize="sm">
              {formatTime(startDate)} — {formatTime(endDate)}
            </Text>
          </HStack>

          {/* Участники */}
          <HStack gap={2}>
            {lesson.student && (
              <HStack gap={1}>
                <Avatar.Root size="2xs">
                  {lesson.student.image && <Avatar.Image src={lesson.student.image} />}
                  <Avatar.Fallback>{lesson.student.name.charAt(0)}</Avatar.Fallback>
                </Avatar.Root>
                <Text fontSize="xs" color="fg.muted">
                  {lesson.student.name}
                </Text>
              </HStack>
            )}
            {lesson.instructor && (
              <HStack gap={1}>
                <Avatar.Root size="2xs">
                  {lesson.instructor.image && <Avatar.Image src={lesson.instructor.image} />}
                  <Avatar.Fallback>{lesson.instructor.name.charAt(0)}</Avatar.Fallback>
                </Avatar.Root>
                <Text fontSize="xs" color="fg.muted">
                  {lesson.instructor.name}
                </Text>
              </HStack>
            )}
          </HStack>

          {/* Автомобиль */}
          {lesson.vehicle && (
            <HStack gap={2} color="fg.muted">
              <Icon size="sm">
                <LuCar />
              </Icon>
              <Text fontSize="xs">
                {lesson.vehicle.brand} {lesson.vehicle.model}
              </Text>
            </HStack>
          )}
        </VStack>
      </Link>
    </Box>
  )
}
