import type { TranslateFunction, TranslateParams } from './types'

export interface ResolveTranslationOptions {
  /**
   * `'exact'` (по умолчанию) — отклоняет только результат, буквально равный `key` (стандартный
   * fallback next-intl при отсутствии перевода).
   *
   * `'prefix'` — дополнительно отклоняет результат, лишь НАЧИНАЮЩИЙСЯ с `key` (например
   * `t()` вернул сам путь с довеском вместо перевода). Нужен там, где `key` — не полный,
   * самодостаточный путь перевода, а один из двух кандидатов в построении по частям
   * (`{prefix}.{code}.{origin}` → `{prefix}.{code}`, см. `createFormErrorMap`): без этой
   * проверки более короткий `baseKey` рискует "поймать" фрагмент чужого пути как валидный
   * перевод.
   */
  matchMode?: 'exact' | 'prefix'
}

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
  options?: ResolveTranslationOptions,
): string | undefined {
  if (!t) {
    return undefined
  }

  try {
    const result = t(key, params)
    if (!result || result === key) {
      return undefined
    }
    if (options?.matchMode === 'prefix' && result.startsWith(key)) {
      return undefined
    }
    return result
  } catch {
    return undefined
  }
}
