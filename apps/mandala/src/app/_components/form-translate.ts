/** Минимальный контракт переводчика next-intl, который нужен адаптеру */
interface NextIntlTranslator {
  (key: never, params?: never): string
  has: (key: never) => boolean
}

/**
 * Адаптер next-intl translator к `TranslateFunction` из `@letar/forms`.
 *
 * Ключа нет в messages — возвращает сам ключ, не вызывая `t()`: next-intl иначе пишет
 * MISSING_MESSAGE в лог. Библиотека форм считает «результат === key» отсутствием перевода и
 * берёт свой встроенный словарь (ru/en), поэтому дублировать в messages её тексты не нужно.
 */
export function createFormTranslate(
  nextIntlT: NextIntlTranslator,
): (key: string, params?: Record<string, string | number | boolean | Date | null | undefined>) => string {
  const translate = nextIntlT as unknown as (key: string, params?: unknown) => string
  const has = nextIntlT.has as unknown as (key: string) => boolean

  return (key, params) => {
    if (!has(key)) {
      return key
    }
    try {
      return translate(key, params)
    } catch {
      // Ключ есть, но сообщение не отформатировалось (например, не хватает параметра)
      return key
    }
  }
}
