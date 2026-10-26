/** Условия посадочной; null — карточка скрыта, пока владелец не дал цифру (KM-033). */
export const OFFER = {
  priceFromRub: null as number | null,
  weeksFrom: null as number | null,
  friendsDiscountPercent: null as number | null,
  freeFirstCall: true,
  stagedPayment: true,
}

/** Цена в рублях без копеек по правилам локали. */
export function formatOfferPrice(locale: string, rub: number) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(rub)
}
