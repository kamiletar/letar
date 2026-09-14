import type { TranslateFunction, TranslateParams } from './types'

/**
 * Пытается получить перевод по ключу через `t()`.
 *
 * next-intl (и совместимые i18n-библиотеки) при отсутствии перевода возвращают сам ключ, а не
 * пустую строку и не бросают исключение — поэтому «перевод не найден» здесь означает: `t` не
 * задан, бросил исключение, вернул пустую строку, либо вернул буквально тот же `key`. Общий
 * примитив для паттерна «попробовать `t()`, иначе откатиться на fallback», повторявшегося
 * независимо в Zod error map, title/placeholder/description полей и статичных UI-заголовках
 * форм (`FormI18nProvider`, `FormErrors`).
 */
export function resolveTranslation(
  t: TranslateFunction | undefined,
  key: string,
  params?: TranslateParams,
): string | undefined {
  if (!t) {
    return undefined
  }

  try {
    const result = t(key, params)
    if (!result || result === key) {
      return undefined
    }
    return result
  } catch {
    return undefined
  }
}
