'use client'

import {
  Box,
  Button,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  HStack,
  SimpleGrid,
  Stack,
  Table,
  Text,
} from '@chakra-ui/react'
import { useCallback, useMemo, useState } from 'react'

import { toaster } from '@/app/_components/ui/toaster'
import { DrivingSchoolForm } from '@/driving-school-form'

import type { StudyGroupSummary } from '../../study-groups/_actions/study-group.action'
import type { TheoryTopicSummary } from '../../theory-topics/_actions/theory-topic.action'
import type { ScheduleSlotPreview } from '../_actions/theory-lesson-generate.action'
import { generateTheoryScheduleAction, previewTheoryScheduleAction } from '../_actions/theory-lesson-generate.action'

interface GenerateScheduleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  schoolId: string
  groups: StudyGroupSummary[]
  topics: TheoryTopicSummary[]
  instructors: { id: string; name: string | null }[]
  classrooms: { id: string; name: string; address: string | null }[]
}

interface FormValues {
  groupId: string
  topicId: string
  startDate: string
  endDate: string
  instructorId: string
  location: string
}

export function GenerateScheduleDialog({
  open,
  onOpenChange,
  schoolId,
  groups,
  topics,
  instructors,
  classrooms,
}: GenerateScheduleDialogProps) {
  const [preview, setPreview] = useState<ScheduleSlotPreview[] | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [formValues, setFormValues] = useState<FormValues | null>(null)

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

  const initialValues: FormValues = useMemo(
    () => ({
      groupId: '',
      topicId: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      instructorId: '',
      location: '',
    }),
    []
  )

  // Предпросмотр
  const handlePreview = useCallback(async (value: FormValues) => {
    if (!value.groupId || !value.startDate || !value.endDate) {
      toaster.error({ title: 'Заполните группу и диапазон дат' })
      return
    }

    setIsLoadingPreview(true)
    setFormValues(value)
    try {
      const result = await previewTheoryScheduleAction(value.groupId, value.startDate, value.endDate)
      if (result.success && result.slots) {
        setPreview(result.slots)
        if (result.slots.length === 0) {
          toaster.info({ title: 'Нет доступных слотов в указанном диапазоне' })
        }
      } else {
        toaster.error({ title: 'Ошибка предпросмотра', description: result.error })
      }
    } finally {
      setIsLoadingPreview(false)
    }
  }, [])

  // Генерация
  const handleGenerate = useCallback(async () => {
    if (!formValues || !preview || preview.length === 0) {
      return
    }

    if (!formValues.topicId) {
      toaster.error({ title: 'Выберите тему для занятий' })
      return
    }

    setIsGenerating(true)
    try {
      const result = await generateTheoryScheduleAction({
        groupId: formValues.groupId,
        topicId: formValues.topicId,
        startDate: formValues.startDate,
        endDate: formValues.endDate,
        instructorId: formValues.instructorId || undefined,
        location: formValues.location || undefined,
      })

      if (result.success) {
        toaster.success({ title: `Создано ${result.count} занятий` })
        setPreview(null)
        setFormValues(null)
        onOpenChange(false)
      } else {
        toaster.error({ title: 'Ошибка генерации', description: result.error })
      }
    } finally {
      setIsGenerating(false)
    }
  }, [formValues, preview, onOpenChange])

  return (
    <DialogRoot open={open} onOpenChange={(e) => onOpenChange(e.open)} size="xl">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Сгенерировать расписание</DialogTitle>
        </DialogHeader>
        <DialogCloseTrigger />

        <DialogBody>
          <Stack gap={6}>
            <DrivingSchoolForm<FormValues> initialValue={initialValues} onSubmit={handlePreview}>
              <Stack gap={4}>
                <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                  <DrivingSchoolForm.Field.Select
                    name="groupId"
                    label="Учебная группа"
                    options={groupOptions}
                    placeholder="Выберите группу"
                    required
                  />

                  <DrivingSchoolForm.Field.Select
                    name="topicId"
                    label="Тема (для всех занятий)"
                    options={topicOptions}
                    placeholder="Выберите тему"
                    required
                  />

                  <DrivingSchoolForm.Field.Date name="startDate" label="Дата начала" required />
                  <DrivingSchoolForm.Field.Date name="endDate" label="Дата окончания" required />

                  <DrivingSchoolForm.Field.Select
                    name="instructorId"
                    label="Преподаватель"
                    options={instructorOptions}
                  />

                  <DrivingSchoolForm.Field.Select name="location" label="Место проведения" options={locationOptions} />
                </SimpleGrid>

                <HStack justify="flex-end">
                  <Button type="submit" colorPalette="blue" loading={isLoadingPreview}>
                    Предпросмотр
                  </Button>
                </HStack>
              </Stack>
            </DrivingSchoolForm>

            {/* Таблица предпросмотра */}
            {preview && preview.length > 0 && (
              <Box>
                <Text fontWeight="semibold" mb={3}>
                  Будет создано {preview.length} занятий:
                </Text>
                <Box maxH="300px" overflowY="auto" borderWidth="1px" borderRadius="md">
                  <Table.Root size="sm">
                    <Table.Header>
                      <Table.Row>
                        <Table.ColumnHeader>#</Table.ColumnHeader>
                        <Table.ColumnHeader>Дата</Table.ColumnHeader>
                        <Table.ColumnHeader>День</Table.ColumnHeader>
                        <Table.ColumnHeader>Время</Table.ColumnHeader>
                        <Table.ColumnHeader>Длительность</Table.ColumnHeader>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {preview.map((slot, idx) => (
                        <Table.Row key={slot.date}>
                          <Table.Cell>{idx + 1}</Table.Cell>
                          <Table.Cell>{new Date(slot.date + 'T00:00:00').toLocaleDateString('ru-RU')}</Table.Cell>
                          <Table.Cell>{slot.dayOfWeek}</Table.Cell>
                          <Table.Cell>{slot.startTime}</Table.Cell>
                          <Table.Cell>{slot.duration} мин</Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                </Box>
              </Box>
            )}
          </Stack>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            colorPalette="brand"
            onClick={handleGenerate}
            loading={isGenerating}
            disabled={!preview || preview.length === 0}
          >
            Создать {preview?.length || 0} занятий
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  )
}
