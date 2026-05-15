import { LicenseCategoryFormSchema as LicenseCategorySchema } from '@letar/driving-school-db/form-schemas/enums/LicenseCategory.form'
import { z } from 'zod/v4'

export const CreateSchoolSchema = z
  .object({
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
  })
  .strip()

export type CreateSchoolInput = z.infer<typeof CreateSchoolSchema>
