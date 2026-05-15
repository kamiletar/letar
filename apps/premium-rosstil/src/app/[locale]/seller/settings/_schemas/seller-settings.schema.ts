import { z } from 'zod/v4'

/**
 * Схема настроек магазина продавца.
 */
export const SellerSettingsSchema = z
  .object({
    shopName: z.string().min(2, 'Минимум 2 символа').max(100),
    description: z.string().max(1000).optional(),
    contactEmail: z.email('Некорректный email').optional().or(z.literal('')),
    contactPhone: z.string().max(20).optional(),

    // Юридические данные
    inn: z.string().max(12).optional(),
    legalName: z.string().max(200).optional(),
    legalAddress: z.string().max(500).optional(),
    ogrn: z.string().max(15).optional(),

    // Банковские реквизиты
    bankAccount: z.string().max(20).optional(),
    bik: z.string().max(9).optional(),
    bankName: z.string().max(200).optional(),
  })
  .strip()

export type SellerSettingsFormData = z.infer<typeof SellerSettingsSchema>
