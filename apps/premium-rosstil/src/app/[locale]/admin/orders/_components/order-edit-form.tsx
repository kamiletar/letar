'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { useRouter } from '@/i18n/navigation'
import { PremiumRosstilForm } from '@/premium-rosstil-form'
import { Stack } from '@chakra-ui/react'
import { type UpdateOrderData, UpdateOrderSchema } from '../_schemas/order-admin.schema'
import { STATUS_LABELS } from './order-status-badge'

export type UpdateOrderResult = { success: true; redirect?: string } | { success: false; error: string }

interface OrderEditFormProps {
  action: (data: UpdateOrderData) => Promise<UpdateOrderResult>
  defaultValue: UpdateOrderData
}

/**
 * Форма редактирования статуса заказа и заметок администратора.
 * Использует PremiumRosstilForm (декларативный API) и Zod v4.
 */
export function OrderEditForm({ action, defaultValue }: OrderEditFormProps) {
  const router = useRouter()

  const handleSubmit = async (data: UpdateOrderData) => {
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
    <PremiumRosstilForm initialValue={defaultValue} schema={UpdateOrderSchema} onSubmit={handleSubmit}>
      <Stack gap={4}>
        <PremiumRosstilForm.Errors />

        <PremiumRosstilForm.Select.OrderStatus name="status" label="Статус заказа" options={statusOptions} />

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
