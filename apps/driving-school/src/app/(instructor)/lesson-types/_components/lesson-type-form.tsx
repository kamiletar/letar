'use client'

import { Button, Stack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useMemo } from 'react'

import { toaster } from '@/app/_components/ui/toaster'
import { DrivingSchoolForm } from '@/driving-school-form'
import type { LessonCategory, LicenseCategory } from '@letar/driving-school-db/prisma'

import { LESSON_DURATION_OPTIONS } from '@/app/_constants'

import {
  createLessonTypeAction,
  type LessonTypeActionResult,
  type LessonTypeWithStats,
  updateLessonTypeAction,
} from '../_actions/lesson-type.action'
import { LessonTypeFormSchema, type LessonTypeInput } from '../_schemas/lesson-type-form.schema'

// Тип данных формы со строковыми значениями для совместимости с Select
interface LessonTypeFormValues {
  name: string
  description: string
  durationMinutes: string
  licenseCategory: string
  lessonCategory: string
}

// Опции категорий прав
const licenseCategories = [
  { label: 'Все категории', value: '' },
  { label: 'M — мопеды, скутеры', value: 'M' },
  { label: 'A1 — лёгкие мотоциклы', value: 'A1' },
  { label: 'A — мотоциклы', value: 'A' },
  { label: 'B1 — квадрициклы', value: 'B1' },
  { label: 'B — легковые авто', value: 'B' },
  { label: 'C1 — средние грузовики', value: 'C1' },
  { label: 'C — грузовики', value: 'C' },
  { label: 'D1 — малые автобусы', value: 'D1' },
  { label: 'D — автобусы', value: 'D' },
  { label: 'BE — легковые с прицепом', value: 'BE' },
  { label: 'CE — грузовики с прицепом', value: 'CE' },
  { label: 'C1E — средние грузовики с прицепом', value: 'C1E' },
  { label: 'DE — автобусы с прицепом', value: 'DE' },
  { label: 'D1E — малые автобусы с прицепом', value: 'D1E' },
  { label: 'Tm — трамваи', value: 'Tm' },
  { label: 'Tb — троллейбусы', value: 'Tb' },
]

interface LessonTypeFormProps {
  defaultValues?: Partial<LessonTypeWithStats>
  submitLabel?: string
}

export function LessonTypeForm({ defaultValues, submitLabel = 'Создать' }: LessonTypeFormProps) {
  const router = useRouter()
  const isEditing = !!defaultValues?.id

  // Начальные значения формы
  const initialValues: LessonTypeFormValues = useMemo(
    () => ({
      name: defaultValues?.name ?? '',
      description: defaultValues?.description ?? '',
      durationMinutes: defaultValues?.durationMinutes?.toString() ?? '90',
      licenseCategory: defaultValues?.licenseCategory ?? '',
      lessonCategory: defaultValues?.lessonCategory ?? '',
    }),
    [defaultValues]
  )

  // Обработчик отправки формы
  const handleSubmit = async (value: LessonTypeFormValues) => {
    // Подготавливаем данные для типизированного action
    const data: LessonTypeInput = {
      name: value.name,
      description: value.description || undefined,
      durationMinutes: parseInt(value.durationMinutes, 10),
      licenseCategory: (value.licenseCategory || undefined) as LicenseCategory | undefined,
      lessonCategory: (value.lessonCategory || undefined) as LessonCategory | undefined,
      ...(defaultValues?.id && { id: defaultValues.id }),
    }

    // Предварительная валидация схемой
    const validation = LessonTypeFormSchema.safeParse(data)
    if (!validation.success) {
      toaster.error({
        title: 'Ошибка валидации',
        description: validation.error.issues.map((issue) => issue.message).join(', '),
      })
      return
    }

    // Вызываем типизированный Server Action
    const result: LessonTypeActionResult = isEditing
      ? await updateLessonTypeAction(data)
      : await createLessonTypeAction(data)

    if (result.success) {
      toaster.success({ title: isEditing ? 'Тип занятия обновлён' : 'Тип занятия создан' })
      if (!isEditing) {
        router.push('/lesson-types')
      }
      router.refresh()
    } else {
      toaster.error({ title: 'Ошибка', description: result.error })
    }
  }

  return (
    <DrivingSchoolForm<LessonTypeFormValues> initialValue={initialValues} onSubmit={handleSubmit}>
      <DrivingSchoolForm.DirtyGuard />
      <Stack gap={6}>
        <DrivingSchoolForm.Errors title="Ошибки формы" />

        {/* Name */}
        <DrivingSchoolForm.Field.String
          name="name"
          label="Название"
          placeholder="Например: Стандартное занятие"
          helperText="Краткое название, которое увидят ученики при записи"
          required
        />

        {/* Description */}
        <DrivingSchoolForm.Field.Textarea
          name="description"
          label="Описание"
          placeholder="Опишите, что включает это занятие..."
          rows={3}
        />

        {/* Lesson Category */}
        <DrivingSchoolForm.Select.LessonCategory
          name="lessonCategory"
          label="Тип занятия"
          helperText="Выберите предустановленный тип или 'Своё название' для собственного"
        />

        {/* Duration */}
        <DrivingSchoolForm.Field.Select
          name="durationMinutes"
          label="Длительность"
          options={LESSON_DURATION_OPTIONS}
          required
        />

        {/* License Category */}
        <DrivingSchoolForm.Field.Select
          name="licenseCategory"
          label="Категория прав"
          options={licenseCategories}
          helperText="Оставьте пустым, если занятие подходит для любой категории"
        />

        {/* Buttons */}
        <Stack direction="row" gap={4}>
          <DrivingSchoolForm.Button.Submit colorPalette="brand" size="lg">
            {submitLabel}
          </DrivingSchoolForm.Button.Submit>
          <Button type="button" variant="outline" size="lg" onClick={() => router.back()}>
            Отмена
          </Button>
        </Stack>
      </Stack>
    </DrivingSchoolForm>
  )
}
