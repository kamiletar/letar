import { z } from 'zod/v4'

/**
 * Схема для формы создания/редактирования адреса.
 * Использует .strip() для удаления служебных полей React Server Actions.
 */
export const AddressFormSchema = z
  .object({
    label: z.string().min(1, 'Укажите метку адреса (например: "Дом", "Работа")'),
    fullAddress: z.string().min(1, 'Введите адрес'),
    postalCode: z.string().optional(),
    country: z.string().default('Россия'),
    region: z.string().optional(),
    city: z.string().optional(),
    street: z.string().optional(),
    house: z.string().optional(),
    block: z.string().optional(),
    entrance: z.string().optional(),
    floor: z.string().optional(),
    flat: z.string().optional(),
    recipientName: z.string().min(1, 'Укажите имя получателя'),
    phone: z
      .string()
      .min(1, 'Укажите номер телефона')
      .regex(/^\+7\d{10}$/, 'Номер должен быть в формате +7XXXXXXXXXX'),
    isDefault: z.coerce.boolean().optional().default(false),
  })
  .strip()

export type AddressFormData = z.infer<typeof AddressFormSchema>
