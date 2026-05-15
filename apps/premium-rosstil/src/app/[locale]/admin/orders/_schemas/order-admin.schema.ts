import { OrderStatusFormSchema as OrderStatusSchema } from '@/generated/form-schemas/enums/OrderStatus.form'
import { z } from 'zod/v4'

/**
 * Schema for updating order status and admin notes.
 * Uses .strip() to handle React Server Actions service fields.
 */
export const UpdateOrderSchema = z
  .object({
    status: OrderStatusSchema,
    adminNotes: z.string().optional(),
  })
  .strip()

export type UpdateOrderData = z.infer<typeof UpdateOrderSchema>
