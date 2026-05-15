import { GenderFormSchema as GenderSchema } from '@/generated/form-schemas/enums/Gender.form'
import { z } from 'zod/v4'

/**
 * Схема для редактирования профиля пользователя.
 * Использует .strip() для удаления служебных полей React Server Actions.
 */
export const ProfileEditSchema = z
  .object({
    name: z.string().min(1, 'Имя обязательно для заполнения').max(100, 'Имя слишком длинное'),
    email: z.string().email('Некорректный email адрес'),
    gender: GenderSchema.nullable().optional(),
    birthdate: z.string().nullable().optional(), // ISO string from input[type="date"]
    phoneNumber: z
      .string()
      .nullable()
      .optional()
      .refine(
        (val) => {
          // Пустое значение разрешено (optional)
          if (!val || val === '') {
            return true
          }
          // Проверяем формат +7XXXXXXXXXX (12 символов)
          return /^\+7\d{10}$/.test(val)
        },
        {
          message: 'Некорректный формат телефона. Используйте формат +7 (999) 123-45-67',
        }
      ),
  })
  .strip()

export type ProfileEditData = z.infer<typeof ProfileEditSchema>
