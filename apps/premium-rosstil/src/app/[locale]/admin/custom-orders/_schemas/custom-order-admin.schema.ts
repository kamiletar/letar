import { CustomOrderStatusFormSchema as CustomOrderStatusSchema } from '@/generated/form-schemas/enums/CustomOrderStatus.form'
import { z } from 'zod/v4'

/**
 * Schema for updating custom order status and admin notes.
 * Uses .strip() to handle React Server Actions service fields.
 */
export const UpdateCustomOrderSchema = z
  .object({
    status: CustomOrderStatusSchema,
    adminNotes: z.string().optional(),
  })
  .strip()

export type UpdateCustomOrderData = z.infer<typeof UpdateCustomOrderSchema>
