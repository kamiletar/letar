'use client'

import { DEFAULT_STATIC_TEXT_LOCALE, resolveStaticFormText } from '@letar/forms-core/i18n'
import { useFormI18n } from '@letar/forms-react'

/**
 * Ключи переводов встроенных дефолтов отдельных специализированных полей (placeholder), не
 * покрытых `selection-field-strings.ts` (тот файл — только Combobox/Autocomplete). Проп
 * (`placeholder`) и `resolved.placeholder` (schema meta через `useResolvedFieldProps`) остаются
 * сильнее — резолвер вызывается только когда ни то ни другое не задано, см. места вызова в
 * `field-address.tsx`/`field-city.tsx`/`field-signature.tsx`/`field-editable.tsx`/
 * `field-password-strength.tsx`/`field-duration.tsx`/`field-rich-text-impl.tsx`.
 */
export type FieldDefaultStringKey =
  | 'formField.address.placeholder'
  | 'formField.city.placeholder'
  | 'formField.signature.placeholder'
  | 'formField.editable.placeholder'
  | 'formField.passwordStrength.placeholder'
  | 'formField.richText.placeholder'
  | 'formField.duration.minutesPlaceholder'

/**
 * Встроенный словарь дефолтов — отдельный от `selection-field-strings.ts`: те строки относятся
 * только к полям выбора (Combobox/Autocomplete), эти — к разным специализированным полям без
 * общего родителя.
 */
const BUILTIN_FIELD_DEFAULT_STRINGS: Record<FieldDefaultStringKey, Record<string, string>> = {
  'formField.address.placeholder': { en: 'Start typing address...', ru: 'Начните вводить адрес...' },
  'formField.city.placeholder': { en: 'Enter city', ru: 'Введите город' },
  'formField.signature.placeholder': { en: 'Sign here', ru: 'Распишитесь здесь' },
  'formField.editable.placeholder': { en: 'Click to edit', ru: 'Нажмите, чтобы изменить' },
  'formField.passwordStrength.placeholder': { en: 'Enter password', ru: 'Введите пароль' },
  'formField.richText.placeholder': { en: 'Start typing...', ru: 'Начните вводить...' },
  'formField.duration.minutesPlaceholder': { en: 'min', ru: 'мин' },
}

function buildBuiltinString(key: FieldDefaultStringKey, locale: string): string {
  const lang = locale.split('-')[0] ?? locale
  const dict = BUILTIN_FIELD_DEFAULT_STRINGS[key]

  return dict[lang] ?? dict[DEFAULT_STATIC_TEXT_LOCALE]!
}

/**
 * Резолвит встроенный дефолт статичной UI-строки поля — общая лестница `resolveStaticFormText`
 * (`@letar/forms-core/i18n`, тот же порядок, что у `resolveSelectionString` и `resolveMinCharsHint`):
 * перевод приложения по ключу → встроенный словарь по `locale` (ru/en) → английский текст, если
 * провайдера в дереве нет вовсе — `FormI18nProvider` опционален, его отсутствие не ошибка
 * конфигурации.
 */
export function resolveFieldDefaultString(i18n: ReturnType<typeof useFormI18n>, key: FieldDefaultStringKey): string {
  return resolveStaticFormText(i18n, key, (locale) => buildBuiltinString(key, locale))
}

/**
 * Хук-обёртка над `resolveFieldDefaultString`.
 *
 * ⚠️ Вызывать только из `useFieldState` поля (или из тела обычного компонента-поля вроде
 * `FieldRichText`, минующего `createField`/`render`-колбэк), не из `render` у `createField`:
 * `render` там — колбэк внутри `form.Field`, хуки там небезопасны (тот же приём, что у
 * `useMinCharsHint`/`useSelectionString`).
 */
export function useFieldDefaultString(key: FieldDefaultStringKey): string {
  return resolveFieldDefaultString(useFormI18n(), key)
}
