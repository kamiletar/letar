import { LicenseCategoryFormSchema as LicenseCategorySchema } from '@letar/driving-school-db/form-schemas/enums/LicenseCategory.form'
import { z } from 'zod/v4'

export const UpdateSchoolSchema = z
  .object({
    schoolId: z.string().min(1, 'ID школы обязателен'),
    name: z
      .string()
      .min(2, 'Название должно содержать минимум 2 символа')
      .max(100, 'Название слишком длинное')
      .meta({
        ui: {
          title: 'Название школы',
          placeholder: 'Автошкола "Профессионал"',
          description: 'Официальное название автошколы',
        },
      }),
    description: z
      .string()
      .max(500, 'Описание слишком длинное')
      .optional()
      .meta({
        ui: {
          title: 'Описание',
          placeholder: 'Опишите преимущества вашей автошколы...',
          fieldType: 'textarea',
          description: 'Краткая информация для учеников',
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
    email: z
      .email('Введите корректный email')
      .optional()
      .or(z.literal(''))
      .meta({
        ui: {
          title: 'Email',
          placeholder: 'school@example.com',
        },
      }),
    website: z
      .url('Введите корректный URL')
      .optional()
      .or(z.literal(''))
      .meta({
        ui: {
          title: 'Сайт',
          placeholder: 'https://school.ru',
        },
      }),
    licenseCategories: z
      .array(LicenseCategorySchema)
      .optional()
      .meta({
        ui: {
          title: 'Категории прав',
          fieldType: 'listbox',
          description: 'Какие категории обучаете',
        },
      }),
    isPublic: z.coerce
      .boolean()
      .optional()
      .meta({
        ui: {
          title: 'Публичная школа',
          fieldType: 'switch',
          description: 'Показывать в каталоге автошкол',
        },
      }),
  })
  .strip()

export type UpdateSchoolInput = z.infer<typeof UpdateSchoolSchema>
