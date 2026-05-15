import { z } from 'zod/v4'

/**
 * Схема паспортных данных
 * Формат: серия XXXX, номер XXXXXX
 */
export const PassportDataSchema = z
  .object({
    series: z
      .string()
      .min(4, 'Серия должна содержать 4 цифры')
      .max(5, 'Серия должна содержать 4 цифры')
      .regex(/^\d{2}\s?\d{2}$/, 'Формат: XXXX или XX XX')
      .meta({ ui: { title: 'Серия паспорта', placeholder: '45 12', helperText: '4 цифры' } }),
    number: z
      .string()
      .min(6, 'Номер должен содержать 6 цифр')
      .max(6, 'Номер должен содержать 6 цифр')
      .regex(/^\d{6}$/, 'Номер должен содержать 6 цифр')
      .meta({ ui: { title: 'Номер паспорта', placeholder: '123456', helperText: '6 цифр' } }),
    issuedBy: z
      .string()
      .min(10, 'Введите кем выдан паспорт')
      .meta({ ui: { title: 'Кем выдан', placeholder: 'Отделом УФМС России по г. Москве' } }),
    issuedAt: z
      .string()
      .min(1, 'Введите дату выдачи')
      .meta({ ui: { title: 'Дата выдачи' } }),
    departmentCode: z
      .string()
      .min(6, 'Код подразделения: XXX-XXX')
      .max(7, 'Код подразделения: XXX-XXX')
      .regex(/^\d{3}-?\d{3}$/, 'Формат: XXX-XXX')
      .meta({ ui: { title: 'Код подразделения', placeholder: '770-001', helperText: 'Формат: XXX-XXX' } }),
  })
  .strip()

export type PassportData = z.infer<typeof PassportDataSchema>

/**
 * Схема персональных данных ученика для договора
 */
export const StudentPersonalDataSchema = z
  .object({
    passport: PassportDataSchema,
    registrationAddress: z
      .string()
      .min(10, 'Введите адрес регистрации')
      .meta({
        ui: {
          title: 'Адрес регистрации',
          placeholder: 'г. Москва, ул. Примерная, д. 1, кв. 10',
          helperText: 'Адрес по месту регистрации (прописки)',
        },
      }),
    snils: z
      .string()
      .optional()
      .refine((val) => !val || /^\d{3}-\d{3}-\d{3}\s?\d{2}$/.test(val), 'Формат СНИЛС: XXX-XXX-XXX XX')
      .meta({
        ui: { title: 'СНИЛС (опционально)', placeholder: '123-456-789 00', helperText: 'Формат: XXX-XXX-XXX XX' },
      }),
    inn: z
      .string()
      .optional()
      .refine((val) => !val || /^\d{12}$/.test(val), 'ИНН должен содержать 12 цифр')
      .meta({ ui: { title: 'ИНН (опционально)', placeholder: '123456789012', helperText: '12 цифр' } }),
  })
  .strip()

export type StudentPersonalData = z.infer<typeof StudentPersonalDataSchema>
