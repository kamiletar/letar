import { z } from 'zod/v4'

/**
 * Схема валидации формы редактирования профиля компании (B2B)
 */
export const CompanyProfileSchema = z
  .object({
    companyName: z
      .string()
      .min(2, 'Название компании должно содержать минимум 2 символа')
      .max(200, 'Название компании слишком длинное'),
    companyINN: z
      .string()
      .optional()
      .nullable()
      .refine((val) => !val || /^\d{10}$|^\d{12}$/.test(val), 'ИНН должен содержать 10 цифр (юрлицо) или 12 цифр (ИП)'),
    companyAddress: z.string().max(500, 'Адрес слишком длинный').optional().nullable(),
    contactPerson: z.string().max(100, 'Имя контактного лица слишком длинное').optional().nullable(),
    companyPhone: z
      .string()
      .optional()
      .nullable()
      .refine((val) => !val || /^\+?[0-9\s\-()]{10,20}$/.test(val), 'Некорректный формат телефона'),
    companyEmail: z.email('Некорректный формат email').optional().nullable(),
  })
  .strip()

export type CompanyProfileData = z.infer<typeof CompanyProfileSchema>
