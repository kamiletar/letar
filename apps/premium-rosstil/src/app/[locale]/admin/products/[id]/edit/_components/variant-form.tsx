'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { PremiumRosstilForm } from '@/premium-rosstil-form'
import { Stack } from '@chakra-ui/react'
import { type VariantFormData, VariantFormSchema } from '../_schemas/variant-form.schema'

export type VariantFormResult = { success: true } | { success: false; error: string }

interface VariantFormProps {
  action: (data: VariantFormData) => Promise<VariantFormResult>
  defaultValue?: VariantFormData
  submitLabel?: string
  onSuccess?: () => void
}

/**
 * Переиспользуемый компонент формы для создания/редактирования ProductVariant.
 * Использует PremiumRosstilForm (декларативный API) и Zod v4.
 */
export function VariantForm({ action, defaultValue, submitLabel = 'Сохранить', onSuccess }: VariantFormProps) {
  const initialValue: VariantFormData = {
    color: defaultValue?.color || '',
    composition: defaultValue?.composition || '',
  }

  const handleSubmit = async (data: VariantFormData) => {
    const result = await action(data)

    if (result.success) {
      toaster.success({
        title: 'Успешно',
        description: 'Вариант сохранён',
      })
      onSuccess?.()
    } else {
      toaster.error({
        title: 'Ошибка',
        description: result.error,
      })
    }
  }

  return (
    <PremiumRosstilForm initialValue={initialValue} schema={VariantFormSchema} onSubmit={handleSubmit}>
      <Stack gap={4}>
        <PremiumRosstilForm.Errors />

        <PremiumRosstilForm.Field.String
          name="color"
          label="Цвет"
          placeholder="Например: Бежевый, Черный, Синий"
          required
        />

        <PremiumRosstilForm.Field.Textarea
          name="composition"
          label="Состав"
          placeholder="Например: 95% хлопок, 5% эластан"
          rows={3}
          required
        />

        <PremiumRosstilForm.Button.Submit colorPalette="fg" width="full">
          {submitLabel}
        </PremiumRosstilForm.Button.Submit>
      </Stack>
    </PremiumRosstilForm>
  )
}
