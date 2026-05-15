'use client'

import { Button, Heading, HStack, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { useCallback, useState } from 'react'
import { LuCalendar, LuListPlus, LuPlus } from 'react-icons/lu'

import type { StudyGroupSummary } from '../../../study-groups/_actions/study-group.action'
import { getStudyGroupsAction } from '../../../study-groups/_actions/study-group.action'
import type { TheoryTopicSummary } from '../../../theory-topics/_actions/theory-topic.action'
import { getTheoryTopicsAction } from '../../../theory-topics/_actions/theory-topic.action'
import {
  getSchoolClassroomsAction,
  getSchoolInstructorsAction,
  type SchoolClassroom,
} from '../../_actions/theory-lesson.action'
import type { TheoryLessonSummary } from '../../_actions/theory-lesson.types'
import { GenerateScheduleDialog } from '../../_components/generate-schedule-dialog'
import { TheoryLessonsList } from '../../_components/theory-lessons-list'

interface Props {
  lessons: TheoryLessonSummary[]
  schoolId: string
}

export function TheoryLessonsClientPage({ lessons, schoolId }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [groups, setGroups] = useState<StudyGroupSummary[]>([])
  const [topics, setTopics] = useState<TheoryTopicSummary[]>([])
  const [instructors, setInstructors] = useState<{ id: string; name: string | null }[]>([])
  const [classrooms, setClassrooms] = useState<SchoolClassroom[]>([])

  // Загружаем данные для диалога генерации при открытии
  const loadDialogData = useCallback(async () => {
    const [groupsResult, topicsResult, instructorsResult, classroomsResult] = await Promise.all([
      getStudyGroupsAction(schoolId),
      getTheoryTopicsAction(schoolId),
      getSchoolInstructorsAction(schoolId),
      getSchoolClassroomsAction(schoolId),
    ])

    if (groupsResult.success) {
      setGroups(groupsResult.groups.filter((g) => g.isActive))
    }
    if (topicsResult.success) {
      setTopics(topicsResult.topics.filter((t) => t.isActive))
    }
    if (instructorsResult.success) {
      setInstructors(instructorsResult.instructors)
    }
    if (classroomsResult.success) {
      setClassrooms(classroomsResult.classrooms)
    }
  }, [schoolId])

  // Предзагрузка данных при первом открытии
  const handleOpenDialog = useCallback(() => {
    if (groups.length === 0) {
      loadDialogData()
    }
    setDialogOpen(true)
  }, [groups.length, loadDialogData])

  return (
    <VStack gap={6} align="stretch">
      {/* Заголовок страницы */}
      <HStack justify="space-between">
        <HStack gap={3}>
          <LuCalendar size={28} />
          <Heading size="xl">Теоретические занятия</Heading>
        </HStack>
        <HStack gap={2}>
          <Button variant="outline" colorPalette="blue" onClick={handleOpenDialog}>
            <LuListPlus />
            Сгенерировать
          </Button>
          <Button asChild colorPalette="brand">
            <Link href={`/school/theory-lessons/new?schoolId=${schoolId}`}>
              <LuPlus />
              Создать занятие
            </Link>
          </Button>
        </HStack>
      </HStack>

      {/* Список занятий */}
      <TheoryLessonsList lessons={lessons} schoolId={schoolId} />

      {/* Диалог массовой генерации */}
      <GenerateScheduleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        schoolId={schoolId}
        groups={groups}
        topics={topics}
        instructors={instructors}
        classrooms={classrooms}
      />
    </VStack>
  )
}
