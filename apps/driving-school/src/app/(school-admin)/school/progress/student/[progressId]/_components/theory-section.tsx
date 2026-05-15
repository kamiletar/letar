'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Badge, Button, Card, HStack, Text, VStack } from '@chakra-ui/react'
import type { TheoryStatus } from '@letar/driving-school-db/prisma'
import { useState } from 'react'
import { LuBookOpen, LuCheck, LuPlay } from 'react-icons/lu'

import type { StudentProgressDetails } from '../../../_actions/progress.action'
import { updateTheoryStatusAction } from '../../../_actions/theory.action'

const THEORY_STATUS_CONFIG: Record<TheoryStatus, { label: string; color: string }> = {
  NOT_STARTED: { label: 'Не начато', color: 'gray' },
  IN_PROGRESS: { label: 'В процессе', color: 'yellow' },
  COMPLETED: { label: 'Завершено', color: 'green' },
  FAILED: { label: 'Не сдано', color: 'red' },
}

interface TheorySectionProps {
  progress: StudentProgressDetails
  onRefresh: () => void
}

export function TheorySection({ progress, onRefresh }: TheorySectionProps) {
  const [isUpdating, setIsUpdating] = useState(false)

  const statusConfig = THEORY_STATUS_CONFIG[progress.theoryStatus]

  const handleStartTheory = async () => {
    setIsUpdating(true)
    const result = await updateTheoryStatusAction({
      progressId: progress.id,
      status: 'IN_PROGRESS',
    })
    setIsUpdating(false)

    if (result.success) {
      toaster.success({ title: 'Теория начата' })
      onRefresh()
    } else {
      toaster.error({ title: 'Ошибка', description: result.message })
    }
  }

  const handleCompleteTheory = async () => {
    setIsUpdating(true)
    const result = await updateTheoryStatusAction({
      progressId: progress.id,
      status: 'COMPLETED',
    })
    setIsUpdating(false)

    if (result.success) {
      toaster.success({ title: 'Теория завершена' })
      onRefresh()
    } else {
      toaster.error({ title: 'Ошибка', description: result.message })
    }
  }

  return (
    <Card.Root>
      <Card.Header>
        <HStack justify="space-between">
          <HStack gap={2}>
            <LuBookOpen size={20} />
            <Text fontWeight="semibold">Теория</Text>
          </HStack>
          <Badge colorPalette={statusConfig.color} size="lg">
            {statusConfig.label}
          </Badge>
        </HStack>
      </Card.Header>
      <Card.Body>
        <VStack align="stretch" gap={4}>
          {/* Информация о группе */}
          {progress.studyGroup && (
            <HStack>
              <Text color="fg.muted">Группа:</Text>
              <Text fontWeight="medium">{progress.studyGroup.name}</Text>
            </HStack>
          )}

          {/* Филиал теории */}
          {progress.theoryLocation && (
            <HStack>
              <Text color="fg.muted">Филиал:</Text>
              <Text>{progress.theoryLocation.name}</Text>
            </HStack>
          )}

          {/* Посещаемость */}
          {progress.theoryAttendanceRate !== null && (
            <HStack>
              <Text color="fg.muted">Посещаемость:</Text>
              <Text fontWeight="medium">{progress.theoryAttendanceRate}%</Text>
            </HStack>
          )}

          {/* Даты */}
          {progress.theoryStartedAt && (
            <HStack>
              <Text color="fg.muted">Начало:</Text>
              <Text>{new Date(progress.theoryStartedAt).toLocaleDateString('ru-RU')}</Text>
            </HStack>
          )}

          {progress.theoryCompletedAt && (
            <HStack>
              <Text color="fg.muted">Завершено:</Text>
              <Text>{new Date(progress.theoryCompletedAt).toLocaleDateString('ru-RU')}</Text>
            </HStack>
          )}

          {/* Кнопки действий */}
          <HStack gap={3} pt={2}>
            {progress.theoryStatus === 'NOT_STARTED' && (
              <Button size="sm" colorPalette="brand" onClick={handleStartTheory} disabled={isUpdating}>
                <LuPlay />
                Начать теорию
              </Button>
            )}

            {progress.theoryStatus === 'IN_PROGRESS' && (
              <Button size="sm" colorPalette="green" onClick={handleCompleteTheory} disabled={isUpdating}>
                <LuCheck />
                Завершить теорию
              </Button>
            )}
          </HStack>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
