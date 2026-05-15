'use client'

import { Badge, Box, Card, EmptyState, HStack, IconButton, Table, Text, VStack } from '@chakra-ui/react'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { LuCalendar, LuPencil, LuPlay, LuSquareCheck, LuTrash2 } from 'react-icons/lu'

import { toaster } from '@/app/_components/ui/toaster'
import { TheoryLessonStatusLabels } from '@letar/driving-school-db/form-schemas/enums/TheoryLessonStatus.form'
import type { TheoryLessonStatus } from '@letar/driving-school-db/prisma'

import type { TheoryLessonSummary } from '../_actions/theory-lesson.action'
import {
  completeTheoryLessonAction,
  deleteTheoryLessonAction,
  startTheoryLessonAction,
} from '../_actions/theory-lesson.action'

const statusColors: Record<TheoryLessonStatus, string> = {
  SCHEDULED: 'blue',
  IN_PROGRESS: 'orange',
  COMPLETED: 'green',
  CANCELLED: 'red',
  RESCHEDULED: 'gray',
}

interface TheoryLessonsListProps {
  lessons: TheoryLessonSummary[]
  schoolId: string
  groupId?: string
}

export function TheoryLessonsList({ lessons, schoolId, groupId }: TheoryLessonsListProps) {
  if (lessons.length === 0) {
    return (
      <EmptyState.Root>
        <EmptyState.Content>
          <EmptyState.Indicator>
            <LuCalendar />
          </EmptyState.Indicator>
          <EmptyState.Title>Нет занятий</EmptyState.Title>
          <EmptyState.Description>
            {groupId ? 'Создайте первое занятие для этой группы' : 'В школе пока нет теоретических занятий'}
          </EmptyState.Description>
        </EmptyState.Content>
      </EmptyState.Root>
    )
  }

  // Группируем по статусу
  const upcomingLessons = lessons.filter((l) => l.status === 'SCHEDULED' || l.status === 'IN_PROGRESS')
  const pastLessons = lessons.filter(
    (l) => l.status === 'COMPLETED' || l.status === 'CANCELLED' || l.status === 'RESCHEDULED'
  )

  return (
    <VStack gap={6} align="stretch">
      {/* Предстоящие занятия */}
      {upcomingLessons.length > 0 && (
        <Box>
          <Text fontSize="lg" fontWeight="semibold" mb={4}>
            Предстоящие занятия ({upcomingLessons.length})
          </Text>
          <Card.Root>
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Дата и время</Table.ColumnHeader>
                  {!groupId && <Table.ColumnHeader>Группа</Table.ColumnHeader>}
                  <Table.ColumnHeader>Тема</Table.ColumnHeader>
                  <Table.ColumnHeader>Статус</Table.ColumnHeader>
                  <Table.ColumnHeader>Место</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">Действия</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {upcomingLessons.map((lesson) => (
                  <LessonRow key={lesson.id} lesson={lesson} schoolId={schoolId} showGroup={!groupId} />
                ))}
              </Table.Body>
            </Table.Root>
          </Card.Root>
        </Box>
      )}

      {/* Прошедшие занятия */}
      {pastLessons.length > 0 && (
        <Box>
          <Text fontSize="lg" fontWeight="semibold" mb={4} color="fg.muted">
            Прошедшие занятия ({pastLessons.length})
          </Text>
          <Card.Root opacity={0.8}>
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Дата и время</Table.ColumnHeader>
                  {!groupId && <Table.ColumnHeader>Группа</Table.ColumnHeader>}
                  <Table.ColumnHeader>Тема</Table.ColumnHeader>
                  <Table.ColumnHeader>Статус</Table.ColumnHeader>
                  <Table.ColumnHeader>Посещаемость</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">Действия</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {pastLessons.map((lesson) => (
                  <LessonRow key={lesson.id} lesson={lesson} schoolId={schoolId} showGroup={!groupId} showAttendance />
                ))}
              </Table.Body>
            </Table.Root>
          </Card.Root>
        </Box>
      )}
    </VStack>
  )
}

interface LessonRowProps {
  lesson: TheoryLessonSummary
  schoolId: string
  showGroup?: boolean
  showAttendance?: boolean
}

function LessonRow({ lesson, schoolId, showGroup, showAttendance }: LessonRowProps) {
  const queryClient = useQueryClient()
  const handleStart = async () => {
    const result = await startTheoryLessonAction(lesson.id)
    if (result.success) {
      toaster.success({ title: 'Занятие начато' })
      // Автоматически обновить список занятий
      queryClient.invalidateQueries({ queryKey: ['TheoryLesson'] })
    } else {
      toaster.error({ title: 'Ошибка', description: 'Не удалось начать занятие' })
    }
  }

  const handleComplete = async () => {
    const result = await completeTheoryLessonAction(lesson.id)
    if (result.success) {
      toaster.success({ title: 'Занятие завершено' })
      // Автоматически обновить список занятий
      queryClient.invalidateQueries({ queryKey: ['TheoryLesson'] })
    } else {
      toaster.error({ title: 'Ошибка', description: 'Не удалось завершить занятие' })
    }
  }

  const handleDelete = async () => {
    const result = await deleteTheoryLessonAction(lesson.id)
    if (result.success) {
      toaster.success({ title: 'Занятие удалено' })
      // Автоматически обновить список занятий
      queryClient.invalidateQueries({ queryKey: ['TheoryLesson'] })
    } else {
      toaster.error({
        title: 'Ошибка',
        description: result.message || 'Не удалось удалить занятие',
      })
    }
  }

  const dateText = new Date(lesson.scheduledAt).toLocaleDateString('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
  const timeText = new Date(lesson.scheduledAt).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const isEditable = lesson.status === 'SCHEDULED'
  const canStart = lesson.status === 'SCHEDULED'
  const canComplete = lesson.status === 'IN_PROGRESS' || lesson.status === 'SCHEDULED'

  return (
    <Table.Row>
      <Table.Cell>
        <Box>
          <Text fontWeight="medium">{dateText}</Text>
          <Text fontSize="sm" color="fg.muted">
            {timeText} ({lesson.duration} мин)
          </Text>
        </Box>
      </Table.Cell>
      {showGroup && (
        <Table.Cell>
          <Text>{lesson.groupName}</Text>
        </Table.Cell>
      )}
      <Table.Cell>
        <Text lineClamp={1}>{lesson.topicName}</Text>
      </Table.Cell>
      <Table.Cell>
        <Badge colorPalette={statusColors[lesson.status]} size="sm">
          {TheoryLessonStatusLabels[lesson.status]}
        </Badge>
      </Table.Cell>
      {showAttendance ? (
        <Table.Cell>
          {lesson.status === 'COMPLETED' ? (
            <Text fontSize="sm">
              {lesson.attendeesCount} / {lesson.totalMembers}
            </Text>
          ) : (
            <Text color="fg.muted" fontSize="sm">
              —
            </Text>
          )}
        </Table.Cell>
      ) : (
        <Table.Cell>
          <Text fontSize="sm" color="fg.muted">
            {lesson.location || '—'}
          </Text>
        </Table.Cell>
      )}
      <Table.Cell textAlign="right">
        <HStack gap={1} justify="flex-end">
          {canStart && (
            <IconButton
              aria-label="Начать занятие"
              variant="ghost"
              size="sm"
              colorPalette="green"
              onClick={handleStart}
              title="Начать"
            >
              <LuPlay />
            </IconButton>
          )}
          {canComplete && lesson.status === 'IN_PROGRESS' && (
            <IconButton
              aria-label="Завершить занятие"
              variant="ghost"
              size="sm"
              colorPalette="green"
              onClick={handleComplete}
              title="Завершить"
            >
              <LuSquareCheck />
            </IconButton>
          )}
          {isEditable && (
            <>
              <IconButton aria-label="Редактировать занятие" variant="ghost" size="sm" asChild title="Редактировать">
                <Link href={`/school/theory-lessons/lesson/${lesson.id}?schoolId=${schoolId}`}>
                  <LuPencil />
                </Link>
              </IconButton>
              <IconButton
                aria-label="Удалить занятие"
                variant="ghost"
                size="sm"
                colorPalette="red"
                onClick={handleDelete}
                title="Удалить"
              >
                <LuTrash2 />
              </IconButton>
            </>
          )}
        </HStack>
      </Table.Cell>
    </Table.Row>
  )
}
