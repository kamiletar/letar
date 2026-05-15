import { GenderFormSchema as GenderSchema } from '@/generated/form-schemas/enums/Gender.form'
import { z } from 'zod/v4'

/**
 * Custom form schema for ProductSize create/edit forms.
 * Uses .strip() instead of .strict() to handle React Server Actions service fields.
 * Includes validation for measurement ranges (min < max).
 */
export const ProductSizeFormSchema = z
  .object({
    gender: GenderSchema,
    international: z.string().min(1, 'Поле обязательно для заполнения'),
    ru: z.string().min(1, 'Поле обязательно для заполнения'),
    de: z.string().min(1, 'Поле обязательно для заполнения'),
    it: z.string().min(1, 'Поле обязательно для заполнения'),
    fr: z.string().min(1, 'Поле обязательно для заполнения'),
    uk: z.string().min(1, 'Поле обязательно для заполнения'),
    us: z.string().min(1, 'Поле обязательно для заполнения'),
    jeansFrom: z.string().min(1, 'Поле обязательно для заполнения'),
    jeansTo: z.string().min(1, 'Поле обязательно для заполнения'),
    bustMin: z.coerce.number().int().min(0, 'Минимальное значение: 0'),
    bustMax: z.coerce.number().int().min(0, 'Минимальное значение: 0'),
    waistMin: z.coerce.number().int().min(0, 'Минимальное значение: 0'),
    waistMax: z.coerce.number().int().min(0, 'Минимальное значение: 0'),
    hipsMin: z.coerce.number().int().min(0, 'Минимальное значение: 0'),
    hipsMax: z.coerce.number().int().min(0, 'Минимальное значение: 0'),
    sortOrder: z.coerce.number().int().min(0, 'Минимальное значение: 0').default(0),
  })
  .strip()
  .refine((data) => data.bustMin < data.bustMax, {
    message: 'Минимальный обхват груди должен быть меньше максимального',
    path: ['bustMax'],
  })
  .refine((data) => data.waistMin < data.waistMax, {
    message: 'Минимальный обхват талии должен быть меньше максимального',
    path: ['waistMax'],
  })
  .refine((data) => data.hipsMin < data.hipsMax, {
    message: 'Минимальный обхват бедер должен быть меньше максимального',
    path: ['hipsMax'],
  })

export type ProductSizeFormData = z.infer<typeof ProductSizeFormSchema>
