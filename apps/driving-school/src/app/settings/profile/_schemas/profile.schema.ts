import { z } from 'zod/v4'

/**
 * Схема обновления профиля с UI метаданными
 */
export const UpdateProfileSchema = z
  .object({
    name: z
      .string()
      .max(100, { message: 'Максимум 100 символов' })
      .optional()
      .meta({
        ui: {
          title: 'Имя',
          placeholder: 'Иван Иванов',
          description: 'Ваше полное имя',
        },
      }),
    phone: z
      .string()
      .max(20, { message: 'Максимум 20 символов' })
      .optional()
      .meta({
        ui: {
          title: 'Телефон',
          placeholder: '+7 (999) 123-45-67',
          fieldType: 'phone',
        },
      }),
  })
  .strip()

export type UpdateProfileData = z.infer<typeof UpdateProfileSchema>
