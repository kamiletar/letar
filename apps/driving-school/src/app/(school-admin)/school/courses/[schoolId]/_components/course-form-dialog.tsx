'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Button, Dialog, HStack, Portal, VStack } from '@chakra-ui/react'
import type { LicenseCategory, TheoryFormat, TransmissionType } from '@letar/driving-school-db/prisma'
import { Form } from '@letar/forms'
import { useEffect, useMemo, useState } from 'react'

import { getSchoolLicenseCategoriesAction } from '../../../theory-topics/_actions/theory-topic.action'
import type { TrainingCourseSummary } from '../../_actions/courses.action'
import { createCourseAction, updateCourseAction } from '../../_actions/courses.action'
import { type CourseFormData, CourseFormSchema } from '../../_schemas/course.schema'

// Опции для select'ов
const CATEGORY_OPTIONS: { label: string; value: LicenseCategory }[] = [
  { label: 'M', value: 'M' },
  { label: 'A1', value: 'A1' },
  { label: 'A', value: 'A' },
  { label: 'B1', value: 'B1' },
  { label: 'B', value: 'B' },
  { label: 'C1', value: 'C1' },
  { label: 'C', value: 'C' },
  { label: 'D1', value: 'D1' },
  { label: 'D', value: 'D' },
  { label: 'BE', value: 'BE' },
  { label: 'CE', value: 'CE' },
  { label: 'C1E', value: 'C1E' },
  { label: 'DE', value: 'DE' },
  { label: 'D1E', value: 'D1E' },
  { label: 'Tm', value: 'Tm' },
  { label: 'Tb', value: 'Tb' },
]

const TRANSMISSION_OPTIONS: { label: string; value: TransmissionType }[] = [
  { label: 'МКПП (механика)', value: 'MANUAL' },
  { label: 'АКПП (автомат)', value: 'AUTOMATIC' },
]

const THEORY_FORMAT_OPTIONS: { label: string; value: TheoryFormat }[] = [
  { label: 'Очно в классе', value: 'CLASSROOM' },
  { label: 'Дистанционно', value: 'DISTANCE' },
  { label: 'Онлайн', value: 'ONLINE' },
  { label: 'Смешанный формат', value: 'HYBRID' },
]

interface CourseFormDialogProps {
  schoolId: string
  course?: TrainingCourseSummary
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CourseFormDialog({ schoolId, course, open, onOpenChange, onSuccess }: CourseFormDialogProps) {
  const isEdit = !!course
  const [schoolCategories, setSchoolCategories] = useState<string[]>([])

  // Загружаем категории прав школы для фильтрации Select
  useEffect(() => {
    getSchoolLicenseCategoriesAction(schoolId).then((result) => {
      if (result.success) {
        setSchoolCategories(result.categories)
      }
    })
  }, [schoolId])

  // Фильтруем опции категорий по профилю школы
  const categoryOptions = useMemo(
    () =>
      schoolCategories.length > 0
        ? CATEGORY_OPTIONS.filter((opt) => schoolCategories.includes(opt.value))
        : CATEGORY_OPTIONS,
    [schoolCategories]
  )

  const initialValue: CourseFormData = course
    ? {
        name: course.name,
        category: course.category,
        transmissionType: course.transmissionType,
        practiceLessons: course.practiceLessons,
        lessonDuration: course.lessonDuration,
        theoryFormat: course.theoryFormat,
        theoryHours: course.theoryHours,
        price: course.price,
        description: course.description,
      }
    : {
        name: '',
        category: 'B',
        transmissionType: null,
        practiceLessons: 56,
        lessonDuration: 90,
        theoryFormat: 'CLASSROOM',
        theoryHours: null,
        price: 0,
        description: null,
      }

  const handleSubmit = async (data: CourseFormData) => {
    if (isEdit) {
      const result = await updateCourseAction(course.id, data)
      if (result.success) {
        toaster.success({ title: 'Курс обновлён' })
        onSuccess()
      } else {
        toaster.error({
          title: 'Ошибка',
          description: result.message || 'Не удалось обновить курс',
        })
      }
    } else {
      const result = await createCourseAction({
        organizationId: schoolId,
        ...data,
      })
      if (result.success) {
        toaster.success({ title: 'Курс создан' })
        window.dispatchEvent(new Event('school-data-changed'))
        onSuccess()
      } else {
        toaster.error({
          title: 'Ошибка',
          description: result.message || 'Не удалось создать курс',
        })
      }
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(e) => onOpenChange(e.open)} size={{ base: 'full', md: 'lg' }}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{isEdit ? 'Редактирование курса' : 'Новый курс обучения'}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Form initialValue={initialValue} schema={CourseFormSchema} onSubmit={handleSubmit}>
                <VStack gap={4} align="stretch">
                  <Form.Field.String name="name" />

                  <HStack gap={4} align="start">
                    <Form.Field.Select name="category" options={categoryOptions} />
                    <Form.Field.Select
                      name="transmissionType"
                      options={TRANSMISSION_OPTIONS}
                      placeholder="Не указан"
                      clearable
                    />
                  </HStack>

                  <HStack gap={4} align="start">
                    <Form.Field.Number name="practiceLessons" />
                    <Form.Field.Number name="lessonDuration" />
                  </HStack>

                  <HStack gap={4} align="start">
                    <Form.Field.Select name="theoryFormat" options={THEORY_FORMAT_OPTIONS} />
                    <Form.Field.Number name="theoryHours" />
                  </HStack>

                  <Form.Field.Number name="price" />

                  <Form.Field.Textarea name="description" />

                  <HStack justify="flex-end" pt={4}>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                      Отмена
                    </Button>
                    <Form.Button.Submit>{isEdit ? 'Сохранить' : 'Создать курс'}</Form.Button.Submit>
                  </HStack>
                </VStack>
              </Form>
            </Dialog.Body>
            <Dialog.CloseTrigger />
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
