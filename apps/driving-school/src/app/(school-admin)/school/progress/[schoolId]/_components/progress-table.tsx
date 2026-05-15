'use client'

import { Avatar, Badge, Box, EmptyState, HStack, IconButton, Table, Text, VStack } from '@chakra-ui/react'
import type { DocumentsStatus, ProgressStatus, TheoryStatus } from '@letar/driving-school-db/prisma'
import Link from 'next/link'
import { LuClipboardList, LuEye, LuUsers } from 'react-icons/lu'

import type { StudentProgressSummary } from '../../_actions/progress.action'

// Конфигурация статусов
const PROGRESS_STATUS_CONFIG: Record<ProgressStatus, { label: string; color: string }> = {
  ACTIVE: { label: 'Активный', color: 'green' },
  COMPLETED: { label: 'Завершено', color: 'blue' },
  EXPELLED: { label: 'Отчислен', color: 'red' },
  SUSPENDED: { label: 'Приостановлен', color: 'yellow' },
}

const DOCUMENTS_STATUS_CONFIG: Record<DocumentsStatus, { label: string; color: string }> = {
  NOT_STARTED: { label: 'Не начато', color: 'gray' },
  IN_PROGRESS: { label: 'В процессе', color: 'yellow' },
  READY: { label: 'Готовы', color: 'green' },
}

const THEORY_STATUS_CONFIG: Record<TheoryStatus, { label: string; color: string }> = {
  NOT_STARTED: { label: 'Не начато', color: 'gray' },
  IN_PROGRESS: { label: 'В процессе', color: 'yellow' },
  COMPLETED: { label: 'Завершено', color: 'green' },
  FAILED: { label: 'Не сдано', color: 'red' },
}

interface ProgressTableProps {
  students: StudentProgressSummary[]
  schoolId: string
}

export function ProgressTable({ students, schoolId }: ProgressTableProps) {
  if (students.length === 0) {
    return (
      <EmptyState.Root>
        <EmptyState.Content>
          <EmptyState.Indicator>
            <LuUsers />
          </EmptyState.Indicator>
          <EmptyState.Title>Нет учеников</EmptyState.Title>
          <EmptyState.Description>Добавьте ученика для отслеживания прогресса обучения</EmptyState.Description>
        </EmptyState.Content>
      </EmptyState.Root>
    )
  }

  return (
    <Box overflowX="auto">
      <Table.Root variant="outline" size="sm">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Ученик</Table.ColumnHeader>
            <Table.ColumnHeader>Статус</Table.ColumnHeader>
            <Table.ColumnHeader>Документы</Table.ColumnHeader>
            <Table.ColumnHeader>Теория</Table.ColumnHeader>
            <Table.ColumnHeader>Категории</Table.ColumnHeader>
            <Table.ColumnHeader>Прогресс</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="right">Действия</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {students.map((student) => (
            <StudentRow key={student.id} student={student} schoolId={schoolId} />
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  )
}

interface StudentRowProps {
  student: StudentProgressSummary
  schoolId: string
}

function StudentRow({ student, schoolId }: StudentRowProps) {
  const progressConfig = PROGRESS_STATUS_CONFIG[student.status]
  const docsConfig = DOCUMENTS_STATUS_CONFIG[student.documentsStatus]
  const theoryConfig = THEORY_STATUS_CONFIG[student.theoryStatus]

  const enrollDate = new Date(student.enrolledAt).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <Table.Row>
      <Table.Cell>
        <HStack gap={3}>
          <Avatar.Root size="sm">
            <Avatar.Image src={student.user.image || undefined} />
            <Avatar.Fallback name={student.user.name || ''} />
          </Avatar.Root>
          <VStack align="start" gap={0}>
            <Text fontWeight="medium">{student.user.name || 'Без имени'}</Text>
            <Text fontSize="xs" color="fg.muted">
              {student.user.email || student.user.phone}
            </Text>
            <Text fontSize="xs" color="fg.muted">
              с {enrollDate}
            </Text>
          </VStack>
        </HStack>
      </Table.Cell>

      <Table.Cell>
        <Badge colorPalette={progressConfig.color} size="sm">
          {progressConfig.label}
        </Badge>
      </Table.Cell>

      <Table.Cell>
        <VStack align="start" gap={1}>
          <Badge colorPalette={docsConfig.color} size="sm">
            {docsConfig.label}
          </Badge>
          {student.documentsLocation && (
            <Text fontSize="xs" color="fg.muted">
              {student.documentsLocation.name}
            </Text>
          )}
        </VStack>
      </Table.Cell>

      <Table.Cell>
        <VStack align="start" gap={1}>
          <Badge colorPalette={theoryConfig.color} size="sm">
            {theoryConfig.label}
          </Badge>
          {student.studyGroup && (
            <Text fontSize="xs" color="fg.muted">
              {student.studyGroup.name}
            </Text>
          )}
        </VStack>
      </Table.Cell>

      <Table.Cell>
        <HStack gap={1} wrap="wrap">
          {student.categories.map((cat) => (
            <Badge key={cat.id} colorPalette="purple" variant="subtle" size="sm">
              {cat.category}
              {cat.transmissionRestriction && ` (${cat.transmissionRestriction === 'AUTOMATIC' ? 'АТ' : 'МТ'})`}
            </Badge>
          ))}
          {student.categories.length === 0 && (
            <Text fontSize="xs" color="fg.muted">
              —
            </Text>
          )}
        </HStack>
      </Table.Cell>

      <Table.Cell>
        <HStack gap={2}>
          <Box w="60px" h="6px" bg="bg.emphasized" borderRadius="full" overflow="hidden">
            <Box
              w={`${student.overallProgress}%`}
              h="100%"
              bg={
                student.overallProgress >= 75
                  ? 'green.solid'
                  : student.overallProgress >= 50
                    ? 'yellow.solid'
                    : 'red.solid'
              }
              borderRadius="full"
            />
          </Box>
          <Text fontSize="xs" fontWeight="medium">
            {student.overallProgress}%
          </Text>
        </HStack>
      </Table.Cell>

      <Table.Cell textAlign="right">
        <HStack gap={1} justify="flex-end">
          <IconButton aria-label="Подробнее" variant="ghost" size="sm" asChild>
            <Link href={`/school/progress/student/${student.id}?schoolId=${schoolId}`}>
              <LuEye />
            </Link>
          </IconButton>
          <IconButton aria-label="Записать на курс" variant="ghost" size="sm" asChild>
            <Link href={`/school/progress/student/${student.id}/enroll?schoolId=${schoolId}`}>
              <LuClipboardList />
            </Link>
          </IconButton>
        </HStack>
      </Table.Cell>
    </Table.Row>
  )
}
