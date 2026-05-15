'use client'

import {
  Badge,
  Box,
  Button,
  Card,
  Heading,
  HStack,
  SimpleGrid,
  Spinner,
  Stat,
  Tabs,
  Text,
  VStack,
} from '@chakra-ui/react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useState } from 'react'
import { LuArrowLeft, LuCalendar, LuClock, LuUsers } from 'react-icons/lu'

import { toaster } from '@/app/_components/ui/toaster'
import {
  countLessonDays,
  DAY_NAMES,
  formatDuration,
  getActiveLessonDays,
  getTotalWeeklyMinutes,
  type LessonSchedule,
} from '@/lib/lesson-schedule'

import { getGroupMembersAction } from '../../_actions/study-group-member.action'
import type { GroupMemberDetails } from '../../_actions/study-group-member.types'
import { getStudyGroupAction } from '../../_actions/study-group.action'
import type { StudyGroupDetails } from '../../_actions/study-group.types'
import { AddMemberDialog } from '../../_components/add-member-dialog'
import { GroupMembersList } from '../../_components/group-members-list'
import { StudyGroupForm } from '../../_components/study-group-form'

// Локализация расписания
const scheduleLabels: Record<string, string> = {
  MORNING: 'Утренняя',
  EVENING: 'Вечерняя',
  WEEKEND: 'Выходного дня',
}

function StudyGroupDetailPageContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const groupId = params.id as string
  const schoolId = searchParams.get('schoolId')

  const [group, setGroup] = useState<StudyGroupDetails | null>(null)
  const [members, setMembers] = useState<GroupMemberDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('info')

  const loadGroup = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await getStudyGroupAction(groupId)
      if (result.success) {
        setGroup(result.group)
      } else {
        toaster.error({
          title: 'Ошибка',
          description: 'Не удалось загрузить группу',
        })
      }
    } finally {
      setIsLoading(false)
    }
  }, [groupId])

  const loadMembers = useCallback(async () => {
    const result = await getGroupMembersAction(groupId)
    if (result.success) {
      setMembers(result.members)
    }
  }, [groupId])

  useEffect(() => {
    loadGroup()
    loadMembers()
  }, [loadGroup, loadMembers])

  if (!schoolId) {
    return (
      <VStack py={12}>
        <Text color="fg.muted">Школа не указана</Text>
        <Button asChild variant="ghost">
          <Link href="/school/stats">
            <LuArrowLeft />
            Назад
          </Link>
        </Button>
      </VStack>
    )
  }

  if (isLoading) {
    return (
      <HStack justify="center" py={12}>
        <Spinner />
        <Text>Загрузка группы...</Text>
      </HStack>
    )
  }

  if (!group) {
    return (
      <VStack py={12}>
        <Text color="fg.muted">Группа не найдена</Text>
        <Button asChild variant="ghost">
          <Link href={`/school/study-groups/${schoolId}`}>
            <LuArrowLeft />
            Назад к списку групп
          </Link>
        </Button>
      </VStack>
    )
  }

  const schedule = group.lessonSchedule as LessonSchedule
  const activeDays = getActiveLessonDays(schedule)
  const daysText = activeDays.map((d) => DAY_NAMES[d]).join(', ')
  const daysCount = countLessonDays(schedule)
  const totalMinutes = getTotalWeeklyMinutes(schedule)
  const activeMembers = members.filter((m) => !m.leftAt)

  return (
    <VStack gap={6} align="stretch">
      {/* Заголовок */}
      <HStack justify="space-between" flexWrap="wrap" gap={4}>
        <HStack gap={4}>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/school/study-groups/${schoolId}`}>
              <LuArrowLeft />
              Назад
            </Link>
          </Button>
          <Box>
            <HStack gap={2}>
              <Heading size="lg">{group.name}</Heading>
              <Badge colorPalette={group.isActive ? 'green' : 'gray'}>{group.isActive ? 'Активная' : 'Архив'}</Badge>
            </HStack>
            <Text color="fg.muted" fontSize="sm">
              {scheduleLabels[group.schedule]} • Категории: {group.categories.join(', ')}
            </Text>
          </Box>
        </HStack>
      </HStack>

      {/* Табы */}
      <Tabs.Root value={activeTab} onValueChange={(e) => setActiveTab(e.value)}>
        <Tabs.List>
          <Tabs.Trigger value="info">Информация</Tabs.Trigger>
          <Tabs.Trigger value="members">Участники ({activeMembers.length})</Tabs.Trigger>
          <Tabs.Trigger value="edit">Редактировать</Tabs.Trigger>
        </Tabs.List>

        {/* Информация */}
        <Tabs.Content value="info">
          <VStack gap={6} align="stretch" pt={4}>
            {/* Статистика */}
            <SimpleGrid columns={{ base: 2, md: 4 }} gap={4}>
              <Card.Root>
                <Card.Body>
                  <Stat.Root>
                    <HStack justify="space-between" mb={2}>
                      <Stat.Label color="fg.muted">Участников</Stat.Label>
                      <Box color="purple.fg">
                        <LuUsers />
                      </Box>
                    </HStack>
                    <Stat.ValueText fontSize="2xl" fontWeight="bold">
                      {activeMembers.length} / {group.maxStudents}
                    </Stat.ValueText>
                  </Stat.Root>
                </Card.Body>
              </Card.Root>

              <Card.Root>
                <Card.Body>
                  <Stat.Root>
                    <HStack justify="space-between" mb={2}>
                      <Stat.Label color="fg.muted">Занятий</Stat.Label>
                      <Box color="blue.fg">
                        <LuCalendar />
                      </Box>
                    </HStack>
                    <Stat.ValueText fontSize="2xl" fontWeight="bold">
                      {group.lessonsCount}
                    </Stat.ValueText>
                  </Stat.Root>
                </Card.Body>
              </Card.Root>

              <Card.Root>
                <Card.Body>
                  <Stat.Root>
                    <HStack justify="space-between" mb={2}>
                      <Stat.Label color="fg.muted">Дни занятий</Stat.Label>
                      <Box color="green.fg">
                        <LuCalendar />
                      </Box>
                    </HStack>
                    <Stat.ValueText fontSize="lg" fontWeight="bold">
                      {daysCount > 0 ? daysText : 'Нет расписания'}
                    </Stat.ValueText>
                    <Text fontSize="xs" color="fg.muted">
                      {daysCount} {daysCount === 1 ? 'день' : daysCount >= 2 && daysCount <= 4 ? 'дня' : 'дней'} в
                      неделю
                    </Text>
                  </Stat.Root>
                </Card.Body>
              </Card.Root>

              <Card.Root>
                <Card.Body>
                  <Stat.Root>
                    <HStack justify="space-between" mb={2}>
                      <Stat.Label color="fg.muted">Время занятий</Stat.Label>
                      <Box color="orange.fg">
                        <LuClock />
                      </Box>
                    </HStack>
                    <Stat.ValueText fontSize="xl" fontWeight="bold">
                      {formatDuration(totalMinutes)}
                    </Stat.ValueText>
                    <Text fontSize="xs" color="fg.muted">
                      в неделю
                    </Text>
                  </Stat.Root>
                </Card.Body>
              </Card.Root>
            </SimpleGrid>

            {/* Даты */}
            <Card.Root>
              <Card.Body>
                <HStack justify="space-between" flexWrap="wrap" gap={4}>
                  <Box>
                    <Text fontSize="sm" color="fg.muted">
                      Дата начала
                    </Text>
                    <Text fontWeight="medium">
                      {new Date(group.startDate).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </Text>
                  </Box>
                  {group.endDate && (
                    <Box>
                      <Text fontSize="sm" color="fg.muted">
                        Дата окончания
                      </Text>
                      <Text fontWeight="medium">
                        {new Date(group.endDate).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </Text>
                    </Box>
                  )}
                  <Box>
                    <Text fontSize="sm" color="fg.muted">
                      Создана
                    </Text>
                    <Text fontWeight="medium">{new Date(group.createdAt).toLocaleDateString('ru-RU')}</Text>
                  </Box>
                </HStack>
              </Card.Body>
            </Card.Root>

            {/* Ближайшие занятия */}
            {group.upcomingLessons.length > 0 && (
              <Box>
                <Heading size="md" mb={4}>
                  Ближайшие занятия
                </Heading>
                <Card.Root>
                  <VStack align="stretch" gap={0} divideY="1px" divideColor="border">
                    {group.upcomingLessons.map((lesson) => (
                      <HStack key={lesson.id} justify="space-between" py={3} px={4}>
                        <Box>
                          <Text fontWeight="medium">{lesson.topic?.name || 'Без темы'}</Text>
                          <Text fontSize="sm" color="fg.muted">
                            {new Date(lesson.scheduledAt).toLocaleDateString('ru-RU', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>
                        </Box>
                        <Badge colorPalette={lesson.status === 'SCHEDULED' ? 'blue' : 'green'}>
                          {lesson.status === 'SCHEDULED' ? 'Запланировано' : lesson.status}
                        </Badge>
                      </HStack>
                    ))}
                  </VStack>
                </Card.Root>
              </Box>
            )}
          </VStack>
        </Tabs.Content>

        {/* Участники */}
        <Tabs.Content value="members">
          <Box pt={4}>
            <GroupMembersList
              members={members}
              groupId={groupId}
              maxStudents={group.maxStudents}
              onRefresh={loadMembers}
              onAddMember={() => setIsAddMemberOpen(true)}
            />
          </Box>
        </Tabs.Content>

        {/* Редактирование */}
        <Tabs.Content value="edit">
          <Box pt={4}>
            <StudyGroupForm schoolId={schoolId} group={group} />
          </Box>
        </Tabs.Content>
      </Tabs.Root>

      {/* Диалог добавления участников */}
      <AddMemberDialog
        groupId={groupId}
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        onSuccess={loadMembers}
      />
    </VStack>
  )
}

export default function StudyGroupDetailPage() {
  return (
    <Suspense
      fallback={
        <HStack justify="center" py={12}>
          <Spinner />
          <Text>Загрузка...</Text>
        </HStack>
      }
    >
      <StudyGroupDetailPageContent />
    </Suspense>
  )
}
