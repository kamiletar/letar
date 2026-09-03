/**
 * Тонкая безопасная обёртка над Umami `window.umami.track` + фильтр ПДн из полезной нагрузки
 * события.
 *
 * Вынесено из `apps/aboi/src/lib/analytics.ts` (§11.15 PLAN.md aboi, 2026-09-02): требование
 * 152-ФЗ «в событиях нет email, телефона, адреса, order token и другой ПДн» должно быть
 * проверяемым кодом, а не держаться на дисциплине каждого нового вызова `trackEvent` — этого
 * не масштабировать на десятки приложений монорепо.
 *
 * SSR-safe и cookie-consent-safe: no-op на сервере и если скрипт Umami не загружен (пользователь
 * ещё не дал согласие на аналитику — `UmamiScript`/`UmamiScriptConsent` не подключился).
 */
interface UmamiGlobal {
  track: (eventName: string, eventData?: Record<string, unknown>) => void
}

/**
 * Фрагменты имени ключа, запрещённые для отправки в аналитику ни при каких обстоятельствах.
 * Проверка по имени ключа, а не по значению: имя известно на этапе написания кода, значение — нет.
 *
 * Приложение может расширить список через `extraForbiddenKeyFragments` — например, доменными
 * полями вроде «вплетённых слов товара». Сужать дефолтный список нельзя.
 */
const DEFAULT_FORBIDDEN_KEY_FRAGMENTS = [
  'email',
  'phone',
  'tel',
  'customerName',
  'fullName',
  'address',
  'postalCode',
  'token',
  'accessToken',
  'pin',
  'password',
  'secret',
]

function buildForbiddenKeyRegex(extraFragments: readonly string[]): RegExp {
  const fragments = [...DEFAULT_FORBIDDEN_KEY_FRAGMENTS, ...extraFragments]
  return new RegExp(`^(.*_)?(${fragments.join('|')})$`, 'i')
}

/**
 * Значения, которые выглядят как ПДн независимо от имени ключа — страховка от того, что
 * персональные данные приедут под безобидным именем (`value`, `q`, `id`).
 */
function looksLikePersonalData(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false
  }
  // email
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return true
  }
  // телефон: 10+ цифр, допускаются пробелы/скобки/дефисы/плюс
  if (/^\+?[\d\s()-]{10,}$/.test(value) && (value.match(/\d/g)?.length ?? 0) >= 10) {
    return true
  }
  // токен доступа: длинная строка без пробелов (accessToken заказа — 32+ символа)
  if (value.length >= 32 && !/\s/.test(value)) {
    return true
  }
  return false
}

/**
 * Убирает из полезной нагрузки события всё, что похоже на ПДн.
 *
 * @param extraForbiddenKeyFragments — доменные фрагменты имени ключа сверх дефолтного списка
 * (например `['words?']` — вплетённые слова товара у aboi). Регекс-фрагменты, не литеральные строки.
 */
export function sanitizeEventData(
  eventData: Record<string, unknown> | undefined,
  extraForbiddenKeyFragments: readonly string[] = [],
): Record<string, unknown> | undefined {
  if (!eventData) {
    return undefined
  }

  const forbiddenKeys = buildForbiddenKeyRegex(extraForbiddenKeyFragments)
  const safe: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(eventData)) {
    if (forbiddenKeys.test(key) || looksLikePersonalData(value)) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[analytics] поле "${key}" не отправлено в аналитику: похоже на персональные данные`)
      }
      continue
    }
    safe[key] = value
  }

  return Object.keys(safe).length > 0 ? safe : undefined
}

/**
 * @param extraForbiddenKeyFragments — см. {@link sanitizeEventData}.
 */
export function trackEvent(
  eventName: string,
  eventData?: Record<string, unknown>,
  extraForbiddenKeyFragments?: readonly string[],
): void {
  if (typeof window === 'undefined') {
    return
  }
  const umami = (window as unknown as { umami?: UmamiGlobal }).umami
  umami?.track(eventName, sanitizeEventData(eventData, extraForbiddenKeyFragments))
}
