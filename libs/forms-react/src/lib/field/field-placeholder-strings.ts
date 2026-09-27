'use client'

import { DEFAULT_STATIC_TEXT_LOCALE, resolveStaticFormText } from '@letar/forms-core/i18n'
import { useFormI18n } from '../i18n'

/**
 * Ключи переводов placeholder-строк отдельных специализированных полей shadcn-скина, не
 * покрытых `selection-strings.ts` (Combobox/Autocomplete) и `signature-strings.ts` (Signature) —
 * у каждого поля здесь ровно одна встроенная строка, поэтому один общий словарь вместо отдельного
 * файла на поле.
 *
 * ⚠️ Не тот же словарь, что `formField.*` у Chakra-скина (`field-default-strings.ts` в
 * `libs/forms`) — тот же принцип, что у `formSignature.*`: общего рантайма для несписочных полей
 * между Chakra и остальными скинами пока нет (тот словарь локальный для Chakra, не заведён через
 * `@letar/forms-react`). Ключи здесь намеренно с другим префиксом (`formFieldPlaceholder.*`),
 * чтобы одноимённый перевод приложения не значил разное в двух пакетах; английские значения при
 * этом совпадают с Chakra-версией там, где для ключа есть аналог — русские оставлены как у
 * существующего shadcn-хардкода, где он расходится с Chakra (не меняем устоявшийся текст без
 * причины, см. `BUILTIN_FIELD_PLACEHOLDER_STRINGS`).
 */
export type FieldPlaceholderStringKey =
  | 'formFieldPlaceholder.address'
  | 'formFieldPlaceholder.city'
  | 'formFieldPlaceholder.passwordStrength'
  | 'formFieldPlaceholder.richText'
  | 'formFieldPlaceholder.editable'

/** Английский текст — как у Chakra-версии поля; русский — как был в shadcn-хардкоде до i18n */
const BUILTIN_FIELD_PLACEHOLDER_STRINGS: Record<FieldPlaceholderStringKey, Record<string, string>> = {
  'formFieldPlaceholder.address': { en: 'Start typing address...', ru: 'Начните вводить адрес...' },
  'formFieldPlaceholder.city': { en: 'Enter city', ru: 'Введите город...' },
  'formFieldPlaceholder.passwordStrength': { en: 'Enter password', ru: 'Введите пароль' },
  'formFieldPlaceholder.richText': { en: 'Start typing...', ru: 'Начните вводить...' },
  'formFieldPlaceholder.editable': { en: 'Click to edit', ru: 'Нажмите для редактирования' },
}

function buildBuiltinString(key: FieldPlaceholderStringKey, locale: string): string {
  const lang = locale.split('-')[0] ?? locale
  const dict = BUILTIN_FIELD_PLACEHOLDER_STRINGS[key]

  return dict[lang] ?? dict[DEFAULT_STATIC_TEXT_LOCALE]!
}

/**
 * Резолвит встроенную placeholder-строку поля — та же лестница `resolveStaticFormText`, что у
 * `resolveSignatureString`/`resolveSelectionString`: перевод приложения по ключу → встроенный
 * словарь по `locale` (ru/en) → английский текст, если провайдера в дереве нет вовсе и скин не
 * передал свой `noProviderLocale`.
 */
export function resolveFieldPlaceholderString(
  i18n: ReturnType<typeof useFormI18n>,
  key: FieldPlaceholderStringKey,
  noProviderLocale?: string,
): string {
  const builtin = (locale: string) => buildBuiltinString(key, locale)
  return !i18n && noProviderLocale ? builtin(noProviderLocale) : resolveStaticFormText(i18n, key, builtin)
}

/**
 * Хук-обёртка над `resolveFieldPlaceholderString`.
 *
 * ⚠️ Вызывать только из `useFieldState` поля (или из тела обычного компонента-поля, минующего
 * `render`-колбэк `createField`, как `RichTextEditor` у `FieldRichText`), не из `render` у
 * `createField`: `render` там — колбэк внутри `form.Field`, хуки там небезопасны (тот же приём,
 * что у `useSignatureString`/`useSelectionString`).
 */
export function useFieldPlaceholderString(key: FieldPlaceholderStringKey, noProviderLocale?: string): string {
  return resolveFieldPlaceholderString(useFormI18n(), key, noProviderLocale)
}
