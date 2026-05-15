import { formatPhone } from './phone-utils'

/**
 * Форматирует номер телефона в читаемый формат
 *
 * Примеры:
 * +79991234567 -> +7 (999) 123-45-67
 * 79991234567 -> +7 (999) 123-45-67
 *
 * @param phoneNumber - номер телефона в любом формате
 * @returns отформатированный номер телефона
 * @deprecated Use formatPhone from phone-utils instead
 */
export function formatPhoneNumber(phoneNumber: string): string {
  return formatPhone(phoneNumber)
}
