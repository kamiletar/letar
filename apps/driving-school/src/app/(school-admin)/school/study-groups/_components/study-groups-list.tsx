'use client'

import { Badge, Box, Card, EmptyState, HStack, IconButton, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { LuArchive, LuCalendar, LuClock, LuPencil, LuRefreshCw, LuUsers } from 'react-icons/lu'

import { toaster } from '@/app/_components/ui/toaster'
import {
  countLessonDays,
  DAY_NAMES,
  formatDuration,
  getActiveLessonDays,
  getTotalWeeklyMinutes,
  type LessonSchedule,
} from '@/lib/lesson-schedule'

import type { StudyGroupSummary } from '../_actions/study-group.action'
import { archiveStudyGroupAction, restoreStudyGroupAction } from '../_actions/study-group.action'

// Локализация расписания
const scheduleLabels: Record<string, string> = {
  MORNING: 'Утренняя',
  EVENING: 'Вечерняя',
  WEEKEND: 'Выходного дня',
}

interface StudyGroupsListProps {
  groups: StudyGroupSummary[]
  schoolId: string
}

export function StudyGroupsList({ groups, schoolId }: StudyGroupsListProps) {
  if (groups.length === 0) {
    return (
      <EmptyState.Root>
        <EmptyState.Content>
          <EmptyState.Indicator>
            <LuUsers />
          </EmptyState.Indicator>
          <EmptyState.Title>Нет учебных групп</EmptyState.Title>
          <EmptyState.Description>Создайте первую учебную группу для теоретических занятий</EmptyState.Description>
        </EmptyState.Content>
      </EmptyState.Root>
    )
  }

  const activeGroups = groups.filter((g) => g.isActive)
  const archivedGroups = groups.filter((g) => !g.isActive)

  return (
    <VStack gap={6} align="stretch">
      {/* Активные группы */}
      {activeGroups.length > 0 && (
        <Box>
          <Text fontSize="lg" fontWeight="semibold" mb={4}>
            Активные группы ({activeGroups.length})
          </Text>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
            {activeGroups.map((group) => (
              <GroupCard key={group.id} group={group} schoolId={schoolId} />
            ))}
          </SimpleGrid>
        </Box>
      )}

      {/* Архивированные группы */}
      {archivedGroups.length > 0 && (
        <Box>
          <Text fontSize="lg" fontWeight="semibold" mb={4} color="fg.muted">
            Архив ({archivedGroups.length})
          </Text>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
            {archivedGroups.map((group) => (
              <GroupCard key={group.id} group={group} schoolId={schoolId} isArchived />
            ))}
          </SimpleGrid>
        </Box>
      )}
    </VStack>
  )
}

interface GroupCardProps {
  group: StudyGroupSummary
  schoolId: string
  isArchived?: boolean
}

function GroupCard({ group, schoolId, isArchived }: GroupCardProps) {
  const queryClient = useQueryClient()

  const handleArchive = async () => {
    const result = await archiveStudyGroupAction(group.id)
    if (result.success) {
      toaster.success({ title: 'Группа архивирована' })
      // Автоматически обновить список групп
      queryClient.invalidateQueries({ queryKey: ['StudyGroup'] })
    } else {
      toaster.error({
        title: 'Ошибка',
        description: result.message || 'Не удалось архивировать группу',
      })
    }
  }

  const handleRestore = async () => {
    const result = await restoreStudyGroupAction(group.id)
    if (result.success) {
      toaster.success({ title: 'Группа восстановлена' })
      // Автоматически обновить список групп
      queryClient.invalidateQueries({ queryKey: ['StudyGroup'] })
    } else {
      toaster.error({
        title: 'Ошибка',
        description: 'Не удалось восстановить группу',
      })
    }
  }

  const schedule = group.lessonSchedule as LessonSchedule
  const activeDays = getActiveLessonDays(schedule)
  const daysText = activeDays.map((d) => DAY_NAMES[d]).join(', ')
  const daysCount = countLessonDays(schedule)
  const totalMinutes = getTotalWeeklyMinutes(schedule)
  const startDateText = new Date(group.startDate).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <Card.Root opacity={isArchived ? 0.7 : 1}>
      <Card.Body>
        <VStack align="stretch" gap={3}>
          {/* Заголовок */}
          <HStack justify="space-between">
            <VStack align="start" gap={0}>
              <Text fontWeight="semibold" fontSize="lg">
                {group.name}
              </Text>
              <Badge colorPalette={isArchived ? 'gray' : 'green'} size="sm">
                {scheduleLabels[group.schedule] || group.schedule}
              </Badge>
            </VStack>
            <HStack gap={1}>
              {group.categories.map((cat) => (
                <Badge key={cat} colorPalette="purple" variant="subtle">
                  {cat}
                </Badge>
              ))}
            </HStack>
          </HStack>

          {/* Информация */}
          <VStack align="stretch" gap={2} fontSize="sm" color="fg.muted">
            <HStack gap={2}>
              <LuUsers />
              <Text>
                {group.membersCount} / {group.maxStudents} учеников
              </Text>
            </HStack>
            <HStack gap={2}>
              <LuCalendar />
              <Text>{daysCount > 0 ? daysText : 'Нет расписания'}</Text>
            </HStack>
            <HStack gap={2}>
              <LuClock />
              <Text>{formatDuration(totalMinutes)} в неделю</Text>
            </HStack>
            <Text fontSize="xs">Начало: {startDateText}</Text>
          </VStack>

          {/* Кнопки действий */}
          <HStack justify="flex-end" pt={2}>
            {isArchived ? (
              <IconButton
                aria-label="Восстановить группу"
                variant="ghost"
                size="sm"
                onClick={handleRestore}
                title="Восстановить"
              >
                <LuRefreshCw />
              </IconButton>
            ) : (
              <>
                <IconButton aria-label="Редактировать группу" variant="ghost" size="sm" asChild title="Редактировать">
                  <Link href={`/school/study-groups/group/${group.id}?schoolId=${schoolId}`}>
                    <LuPencil />
                  </Link>
                </IconButton>
                <IconButton
                  aria-label="Архивировать группу"
                  variant="ghost"
                  size="sm"
                  colorPalette="red"
                  onClick={handleArchive}
                  title="Архивировать"
                >
                  <LuArchive />
                </IconButton>
              </>
            )}
          </HStack>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
