/**
 * Хелперы для обработки ошибок в Server Actions.
 *
 * ВАЖНО: Этот файл НЕ содержит 'use server' директиву,
 * т.к. функции — синхронные утилиты.
 */

import type { MutationResult } from './with-admin-auth'

/**
 * Обрабатывает ошибку уникальности ZenStack v3 ORM (unique_violation, Postgres SQLSTATE 23505).
 * ZenStack v3 оборачивает ошибку драйвера в ORMError с полем `dbErrorCode` — это не Prisma-код
 * P2002, см. .claude/docs/zenstack-v3-orm-error-codes.md
 *
 * @param error - Пойманное исключение
 * @param field - Поле с уникальным ограничением
 * @param message - Сообщение об ошибке
 */
export function handleUniqueConstraintError(error: unknown, field: string, message: string): MutationResult | null {
  if (error && typeof error === 'object' && 'dbErrorCode' in error && error.dbErrorCode === '23505') {
    return { success: false, error: message, field }
  }
  return null
}
