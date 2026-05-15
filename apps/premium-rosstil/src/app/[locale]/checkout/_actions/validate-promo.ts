'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'

export interface PromoValidationResult {
  valid: boolean
  error?: string
  /** Тип скидки */
  type?: 'PERCENTAGE' | 'FIXED_AMOUNT'
  /** Размер скидки (% или ₽) */
  discount?: number
  /** Рассчитанная сумма скидки в рублях */
  discountAmount?: number
}

/**
 * Валидация промокода без создания заказа.
 * Возвращает тип, размер и рассчитанную сумму скидки.
 */
export async function validatePromo(code: string, cartTotal: number): Promise<PromoValidationResult> {
  if (!code || !code.trim()) {
    return { valid: false, error: 'Введите промокод' }
  }

  const session = await getSession()
  if (!session?.user) {
    return { valid: false, error: 'Необходимо войти в систему' }
  }

  const db = getEnhancedPrisma(session.user)
  const normalizedCode = code.toUpperCase().trim()

  const promo = await db.promo.findUnique({
    where: { code: normalizedCode },
  })

  if (!promo) {
    return { valid: false, error: 'Промокод не найден' }
  }

  if (!promo.isActive) {
    return { valid: false, error: 'Промокод не активен' }
  }

  const now = new Date()
  if (now < promo.dateFrom) {
    return { valid: false, error: 'Промокод ещё не действует' }
  }
  if (now > promo.dateTo) {
    return { valid: false, error: 'Промокод истёк' }
  }

  if (promo.minAmount && cartTotal < Number(promo.minAmount)) {
    return {
      valid: false,
      error: `Минимальная сумма заказа: ${Number(promo.minAmount).toLocaleString('ru-RU')} ₽`,
    }
  }

  if (promo.maxUsages && promo.usageCount >= promo.maxUsages) {
    return { valid: false, error: 'Промокод исчерпан' }
  }

  // Проверка лимита на пользователя
  if (promo.perCustomer) {
    const usedByUser = await db.order.count({
      where: { userId: session.user.id, promoId: promo.id },
    })
    if (usedByUser >= promo.perCustomer) {
      return { valid: false, error: 'Вы уже использовали этот промокод' }
    }
  }

  // Расчёт скидки
  const type = promo.type as 'PERCENTAGE' | 'FIXED_AMOUNT'
  const discount = Number(promo.discount)
  let discountAmount: number

  if (type === 'PERCENTAGE') {
    discountAmount = Math.round(cartTotal * (discount / 100) * 100) / 100
  } else {
    discountAmount = Math.min(discount, cartTotal)
  }

  return {
    valid: true,
    type,
    discount,
    discountAmount,
  }
}
