/**
 * Хелперы для обработки ошибок в Server Actions.
 *
 * ВАЖНО: Этот файл НЕ содержит 'use server' директиву,
 * т.к. функции — синхронные утилиты.
 */

import type { MutationResult } from './with-admin-auth'

/**
 * Обрабатывает Prisma ошибку уникальности (P2002).
 *
 * @param error - Пойманное исключение
 * @param field - Поле с уникальным ограничением
 * @param message - Сообщение об ошибке
 */
export function handleUniqueConstraintError(error: unknown, field: string, message: string): MutationResult | null {
  if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
    return { success: false, error: message, field }
  }
  return null
}
