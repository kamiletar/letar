import { z } from 'zod/v4'

/**
 * Валидация заявки специалиста (этап 5.7). consentPdn обязан быть true —
 * без активного согласия на обработку ПДн заявка не принимается (152-ФЗ).
 */
export const ProfessionalLeadSchema = z
  .object({
    name: z.string().min(2).max(100),
    email: z.email(),
    consentPdn: z.boolean().refine((v) => v === true, {
      message: 'Необходимо согласие с обработкой персональных данных',
    }),
    locale: z.string().optional(),
    source: z.string().optional(),
  })
  .strip()

export type ProfessionalLeadInput = z.infer<typeof ProfessionalLeadSchema>
