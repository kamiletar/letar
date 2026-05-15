/** Поддерживаемые бренды карт */
export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'mir' | 'unionpay' | 'maestro' | 'jcb' | 'discover' | 'unknown'

/** Информация о бренде карты */
export interface CardBrandInfo {
  brand: CardBrand
  /** Отображаемое название */
  name: string
  /** Длина номера */
  lengths: number[]
  /** Длина CVC */
  cvcLength: number
  /** Паттерн форматирования (массив размеров групп) */
  gaps: number[]
}

/** Информация о каждом бренде */
const BRANDS: Record<Exclude<CardBrand, 'unknown'>, CardBrandInfo> = {
  visa: {
    brand: 'visa',
    name: 'Visa',
    lengths: [16, 18, 19],
    cvcLength: 3,
    gaps: [4, 4, 4, 4],
  },
  mastercard: {
    brand: 'mastercard',
    name: 'Mastercard',
    lengths: [16],
    cvcLength: 3,
    gaps: [4, 4, 4, 4],
  },
  amex: {
    brand: 'amex',
    name: 'American Express',
    lengths: [15],
    cvcLength: 4,
    gaps: [4, 6, 5],
  },
  mir: {
    brand: 'mir',
    name: 'МИР',
    lengths: [16, 17, 18, 19],
    cvcLength: 3,
    gaps: [4, 4, 4, 4],
  },
  unionpay: {
    brand: 'unionpay',
    name: 'UnionPay',
    lengths: [16, 17, 18, 19],
    cvcLength: 3,
    gaps: [4, 4, 4, 4],
  },
  maestro: {
    brand: 'maestro',
    name: 'Maestro',
    lengths: [12, 13, 14, 15, 16, 17, 18, 19],
    cvcLength: 3,
    gaps: [4, 4, 4, 4],
  },
  jcb: {
    brand: 'jcb',
    name: 'JCB',
    lengths: [16, 17, 18, 19],
    cvcLength: 3,
    gaps: [4, 4, 4, 4],
  },
  discover: {
    brand: 'discover',
    name: 'Discover',
    lengths: [16, 19],
    cvcLength: 3,
    gaps: [4, 4, 4, 4],
  },
}

const UNKNOWN_BRAND: CardBrandInfo = {
  brand: 'unknown',
  name: 'Unknown',
  lengths: [16],
  cvcLength: 3,
  gaps: [4, 4, 4, 4],
}

/**
 * Определяет бренд карты по первым цифрам номера (BIN/IIN).
 *
 * @param number - Номер карты (частичный или полный)
 * @returns Информация о бренде
 */
export function detectBrand(number: string): CardBrandInfo {
  const digits = number.replace(/\D/g, '')
  if (!digits) return UNKNOWN_BRAND

  const n2 = Number(digits.slice(0, 2))
  const n4 = Number(digits.slice(0, 4))
  const n6 = Number(digits.slice(0, 6))

  // МИР: 2200-2204
  if (n4 >= 2200 && n4 <= 2204) return BRANDS.mir

  // Amex: 34, 37
  if (n2 === 34 || n2 === 37) return BRANDS.amex

  // Visa: начинается с 4
  if (digits[0] === '4') return BRANDS.visa

  // Mastercard: 51-55, 2221-2720
  if ((n2 >= 51 && n2 <= 55) || (n4 >= 2221 && n4 <= 2720)) return BRANDS.mastercard

  // Discover: 6011, 622126-622925, 644-649, 65
  if (n4 === 6011 || (n6 >= 622126 && n6 <= 622925) || (n2 >= 64 && n2 <= 65)) return BRANDS.discover

  // JCB: 3528-3589
  if (n4 >= 3528 && n4 <= 3589) return BRANDS.jcb

  // UnionPay: 62 (не пересекается с Discover выше)
  if (n2 === 62) return BRANDS.unionpay

  // Maestro: 50, 56-69
  if (n2 === 50 || (n2 >= 56 && n2 <= 69)) return BRANDS.maestro

  return UNKNOWN_BRAND
}

/** Получить информацию о бренде по имени */
export function getBrandInfo(brand: CardBrand): CardBrandInfo {
  if (brand === 'unknown') return UNKNOWN_BRAND
  return BRANDS[brand] ?? UNKNOWN_BRAND
}
