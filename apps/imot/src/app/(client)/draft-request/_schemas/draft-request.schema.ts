import { z } from 'zod/v4'

// import { Gender } from '@/generated/prisma'

export const Gender = {
  MALE: 'MALE',
  FEMALE: 'FEMALE',
  OTHER: 'OTHER',
} as const

export type Gender = (typeof Gender)[keyof typeof Gender]

/**
 * Схема для черновика запроса клиента
 */
export const draftRequestSchema = z
  .object({
    mainRequest: z
      .string({ message: 'Пожалуйста, опишите ваш запрос' })
      .min(10, 'Запрос должен содержать минимум 10 символов')
      .max(2000, 'Запрос не должен превышать 2000 символов'),
    birthdate: z.string({ message: 'Пожалуйста, укажите дату рождения' }).min(1, 'Дата рождения обязательна'),
    gender: z
      .string({ message: 'Пожалуйста, выберите пол' })
      .min(1, 'Пол обязателен')
      .refine((val) => val === 'MALE' || val === 'FEMALE' || val === 'OTHER', {
        message: 'Пожалуйста, выберите пол',
      }),
  })
  .strip()

export type DraftRequestFormData = z.infer<typeof draftRequestSchema>
