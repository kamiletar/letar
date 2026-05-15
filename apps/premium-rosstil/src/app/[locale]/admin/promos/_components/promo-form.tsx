'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { PremiumRosstilForm } from '@/premium-rosstil-form'
import { Box, Grid, Text, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { createPromo, updatePromo } from '../_actions/promo.actions'
import { type PromoFormData, PromoFormSchema } from '../_schemas/promo.schema'

interface PromoFormProps {
  /** Данные для редактирования (undefined = создание) */
  defaultValue?: PromoFormData & { id: string }
}

/** Форма создания/редактирования промокода */
export function PromoForm({ defaultValue }: PromoFormProps) {
  const router = useRouter()
  const isEdit = !!defaultValue

  const initialValue: PromoFormData = {
    code: defaultValue?.code || '',
    type: defaultValue?.type || 'PERCENTAGE',
    discount: defaultValue?.discount || 10,
    description: defaultValue?.description || '',
    isActive: defaultValue?.isActive ?? true,
    dateFrom: defaultValue?.dateFrom || new Date(),
    dateTo: defaultValue?.dateTo || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 дней
    minAmount: defaultValue?.minAmount || 0,
    maxUsages: defaultValue?.maxUsages || 0,
    perCustomer: defaultValue?.perCustomer || 1,
  }

  const handleSubmit = async (data: PromoFormData) => {
    const result = isEdit ? await updatePromo(defaultValue.id, data) : await createPromo(data)

    if (result.success) {
      toaster.success({
        title: isEdit ? 'Промокод обновлён' : 'Промокод создан',
      })
      router.push('/admin/promos')
      router.refresh()
    } else {
      toaster.error({ title: result.error || 'Ошибка' })
    }
  }

  return (
    <PremiumRosstilForm initialValue={initialValue} schema={PromoFormSchema} onSubmit={handleSubmit}>
      <VStack align="stretch" gap={6}>
        <PremiumRosstilForm.Errors />

        {/* Основные данные */}
        <Box>
          <Text fontSize="lg" fontWeight="semibold" mb={4}>
            Промокод
          </Text>
          <VStack align="stretch" gap={4}>
            <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
              <PremiumRosstilForm.Field.String name="code" label="Код" placeholder="WELCOME10" required />
              <PremiumRosstilForm.Field.Select
                name="type"
                label="Тип скидки"
                options={[
                  { value: 'PERCENTAGE', label: 'Процент (%)' },
                  { value: 'FIXED_AMOUNT', label: 'Фиксированная сумма (₽)' },
                ]}
                required
              />
            </Grid>

            <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
              <PremiumRosstilForm.Field.Number name="discount" label="Размер скидки" required />
              <PremiumRosstilForm.Field.Number name="minAmount" label="Минимум заказа (₽, 0 = без ограничения)" />
            </Grid>

            <PremiumRosstilForm.Field.Textarea
              name="description"
              label="Описание (для админки)"
              placeholder="Промокод для новых пользователей"
              rows={2}
            />
          </VStack>
        </Box>

        {/* Условия */}
        <Box>
          <Text fontSize="lg" fontWeight="semibold" mb={4}>
            Условия действия
          </Text>
          <VStack align="stretch" gap={4}>
            <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
              <PremiumRosstilForm.Field.Date name="dateFrom" label="Начало действия" required />
              <PremiumRosstilForm.Field.Date name="dateTo" label="Окончание действия" required />
            </Grid>

            <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
              <PremiumRosstilForm.Field.Number name="maxUsages" label="Макс. использований (0 = неограниченно)" />
              <PremiumRosstilForm.Field.Number name="perCustomer" label="Макс. на пользователя" />
            </Grid>

            <PremiumRosstilForm.Field.Checkbox name="isActive" label="Активен" />
          </VStack>
        </Box>

        <PremiumRosstilForm.Button.Submit colorPalette="fg" size="lg">
          {isEdit ? 'Сохранить' : 'Создать промокод'}
        </PremiumRosstilForm.Button.Submit>
      </VStack>
    </PremiumRosstilForm>
  )
}
