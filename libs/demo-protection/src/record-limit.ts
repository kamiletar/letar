/**
 * Проверка лимита записей в таблице для демо-приложений.
 * Предотвращает флуд без авторизации.
 */

/** Лимит записей по умолчанию */
export const DEFAULT_RECORD_LIMIT = 50

/**
 * Проверяет, не превышен ли лимит записей.
 * @param currentCount текущее количество записей
 * @param limit максимум записей (по умолчанию 50)
 * @returns `true` если можно создавать, `false` если лимит достигнут
 */
export function checkRecordLimit(currentCount: number, limit = DEFAULT_RECORD_LIMIT): boolean {
  return currentCount < limit
}

export function recordLimitError(limit = DEFAULT_RECORD_LIMIT): string {
  return `Достигнут лимит демо-записей (${limit}). Удалите старые для создания новых.`
}
