import { z } from 'zod/v4'

/**
 * Схема для редактирования профиля пользователя
 * Используется в форме редактирования профиля
 */
export const ProfileEditSchema = z
  .object({
    name: z
      .string({ message: 'Имя обязательно' })
      .min(2, 'Имя должно содержать минимум 2 символа')
      .max(100, 'Имя должно содержать максимум 100 символов'),

    phoneNumber: z
      .string()
      .regex(/^\+?[0-9\s\-()]{10,20}$/, 'Некорректный формат телефона')
      .optional()
      .or(z.literal('')),

    image: z
      .string()
      .startsWith('/api/files/avatars/', 'Некорректный URL аватара')
      .optional()
      .or(z.literal(''))
      .or(z.null()),
  })
  .strip() // Удаляем поля React Server Actions ($ACTION_*)

export type ProfileEditInput = z.infer<typeof ProfileEditSchema>
