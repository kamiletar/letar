/**
 * Разовое синхронное чтение prefers-reduced-motion — без подписки на изменения.
 *
 * Для реактивного отслеживания (нужен re-render при смене настройки в рантайме)
 * используй `useMediaQuery(breakpoints.prefersReducedMotion)` вместо этой функции —
 * оба паттерна легитимны и не взаимозаменяемы.
 *
 * @example
 * ```ts
 * useEffect(() => {
 *   if (prefersReducedMotion()) return
 *   // запуск анимации
 * }, [])
 * ```
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
