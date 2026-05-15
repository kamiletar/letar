/**
 * ТИПЫ ДЛЯ ПРОФИЛЯ ПОЛЬЗОВАТЕЛЯ
 */

/** Результат обновления профиля */
export type UpdateProfileResult = { success: true } | { success: false; error: string }
