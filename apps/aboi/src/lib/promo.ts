import { prismaAuth } from './prisma'

export interface PromoApplicationResult {
  ok: boolean
  /// Применённая скидка в копейках
  discount?: number
  /// Найденный промокод (для последующей фиксации в Order)
  promoId?: string
  promoCode?: string
  error?: string
}

/**
 * Валидирует промокод и считает скидку для текущей суммы заказа (в копейках).
 * Чистая read-only проверка — не меняет state. Применение фиксируется в `placeOrderAction`
 * через `PromoUsage.create` + `Promo.usedCount++`.
 */
export async function validatePromo(rawCode: string, itemsTotal: number): Promise<PromoApplicationResult> {
  const code = rawCode.trim().toUpperCase()
  if (!code) return { ok: false, error: 'Введите промокод' }

  const promo = await prismaAuth.promo.findUnique({ where: { code } })
  if (!promo) return { ok: false, error: 'Промокод не найден' }
  if (!promo.isActive) return { ok: false, error: 'Промокод неактивен' }

  const now = new Date()
  if (promo.validFrom > now) return { ok: false, error: 'Промокод ещё не начал действовать' }
  if (promo.validUntil && promo.validUntil < now) return { ok: false, error: 'Срок действия промокода истёк' }

  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
    return { ok: false, error: 'Промокод исчерпан' }
  }

  if (promo.minOrderAmount !== null && itemsTotal < promo.minOrderAmount) {
    return {
      ok: false,
      error: `Минимальная сумма заказа для этого промокода — ${(promo.minOrderAmount / 100).toFixed(0)} ₽`,
    }
  }

  let discount = 0
  if (promo.type === 'PERCENT') {
    discount = Math.floor((itemsTotal * promo.value) / 100)
  } else {
    discount = Math.min(promo.value, itemsTotal)
  }

  return { ok: true, discount, promoId: promo.id, promoCode: promo.code }
}
