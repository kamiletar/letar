import { z } from 'zod/v4'

// Базовые поля филиала с meta.ui
// ПРИМЕЧАНИЕ: schoolId из URL — это organizationId после миграции School → Organization
const baseLocationFields = {
  organizationId: z.string(),
  name: z
    .string()
    .min(2, 'Название должно содержать минимум 2 символа')
    .max(100, 'Название слишком длинное')
    .meta({
      ui: {
        title: 'Название филиала',
        placeholder: 'Главный офис',
        description: 'Уникальное название для идентификации',
      },
    }),
  type: z
    .enum(['OFFICE', 'CLASSROOM', 'TRAINING'], {
      error: 'Выберите тип филиала',
    })
    .meta({
      ui: {
        title: 'Тип филиала',
        fieldType: 'select',
        description: 'Назначение помещения',
      },
    }),
  city: z
    .string()
    .min(2, 'Укажите город')
    .max(100, 'Название города слишком длинное')
    .meta({
      ui: {
        title: 'Город',
        placeholder: 'Москва',
      },
    }),
  address: z
    .string()
    .min(5, 'Укажите адрес')
    .max(200, 'Адрес слишком длинный')
    .meta({
      ui: {
        title: 'Адрес',
        placeholder: 'ул. Примерная, д. 1',
        description: 'Полный адрес филиала',
      },
    }),
  phone: z
    .string()
    .regex(/^(\+7|8)?[\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}$/, 'Введите корректный номер телефона')
    .optional()
    .or(z.literal(''))
    .meta({
      ui: {
        title: 'Телефон',
        placeholder: '+7 (999) 123-45-67',
        fieldType: 'phone',
      },
    }),
  description: z
    .string()
    .max(500, 'Описание слишком длинное')
    .optional()
    .meta({
      ui: {
        title: 'Описание',
        placeholder: 'Дополнительная информация...',
        fieldType: 'textarea',
      },
    }),
  // Данные из DaData (скрытые поля)
  timezone: z.string().optional(), // "UTC+3"
  geoLat: z.string().optional(),
  geoLon: z.string().optional(),
  // Часы работы в JSON формате (строка для передачи через форму)
  workingHours: z
    .string()
    .optional()
    .meta({
      ui: {
        title: 'Часы работы',
        description: 'Расписание работы филиала',
      },
    }),
}

export const CreateLocationSchema = z.object(baseLocationFields).strip()

export const UpdateLocationSchema = z
  .object({
    locationId: z.string(),
    ...baseLocationFields,
    isActive: z
      .boolean()
      .optional()
      .default(true)
      .meta({
        ui: {
          title: 'Активен',
          fieldType: 'switch',
          description: 'Показывать в списке филиалов',
        },
      }),
  })
  .strip()

export const DeleteLocationSchema = z
  .object({
    locationId: z.string(),
    organizationId: z.string(),
  })
  .strip()

// Типы для использования в actions
export type CreateLocationInput = z.infer<typeof CreateLocationSchema>
export type UpdateLocationInput = z.infer<typeof UpdateLocationSchema>
export type DeleteLocationInput = z.infer<typeof DeleteLocationSchema>
