import { Gender } from '@/generated/prisma'
import { z } from 'zod/v4'

/**
 * Схема для редактирования профиля клиента
 * Включает поля как из User, так и из Client моделей
 */
export const ClientProfileEditSchema = z
  .object({
    // Поля из User модели
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

    // Дополнительные поля из Client модели
    gender: z.nativeEnum(Gender, { message: 'Выберите пол' }).optional().or(z.literal('')),

    birthdate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Некорректный формат даты')
      .optional()
      .or(z.literal('')),

    phone: z
      .string()
      .regex(/^\+?[0-9\s\-()]{10,20}$/, 'Некорректный формат телефона')
      .optional()
      .or(z.literal('')),
  })
  .strip() // Удаляем поля React Server Actions ($ACTION_*)

export type ClientProfileEditInput = z.infer<typeof ClientProfileEditSchema>
export type ClientProfileEditData = z.input<typeof ClientProfileEditSchema>
