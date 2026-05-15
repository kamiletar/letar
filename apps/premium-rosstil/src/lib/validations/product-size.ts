import { Gender } from '@/generated/prisma'
import { z } from 'zod/v4'

/**
 * Схема валидации для создания/обновления ProductSize
 */
export const productSizeSchema = z.object({
  gender: z.nativeEnum(Gender, {
    error: () => ({ message: 'Выберите пол' }),
  }),
  international: z.string().min(1, 'Выберите международный размер'),
  ru: z.string().min(1, 'RU размер обязателен'),
  de: z.string().min(1, 'DE размер обязателен'),
  it: z.string().min(1, 'IT размер обязателен'),
  fr: z.string().min(1, 'FR размер обязателен'),
  uk: z.string().min(1, 'UK размер обязателен'),
  us: z.string().min(1, 'US размер обязателен'),
  jeansFrom: z.string().min(1, 'Размер джинс (от) обязателен'),
  jeansTo: z.string().min(1, 'Размер джинс (до) обязателен'),

  // Measurements in centimeters (optional)
  bustMin: z.coerce
    .number()
    .int()
    .positive('Обхват груди (от) должен быть положительным числом')
    .optional()
    .or(z.literal('')),
  bustMax: z.coerce
    .number()
    .int()
    .positive('Обхват груди (до) должен быть положительным числом')
    .optional()
    .or(z.literal('')),
  waistMin: z.coerce
    .number()
    .int()
    .positive('Обхват талии (от) должен быть положительным числом')
    .optional()
    .or(z.literal('')),
  waistMax: z.coerce
    .number()
    .int()
    .positive('Обхват талии (до) должен быть положительным числом')
    .optional()
    .or(z.literal('')),
  hipsMin: z.coerce
    .number()
    .int()
    .positive('Обхват бедер (от) должен быть положительным числом')
    .optional()
    .or(z.literal('')),
  hipsMax: z.coerce
    .number()
    .int()
    .positive('Обхват бедер (до) должен быть положительным числом')
    .optional()
    .or(z.literal('')),
})

/**
 * Типы для TypeScript
 */
export type ProductSizeInput = z.infer<typeof productSizeSchema>
