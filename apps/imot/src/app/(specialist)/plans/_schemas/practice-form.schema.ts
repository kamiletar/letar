import { z } from 'zod/v4'

/**
 * Схема валидации для формы создания/редактирования практики.
 * Использует .strip() для обработки React Server Actions service fields.
 */
export const PracticeFormSchema = z
  .object({
    clientId: z.string().min(1, 'Клиент обязателен для выбора'),
    title: z.string().min(1, 'Название практики обязательно'),
    description: z.string().min(1, 'Описание обязательно'),

    // К какому уровню относится
    level: z
      .enum(['numerology', 'neuropsych', 'energy', 'body', 'style', 'integration'])
      .describe('Выберите уровень практики'),

    // Инструкции
    instructions: z.string().min(1, 'Инструкции обязательны'),
    frequency: z.string().optional(),
    duration: z.string().optional(),

    // Материалы
    materials: z.string().optional(), // JSON массив
    videoUrl: z.string().url('Некорректный URL видео').optional().or(z.literal('')),
    audioUrl: z.string().url('Некорректный URL аудио').optional().or(z.literal('')),

    // Отслеживание
    isAssigned: z.boolean().default(true),

    notes: z.string().optional(),
  })
  .strip()

export type PracticeFormData = z.infer<typeof PracticeFormSchema>
