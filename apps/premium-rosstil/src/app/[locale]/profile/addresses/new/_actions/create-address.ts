'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { type AddressFormData, AddressFormSchema } from '../../_schemas/address-form.schema'

export type CreateAddressResult = { success: true; redirect: string } | { success: false; error: string }

export async function createAddress(data: AddressFormData): Promise<CreateAddressResult> {
  // 1. Аутентификация
  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'Необходимо войти в систему' }
  }

  // 2. Валидация
  const parsed = AddressFormSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  const validatedData = parsed.data

  // 3. Получение DB клиента
  const db = getEnhancedPrisma(session.user)

  // 4. Если адрес помечен как default, снимаем флаг с других адресов
  if (validatedData.isDefault) {
    await db.address.updateMany({
      where: { userId: session.user.id },
      data: { isDefault: false },
    })
  }

  // 5. Создание адреса
  try {
    await db.address.create({
      data: {
        userId: session.user.id,
        label: validatedData.label,
        fullAddress: validatedData.fullAddress,
        postalCode: validatedData.postalCode,
        country: validatedData.country,
        region: validatedData.region,
        city: validatedData.city,
        street: validatedData.street,
        house: validatedData.house,
        block: validatedData.block,
        entrance: validatedData.entrance,
        floor: validatedData.floor,
        flat: validatedData.flat,
        recipientName: validatedData.recipientName,
        phone: validatedData.phone,
        isDefault: validatedData.isDefault,
      },
    })
  } catch (error) {
    console.error('Failed to create address:', error)
    return { success: false, error: 'Не удалось создать адрес. Попробуйте еще раз.' }
  }

  // 6. Возвращаем успех с редиректом
  return { success: true, redirect: '/profile/addresses' }
}
