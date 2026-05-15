'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { type SellerSettingsFormData, SellerSettingsSchema } from '../_schemas/seller-settings.schema'

export type UpdateSellerResult = { success: true } | { success: false; error: string }

/**
 * Обновить настройки магазина продавца.
 */
export async function updateSeller(data: SellerSettingsFormData): Promise<UpdateSellerResult> {
  const session = await getSession()
  if (!session?.user || (session.user.role !== 'SELLER' && session.user.role !== 'ADMIN')) {
    return { success: false, error: 'Требуются права продавца' }
  }

  const parsed = SellerSettingsSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  const db = getEnhancedPrisma(session.user)
  const validatedData = parsed.data

  try {
    await db.seller.update({
      where: { userId: session.user.id },
      data: {
        shopName: validatedData.shopName,
        description: validatedData.description || null,
        contactEmail: validatedData.contactEmail || null,
        contactPhone: validatedData.contactPhone || null,
        inn: validatedData.inn || null,
        legalName: validatedData.legalName || null,
        legalAddress: validatedData.legalAddress || null,
        ogrn: validatedData.ogrn || null,
        bankAccount: validatedData.bankAccount || null,
        bik: validatedData.bik || null,
        bankName: validatedData.bankName || null,
      },
    })
  } catch (error) {
    console.error('Failed to update seller:', error)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return { success: false, error: 'Магазин с таким названием уже существует' }
    }
    return { success: false, error: 'Не удалось сохранить настройки' }
  }

  return { success: true }
}
