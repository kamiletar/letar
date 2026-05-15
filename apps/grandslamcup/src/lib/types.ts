/**
 * Общие типы для серверных действий.
 */

/** Результат server action — успех или ошибка */
export type ActionResult<T = void> =
  | (T extends void ? { success: true; data?: undefined } : { success: true; data: T })
  | { success: false; error: string }
