import { z } from 'zod/v4'

import { emailSchema } from '@/app/_schemas/common.schema'

export const contactMessageSchema = z
  .object({
    name: z.string().min(2, 'Имя должно содержать минимум 2 символа').max(100, 'Имя слишком длинное'),
    email: emailSchema,
    message: z
      .string()
      .min(10, 'Сообщение должно содержать минимум 10 символов')
      .max(5000, 'Сообщение слишком длинное'),
  })
  .strip()

export type ContactMessageInput = z.infer<typeof contactMessageSchema>
