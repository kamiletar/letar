'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Gender } from '@/generated/prisma'
import { useRouter } from '@/i18n/navigation'
import { PremiumRosstilForm } from '@/premium-rosstil-form'
import { Grid, VStack } from '@chakra-ui/react'
import { useTypedFormContext } from '@letar/forms'
import { upsertMeasurements, type UpsertMeasurementsResult } from '../_actions/upsert-measurements'
import { type MeasurementsFormData, MeasurementsFormSchema } from '../_schemas/measurements-form.schema'

interface MeasurementsFormProps {
  defaultValue?: Partial<MeasurementsFormData>
}

/**
 * Форма для ввода замеров пользователя.
 * Использует декларативный Form API.
 */
export function MeasurementsForm({ defaultValue }: MeasurementsFormProps) {
  const router = useRouter()

  const initialValue: MeasurementsFormData = {
    gender: defaultValue?.gender ?? Gender.FEMALE,
    bust: defaultValue?.bust ?? '',
    waist: defaultValue?.waist ?? '',
    hips: defaultValue?.hips ?? '',
    height: defaultValue?.height ?? '',
    preferredSize: defaultValue?.preferredSize ?? '',
    notes: defaultValue?.notes ?? '',
  }

  const handleSubmit = async (data: MeasurementsFormData) => {
    const result: UpsertMeasurementsResult = await upsertMeasurements(data)

    if (result.success) {
      toaster.success({
        title: 'Замеры сохранены',
        description: 'Ваши данные успешно сохранены',
      })
      router.push(result.redirect)
    } else {
      toaster.error({
        title: 'Ошибка',
        description: result.error,
      })
    }
  }

  return (
    <PremiumRosstilForm initialValue={initialValue} schema={MeasurementsFormSchema} onSubmit={handleSubmit}>
      <VStack align="stretch" gap={6}>
        {/* Пол */}
        <PremiumRosstilForm.Select.Gender
          name="gender"
          label="Пол"
          placeholder="Выберите пол"
          helperText="Используется для подбора размеров"
          required
        />

        {/* Измерения в 2 колонки */}
        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
          <PremiumRosstilForm.Field.Number name="bust" label="Обхват груди (см)" placeholder="90" min={50} max={200} />

          <PremiumRosstilForm.Field.Number name="waist" label="Обхват талии (см)" placeholder="70" min={40} max={150} />

          <PremiumRosstilForm.Field.Number name="hips" label="Обхват бедер (см)" placeholder="95" min={50} max={200} />

          <PremiumRosstilForm.Field.Number name="height" label="Рост (см)" placeholder="165" min={100} max={250} />
        </Grid>

        {/* Предпочтительный размер */}
        <PremiumRosstilForm.Field.String
          name="preferredSize"
          label="Предпочтительный размер (RU)"
          placeholder="46"
          helperText="Размер, который вы обычно носите (например, 44, 46, 48). Нажмите на рекомендованный размер ниже, чтобы автоматически заполнить это поле."
        />

        {/* Заметки */}
        <PremiumRosstilForm.Field.Textarea
          name="notes"
          label="Дополнительные заметки"
          placeholder="Дополнительная информация о ваших предпочтениях..."
          rows={4}
        />

        {/* Общие ошибки формы */}
        <PremiumRosstilForm.Errors />

        {/* Кнопка submit */}
        <PremiumRosstilForm.Button.Submit colorPalette="fg" size="lg">
          Сохранить замеры
        </PremiumRosstilForm.Button.Submit>
      </VStack>
    </PremiumRosstilForm>
  )
}

/**
 * Хук для получения текущих значений формы замеров.
 * Используется в компоненте LiveSizeRecommendation.
 */
export function useMeasurementsFormValues() {
  return useTypedFormContext<MeasurementsFormData>()
}
