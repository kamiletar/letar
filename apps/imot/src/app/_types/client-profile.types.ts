/**
 * ТИПЫ ДЛЯ ПРОФИЛЯ КЛИЕНТА
 */

/** Результат обновления профиля клиента */
export type UpdateClientProfileResult = { success: true } | { success: false; error: string }
