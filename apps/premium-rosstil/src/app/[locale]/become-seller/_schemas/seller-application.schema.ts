import { z } from 'zod/v4'

export const SellerApplicationSchema = z
  .object({
    shopName: z.string().min(2, 'Минимум 2 символа').max(100, 'Максимум 100 символов'),
    description: z.string().max(1000, 'Максимум 1000 символов').optional(),
    inn: z
      .string()
      .regex(/^\d{10,12}$/, 'ИНН должен содержать 10 или 12 цифр')
      .optional(),
    legalName: z.string().max(200).optional(),
    ogrn: z
      .string()
      .regex(/^\d{13,15}$/, 'ОГРН должен содержать 13 или 15 цифр')
      .optional(),
    contactEmail: z.email('Введите корректный email'),
    contactPhone: z.string().min(10, 'Введите корректный телефон').max(20),
    portfolioLinks: z.string().max(500).optional(),
    agreementAccepted: z.literal(true, { error: 'Необходимо принять условия договора' }),
  })
  .strip()

export type SellerApplicationFormData = z.infer<typeof SellerApplicationSchema>
