'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Badge, Box, Button, Card, HStack, Progress, Text, VStack } from '@chakra-ui/react'
import type { ApprovalStatus, PracticeStatus } from '@letar/driving-school-db/prisma'
import { useState } from 'react'
import { LuCar, LuPlay, LuSend } from 'react-icons/lu'

import { requestInstructorApprovalAction, updatePracticeStatusAction } from '../../../_actions/practice.action'
import type { StudentProgressDetails } from '../../../_actions/progress.action'
import type { CategoryProgressSummary } from '../../../_lib/category-transformer'

const PRACTICE_STATUS_CONFIG: Record<PracticeStatus, { label: string; color: string }> = {
  NOT_STARTED: { label: 'Не начато', color: 'gray' },
  IN_PROGRESS: { label: 'В процессе', color: 'yellow' },
  COMPLETED: { label: 'Завершено', color: 'green' },
}

const APPROVAL_STATUS_CONFIG: Record<ApprovalStatus, { label: string; color: string }> = {
  NOT_REQUESTED: { label: 'Не запрошен', color: 'gray' },
  REQUESTED: { label: 'Ожидает', color: 'yellow' },
  APPROVED: { label: 'Одобрен', color: 'green' },
  DENIED: { label: 'Отклонён', color: 'red' },
}

interface PracticeSectionProps {
  progress: StudentProgressDetails
  onRefresh: () => void
}

export function PracticeSection({ progress, onRefresh }: PracticeSectionProps) {
  if (progress.categories.length === 0) {
    return (
      <Card.Root>
        <Card.Header>
          <HStack gap={2}>
            <LuCar size={20} />
            <Text fontWeight="semibold">Практика</Text>
          </HStack>
        </Card.Header>
        <Card.Body>
          <Text color="fg.muted">Нет записей на категории</Text>
        </Card.Body>
      </Card.Root>
    )
  }

  return (
    <Card.Root>
      <Card.Header>
        <HStack gap={2}>
          <LuCar size={20} />
          <Text fontWeight="semibold">Практика по категориям</Text>
        </HStack>
      </Card.Header>
      <Card.Body>
        <VStack align="stretch" gap={4}>
          {progress.categories.map((cat) => (
            <CategoryPracticeCard key={cat.id} category={cat} onRefresh={onRefresh} />
          ))}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}

interface CategoryPracticeCardProps {
  category: CategoryProgressSummary
  onRefresh: () => void
}

function CategoryPracticeCard({ category, onRefresh }: CategoryPracticeCardProps) {
  const [isUpdating, setIsUpdating] = useState(false)

  const practiceConfig = PRACTICE_STATUS_CONFIG[category.practiceStatus]
  const approvalConfig = APPROVAL_STATUS_CONFIG[category.instructorApprovalStatus]

  const progressPercent =
    category.lessonsTotal > 0 ? Math.round((category.lessonsCompleted / category.lessonsTotal) * 100) : 0

  const handleStartPractice = async () => {
    setIsUpdating(true)
    const result = await updatePracticeStatusAction({
      categoryProgressId: category.id,
      status: 'IN_PROGRESS',
    })
    setIsUpdating(false)

    if (result.success) {
      toaster.success({ title: 'Практика начата' })
      onRefresh()
    } else {
      toaster.error({ title: 'Ошибка', description: result.message })
    }
  }

  const handleRequestApproval = async () => {
    setIsUpdating(true)
    const result = await requestInstructorApprovalAction(category.id)
    setIsUpdating(false)

    if (result.success) {
      toaster.success({ title: 'Запрос отправлен инструктору' })
      onRefresh()
    } else {
      toaster.error({ title: 'Ошибка', description: result.message })
    }
  }

  return (
    <Box p={4} borderWidth="1px" borderColor="border.muted" borderRadius="lg">
      <VStack align="stretch" gap={3}>
        {/* Заголовок */}
        <HStack justify="space-between">
          <HStack gap={2}>
            <Badge colorPalette="purple" size="lg">
              {category.category}
              {category.transmissionRestriction &&
                ` (${category.transmissionRestriction === 'AUTOMATIC' ? 'АТ' : 'МТ'})`}
            </Badge>
            <Badge colorPalette={practiceConfig.color} size="sm">
              {practiceConfig.label}
            </Badge>
          </HStack>

          {category.instructor && (
            <Text fontSize="sm" color="fg.muted">
              Инструктор: {category.instructor.name}
            </Text>
          )}
        </HStack>

        {/* Прогресс занятий */}
        <VStack align="stretch" gap={1}>
          <HStack justify="space-between">
            <Text fontSize="sm">Занятия</Text>
            <Text fontSize="sm" fontWeight="medium">
              {category.lessonsCompleted} / {category.lessonsTotal}
            </Text>
          </HStack>
          <Progress.Root value={progressPercent} size="sm">
            <Progress.Track>
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>
        </VStack>

        {/* Допуск к экзамену */}
        <HStack justify="space-between">
          <Text fontSize="sm" color="fg.muted">
            Допуск к ГИБДД:
          </Text>
          <Badge colorPalette={approvalConfig.color} size="sm">
            {approvalConfig.label}
          </Badge>
        </HStack>

        {/* Кнопки действий */}
        <HStack gap={3} pt={2}>
          {category.practiceStatus === 'NOT_STARTED' && (
            <Button size="sm" colorPalette="brand" onClick={handleStartPractice} disabled={isUpdating}>
              <LuPlay />
              Начать практику
            </Button>
          )}

          {category.practiceStatus === 'IN_PROGRESS' &&
            category.instructorApprovalStatus === 'NOT_REQUESTED' &&
            category.instructor && (
              <Button size="sm" variant="outline" onClick={handleRequestApproval} disabled={isUpdating}>
                <LuSend />
                Запросить допуск
              </Button>
            )}
        </HStack>
      </VStack>
    </Box>
  )
}
