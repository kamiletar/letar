'use client'

/**
 * Список опросов с карточками.
 */

import { Badge, Box, Button, Card, HStack, Icon, IconButton, Menu, Text, VStack } from '@chakra-ui/react'
import { useTransition } from 'react'
import { LuCalendar, LuCircleCheck, LuClock, LuEllipsisVertical, LuPencil, LuPlus, LuTrash2 } from 'react-icons/lu'

import { toaster } from '@/app/_components/ui/toaster'

import { deleteSurveyAction, type SurveyWithStats } from '../../_actions/survey.action'

interface SurveyListProps {
  surveys: SurveyWithStats[]
  onEdit: (survey: SurveyWithStats) => void
  onCreate: () => void
  onViewResponses: (surveyId: string) => void
}

/**
 * Названия триггеров на русском
 */
const TRIGGER_LABELS: Record<string, string> = {
  AFTER_COMPLETION: 'После завершения обучения',
  AFTER_FIRST_EXAM: 'После первого экзамена ГИБДД',
  AFTER_LICENSE: 'После получения прав',
  MANUAL: 'Вручную',
}

/**
 * Цвета NPS
 */
function getNpsColor(score: number | null): string {
  if (score === null) {
    return 'gray'
  }
  if (score >= 50) {
    return 'green'
  }
  if (score >= 0) {
    return 'yellow'
  }
  return 'red'
}

function SurveyCard({
  survey,
  onEdit,
  onDelete,
  onViewResponses,
}: {
  survey: SurveyWithStats
  onEdit: () => void
  onDelete: () => void
  onViewResponses: () => void
}) {
  return (
    <Card.Root>
      <Card.Body>
        <HStack justify="space-between" mb={3}>
          <HStack gap={2}>
            <Text fontWeight="semibold">{survey.name}</Text>
            <Badge colorPalette={survey.isActive ? 'green' : 'gray'} size="sm">
              {survey.isActive ? 'Активен' : 'Неактивен'}
            </Badge>
          </HStack>

          <Menu.Root>
            <Menu.Trigger asChild>
              <IconButton variant="ghost" size="sm" aria-label="Меню">
                <LuEllipsisVertical />
              </IconButton>
            </Menu.Trigger>
            <Menu.Positioner>
              <Menu.Content>
                <Menu.Item value="edit" onClick={onEdit}>
                  <LuPencil />
                  Редактировать
                </Menu.Item>
                <Menu.Item value="delete" onClick={onDelete} color="fg.error">
                  <LuTrash2 />
                  Удалить
                </Menu.Item>
              </Menu.Content>
            </Menu.Positioner>
          </Menu.Root>
        </HStack>

        {/* Триггер */}
        <HStack gap={2} mb={3}>
          <Icon boxSize={4} color="fg.muted">
            <LuCalendar />
          </Icon>
          <Text fontSize="sm" color="fg.muted">
            {TRIGGER_LABELS[survey.triggerType] ?? survey.triggerType}
          </Text>
        </HStack>

        {/* Настройки */}
        <HStack gap={4} mb={4}>
          <HStack gap={1}>
            <Icon boxSize={3} color="fg.muted">
              <LuClock />
            </Icon>
            <Text fontSize="xs" color="fg.muted">
              Отправка через {survey.delayDays} дн.
            </Text>
          </HStack>
          <HStack gap={1}>
            <Text fontSize="xs" color="fg.muted">
              Срок {survey.expirationDays} дн.
            </Text>
          </HStack>
        </HStack>

        {/* Статистика */}
        <Box borderTopWidth="1px" pt={3}>
          <HStack justify="space-between">
            <VStack align="start" gap={0}>
              <Text fontSize="xs" color="fg.muted">
                Ответов
              </Text>
              <HStack gap={1}>
                <Text fontWeight="bold">{survey.completedResponses}</Text>
                <Text fontSize="sm" color="fg.muted">
                  / {survey.totalResponses}
                </Text>
              </HStack>
            </VStack>

            <VStack align="center" gap={0}>
              <Text fontSize="xs" color="fg.muted">
                NPS Score
              </Text>
              <Badge colorPalette={getNpsColor(survey.npsScore)} size="lg">
                {survey.npsScore !== null ? (survey.npsScore > 0 ? `+${survey.npsScore}` : survey.npsScore) : '—'}
              </Badge>
            </VStack>

            <Button size="sm" variant="ghost" onClick={onViewResponses}>
              <LuCircleCheck />
              Ответы
            </Button>
          </HStack>
        </Box>
      </Card.Body>
    </Card.Root>
  )
}

export function SurveyList({ surveys, onEdit, onCreate, onViewResponses }: SurveyListProps) {
  const [, startTransition] = useTransition()

  const handleDelete = (survey: SurveyWithStats) => {
    if (!confirm(`Удалить опрос "${survey.name}"?`)) {
      return
    }

    startTransition(async () => {
      const result = await deleteSurveyAction(survey.id)
      if (result.success) {
        toaster.success({ title: 'Опрос удалён' })
      } else {
        toaster.error({ title: 'Ошибка', description: result.error })
      }
    })
  }

  return (
    <VStack align="stretch" gap={4}>
      {/* Кнопка создания */}
      <Box>
        <Button colorPalette="blue" onClick={onCreate}>
          <LuPlus />
          Создать опрос
        </Button>
      </Box>

      {/* Список */}
      {surveys.length === 0 ? (
        <Box p={8} textAlign="center" borderWidth="1px" borderRadius="lg" borderStyle="dashed">
          <Text color="fg.muted" mb={4}>
            Нет опросов. Создайте первый опрос для сбора обратной связи от учеников.
          </Text>
          <Button variant="outline" onClick={onCreate}>
            <LuPlus />
            Создать опрос
          </Button>
        </Box>
      ) : (
        <VStack align="stretch" gap={3}>
          {surveys.map((survey) => (
            <SurveyCard
              key={survey.id}
              survey={survey}
              onEdit={() => onEdit(survey)}
              onDelete={() => handleDelete(survey)}
              onViewResponses={() => onViewResponses(survey.id)}
            />
          ))}
        </VStack>
      )}
    </VStack>
  )
}
