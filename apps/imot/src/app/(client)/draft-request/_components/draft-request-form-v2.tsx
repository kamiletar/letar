'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { ImotForm } from '@/imot-form'
import { Stack } from '@chakra-ui/react'
import { type DraftRequestFormData, draftRequestSchema } from '../_schemas/draft-request.schema'

interface DraftRequestFormV2Props {
  onSubmit: (data: DraftRequestFormData) => Promise<{ success: boolean; error?: string }>
}

export function DraftRequestFormV2({ onSubmit }: DraftRequestFormV2Props) {
  const handleSubmit = async (data: DraftRequestFormData) => {
    const result = await onSubmit(data)

    if (!result.success && result.error) {
      toaster.error({
        title: 'Ошибка',
        description: result.error,
      })
    }
  }

  return (
    <ImotForm schema={draftRequestSchema} onSubmit={handleSubmit}>
      <Stack gap={4}>
        <ImotForm.Field.Date name="birthdate" label="Дата рождения" required />

        <ImotForm.Select.Gender name="gender" label="Пол" required />

        <ImotForm.Field.Textarea
          name="mainRequest"
          label="С чем вы хотите поработать?"
          placeholder="Например: Хочу научиться выстраивать здоровые границы в отношениях..."
          rows={8}
          required
        />

        <ImotForm.Errors />

        <ImotForm.Button.Submit colorPalette="fg" size="lg" width="full">
          Сохранить и продолжить
        </ImotForm.Button.Submit>
      </Stack>
    </ImotForm>
  )
}
