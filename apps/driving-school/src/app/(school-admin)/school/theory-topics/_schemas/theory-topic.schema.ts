import { z } from 'zod/v4'

import { LicenseCategoryFormSchema as LicenseCategorySchema } from '@letar/driving-school-db/form-schemas/enums/LicenseCategory.form'

// Схема для создания/редактирования темы
export const TheoryTopicFormSchema = z
  .object({
    schoolId: z.string().min(1, 'Школа обязательна'),
    name: z
      .string()
      .min(1, 'Название обязательно')
      .max(200, 'Максимум 200 символов')
      .meta({
        ui: {
          title: 'Название темы',
          placeholder: 'ПДД: Дорожные знаки',
          description: 'Краткое название темы',
        },
      }),
    description: z
      .string()
      .max(2000, 'Максимум 2000 символов')
      .optional()
      .meta({
        ui: {
          title: 'Описание',
          placeholder: 'Подробное описание темы...',
          fieldType: 'textarea',
          description: 'Что изучается в рамках темы',
        },
      }),
    categories: z
      .array(LicenseCategorySchema)
      .default([])
      .meta({
        ui: {
          title: 'Категории прав',
          fieldType: 'multiselect',
          description: 'Для каких категорий тема (пусто = для всех)',
        },
      }),
    sortOrder: z.coerce
      .number()
      .int()
      .min(0, 'Порядок не может быть отрицательным')
      .default(0)
      .meta({
        ui: {
          title: 'Порядок',
          placeholder: '0',
          fieldType: 'number',
          description: 'Порядковый номер в программе',
        },
      }),
    materials: z
      .array(z.string().url('Некорректный URL'))
      .optional()
      .meta({
        ui: {
          title: 'Учебные материалы',
          description: 'Ссылки на материалы для изучения',
        },
      }),
  })
  .strip()

export type TheoryTopicFormData = z.infer<typeof TheoryTopicFormSchema>

// Схема для изменения порядка тем
export const ReorderTopicsSchema = z
  .object({
    topicIds: z.array(z.string().min(1)),
  })
  .strip()

export type ReorderTopicsData = z.infer<typeof ReorderTopicsSchema>
