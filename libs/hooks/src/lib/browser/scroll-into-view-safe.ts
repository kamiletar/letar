import { prefersReducedMotion } from './prefers-reduced-motion'

/**
 * Безопасная замена `element.scrollIntoView({ behavior: 'smooth' })`.
 *
 * Chromium анимирует `behavior: 'smooth'` через `requestAnimationFrame`, который не тикает
 * вовсе без OS-фокуса окна (`document.hasFocus() === false`) — вызов зависает НАВСЕГДА, не
 * медленно. Особенно опасно в Playwright: параллельные воркеры часто не держат реальный
 * фокус окна. См. .claude/docs/scrollintoview-smooth-frozen-without-window-focus.md.
 *
 * Функция переключается на `behavior: 'instant'` (не зависит от rAF, не может зависнуть),
 * когда `smooth` заведомо не отработает: окно без фокуса или включён
 * `prefers-reduced-motion: reduce`. Иначе передаёт `behavior` как есть.
 *
 * Для кода, где плавность — не осознанная часть дизайна (большинство случаев: переход по
 * якорю, автоскролл чата/лога, скролл к невалидному полю формы), проще и надёжнее вызывать
 * `element.scrollIntoView({ behavior: 'instant' })` напрямую — этот хелпер нужен там, где
 * `smooth` действительно важен и окно обычно в фокусе.
 *
 * @example
 * ```ts
 * scrollIntoViewSafe(sectionRef.current, { behavior: 'smooth', block: 'center' })
 * ```
 */
export function scrollIntoViewSafe(
  element: Element | null | undefined,
  options: ScrollIntoViewOptions = {},
): void {
  if (!element) { return }

  const wantsSmooth = (options.behavior ?? 'smooth') === 'smooth'
  const canAnimate = typeof document !== 'undefined' && document.hasFocus() && !prefersReducedMotion()

  element.scrollIntoView({
    ...options,
    behavior: wantsSmooth && canAnimate ? 'smooth' : 'instant',
  })
}
