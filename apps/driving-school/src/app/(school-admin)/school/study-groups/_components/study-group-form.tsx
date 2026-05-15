'use client'

import { Box, Button, Fieldset, HStack, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { LessonScheduleEditor } from '@/app/_components/lesson-schedule-editor'
import { toaster } from '@/app/_components/ui/toaster'
import { DrivingSchoolForm } from '@/driving-school-form'
import type { LessonSchedule } from '@/lib/lesson-schedule'
import type { LicenseCategory, StudyGroupSchedule } from '@letar/driving-school-db/prisma'

import type { SchoolClassroom } from '../../theory-lessons/_actions/theory-lesson.action'
import { getSchoolClassroomsAction } from '../../theory-lessons/_actions/theory-lesson.action'
import { getSchoolLicenseCategoriesAction } from '../../theory-topics/_actions/theory-topic.action'
import type { CreateStudyGroupData, StudyGroupDetails, UpdateStudyGroupData } from '../_actions/study-group.action'
import { createStudyGroupAction, updateStudyGroupAction } from '../_actions/study-group.action'
import { StudyGroupFormSchema } from '../_schemas/study-group.schema'

// Тип данных формы со строковыми значениями для совместимости с Select
interface StudyGroupFormValues {
  name: string
  schedule: string
  classroomId: string
  theoryHours: string
  startDate: string
  endDate: string
  maxStudents: string
}

// Опции типа расписания
const scheduleOptions = [
  { label: 'Выберите тип', value: '' },
  { label: 'Утренняя группа', value: 'MORNING' },
  { label: 'Вечерняя группа', value: 'EVENING' },
  { label: 'Группа выходного дня', value: 'WEEKEND' },
]

// Опции категорий прав
const categoryOptions: { value: LicenseCategory; label: string }[] = [
  { value: 'M', label: 'M — мопеды' },
  { value: 'A1', label: 'A1 — лёгкие мотоциклы' },
  { value: 'A', label: 'A — мотоциклы' },
  { value: 'B1', label: 'B1 — квадрициклы' },
  { value: 'B', label: 'B — легковые авто' },
  { value: 'C1', label: 'C1 — средние грузовики' },
  { value: 'C', label: 'C — тяжёлые грузовики' },
  { value: 'D1', label: 'D1 — малые автобусы' },
  { value: 'D', label: 'D — большие автобусы' },
  { value: 'BE', label: 'BE — легковые с прицепом' },
  { value: 'CE', label: 'CE — грузовики с прицепом' },
  { value: 'C1E', label: 'C1E — средние грузовики с прицепом' },
  { value: 'DE', label: 'DE — автобусы с прицепом' },
  { value: 'D1E', label: 'D1E — малые автобусы с прицепом' },
  { value: 'Tm', label: 'Tm — трамваи' },
  { value: 'Tb', label: 'Tb — троллейбусы' },
]

interface StudyGroupFormProps {
  schoolId: string
  group?: StudyGroupDetails
}

export function StudyGroupForm({ schoolId, group }: StudyGroupFormProps) {
  const router = useRouter()
  const isEditing = !!group
  const [selectedCategories, setSelectedCategories] = useState<LicenseCategory[]>(group?.categories || [])
  const [lessonSchedule, setLessonSchedule] = useState<LessonSchedule | null>(
    (group?.lessonSchedule as LessonSchedule) || null
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [schoolCategories, setSchoolCategories] = useState<string[]>([])
  const [classrooms, setClassrooms] = useState<SchoolClassroom[]>([])

  // Загружаем категории прав школы и учебные классы
  useEffect(() => {
    getSchoolLicenseCategoriesAction(schoolId).then((result) => {
      if (result.success) {
        setSchoolCategories(result.categories)
      }
    })
    getSchoolClassroomsAction(schoolId).then((result) => {
      if (result.success) {
        setClassrooms(result.classrooms)
      }
    })
  }, [schoolId])

  // Опции учебных классов для Select
  const classroomOptions = useMemo(
    () => [
      { label: 'Не выбран', value: '' },
      ...classrooms.map((c) => ({
        label: c.address ? `${c.name} — ${c.address}` : c.name,
        value: c.id,
      })),
    ],
    [classrooms]
  )

  // Фильтруем опции категорий по профилю школы
  const filteredCategoryOptions = useMemo(
    () =>
      schoolCategories.length > 0
        ? categoryOptions.filter((opt) => schoolCategories.includes(opt.value))
        : categoryOptions,
    [schoolCategories]
  )

  // Начальные значения формы
  const initialValues: StudyGroupFormValues = useMemo(
    () =>
      group
        ? {
            name: group.name,
            schedule: group.schedule,
            classroomId: group.classroomId || '',
            theoryHours: group.theoryHours?.toString() || '',
            startDate: new Date(group.startDate).toISOString().split('T')[0],
            endDate: group.endDate ? new Date(group.endDate).toISOString().split('T')[0] : '',
            maxStudents: group.maxStudents.toString(),
          }
        : {
            name: '',
            schedule: '',
            classroomId: '',
            theoryHours: '',
            startDate: '',
            endDate: '',
            maxStudents: '20',
          },
    [group]
  )

  // Обработчик отправки формы
  const handleSubmit = async (value: StudyGroupFormValues) => {
    setIsSubmitting(true)

    try {
      // Валидация обязательных полей
      if (!value.name || value.name.trim().length === 0) {
        toaster.error({ title: 'Введите название группы' })
        return
      }
      if (!value.schedule) {
        toaster.error({ title: 'Выберите тип расписания' })
        return
      }
      if (selectedCategories.length === 0) {
        toaster.error({ title: 'Выберите хотя бы одну категорию' })
        return
      }
      if (!value.startDate) {
        toaster.error({ title: 'Укажите дату начала' })
        return
      }

      const formData = {
        organizationId: schoolId,
        name: value.name.trim(),
        schedule: value.schedule as StudyGroupSchedule,
        categories: selectedCategories,
        classroomId: value.classroomId || undefined,
        theoryHours: value.theoryHours ? parseInt(value.theoryHours) : undefined,
        startDate: value.startDate,
        endDate: value.endDate || undefined,
        lessonSchedule: lessonSchedule || {},
        maxStudents: parseInt(value.maxStudents) || 20,
      }

      // Валидация схемой
      const validation = StudyGroupFormSchema.safeParse(formData)
      if (!validation.success) {
        toaster.error({
          title: 'Ошибка валидации',
          description: validation.error.issues.map((issue) => issue.message).join(', '),
        })
        return
      }

      if (isEditing && group) {
        const updateData: UpdateStudyGroupData = {
          name: validation.data.name,
          schedule: validation.data.schedule,
          categories: validation.data.categories,
          classroomId: validation.data.classroomId || null,
          theoryHours: validation.data.theoryHours ?? null,
          startDate: validation.data.startDate,
          endDate: validation.data.endDate || null,
          lessonSchedule: validation.data.lessonSchedule,
          maxStudents: validation.data.maxStudents,
        }

        const result = await updateStudyGroupAction(group.id, updateData)

        if (result.success) {
          toaster.success({ title: 'Группа обновлена' })
          router.push(`/school/study-groups/${schoolId}`)
          router.refresh()
        } else {
          toaster.error({ title: 'Ошибка обновления', description: result.message })
        }
      } else {
        const createData: CreateStudyGroupData = {
          organizationId: schoolId,
          name: validation.data.name,
          schedule: validation.data.schedule,
          categories: validation.data.categories,
          classroomId: validation.data.classroomId || null,
          theoryHours: validation.data.theoryHours ?? null,
          startDate: validation.data.startDate,
          endDate: validation.data.endDate || null,
          lessonSchedule: validation.data.lessonSchedule,
          maxStudents: validation.data.maxStudents,
        }

        const result = await createStudyGroupAction(createData)

        if (result.success) {
          toaster.success({ title: 'Группа создана' })
          window.dispatchEvent(new Event('school-data-changed'))
          router.push(`/school/study-groups/${schoolId}`)
          router.refresh()
        } else {
          toaster.error({ title: 'Ошибка создания', description: result.message })
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

  return (
    <DrivingSchoolForm<StudyGroupFormValues> initialValue={initialValues} onSubmit={handleSubmit}>
      <DrivingSchoolForm.DirtyGuard />
      <Stack gap={6}>
        <DrivingSchoolForm.Errors title="Ошибки формы" />

        {/* Main info */}
        <Fieldset.Root>
          <Fieldset.Legend fontWeight="semibold">Основная информация</Fieldset.Legend>
          <Fieldset.Content>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
              <DrivingSchoolForm.Field.String
                name="name"
                label="Название группы"
                placeholder="Группа Б-2024-01"
                required
              />

              <DrivingSchoolForm.Field.Select
                name="schedule"
                label="Тип расписания"
                options={scheduleOptions}
                required
              />

              {/* Categories checkboxes - separate from form */}
              <Box gridColumn={{ md: 'span 2' }}>
                <Text fontWeight="medium" mb={2}>
                  Категории прав *
                </Text>
                <HStack gap={3} flexWrap="wrap">
                  {filteredCategoryOptions.map((opt) => (
                    <Box
                      key={opt.value}
                      as="label"
                      display="inline-flex"
                      alignItems="center"
                      gap={2}
                      cursor="pointer"
                      fontSize="sm"
                    >
                      <input
                        type="checkbox"
                        value={opt.value}
                        checked={selectedCategories.includes(opt.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCategories((prev) => [...prev, opt.value])
                          } else {
                            setSelectedCategories((prev) => prev.filter((c) => c !== opt.value))
                          }
                        }}
                        style={{ width: '16px', height: '16px' }}
                      />
                      {opt.label}
                    </Box>
                  ))}
                </HStack>
                {selectedCategories.length === 0 && (
                  <Text color="red.fg" fontSize="sm" mt={1}>
                    Выберите хотя бы одну категорию
                  </Text>
                )}
              </Box>

              <DrivingSchoolForm.Field.Select
                name="classroomId"
                label="Учебный класс"
                options={classroomOptions}
                helperText="Филиал для проведения теории"
              />

              <DrivingSchoolForm.Field.Number
                name="theoryHours"
                label="Часы теории"
                min={1}
                max={500}
                helperText="Общее количество часов"
              />

              <DrivingSchoolForm.Field.Number name="maxStudents" label="Макс. учеников" min={1} max={100} required />
            </SimpleGrid>
          </Fieldset.Content>
        </Fieldset.Root>

        {/* Lesson schedule */}
        <Fieldset.Root>
          <Fieldset.Legend fontWeight="semibold">Расписание занятий</Fieldset.Legend>
          <Fieldset.Content>
            <LessonScheduleEditor
              name="lessonSchedule"
              defaultValue={lessonSchedule}
              defaultDuration={120}
              onChange={setLessonSchedule}
            />
          </Fieldset.Content>
        </Fieldset.Root>

        {/* Training dates */}
        <Fieldset.Root>
          <Fieldset.Legend fontWeight="semibold">Даты обучения</Fieldset.Legend>
          <Fieldset.Content>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
              <DrivingSchoolForm.Field.Date name="startDate" label="Дата начала" required />

              <DrivingSchoolForm.Field.Date name="endDate" label="Дата окончания" helperText="Опционально" />
            </SimpleGrid>
          </Fieldset.Content>
        </Fieldset.Root>

        {/* Buttons */}
        <HStack justify="flex-end" gap={4}>
          <Button type="button" variant="ghost" onClick={() => router.push(`/school/study-groups/${schoolId}`)}>
            Отмена
          </Button>
          <Button type="submit" colorPalette="brand" loading={isSubmitting}>
            {isEditing ? 'Сохранить' : 'Создать группу'}
          </Button>
        </HStack>
      </Stack>
    </DrivingSchoolForm>
  )
}
