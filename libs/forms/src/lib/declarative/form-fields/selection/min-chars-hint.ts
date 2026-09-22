'use client'

import { resolveTranslation } from '@letar/forms-core/i18n'
import { useFormI18n } from '@letar/forms-react'

/**
 * Ключ перевода подсказки «введите ещё символов» в пустом выпадающем списке
 * (`Form.Field.Combobox`, `Form.Field.Autocomplete`). Приложение может переопределить текст,
 * передав свой `t` в `FormI18nProvider` — параметр интерполяции один: `minChars`.
 */
const MIN_CHARS_HINT_KEY = 'formSelection.minCharsHint'

/** Локаль встроенного словаря по умолчанию — совпадает с дефолтом `FormI18nProvider` */
const DEFAULT_LOCALE = 'en'

/**
 * Встроенный словарь подсказки — отдельный от `validation.*`
 * (`builtin-error-translations.ts`) и от constraint hints (`constraint-hints.ts`): это не
 * сообщение валидации и не подсказка о схеме, а статичный текст пустого состояния списка.
 * Резолвится по `locale` из `FormI18nProvider`, даже если приложение не передало свой `t`.
 */
const BUILTIN_MIN_CHARS_HINT: Record<string, string> = {
  en: 'Enter at least {minChars} {chars}',
  ru: 'Введите минимум {minChars} {chars}',
}

interface PluralForms {
  one: string
  few?: string
  many?: string
  other: string
}

/**
 * Формы слова «символ» — те же, что у constraint hints (`CHAR_PLURALS` в
 * `constraint-hints.ts`): подсказка стоит в том же интерфейсе, расхождение формулировок было бы
 * заметно. Без плюрализации русский текст ломается на любом `minChars` («минимум 3 символов»),
 * а английский — на `minChars: 1` (дефолт обоих полей: «at least 1 characters»).
 */
const CHAR_PLURALS: Record<string, PluralForms> = {
  en: { one: 'character', other: 'characters' },
  ru: { one: 'символ', few: 'символа', many: 'символов', other: 'символов' },
}

function pluralizeChars(minChars: number, locale: string, lang: string): string {
  const forms = CHAR_PLURALS[lang] ?? CHAR_PLURALS.en!

  try {
    const rule = new Intl.PluralRules(locale).select(minChars)
    switch (rule) {
      case 'one':
        return forms.one
      case 'few':
        return forms.few ?? forms.other
      case 'many':
        return forms.many ?? forms.other
      default:
        return forms.other
    }
  } catch {
    // Неизвестный код локали — Intl.PluralRules бросает RangeError
    return forms.other
  }
}

function buildBuiltinHint(locale: string, minChars: number): string {
  const lang = locale.split('-')[0] ?? locale
  const template = BUILTIN_MIN_CHARS_HINT[lang] ?? BUILTIN_MIN_CHARS_HINT[DEFAULT_LOCALE]!

  return template
    .replace('{minChars}', String(minChars))
    .replace('{chars}', pluralizeChars(minChars, locale, lang))
}

/**
 * Резолвит подсказку о минимальной длине поискового запроса.
 *
 * Порядок (тот же, что у заголовка `Form.Errors`, см. `resolveDefaultErrorsTitle`):
 * перевод приложения по ключу `formSelection.minCharsHint` (если `FormI18nProvider` получил `t`)
 * → встроенный словарь по `locale` (ru/en) → английский текст. Провайдера в дереве нет вовсе —
 * остаётся английский, как было до локализации: `FormI18nProvider` опционален, его отсутствие
 * не ошибка конфигурации.
 */
export function resolveMinCharsHint(i18n: ReturnType<typeof useFormI18n>, minChars: number): string {
  if (!i18n) {
    return buildBuiltinHint(DEFAULT_LOCALE, minChars)
  }

  const translated = i18n.enabled ? resolveTranslation(i18n.t, MIN_CHARS_HINT_KEY, { minChars }) : undefined
  if (translated) {
    return translated
  }

  return buildBuiltinHint(i18n.locale, minChars)
}

/**
 * Хук-обёртка над `resolveMinCharsHint` для полей выбора.
 *
 * ⚠️ Вызывать только из `useFieldState` поля, не из его `render`: `render` в `createField` —
 * не компонент, а колбэк внутри `form.Field`, хуки там небезопасны (тот же приём, что у
 * `locale` в `field-number-input.tsx`).
 */
export function useMinCharsHint(minChars: number): string {
  return resolveMinCharsHint(useFormI18n(), minChars)
}
