/**
 * Алгоритм Луна (Luhn) для валидации номера банковской карты.
 * Ловит ~90% опечаток.
 *
 * @param cardNumber - Номер карты (с или без пробелов/дефисов)
 * @returns true если номер проходит проверку Луна
 */
export function luhn(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '')
  if (digits.length < 12 || digits.length > 19) return false

  let sum = 0
  let isDouble = false

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = Number(digits[i])
    if (isDouble) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
    isDouble = !isDouble
  }

  return sum % 10 === 0
}
