'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { DrivingSchoolForm } from '@/driving-school-form'
import { Button, Stack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'

import type { ReviewFormSchema } from '@/app/(student)/my-reviews/_schemas/review-form.schema'

interface ReviewFormProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  action: (prevState: any, formData: FormData) => Promise<any>
  schema: typeof ReviewFormSchema
  lessonId?: string
  organizationId?: string
  submitLabel?: string
}

export function ReviewForm({
  action,
  schema,
  lessonId,
  organizationId,
  submitLabel = 'Отправить отзыв',
}: ReviewFormProps) {
  const router = useRouter()

  return (
    <DrivingSchoolForm
      schema={schema}
      initialValue={{ rating: 0, text: '' }}
      onSubmit={async (value) => {
        // Создаём FormData для совместимости с существующим action
        const formData = new FormData()
        formData.set('rating', String(value.rating))
        if (value.text) {
          formData.set('text', value.text)
        }
        if (lessonId) {
          formData.set('lessonId', lessonId)
        }
        if (organizationId) {
          formData.set('organizationId', organizationId)
        }

        const result = await action(undefined, formData)

        if (result?.status === 'success' || !result?.error) {
          toaster.success({ title: 'Отзыв отправлен' })
          router.back()
        } else {
          // Показываем ошибки
          const errorMessage =
            result?.error?.formErrors?.[0] || Object.values(result?.error?.fieldErrors ?? {}).flat()[0] || 'Ошибка'
          toaster.error({ title: errorMessage })
        }
      }}
    >
      <Stack gap={6}>
        <DrivingSchoolForm.Errors />

        <DrivingSchoolForm.Field.Rating
          name="rating"
          label="Оценка"
          required
          size="lg"
          colorPalette="yellow"
          helperText="Выберите от 1 до 5 звёзд"
        />

        <DrivingSchoolForm.Field.Textarea
          name="text"
          label="Отзыв"
          placeholder="Расскажите о своём опыте обучения..."
          rows={5}
          maxLength={1000}
          helperText="Необязательно, максимум 1000 символов"
        />

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
