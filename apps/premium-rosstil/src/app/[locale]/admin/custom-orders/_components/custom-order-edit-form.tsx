'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { useRouter } from '@/i18n/navigation'
import { PremiumRosstilForm } from '@/premium-rosstil-form'
import { Stack } from '@chakra-ui/react'
import { type UpdateCustomOrderData, UpdateCustomOrderSchema } from '../_schemas/custom-order-admin.schema'
import { STATUS_LABELS } from './custom-order-status-badge'

export type UpdateCustomOrderResult = { success: true; redirect?: string } | { success: false; error: string }

interface CustomOrderEditFormProps {
  action: (data: UpdateCustomOrderData) => Promise<UpdateCustomOrderResult>
  defaultValue: UpdateCustomOrderData
}

/**
 * Форма редактирования статуса заказа на пошив и заметок администратора.
 * Использует PremiumRosstilForm (декларативный API) и Zod v4.
 */
export function CustomOrderEditForm({ action, defaultValue }: CustomOrderEditFormProps) {
  const router = useRouter()

  const handleSubmit = async (data: UpdateCustomOrderData) => {
    const result = await action(data)

    if (result.success) {
      toaster.success({
        title: 'Успешно',
        description: 'Статус заказа обновлён',
      })
      if (result.redirect) {
        router.push(result.redirect)
      }
    } else {
      toaster.error({
        title: 'Ошибка',
        description: result.error,
      })
    }
  }

  // Преобразуем STATUS_LABELS в формат для select
  const statusOptions = Object.entries(STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
  }))

  return (
    <PremiumRosstilForm initialValue={defaultValue} schema={UpdateCustomOrderSchema} onSubmit={handleSubmit}>
      <Stack gap={4}>
        <PremiumRosstilForm.Errors />

        <PremiumRosstilForm.Select.CustomOrderStatus name="status" label="Статус заказа" options={statusOptions} />

        <PremiumRosstilForm.Field.Textarea
          name="adminNotes"
          label="Заметки администратора"
          placeholder="Внутренние заметки, невидимые клиенту..."
          rows={4}
        />

        <PremiumRosstilForm.Button.Submit colorPalette="fg">Сохранить изменения</PremiumRosstilForm.Button.Submit>
      </Stack>
    </PremiumRosstilForm>
  )
}
