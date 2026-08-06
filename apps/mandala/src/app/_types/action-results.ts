/**
 * Типы результатов Server Actions.
 * Единообразные типы для всех server actions в приложении.
 */

// =============================================================================
// Базовые типы результатов
// =============================================================================

/**
 * Базовый тип результата Server Action.
 * @template T - Тип данных при успехе
 */
export type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string }

/**
 * Результат действия с указанием проблемного поля.
 * Используется для форм с серверной валидацией.
 * @template T - Тип данных при успехе
 */
export type ActionResultWithField<T = void> = { success: true; data?: T } | {
  success: false
  error: string
  field?: string
}

/**
 * Результат действия с редиректом.
 * Используется когда после успеха нужен редирект на другую страницу.
 * @template T - Тип данных при успехе
 */
export type ActionResultWithRedirect<T = void> = { success: true; data?: T; redirectTo?: string } | {
  success: false
  error: string
}

// =============================================================================
// Специализированные типы
// =============================================================================

/**
 * Результат создания сущности.
 * Возвращает ID созданной записи.
 */
export type CreateActionResult = ActionResult<{ id: string }>

/**
 * Результат обновления сущности.
 */
export type UpdateActionResult = ActionResult

/**
 * Результат удаления сущности.
 */
export type DeleteActionResult = ActionResult

/**
 * Результат bulk-операции.
 * Возвращает количество затронутых записей.
 */
export type BulkActionResult = ActionResult<{ count: number }>
