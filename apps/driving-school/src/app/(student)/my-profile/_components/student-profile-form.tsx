'use client'

import { updateStudentProfileAction } from '@/app/(student)/my-profile/_actions/update-student-profile.action'
import { UpdateStudentProfileSchema } from '@/app/(student)/my-profile/_schemas/student-profile.schema'
import { toaster } from '@/app/_components/ui/toaster'
import { DrivingSchoolForm } from '@/driving-school-form'
import { VStack } from '@chakra-ui/react'

interface StudentProfileFormProps {
  initialData: {
    name: string | null
    phone: string | null
    preferredAreas: string[] | null
    noteForInstructor: string | null
  } | null
}

/**
 * Форма профиля ученика
 *
 * Особенности:
 * - DrivingSchoolForm (декларативный API на TanStack Form)
 * - Form.Field.Tags для массива предпочтительных районов
 * - Form.Field.Phone с российской маской
 * - Решает Bug #21 (form reset после Server Action)
 */
export function StudentProfileForm({ initialData }: StudentProfileFormProps) {
  const handleSubmit = async (value: {
    name: string
    phone?: string
    preferredAreas?: string[]
    noteForInstructor?: string
  }) => {
    // Вызываем Server Action напрямую с типизированными данными
    // Гарантируем что preferredAreas всегда массив
    const result = await updateStudentProfileAction({
      ...value,
      preferredAreas: value.preferredAreas ?? [],
    })

    if (result.success) {
      toaster.success({
        title: 'Профиль обновлён',
        description: 'Ваши данные успешно сохранены',
      })
    } else {
      toaster.error({
        title: 'Ошибка',
        description: result.error,
      })
    }
  }

  return (
    <DrivingSchoolForm
      initialValue={{
        name: initialData?.name ?? '',
        phone: initialData?.phone ?? '',
        preferredAreas: initialData?.preferredAreas ?? [],
        noteForInstructor: initialData?.noteForInstructor ?? '',
      }}
      schema={UpdateStudentProfileSchema}
      onSubmit={handleSubmit}
    >
      <VStack gap={4} align="stretch">
        <DrivingSchoolForm.Field.String name="name" label="Имя" placeholder="Ваше имя" required autoComplete="name" />

        <DrivingSchoolForm.Field.Phone name="phone" label="Телефон" country="RU" autoUnmask />

        <DrivingSchoolForm.Field.Tags
          name="preferredAreas"
          label="Предпочтительные районы для занятий"
          placeholder="Введите район и нажмите Enter"
          helperText="Укажите районы, в которых вам удобно заниматься"
        />

        <DrivingSchoolForm.Field.Textarea
          name="noteForInstructor"
          label="Заметка для инструктора"
          placeholder="Напишите, что вы хотите изучить, какие у вас цели..."
          helperText="Максимум 500 символов"
          rows={4}
        />

        <DrivingSchoolForm.Button.Submit colorPalette="brand" size="lg">
          Сохранить профиль
        </DrivingSchoolForm.Button.Submit>
      </VStack>
    </DrivingSchoolForm>
  )
}
