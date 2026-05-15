/**
 * Unified phone utilities for formatting, validation, and normalization.
 * Supports Russian phone numbers (+7).
 */

/**
 * Formats a phone number for display.
 * Converts 8 to +7 and formats as +7 (XXX) XXX-XX-XX
 *
 * @example
 * formatPhone('+79991234567') // '+7 (999) 123-45-67'
 * formatPhone('89991234567')  // '+7 (999) 123-45-67'
 * formatPhone('9991234567')   // '+7 (999) 123-45-67'
 */
export function formatPhone(value: string): string {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '')

  // If empty, return empty string
  if (!digits) {
    return ''
  }

  // Normalize: 8 → 7, 7 stays as is, other digits → prepend 7
  let normalized: string
  if (digits.startsWith('8')) {
    // 8 is alternative country code for Russia
    normalized = '7' + digits.slice(1)
  } else if (digits.startsWith('7')) {
    // 7 is the country code
    normalized = digits
  } else {
    // Any other digit is the start of operator code, prepend 7
    normalized = '7' + digits
  }

  // Start with +7
  let formatted = '+7'

  // Add operator code (XXX)
  if (normalized.length > 1) {
    formatted += ' (' + normalized.slice(1, 4)
  }

  // Close bracket and add first part of number
  if (normalized.length >= 4) {
    formatted += ') ' + normalized.slice(4, 7)
  }

  // Add second part of number (only if there are digits)
  if (normalized.length > 7) {
    formatted += '-' + normalized.slice(7, 9)
  }

  // Add third part of number (only if there are digits)
  if (normalized.length > 9) {
    formatted += '-' + normalized.slice(9, 11)
  }

  return formatted
}

/**
 * Validates if a phone number is valid.
 * Checks that it has 11 digits and starts with 7 or 8.
 *
 * @example
 * validatePhone('+79991234567') // true
 * validatePhone('89991234567')  // true
 * validatePhone('123')          // false
 */
export function validatePhone(value: string): boolean {
  const cleaned = value.replace(/\D/g, '')
  return cleaned.length === 11 && (cleaned.startsWith('7') || cleaned.startsWith('8'))
}

/**
 * Normalizes a phone number for database storage.
 * Converts 8 to 7 and returns in format +7XXXXXXXXXX
 *
 * @example
 * normalizePhone('+7 (999) 123-45-67') // '+79991234567'
 * normalizePhone('8 999 123 45 67')    // '+79991234567'
 */
export function normalizePhone(value: string): string {
  const cleaned = value.replace(/\D/g, '')
  const normalized = cleaned.startsWith('8') ? '7' + cleaned.slice(1) : cleaned

  // Ensure it starts with 7
  if (normalized.startsWith('7')) {
    return '+' + normalized
  }

  // If it doesn't start with 7, prepend it
  return '+7' + normalized
}

/**
 * Extracts only digits from a formatted phone number.
 * Used internally by PhoneInput component.
 *
 * @example
 * getDigitsOnly('+7 (999) 123-45-67') // '+79991234567'
 * getDigitsOnly('9991234567')          // '+79991234567'
 */
export function getDigitsOnly(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (!digits) {
    return ''
  }
  // 7 or 8 at start is country code
  if (digits.startsWith('7')) {
    return '+' + digits
  }
  if (digits.startsWith('8')) {
    return '+7' + digits.slice(1)
  }
  // Other digits — prepend +7
  return '+7' + digits
}
