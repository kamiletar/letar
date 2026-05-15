'use server'

import { Prisma } from '@/generated/prisma'
import { requireAdmin } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { type PromoFormData, PromoFormSchema } from '../_schemas/promo.schema'

/** Создать промокод */
export async function createPromo(input: PromoFormData): Promise<{ success: boolean; error?: string; id?: string }> {
  const user = await requireAdmin()
  const db = getEnhancedPrisma(user)

  const parsed = PromoFormSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Ошибка валидации' }
  }

  const data = parsed.data

  // Проверка уникальности кода
  const existing = await db.promo.findUnique({ where: { code: data.code } })
  if (existing) {
    return { success: false, error: `Промокод "${data.code}" уже существует` }
  }

  try {
    const promo = await db.promo.create({
      data: {
        code: data.code,
        type: data.type,
        discount: new Prisma.Decimal(data.discount.toFixed(2)),
        description: data.description || null,
        isActive: data.isActive,
        dateFrom: data.dateFrom,
        dateTo: data.dateTo,
        minAmount: data.minAmount ? new Prisma.Decimal(data.minAmount.toFixed(2)) : null,
        maxUsages: data.maxUsages || null,
        perCustomer: data.perCustomer,
      },
    })

    revalidatePath('/admin/promos')
    return { success: true, id: promo.id }
  } catch (error) {
    console.error('Ошибка создания промокода:', error)
    return { success: false, error: 'Не удалось создать промокод' }
  }
}

/** Обновить промокод */
export async function updatePromo(id: string, input: PromoFormData): Promise<{ success: boolean; error?: string }> {
  const user = await requireAdmin()
  const db = getEnhancedPrisma(user)

  const parsed = PromoFormSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Ошибка валидации' }
  }

  const data = parsed.data

  // Проверка уникальности кода (исключая текущий)
  const existing = await db.promo.findFirst({
    where: { code: data.code, NOT: { id } },
  })
  if (existing) {
    return { success: false, error: `Промокод "${data.code}" уже используется` }
  }

  try {
    await db.promo.update({
      where: { id },
      data: {
        code: data.code,
        type: data.type,
        discount: new Prisma.Decimal(data.discount.toFixed(2)),
        description: data.description || null,
        isActive: data.isActive,
        dateFrom: data.dateFrom,
        dateTo: data.dateTo,
        minAmount: data.minAmount ? new Prisma.Decimal(data.minAmount.toFixed(2)) : null,
        maxUsages: data.maxUsages || null,
        perCustomer: data.perCustomer,
      },
    })

    revalidatePath('/admin/promos')
    revalidatePath(`/admin/promos/${id}/edit`)
    return { success: true }
  } catch (error) {
    console.error('Ошибка обновления промокода:', error)
    return { success: false, error: 'Не удалось обновить промокод' }
  }
}

/** Удалить промокод */
export async function deletePromo(id: string): Promise<{ success: boolean; error?: string }> {
  const user = await requireAdmin()
  const db = getEnhancedPrisma(user)

  try {
    await db.promo.delete({ where: { id } })
    revalidatePath('/admin/promos')
    return { success: true }
  } catch (error) {
    console.error('Ошибка удаления промокода:', error)
    return { success: false, error: 'Не удалось удалить промокод' }
  }
}

/** Переключить активность промокода */
export async function togglePromoActive(id: string, isActive: boolean): Promise<{ success: boolean; error?: string }> {
  const user = await requireAdmin()
  const db = getEnhancedPrisma(user)

  try {
    await db.promo.update({ where: { id }, data: { isActive } })
    revalidatePath('/admin/promos')
    return { success: true }
  } catch (error) {
    console.error('Ошибка обновления промокода:', error)
    return { success: false, error: 'Не удалось обновить промокод' }
  }
}
