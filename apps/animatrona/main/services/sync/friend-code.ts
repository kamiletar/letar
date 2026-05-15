/**
 * Friend Code — Генерация и верификация
 *
 * Friend Code — удобный для человека идентификатор вида "AXKM-7J2P"
 * Генерируется из PeerId через SHA256 хеш.
 */

import { createHash } from 'crypto'

/**
 * Набор символов для Friend Code (без confusing символов: 0/O, 1/I/L)
 */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

/**
 * Генерировать Friend Code из PeerId
 *
 * @param peerId - PeerId в формате multibase (12D3KooW...)
 * @returns Friend Code вида "AXKM-7J2P"
 */
export function generateFriendCode(peerId: string): string {
  // Хешируем PeerId
  const hash = createHash('sha256').update(peerId).digest()

  // Берём первые 8 байт хеша
  const bytes = hash.slice(0, 8)

  // Конвертируем в символы из алфавита
  let code = ''
  for (let i = 0; i < 8; i++) {
    const index = bytes[i] % ALPHABET.length
    code += ALPHABET[index]
  }

  // Форматируем как XXXX-XXXX
  return `${code.slice(0, 4)}-${code.slice(4, 8)}`
}

/**
 * Проверить формат Friend Code
 *
 * @param code - Friend Code для проверки
 * @returns true если формат корректный
 */
export function isValidFriendCodeFormat(code: string): boolean {
  // Убираем пробелы и приводим к верхнему регистру
  const normalized = code.replace(/\s/g, '').toUpperCase()

  // Проверяем формат XXXX-XXXX
  const pattern = new RegExp(`^[${ALPHABET}]{4}-[${ALPHABET}]{4}$`)
  return pattern.test(normalized)
}

/**
 * Нормализовать Friend Code (убрать пробелы, привести к верхнему регистру)
 */
export function normalizeFriendCode(code: string): string {
  return code.replace(/\s/g, '').toUpperCase()
}

/**
 * Проверить соответствие Friend Code и PeerId
 *
 * @param code - Friend Code для проверки
 * @param peerId - PeerId для сравнения
 * @returns true если код соответствует PeerId
 */
export function verifyFriendCode(code: string, peerId: string): boolean {
  const normalized = normalizeFriendCode(code)
  const expected = generateFriendCode(peerId)
  return normalized === expected
}
