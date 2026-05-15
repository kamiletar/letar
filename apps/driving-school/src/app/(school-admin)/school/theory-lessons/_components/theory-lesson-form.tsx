'use client'

import { Button, Fieldset, HStack, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useFormContext } from '@letar/forms'
import { useStore } from '@tanstack/react-form'

import { toaster } from '@/app/_components/ui/toaster'
import { DrivingSchoolForm } from '@/driving-school-form'
import type { LessonSchedule } from '@/lib/lesson-schedule'
import { getNextLessonSlot } from '@/lib/lesson-schedule'

import type { StudyGroupSummary } from '../../study-groups/_actions/study-group.action'
import { getStudyGroupsAction } from '../../study-groups/_actions/study-group.action'
import type { TheoryTopicSummary } from '../../theory-topics/_actions/theory-topic.action'
import { getTheoryTopicsAction } from '../../theory-topics/_actions/theory-topic.action'
import type { SchoolClassroom, TheoryLessonDetails } from '../_actions/theory-lesson.action'
import {
  createTheoryLessonAction,
  getSchoolClassroomsAction,
  getSchoolInstructorsAction,
  updateTheoryLessonAction,
} from '../_actions/theory-lesson.action'
import { type TheoryLessonFormData, TheoryLessonFormSchema } from '../_schemas/theory-lesson.schema'

// Тип данных формы со строковыми значениями для совместимости с Select
interface TheoryLessonFormValues {
  groupId: string
  topicId: string
  scheduledAt: string // datetime-local string
  duration: string // number as string
  instructorId: string
  location: string
}

interface TheoryLessonFormProps {
  schoolId: string
  lesson?: TheoryLessonDetails
  groupId?: string // При создании со страницы группы
}

/**
 * Наблюдатель за изменением groupId в форме.
 * SelectFieldProps не поддерживает onChange — отслеживаем через form store.
 */
function GroupIdWatcher({ onGroupChange }: { onGroupChange: (groupId: string) => void }) {
  const form = useFormContext()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const groupIdValue = useStore((form as any).store, (s: any) => s.values.groupId) as string
  const prevRef = useRef('')

  useEffect(() => {
    if (groupIdValue && groupIdValue !== prevRef.current) {
      prevRef.current = groupIdValue
      onGroupChange(groupIdValue)
    }
  }, [groupIdValue, onGroupChange])

  return null
}

export function TheoryLessonForm({ schoolId, lesson, groupId }: TheoryLessonFormProps) {
  const router = useRouter()
  const isEditing = !!lesson

  const [groups, setGroups] = useState<StudyGroupSummary[]>([])
  const [topics, setTopics] = useState<TheoryTopicSummary[]>([])
  const [instructors, setInstructors] = useState<{ id: string; name: string | null }[]>([])
  const [classrooms, setClassrooms] = useState<SchoolClassroom[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Ключ для ререндера формы при авто-подстановке
  const [formKey, setFormKey] = useState(0)
  const [autoFilledValues, setAutoFilledValues] = useState<Partial<TheoryLessonFormValues>>({})

  const loadData = useCallback(async () => {
    setIsLoadingData(true)
    try {
      const [groupsResult, topicsResult, instructorsResult, classroomsResult] = await Promise.all([
        getStudyGroupsAction(schoolId),
        getTheoryTopicsAction(schoolId),
        getSchoolInstructorsAction(schoolId),
        getSchoolClassroomsAction(schoolId),
      ])

      if (groupsResult.success) {
        // Только активные группы
        setGroups(groupsResult.groups.filter((g) => g.isActive))
      }
      if (topicsResult.success) {
        // Только активные темы
        setTopics(topicsResult.topics.filter((t) => t.isActive))
      }
      if (instructorsResult.success) {
        setInstructors(instructorsResult.instructors)
      }
      if (classroomsResult.success) {
        setClassrooms(classroomsResult.classrooms)
      }
    } finally {
      setIsLoadingData(false)
    }
  }, [schoolId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Формируем опции для селектов
  const groupOptions = useMemo(
    () =>
      groups.map((g) => ({
        label: `${g.name} (${g.membersCount} уч.)`,
        value: g.id,
      })),
    [groups]
  )

  const topicOptions = useMemo(
    () =>
      topics.map((t) => ({
        label: t.name,
        value: t.id,
      })),
    [topics]
  )

  const instructorOptions = useMemo(
    () => [
      { label: 'Не назначен', value: '' },
      ...instructors.map((i) => ({
        label: i.name || 'Без имени',
        value: i.id,
      })),
    ],
    [instructors]
  )

  // Опции места проведения (учебные классы + ручной ввод)
  const locationOptions = useMemo(
    () => [
      { label: 'Не указано', value: '' },
      ...classrooms.map((c) => ({
        label: c.address ? `${c.name} — ${c.address}` : c.name,
        value: c.address ? `${c.name} — ${c.address}` : c.name,
      })),
    ],
    [classrooms]
  )

  const durationOptions = useMemo(
    () => [
      { label: '30 мин', value: '30' },
      { label: '45 мин', value: '45' },
      { label: '60 мин', value: '60' },
      { label: '90 мин', value: '90' },
      { label: '120 мин (2 часа)', value: '120' },
      { label: '180 мин (3 часа)', value: '180' },
      { label: '240 мин (4 часа)', value: '240' },
    ],
    []
  )

  // Форматируем дату для input datetime-local
  const formatDateTimeLocal = (date: Date) => {
    const d = new Date(date)
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 16)
  }

  // Авто-подстановка при выборе группы
  const handleGroupChange = useCallback(
    async (selectedGroupId: string) => {
      if (!selectedGroupId || isEditing) {
        return
      }

      const selectedGroup = groups.find((g) => g.id === selectedGroupId)
      if (!selectedGroup) {
        return
      }

      const updates: Partial<TheoryLessonFormValues> = {}

      // Подставляем location из classroom группы
      if (selectedGroup.classroomName) {
        const classroom = classrooms.find((c) => c.id === selectedGroup.classroomId)
        if (classroom) {
          updates.location = classroom.address ? `${classroom.name} — ${classroom.address}` : classroom.name
        }
      }

      // Подставляем дату и длительность из расписания
      const schedule = selectedGroup.lessonSchedule as LessonSchedule
      if (schedule) {
        // Загружаем существующие занятия группы
        const { getTheoryLessonsForGroupAction } = await import('../_actions/theory-lesson.action')
        const lessonsResult = await getTheoryLessonsForGroupAction(selectedGroupId)
        const existingDates = lessonsResult.success ? lessonsResult.lessons.map((l) => new Date(l.scheduledAt)) : []

        const nextSlot = getNextLessonSlot(schedule, existingDates)
        if (nextSlot) {
          updates.scheduledAt = formatDateTimeLocal(nextSlot.scheduledAt)
          updates.duration = nextSlot.duration.toString()
        }
      }

      if (Object.keys(updates).length > 0) {
        setAutoFilledValues((prev) => ({ ...prev, ...updates, groupId: selectedGroupId }))
        setFormKey((k) => k + 1)
      }
    },
    [groups, classrooms, isEditing]
  )

  // Начальные значения формы
  const initialValues: TheoryLessonFormValues = useMemo(
    () =>
      lesson
        ? {
            groupId: lesson.groupId,
            topicId: lesson.topicId || '',
            scheduledAt: formatDateTimeLocal(lesson.scheduledAt),
            duration: lesson.duration.toString(),
            instructorId: lesson.instructorId || '',
            location: lesson.location || '',
          }
        : {
            groupId: autoFilledValues.groupId || groupId || '',
            topicId: autoFilledValues.topicId || '',
            scheduledAt: autoFilledValues.scheduledAt || '',
            duration: autoFilledValues.duration || '120',
            instructorId: autoFilledValues.instructorId || '',
            location: autoFilledValues.location || '',
          },
    [lesson, groupId, formKey]
  )

  // Обработчик отправки формы
  const handleSubmit = async (value: TheoryLessonFormValues) => {
    setIsSubmitting(true)

    try {
      // Валидация обязательных полей
      if (!value.groupId) {
        toaster.error({ title: 'Выберите группу' })
        return
      }
      if (!value.topicId) {
        toaster.error({ title: 'Выберите тему' })
        return
      }
      if (!value.scheduledAt) {
        toaster.error({ title: 'Укажите дату и время' })
        return
      }

      const data: TheoryLessonFormData = {
        groupId: value.groupId,
        topicId: value.topicId,
        scheduledAt: new Date(value.scheduledAt),
        duration: parseInt(value.duration) || 120,
        instructorId: value.instructorId || undefined,
        location: value.location?.trim() || undefined,
      }

      // Валидация схемой
      const validation = TheoryLessonFormSchema.safeParse(data)
      if (!validation.success) {
        toaster.error({
          title: 'Ошибка валидации',
          description: validation.error.issues.map((issue) => issue.message).join(', '),
        })
        return
      }

      if (isEditing && lesson) {
        const result = await updateTheoryLessonAction(lesson.id, validation.data)

        if (result.success) {
          toaster.success({ title: 'Занятие обновлено' })
          router.push(`/school/theory-lessons/${schoolId}/`)
          router.refresh()
        } else {
          toaster.error({ title: 'Ошибка обновления', description: result.error })
        }
      } else {
        const result = await createTheoryLessonAction(validation.data)

        if (result.success) {
          toaster.success({ title: 'Занятие создано' })
          router.push(`/school/theory-lessons/${schoolId}/`)
          router.refresh()
        } else {
          toaster.error({ title: 'Ошибка создания', description: result.error })
        }
      }
    } catch (error) {
      toaster.error({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Произошла неизвестная ошибка',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoadingData) {
    return <Text>Загрузка данных...</Text>
  }

  return (
    <DrivingSchoolForm<TheoryLessonFormValues> key={formKey} initialValue={initialValues} onSubmit={handleSubmit}>
      <DrivingSchoolForm.DirtyGuard />
      {!isEditing && <GroupIdWatcher onGroupChange={handleGroupChange} />}
      <Stack gap={6}>
        <DrivingSchoolForm.Errors title="Ошибки формы" />

        {/* Main info */}
        <Fieldset.Root>
          <Fieldset.Legend fontWeight="semibold">Основная информация</Fieldset.Legend>
          <Fieldset.Content>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
              <DrivingSchoolForm.Field.Select
                name="groupId"
                label="Учебная группа"
                options={groupOptions}
                placeholder="Выберите группу"
                required
                disabled={!!groupId}
              />

              <DrivingSchoolForm.Field.Select
                name="topicId"
                label="Тема занятия"
                options={topicOptions}
                placeholder="Выберите тему"
                required
              />
            </SimpleGrid>
          </Fieldset.Content>
        </Fieldset.Root>

        {/* Time and place */}
        <Fieldset.Root>
          <Fieldset.Legend fontWeight="semibold">Время и место</Fieldset.Legend>
          <Fieldset.Content>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
              <DrivingSchoolForm.Field.DateTimePicker name="scheduledAt" label="Дата и время" required />

              <DrivingSchoolForm.Field.Select name="duration" label="Длительность" options={durationOptions} required />

              <DrivingSchoolForm.Field.Select
                name="instructorId"
                label="Преподаватель"
                options={instructorOptions}
                helperText="Опционально"
              />

              <DrivingSchoolForm.Field.Select
                name="location"
                label="Место проведения"
                options={locationOptions}
                helperText="Учебный класс школы"
              />
            </SimpleGrid>
          </Fieldset.Content>
        </Fieldset.Root>

        {/* Buttons */}
        <HStack justify="flex-end" gap={4}>
          <Button type="button" variant="ghost" onClick={() => router.push(`/school/theory-lessons/${schoolId}/`)}>
            Отмена
          </Button>
          <Button type="submit" colorPalette="brand" loading={isSubmitting}>
            {isEditing ? 'Сохранить' : 'Создать занятие'}
          </Button>
        </HStack>
      </Stack>
    </DrivingSchoolForm>
  )
}
