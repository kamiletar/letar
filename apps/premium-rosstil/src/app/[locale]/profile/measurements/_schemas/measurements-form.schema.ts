import { GenderFormSchema as GenderSchema } from '@/generated/form-schemas/enums/Gender.form'
import { z } from 'zod/v4'

/**
 * Кастомная схема для формы замеров пользователя.
 * Использует .strip() для удаления служебных полей React Server Actions.
 *
 * Важно: не использует .transform() т.к. getZodConstraint не поддерживает трансформации.
 * Пустые строки обрабатываются в server action.
 */
export const MeasurementsFormSchema = z
  .object({
    gender: GenderSchema,

    // Измерения в сантиметрах (опциональные)
    // Используем z.union для поддержки как числа, так и пустой строки
    bust: z
      .union([
        z.coerce
          .number({
            error: 'Должно быть числом',
          })
          .int('Должно быть целым числом')
          .min(50, 'Минимум 50 см')
          .max(200, 'Максимум 200 см'),
        z.literal(''),
      ])
      .optional(),

    waist: z
      .union([
        z.coerce
          .number({
            error: 'Должно быть числом',
          })
          .int('Должно быть целым числом')
          .min(40, 'Минимум 40 см')
          .max(150, 'Максимум 150 см'),
        z.literal(''),
      ])
      .optional(),

    hips: z
      .union([
        z.coerce
          .number({
            error: 'Должно быть числом',
          })
          .int('Должно быть целым числом')
          .min(50, 'Минимум 50 см')
          .max(200, 'Максимум 200 см'),
        z.literal(''),
      ])
      .optional(),

    height: z
      .union([
        z.coerce
          .number({
            error: 'Должно быть числом',
          })
          .int('Должно быть целым числом')
          .min(100, 'Минимум 100 см')
          .max(250, 'Максимум 250 см'),
        z.literal(''),
      ])
      .optional(),

    preferredSize: z.string().optional(),
    notes: z.string().optional(),
  })
  .strip() // Удаляем служебные поля React Server Actions

export type MeasurementsFormData = z.infer<typeof MeasurementsFormSchema>
