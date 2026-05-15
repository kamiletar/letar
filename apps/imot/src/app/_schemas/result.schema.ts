import { z } from 'zod/v4'

/**
 * Допустимые уровни для результатов
 */
export const ResultLevelEnum = z.enum(['numerology', 'neuropsych', 'energy', 'body', 'style', 'overall'])

/**
 * Схема для создания результата
 * Используется специалистами для записи измерений прогресса клиента
 */
export const ResultCreateSchema = z
  .object({
    clientId: z.string({ message: 'ID клиента обязателен' }).cuid('Некорректный ID клиента'),

    level: ResultLevelEnum,

    metric: z
      .string({ message: 'Метрика обязательна' })
      .min(2, 'Метрика должна содержать минимум 2 символа')
      .max(200, 'Метрика должна содержать максимум 200 символов'),

    value: z
      .number({ message: 'Значение обязательно' })
      .int('Значение должно быть целым числом')
      .min(1, 'Минимальное значение: 1')
      .max(10, 'Максимальное значение: 10'),

    description: z.string().max(1000, 'Описание должно содержать максимум 1000 символов').optional().or(z.literal('')),

    practiceId: z.string().cuid('Некорректный ID практики').optional().or(z.literal('')),

    measuredAt: z
      .string()
      .datetime('Некорректный формат даты')
      .or(z.date())
      .optional()
      .transform((val) => (val ? new Date(val).toISOString() : new Date().toISOString())),

    notes: z.string().max(2000, 'Заметки должны содержать максимум 2000 символов').optional().or(z.literal('')),
  })
  .strip() // Удаляем поля React Server Actions ($ACTION_*)

/**
 * Схема для обновления результата
 */
export const ResultUpdateSchema = z
  .object({
    id: z.string({ message: 'ID результата обязателен' }).cuid('Некорректный ID результата'),

    metric: z
      .string()
      .min(2, 'Метрика должна содержать минимум 2 символа')
      .max(200, 'Метрика должна содержать максимум 200 символов')
      .optional(),

    value: z
      .number()
      .int('Значение должно быть целым числом')
      .min(1, 'Минимальное значение: 1')
      .max(10, 'Максимальное значение: 10')
      .optional(),

    description: z.string().max(1000, 'Описание должно содержать максимум 1000 символов').optional().or(z.literal('')),

    notes: z.string().max(2000, 'Заметки должны содержать максимум 2000 символов').optional().or(z.literal('')),
  })
  .strip()

/**
 * Схема для удаления результата
 */
export const ResultDeleteSchema = z
  .object({
    id: z.string({ message: 'ID результата обязателен' }).cuid('Некорректный ID результата'),
  })
  .strip()

export type ResultCreateInput = z.infer<typeof ResultCreateSchema>
export type ResultUpdateInput = z.infer<typeof ResultUpdateSchema>
export type ResultDeleteInput = z.infer<typeof ResultDeleteSchema>
