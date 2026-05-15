import { z } from 'zod/v4'

// Схема для создания отзыва на инструктора (после занятия)
export const ReviewFormSchema = z
  .object({
    // ID занятия (для отзыва на инструктора)
    lessonId: z.string().optional(),
    // ID организации/школы (для отзыва на школу)
    organizationId: z.string().optional(),
    // Рейтинг 1-5
    rating: z
      .union([z.string(), z.number()])
      .transform((val) => {
        if (typeof val === 'string' && val.trim() === '') {
          return 0
        }
        return Number(val)
      })
      .pipe(z.number().int().min(1, { message: 'Выберите оценку от 1 до 5' }).max(5))
      .meta({
        ui: {
          title: 'Оценка',
          fieldType: 'rating',
          description: 'Ваша оценка от 1 до 5 звёзд',
        },
      }),
    // Текст отзыва (опционально)
    text: z
      .string()
      .max(1000, { message: 'Максимум 1000 символов' })
      .optional()
      .transform((val) => (val === '' ? undefined : val?.trim()))
      .meta({
        ui: {
          title: 'Отзыв',
          placeholder: 'Расскажите о вашем опыте...',
          fieldType: 'textarea',
          description: 'Ваши впечатления (необязательно)',
        },
      }),
    // === Качественные аспекты (для отзыва на занятие) ===
    // Инструктор приехал вовремя
    wasOnTime: z
      .boolean()
      .optional()
      .meta({
        ui: { title: 'Инструктор приехал вовремя' },
      }),
    // Инструктор был терпелив
    wasPatient: z
      .boolean()
      .optional()
      .meta({
        ui: { title: 'Инструктор был терпелив' },
      }),
    // Инструктор понятно объяснял
    explainedWell: z
      .boolean()
      .optional()
      .meta({
        ui: { title: 'Понятно объяснял' },
      }),
    // Ученик чувствовал себя в безопасности
    feltSafe: z
      .boolean()
      .optional()
      .meta({
        ui: { title: 'Чувствовал себя в безопасности' },
      }),
    // Оценка автомобиля (1-5)
    vehicleRating: z
      .union([z.string(), z.number()])
      .optional()
      .transform((val) => {
        if (val === undefined || val === null || val === '') {
          return undefined
        }
        return Number(val)
      })
      .pipe(z.number().int().min(1).max(5).optional())
      .meta({
        ui: {
          title: 'Оценка автомобиля',
          fieldType: 'rating',
          description: 'Состояние и комфорт автомобиля',
        },
      }),
    // Рекомендовал бы инструктора
    wouldRecommend: z
      .boolean()
      .optional()
      .meta({
        ui: { title: 'Рекомендовал бы этого инструктора' },
      }),
  })
  .strip()

export type ReviewFormData = z.infer<typeof ReviewFormSchema>

// Схема для ответа на отзыв
export const ReviewResponseSchema = z
  .object({
    reviewId: z.string().min(1, { message: 'ID отзыва обязателен' }),
    response: z
      .string()
      .transform((val) => val.trim())
      .pipe(z.string().min(1, { message: 'Введите текст ответа' }).max(500, { message: 'Максимум 500 символов' }))
      .meta({
        ui: {
          title: 'Ответ на отзыв',
          placeholder: 'Ваш ответ...',
          fieldType: 'textarea',
        },
      }),
  })
  .strip()

export type ReviewResponseData = z.infer<typeof ReviewResponseSchema>

// Схема для жалобы на отзыв
const validReasons = ['SPAM', 'OFFENSIVE', 'FALSE_INFO', 'NOT_RELEVANT', 'OTHER'] as const

export const ReviewReportSchema = z
  .object({
    reviewId: z.string().min(1, { message: 'ID отзыва обязателен' }),
    reason: z.enum(validReasons, { message: 'Выберите причину жалобы' }).meta({
      ui: {
        title: 'Причина жалобы',
        fieldType: 'select',
      },
    }),
    description: z
      .string()
      .max(500, { message: 'Максимум 500 символов' })
      .optional()
      .transform((val) => (val === '' ? undefined : val?.trim()))
      .meta({
        ui: {
          title: 'Описание',
          placeholder: 'Опишите проблему...',
          fieldType: 'textarea',
        },
      }),
  })
  .strip()

export type ReviewReportData = z.infer<typeof ReviewReportSchema>
