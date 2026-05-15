import { LessonCategoryFormSchema as LessonCategorySchema } from '@letar/driving-school-db/form-schemas/enums/LessonCategory.form'
import { LicenseCategoryFormSchema as LicenseCategorySchema } from '@letar/driving-school-db/form-schemas/enums/LicenseCategory.form'
import { z } from 'zod/v4'

/**
 * Схема формы для создания/редактирования типа занятия с UI метаданными
 * Цена теперь задаётся через PricingOption — отдельную модель.
 */
export const LessonTypeFormSchema = z
  .object({
    name: z
      .string()
      .transform((val) => val.trim())
      .pipe(
        z
          .string()
          .min(1, { message: 'Введите название типа занятия' })
          .max(100, { message: 'Название не должно превышать 100 символов' })
      )
      .meta({
        ui: {
          title: 'Название',
          placeholder: 'Например: Стандартное занятие',
          description: 'Краткое название для отображения ученикам',
        },
      }),

    description: z
      .string()
      .max(500, { message: 'Описание не должно превышать 500 символов' })
      .optional()
      .transform((val) => (val === '' ? undefined : val))
      .meta({ ui: { title: 'Описание', placeholder: 'Опишите, что включает занятие...', fieldType: 'textarea' } }),

    durationMinutes: z.coerce
      .number({ message: 'Введите корректную длительность' })
      .int({ message: 'Длительность должна быть целым числом' })
      .min(15, { message: 'Минимальная длительность — 15 минут' })
      .max(480, { message: 'Максимальная длительность — 8 часов (480 минут)' })
      .meta({
        ui: { title: 'Длительность (мин)', placeholder: '60', fieldType: 'number', description: 'Продолжительность' },
      }),

    licenseCategory: z
      .union([LicenseCategorySchema, z.literal('')])
      .optional()
      .transform((val) => (val === '' ? undefined : val))
      .meta({ ui: { title: 'Категория прав', fieldType: 'select', description: 'Для какой категории прав' } }),

    lessonCategory: z
      .union([LessonCategorySchema, z.literal('')])
      .optional()
      .transform((val) => (val === '' ? undefined : val))
      .meta({ ui: { title: 'Тип занятия', fieldType: 'select', description: 'Предустановленная категория' } }),
  })
  .strip()

export type LessonTypeFormData = z.infer<typeof LessonTypeFormSchema>

/**
 * Схема для создания/обновления типа занятия (с id для обновления)
 */
export const LessonTypeInputSchema = LessonTypeFormSchema.extend({
  id: z.string().optional(),
}).strip()

export type LessonTypeInput = z.infer<typeof LessonTypeInputSchema>
