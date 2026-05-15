'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { DrivingSchoolForm } from '@/driving-school-form'
import { Button, SimpleGrid, Stack } from '@chakra-ui/react'
import { LicenseCategoryLabels } from '@letar/driving-school-db/form-schemas/enums/LicenseCategory.form'
import { useRouter } from 'next/navigation'
import {
  createVehicleAction,
  updateVehicleAction,
  type VehicleActionResult,
  type VehicleData,
} from '../_actions/vehicle.action'
import { VehicleFormSchema, type VehicleInput } from '../_schemas/vehicle-form.schema'

// Категории прав из generated form-schemas
const licenseCategoryOptions = Object.entries(LicenseCategoryLabels).map(([value, label]) => ({
  value,
  label,
}))

interface VehicleFormProps {
  defaultValues?: Partial<VehicleData>
  submitLabel?: string
}

/**
 * Форма автомобиля
 *
 * Особенности:
 * - DrivingSchoolForm (декларативный API на TanStack Form)
 * - Select.TransmissionType для типа КПП
 * - Field.CheckboxCard для категорий прав
 * - Field.Checkbox для флагов
 * - Типизированные Server Actions
 */
export function VehicleForm({ defaultValues, submitLabel = 'Добавить' }: VehicleFormProps) {
  const router = useRouter()
  const isEditing = !!defaultValues?.id

  const handleSubmit = async (value: VehicleInput) => {
    // Вызываем типизированный Server Action
    const data: VehicleInput = {
      ...value,
      // ID при редактировании
      ...(defaultValues?.id && { id: defaultValues.id }),
    }

    const result: VehicleActionResult = isEditing ? await updateVehicleAction(data) : await createVehicleAction(data)

    if (result.success) {
      toaster.success({ title: isEditing ? 'Автомобиль обновлён' : 'Автомобиль добавлен' })
      if (!isEditing) {
        router.push('/vehicles')
      }
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
        brand: defaultValues?.brand ?? '',
        model: defaultValues?.model ?? '',
        plateNumber: defaultValues?.plateNumber ?? '',
        transmission: defaultValues?.transmission ?? 'MANUAL',
        year: defaultValues?.year ?? undefined,
        color: defaultValues?.color ?? '',
        licenseCategories: defaultValues?.licenseCategories ?? [],
        isPrimary: defaultValues?.isPrimary ?? false,
        isActive: defaultValues?.isActive ?? true,
        isAvailable: defaultValues?.isAvailable ?? true,
        unavailableReason: defaultValues?.unavailableReason ?? '',
      }}
      schema={VehicleFormSchema}
      onSubmit={handleSubmit}
    >
      {/* Защита от потери несохранённых изменений */}
      <DrivingSchoolForm.DirtyGuard />

      <Stack gap={6}>
        <DrivingSchoolForm.Errors />

        {/* Марка и модель */}
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
          <DrivingSchoolForm.Field.String name="brand" label="Марка" placeholder="Toyota, Hyundai, Kia..." required />
          <DrivingSchoolForm.Field.String name="model" label="Модель" placeholder="Camry, Solaris, Rio..." required />
        </SimpleGrid>

        {/* КПП и год */}
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
          <DrivingSchoolForm.Select.TransmissionType name="transmission" label="Тип КПП" required />
          <DrivingSchoolForm.Field.Number
            name="year"
            label="Год выпуска"
            min={1990}
            max={new Date().getFullYear() + 1}
          />
        </SimpleGrid>

        {/* Госномер и цвет */}
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
          <DrivingSchoolForm.Field.PlateNumber name="plateNumber" label="Госномер" />
          <DrivingSchoolForm.Field.String name="color" label="Цвет" placeholder="Белый, серебристый..." />
        </SimpleGrid>

        {/* Категории прав */}
        <DrivingSchoolForm.Field.CheckboxCard
          name="licenseCategories"
          label="Категории прав для этого авто"
          helperText="Выберите, какие категории можно преподавать на этом авто"
          options={licenseCategoryOptions}
          size="sm"
          gap={2}
        />

        {/* Флаги */}
        <Stack gap={3}>
          <DrivingSchoolForm.Field.Checkbox name="isPrimary" label="Основной автомобиль" />
          <DrivingSchoolForm.Field.Checkbox name="isActive" label="Активен (используется для обучения)" />
          <DrivingSchoolForm.Field.Checkbox name="isAvailable" label="Доступен сейчас (не в ремонте)" />
        </Stack>

        {/* Причина недоступности */}
        <DrivingSchoolForm.Field.Textarea
          name="unavailableReason"
          label="Причина недоступности"
          placeholder="Например: на ТО до 15 декабря..."
          helperText="Заполните, если автомобиль временно недоступен"
          rows={2}
        />

        {/* Кнопки */}
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
