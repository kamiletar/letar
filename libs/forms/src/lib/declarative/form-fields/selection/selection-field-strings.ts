'use client'

import { DEFAULT_STATIC_TEXT_LOCALE, resolveStaticFormText } from '@letar/forms-core/i18n'
import { useFormI18n } from '@letar/forms-react'

/**
 * Ключи переводов встроенных дефолтов Combobox/Autocomplete (placeholder, индикатор загрузки,
 * пустой результат). Проп (`placeholder`/`loadingMessage`/`emptyMessage`) и `resolved.placeholder`
 * (schema meta через `useResolvedFieldProps`) остаются сильнее — резолвер вызывается только когда
 * ни то ни другое не задано, см. места вызова в `field-combobox.tsx`/`field-autocomplete.tsx`.
 */
export type SelectionStringKey =
  | 'formSelection.combobox.placeholder'
  | 'formSelection.combobox.loadingMessage'
  | 'formSelection.combobox.emptyMessage'
  | 'formSelection.autocomplete.placeholder'
  | 'formSelection.autocomplete.loadingMessage'
  | 'formSelection.autocomplete.emptyMessage'
  | 'formSelection.createOption'
  | 'formSelection.editOption'
  | 'formSelection.editHotkeyHint'
  | 'formSelection.search.placeholder'
  | 'formSelection.search.aria'

/**
 * Встроенный словарь дефолтов — отдельный от `min-chars-hint.ts` (та подсказка требует
 * интерполяции и плюрализации, эти строки статичны без параметров).
 */
const BUILTIN_SELECTION_STRINGS: Record<SelectionStringKey, Record<string, string>> = {
  'formSelection.combobox.placeholder': { en: 'Search...', ru: 'Поиск...' },
  'formSelection.combobox.loadingMessage': { en: 'Loading...', ru: 'Загрузка...' },
  'formSelection.combobox.emptyMessage': { en: 'Nothing found', ru: 'Ничего не найдено' },
  'formSelection.autocomplete.placeholder': { en: 'Start typing...', ru: 'Начните вводить...' },
  'formSelection.autocomplete.loadingMessage': { en: 'Loading...', ru: 'Загрузка...' },
  'formSelection.autocomplete.emptyMessage': { en: 'No suggestions', ru: 'Нет подсказок' },
  // Глагол пункта «+ Добавить…» (`onCreate` у Select/Combobox); знаки «+», «…» и текст поиска дописывает поле
  'formSelection.createOption': { en: 'Add', ru: 'Добавить' },
  // Подпись карандаша (`title`; `aria-label` = «<подпись>: <текст опции>») и подсказка про F2
  'formSelection.editOption': { en: 'Edit', ru: 'Изменить' },
  'formSelection.editHotkeyHint': { en: 'F2 — edit the item', ru: 'F2 — изменить запись' },
  // Поле поиска внутри списка Select: подсказка и `aria-label`
  'formSelection.search.placeholder': { en: 'Search...', ru: 'Поиск...' },
  'formSelection.search.aria': { en: 'Search options', ru: 'Поиск по списку' },
}

function buildBuiltinString(key: SelectionStringKey, locale: string): string {
  const lang = locale.split('-')[0] ?? locale
  const dict = BUILTIN_SELECTION_STRINGS[key]

  return dict[lang] ?? dict[DEFAULT_STATIC_TEXT_LOCALE]!
}

/**
 * Резолвит встроенный дефолт статичной UI-строки поля выбора — общая лестница
 * `resolveStaticFormText` (`@letar/forms-core/i18n`, тот же порядок, что у `resolveMinCharsHint`
 * и заголовка `Form.Errors`): перевод приложения по ключу → встроенный словарь по `locale` (ru/en)
 * → английский текст, если провайдера в дереве нет вовсе — `FormI18nProvider` опционален, его
 * отсутствие не ошибка конфигурации.
 */
export function resolveSelectionString(i18n: ReturnType<typeof useFormI18n>, key: SelectionStringKey): string {
  return resolveStaticFormText(i18n, key, (locale) => buildBuiltinString(key, locale))
}

/**
 * Хук-обёртка над `resolveSelectionString` для полей выбора.
 *
 * ⚠️ Вызывать только из `useFieldState` поля, не из его `render`: `render` в `createField` —
 * не компонент, а колбэк внутри `form.Field`, хуки там небезопасны (тот же приём, что у
 * `useMinCharsHint`).
 */
export function useSelectionString(key: SelectionStringKey): string {
  return resolveSelectionString(useFormI18n(), key)
}
