'use client'

import { toaster } from '@/app/_components/ui/toaster'
import type { ProductSize } from '@/generated/prisma'
import { PremiumRosstilForm } from '@/premium-rosstil-form'
import { Field, Stack } from '@chakra-ui/react'
import { type ItemFormData, ItemFormSchema } from '../_schemas/item-form.schema'
import { SizeSelect } from './size-select'

export type ItemFormResult = { success: true } | { success: false; error: string }

interface ProductItemFormProps {
  action: (data: ItemFormData) => Promise<ItemFormResult>
  sizes: ProductSize[]
  defaultValue?: ItemFormData
  submitLabel?: string
  onSuccess?: () => void
}

/**
 * Переиспользуемый компонент формы для создания/редактирования ProductItem.
 * Использует PremiumRosstilForm (декларативный API) и Zod v4.
 */
export function ProductItemForm({
  action,
  sizes,
  defaultValue,
  submitLabel = 'Сохранить',
  onSuccess,
}: ProductItemFormProps) {
  const initialValue: ItemFormData = {
    sizeId: defaultValue?.sizeId || '',
    price: defaultValue?.price || '',
    availableCount: defaultValue?.availableCount || '0',
  }

  const handleSubmit = async (data: ItemFormData) => {
    const result = await action(data)

    if (result.success) {
      toaster.success({
        title: 'Успешно',
        description: 'Товарная позиция сохранена',
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
    <PremiumRosstilForm initialValue={initialValue} schema={ItemFormSchema} onSubmit={handleSubmit}>
      <Stack gap={4}>
        <PremiumRosstilForm.Errors />

        <Field.Root>
          <Field.Label>Размер</Field.Label>
          <SizeSelect name="sizeId" sizes={sizes} defaultValue={defaultValue?.sizeId} />
        </Field.Root>

        <PremiumRosstilForm.Field.String name="price" label="Цена (₽)" placeholder="5000" required />

        <PremiumRosstilForm.Field.String name="availableCount" label="Количество в наличии" placeholder="0" />

        <PremiumRosstilForm.Button.Submit colorPalette="fg" width="full">
          {submitLabel}
        </PremiumRosstilForm.Button.Submit>
      </Stack>
    </PremiumRosstilForm>
  )
}
