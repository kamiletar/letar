'use client'

/**
 * Панель расписания для сплитскрин-режима
 *
 * Отображает расписание учебной группы или школы.
 */

import { Avatar, Badge, Box, Button, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { use } from 'react'
import { LuCalendar } from 'react-icons/lu'

import { getPanelScheduleAction, type PanelLesson } from '../_actions/split-panel.action'

// Хелперы форматирования дат
function formatDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
  return date.toLocaleDateString('ru-RU', options)
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

interface SchedulePanelProps {
  /** ID учебной группы */
  studyGroupId?: string
  /** ID организации (школы) */
  organizationId?: string
}

export function SchedulePanel({ studyGroupId, organizationId }: SchedulePanelProps) {
  // Загружаем расписание через React 19 use()
  const result = use(getPanelScheduleAction({ studyGroupId, organizationId, limit: 10 }))

  if (!result.success) {
    return (
      <VStack p={4} gap={4}>
        <Text color="fg.muted">Не удалось загрузить расписание</Text>
      </VStack>
    )
  }

  const { lessons } = result

  // Группируем уроки по дням
  const lessonsByDay = lessons.reduce(
    (acc, lesson) => {
      const dateKey = formatDate(new Date(lesson.startTime), { day: 'numeric', month: 'short' })
      if (!acc[dateKey]) {
        acc[dateKey] = []
      }
      acc[dateKey].push(lesson)
      return acc
    },
    {} as Record<string, PanelLesson[]>
  )

  return (
    <VStack p={4} gap={3} align="stretch">
      <HStack gap={2}>
        <Icon color="fg.muted">
          <LuCalendar />
        </Icon>
        <Text fontWeight="medium">Расписание</Text>
      </HStack>

      {lessons.length === 0 ? (
        <Box py={6} textAlign="center">
          <Text color="fg.muted" fontSize="sm">
            Нет запланированных занятий
          </Text>
        </Box>
      ) : (
        <VStack gap={4} align="stretch">
          {Object.entries(lessonsByDay).map(([date, dayLessons]) => (
            <Box key={date}>
              <Text fontSize="xs" fontWeight="medium" color="fg.muted" mb={2}>
                {date}
              </Text>
              <VStack gap={2} align="stretch">
                {dayLessons.map((lesson) => (
                  <ScheduleCard key={lesson.id} lesson={lesson} />
                ))}
              </VStack>
            </Box>
          ))}

          {lessons.length >= 10 && (
            <Button asChild size="sm" variant="ghost" w="full">
              <Link href="/schedule">Полное расписание →</Link>
            </Button>
          )}
        </VStack>
      )}
    </VStack>
  )
}

interface ScheduleCardProps {
  lesson: PanelLesson
}

function ScheduleCard({ lesson }: ScheduleCardProps) {
  const startDate = new Date(lesson.startTime)
  const endDate = new Date(lesson.endTime)

  const statusColors: Record<string, 'blue' | 'green' | 'gray'> = {
    PENDING: 'blue',
    CONFIRMED: 'green',
    COMPLETED: 'gray',
    CANCELLED: 'gray',
    NO_SHOW: 'gray',
    NEEDS_RESCHEDULE: 'gray',
    RESCHEDULED: 'gray',
  }

  return (
    <Box borderWidth="1px" borderRadius="md" p={2} _hover={{ bg: 'bg.subtle' }} transition="background 0.2s">
      <Link href={`/lessons/${lesson.id}`}>
        <HStack gap={3}>
          {/* Время */}
          <Box minW="70px">
            <Text fontSize="sm" fontWeight="medium">
              {formatTime(startDate)}
            </Text>
            <Text fontSize="xs" color="fg.muted">
              {formatTime(endDate)}
            </Text>
          </Box>

          {/* Участники */}
          <VStack gap={1} align="start" flex={1}>
            {lesson.student && (
              <HStack gap={1}>
                <Avatar.Root size="2xs">
                  {lesson.student.image && <Avatar.Image src={lesson.student.image} />}
                  <Avatar.Fallback>{lesson.student.name.charAt(0)}</Avatar.Fallback>
                </Avatar.Root>
                <Text fontSize="xs" truncate maxW="100px">
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
                <Text fontSize="xs" color="fg.muted" truncate maxW="100px">
                  {lesson.instructor.name}
                </Text>
              </HStack>
            )}
          </VStack>

          {/* Статус */}
          <Badge colorPalette={statusColors[lesson.status]} size="sm" variant="subtle">
            {lesson.status === 'CONFIRMED' ? '✓' : '○'}
          </Badge>
        </HStack>
      </Link>
    </Box>
  )
}
