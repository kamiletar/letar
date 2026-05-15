'use client'

import { AddressInput } from '@/app/_components/address-input'
import { toaster } from '@/app/_components/ui/toaster'
import { WorkingHoursEditor } from '@/app/_components/working-hours-editor'
import { DrivingSchoolForm } from '@/driving-school-form'
import { parseWorkingHours, type WorkingHoursSchedule } from '@/lib/working-hours'
import { Box, Field, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import type { LocationType } from '@letar/driving-school-db/prisma'
import { useDeclarativeForm } from '@letar/forms'
import type { AnyFieldApi } from '@tanstack/react-form'
import { type ReactElement, useState } from 'react'
import type { DaDataAddress, DaDataSuggestion } from 'react-dadata'
import { LuSave } from 'react-icons/lu'
import { createLocationAction, type LocationWithDetails, updateLocationAction } from '../_actions/location.action'
import { CreateLocationSchema, UpdateLocationSchema } from '../_schemas/location.schema'

// Типы локаций для Select
const LOCATION_TYPE_OPTIONS: { value: LocationType; title: string }[] = [
  { value: 'OFFICE', title: 'Офис' },
  { value: 'CLASSROOM', title: 'Учебный класс' },
  { value: 'TRAINING', title: 'Площадка' },
]

type Props = {
  organizationId: string
  location?: LocationWithDetails
  onSuccess?: () => void
}

/**
 * Кастомный AddressField с интеграцией в DrivingSchoolForm
 *
 * При выборе адреса автоматически заполняет поля city, timezone, geoLat, geoLon
 */
function AddressField({ name }: { name: string }): ReactElement {
  const { form } = useDeclarativeForm()

  const handleAddressSelect = (suggestion: DaDataSuggestion<DaDataAddress>) => {
    // Автозаполнение города из выбранного адреса
    if (suggestion.data.city) {
      form.setFieldValue('city', suggestion.data.city)
    } else if (suggestion.data.settlement) {
      form.setFieldValue('city', suggestion.data.settlement)
    }

    // Автозаполнение геоданных из DaData
    if (suggestion.data.timezone) {
      form.setFieldValue('timezone', suggestion.data.timezone)
    }
    if (suggestion.data.geo_lat) {
      form.setFieldValue('geoLat', suggestion.data.geo_lat)
    }
    if (suggestion.data.geo_lon) {
      form.setFieldValue('geoLon', suggestion.data.geo_lon)
    }
  }

  return (
    <form.Field name={name}>
      {(field: AnyFieldApi) => {
        const errors = field.state.meta.errors
        const hasError = errors && errors.length > 0
        const geoLat = form.getFieldValue('geoLat') as string
        const geoLon = form.getFieldValue('geoLon') as string
        const timezone = form.getFieldValue('timezone') as string

        return (
          <Field.Root invalid={hasError} required>
            <Field.Label>
              Адрес
              <Field.RequiredIndicator />
            </Field.Label>
            <AddressInput
              value={(field.state.value as string) ?? ''}
              onChange={(value) => field.handleChange(value)}
              onBlur={field.handleBlur}
              placeholder="Введите адрес филиала"
              onAddressSelect={handleAddressSelect}
            />
            {hasError ? (
              <Field.ErrorText>
                {errors.map((e: string | { message: string }) => (typeof e === 'string' ? e : e.message)).join(', ')}
              </Field.ErrorText>
            ) : (
              <Field.HelperText>
                {geoLat && geoLon
                  ? `📍 Координаты: ${geoLat}, ${geoLon}${timezone ? ` (${timezone})` : ''}`
                  : 'Начните вводить адрес для поиска'}
              </Field.HelperText>
            )}
          </Field.Root>
        )
      }}
    </form.Field>
  )
}

/**
 * Кастомный WorkingHoursField с интеграцией в DrivingSchoolForm
 */
function WorkingHoursField({
  name,
  defaultWorkingHours,
}: {
  name: string
  defaultWorkingHours: WorkingHoursSchedule | null
}): ReactElement {
  const { form } = useDeclarativeForm()

  return (
    <form.Field name={name}>
      {(field: AnyFieldApi) => {
        const errors = field.state.meta.errors
        const hasError = errors && errors.length > 0

        return (
          <Field.Root invalid={hasError}>
            <Field.Label>Часы работы</Field.Label>
            <WorkingHoursEditor
              name={name}
              defaultValue={defaultWorkingHours}
              onChange={(schedule) => {
                field.handleChange(JSON.stringify(schedule))
              }}
            />
            {hasError && (
              <Field.ErrorText>
                {errors.map((e: string | { message: string }) => (typeof e === 'string' ? e : e.message)).join(', ')}
              </Field.ErrorText>
            )}
          </Field.Root>
        )
      }}
    </form.Field>
  )
}

interface LocationFormData {
  organizationId: string
  locationId?: string
  name: string
  type: LocationType
  city: string
  address: string
  phone: string
  description: string
  workingHours: string
  isActive: boolean
  timezone: string
  geoLat: string
  geoLon: string
}

/**
 * Форма филиала автошколы
 *
 * Особенности:
 * - DrivingSchoolForm (декларативный API на TanStack Form)
 * - Select.LocationType для типа филиала
 * - Кастомный AddressField с автозаполнением города и координат
 * - Кастомный WorkingHoursField для расписания
 * - Решает Bug #21 (form reset после Server Action)
 */
export function LocationForm({ organizationId, location, onSuccess }: Props) {
  const [formError, setFormError] = useState<string | null>(null)
  const isEdit = !!location

  // Получаем данные из locationData (могут отсутствовать)
  const locData = location?.locationData

  // Парсим workingHours из JSON
  const parsedWorkingHours = locData ? parseWorkingHours(locData.workingHours) : null

  const schema = isEdit ? UpdateLocationSchema : CreateLocationSchema

  const handleSubmit = async (value: LocationFormData) => {
    setFormError(null)

    // Базовые данные для обоих действий
    const baseData = {
      organizationId,
      name: value.name,
      type: value.type as 'OFFICE' | 'CLASSROOM' | 'TRAINING',
      city: value.city,
      address: value.address,
      phone: value.phone || undefined,
      description: value.description || undefined,
      workingHours: value.workingHours || undefined,
      timezone: value.timezone || undefined,
      geoLat: value.geoLat || undefined,
      geoLon: value.geoLon || undefined,
    }

    // Вызываем соответствующий action с правильным типом данных
    const result =
      isEdit && location
        ? await updateLocationAction({
            ...baseData,
            locationId: location.id,
            isActive: value.isActive ?? true,
          })
        : await createLocationAction(baseData)

    if (result?.error?.formErrors) {
      setFormError(result.error.formErrors.join(', '))
      toaster.error({
        title: 'Ошибка',
        description: result.error.formErrors.join(', '),
      })
    } else if (result.success) {
      toaster.success({
        title: isEdit ? 'Филиал обновлён' : 'Филиал создан',
        description: isEdit ? 'Изменения успешно сохранены' : 'Новый филиал добавлен',
      })
      onSuccess?.()
    }
  }

  return (
    <DrivingSchoolForm
      initialValue={{
        organizationId,
        locationId: location?.id ?? '',
        name: location?.name ?? '',
        type: locData?.type ?? 'OFFICE',
        city: locData?.city ?? '',
        address: locData?.address ?? '',
        phone: locData?.phone ?? '',
        description: locData?.description ?? '',
        workingHours: '',
        isActive: locData?.isActive ?? true,
        timezone: locData?.timezone ?? '',
        geoLat: locData?.geoLat ?? '',
        geoLon: locData?.geoLon ?? '',
      }}
      schema={schema}
      onSubmit={handleSubmit}
    >
      <Stack gap={5}>
        {/* Ошибки формы */}
        {formError && (
          <Box layerStyle="panel.error">
            <Text color="error.fg" fontSize="sm">
              {formError}
            </Text>
          </Box>
        )}

        <DrivingSchoolForm.Errors />

        {/* Название и тип */}
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
          <DrivingSchoolForm.Field.String
            name="name"
            label="Название"
            placeholder="Название филиала"
            helperText="Например: Офис на Ленина"
            required
          />
          <DrivingSchoolForm.Field.NativeSelect name="type" label="Тип" options={LOCATION_TYPE_OPTIONS} required />
        </SimpleGrid>

        {/* Адрес с автодополнением DaData */}
        <AddressField name="address" />

        {/* Город (автозаполняется из адреса) */}
        <DrivingSchoolForm.Field.String
          name="city"
          label="Город"
          placeholder="Москва"
          helperText="Автозаполняется при выборе адреса"
          required
        />

        {/* Телефон */}
        <DrivingSchoolForm.Field.Phone name="phone" label="Телефон" />

        {/* Часы работы */}
        <WorkingHoursField name="workingHours" defaultWorkingHours={parsedWorkingHours} />

        {/* Описание */}
        <DrivingSchoolForm.Field.Textarea
          name="description"
          label="Описание"
          placeholder="Дополнительная информация о филиале"
          rows={2}
        />

        {/* Активность (только при редактировании) */}
        {isEdit && (
          <Box p={4} bg="bg.muted" borderRadius="md">
            <DrivingSchoolForm.Field.Switch
              name="isActive"
              label="Активный филиал"
              helperText="Неактивные филиалы не отображаются на публичной странице"
            />
          </Box>
        )}

        {/* Скрытые поля для геоданных */}
        <input type="hidden" name="timezone" />
        <input type="hidden" name="geoLat" />
        <input type="hidden" name="geoLon" />

        {/* Кнопка сохранения */}
        <DrivingSchoolForm.Button.Submit colorPalette="brand">
          <LuSave />
          {isEdit ? 'Сохранить изменения' : 'Добавить филиал'}
        </DrivingSchoolForm.Button.Submit>
      </Stack>
    </DrivingSchoolForm>
  )
}
