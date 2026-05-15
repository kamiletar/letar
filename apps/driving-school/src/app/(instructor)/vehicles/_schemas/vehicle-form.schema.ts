import { LicenseCategoryFormSchema as LicenseCategorySchema } from '@letar/driving-school-db/form-schemas/enums/LicenseCategory.form'
import { TransmissionTypeFormSchema as TransmissionTypeSchema } from '@letar/driving-school-db/form-schemas/enums/TransmissionType.form'
import { z } from 'zod/v4'

/**
 * Схема формы для создания/редактирования автомобиля с UI метаданными
 */
export const VehicleFormSchema = z
  .object({
    brand: z
      .string()
      .transform((val) => val.trim())
      .pipe(
        z
          .string()
          .min(1, { message: 'Введите марку автомобиля' })
          .max(50, { message: 'Марка не должна превышать 50 символов' })
      )
      .meta({ ui: { title: 'Марка', placeholder: 'Например: Toyota', description: 'Марка автомобиля' } }),

    model: z
      .string()
      .transform((val) => val.trim())
      .pipe(
        z
          .string()
          .min(1, { message: 'Введите модель автомобиля' })
          .max(50, { message: 'Модель не должна превышать 50 символов' })
      )
      .meta({ ui: { title: 'Модель', placeholder: 'Например: Camry', description: 'Модель автомобиля' } }),

    plateNumber: z
      .string()
      .max(20, { message: 'Госномер не должен превышать 20 символов' })
      .optional()
      .transform((val) => (val === '' ? undefined : val?.trim()))
      .meta({
        ui: { title: 'Госномер', placeholder: 'А000АА00', description: 'Государственный регистрационный знак' },
      }),

    transmission: TransmissionTypeSchema.meta({
      ui: { title: 'Тип КПП', fieldType: 'select', description: 'Механическая или автоматическая коробка передач' },
    }),

    year: z
      .union([z.string(), z.number()])
      .optional()
      .transform((val) => {
        if (val === undefined || val === '' || val === null) {
          return undefined
        }
        return Number(val)
      })
      .pipe(
        z
          .number()
          .int({ message: 'Год должен быть целым числом' })
          .min(1990, { message: 'Год выпуска не может быть раньше 1990' })
          .max(new Date().getFullYear() + 1, { message: 'Некорректный год выпуска' })
          .optional()
      )
      .meta({ ui: { title: 'Год выпуска', placeholder: '2020', fieldType: 'number' } }),

    color: z
      .string()
      .max(30, { message: 'Цвет не должен превышать 30 символов' })
      .optional()
      .transform((val) => (val === '' ? undefined : val?.trim()))
      .meta({ ui: { title: 'Цвет', placeholder: 'Белый' } }),

    licenseCategories: z
      .array(LicenseCategorySchema)
      .optional()
      .default([])
      .meta({
        ui: { title: 'Категории прав', fieldType: 'listbox', description: 'Для каких категорий прав подходит' },
      }),

    isPrimary: z.coerce
      .boolean()
      .optional()
      .default(false)
      .meta({ ui: { title: 'Основной автомобиль', fieldType: 'switch', description: 'Использовать по умолчанию' } }),

    isActive: z.coerce
      .boolean()
      .optional()
      .default(true)
      .meta({ ui: { title: 'Активен', fieldType: 'switch', description: 'Отображать в списке' } }),

    isAvailable: z.coerce
      .boolean()
      .optional()
      .default(true)
      .meta({ ui: { title: 'Доступен', fieldType: 'switch', description: 'Автомобиль доступен для занятий' } }),

    unavailableReason: z
      .string()
      .max(200, { message: 'Причина не должна превышать 200 символов' })
      .optional()
      .transform((val) => (val === '' ? undefined : val?.trim()))
      .meta({ ui: { title: 'Причина недоступности', placeholder: 'На ремонте до 15.01', fieldType: 'textarea' } }),
  })
  .strip()

export type VehicleFormData = z.infer<typeof VehicleFormSchema>

/**
 * Схема для отметки автомобиля как недоступного
 */
export const VehicleAvailabilitySchema = z
  .object({
    isAvailable: z.coerce.boolean(),
    unavailableReason: z
      .string()
      .max(200, { message: 'Причина не должна превышать 200 символов' })
      .optional()
      .transform((val) => (val === '' ? undefined : val?.trim())),
  })
  .strip()

export type VehicleAvailabilityData = z.infer<typeof VehicleAvailabilitySchema>

/**
 * Схема для создания/обновления автомобиля (с id для обновления)
 */
export const VehicleInputSchema = VehicleFormSchema.extend({
  id: z.string().optional(),
}).strip()

export type VehicleInput = z.infer<typeof VehicleInputSchema>
