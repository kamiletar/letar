/** Условия посадочной; null — карточка скрыта, пока владелец не дал цифру (KM-033). */
export const OFFER = {
  /** Самый дешёвый пакет — визитка (OFFER_PACKAGES[0]). */
  priceFromRub: 15_000 as number | null,
  weeksFrom: null as number | null,
  friendsDiscountPercent: null as number | null,
  /** Скидка первым клиентам: мест 5, размер владелец ещё не назвал. */
  firstClients: { slots: 5, discountPercent: null as number | null },
  freeFirstCall: true,
  stagedPayment: true,
}

/** Пакеты сборки по тому, что сайт умеет; цена «от» — оценка часов по ставке 2 000 ₽/ч (KM-033). */
export const OFFER_PACKAGES = [
  { id: 'card', priceFromRub: 15_000 },
  { id: 'admin', priceFromRub: 40_000 },
  { id: 'payments', priceFromRub: 60_000 },
  { id: 'shop', priceFromRub: 120_000 },
] as const

/** Уровни поддержки в месяц; включённые часы — сверх них правки по ставке. */
export const OFFER_SUPPORT = [
  { id: 'hosting', monthlyRub: 1_500, includedHours: 0 },
  { id: 'base', monthlyRub: 4_000, includedHours: 1 },
  { id: 'integrations', monthlyRub: 8_000, includedHours: 3 },
] as const

/** Цена в рублях без копеек по правилам локали. */
export function formatOfferPrice(locale: string, rub: number) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(rub)
}
