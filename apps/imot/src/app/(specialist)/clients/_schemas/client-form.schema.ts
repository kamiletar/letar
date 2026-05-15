import { GenderFormSchema as GenderSchema } from '@/generated/form-schemas/enums/Gender.form'
import { z } from 'zod/v4'

/**
 * Схема валидации для формы создания/редактирования клиента.
 * Использует .strip() для обработки React Server Actions service fields.
 */
export const ClientFormSchema = z
  .object({
    name: z.string().min(1, 'Имя обязательно для заполнения'),
    email: z.string().email('Неверный формат email'),
    phone: z.string().optional(),
    gender: GenderSchema.optional(),
    birthdate: z.string().optional(), // Дата в формате ISO string для input[type="date"]
    mainRequest: z.string().optional(),
    notes: z.string().optional(),
  })
  .strip()

export type ClientFormData = z.infer<typeof ClientFormSchema>
