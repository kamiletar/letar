'use client'

import { DEFAULT_STATIC_TEXT_LOCALE, resolveStaticFormText } from '@letar/forms-core/i18n'
import { useFormI18n } from '../i18n'

/**
 * Ключи переводов встроенных дефолтов Select/Combobox/Autocomplete (общие для Chakra- и shadcn-скина) (placeholder, индикатор загрузки,
 * пустой результат). Проп (`placeholder`/`loadingMessage`/`emptyMessage`) и `resolved.placeholder`
 * (schema meta через `useResolvedFieldProps`) остаются сильнее — резолвер вызывается только когда
 * ни то ни другое не задано, см. места вызова в `field-combobox.tsx`/`field-autocomplete.tsx`.
 */
export type SelectionStringKey =
  | 'formSelection.combobox.placeholder'
  | 'formSelection.combobox.loadingMessage'
  | 'formSelection.combobox.emptyMessage'
  | 'formSelection.combobox.errorMessage'
  | 'formSelection.combobox.retry'
  | 'formSelection.autocomplete.placeholder'
  | 'formSelection.autocomplete.loadingMessage'
  | 'formSelection.autocomplete.emptyMessage'
  | 'formSelection.createOption'
  | 'formSelection.editOption'
  | 'formSelection.editHotkeyHint'
  | 'formSelection.search.placeholder'
  | 'formSelection.search.aria'
  | 'formSelection.clear'
  | 'formSelection.settleError'
  | 'formSelection.dependsOnHint'
  | 'formSelection.dependentCleared'

/**
 * Встроенный словарь дефолтов — отдельный от `min-chars-hint.ts` (та подсказка требует
 * интерполяции и плюрализации, эти строки статичны без параметров).
 */
const BUILTIN_SELECTION_STRINGS: Record<SelectionStringKey, Record<string, string>> = {
  'formSelection.combobox.placeholder': { en: 'Search...', ru: 'Поиск...' },
  'formSelection.combobox.loadingMessage': { en: 'Loading...', ru: 'Загрузка...' },
  'formSelection.combobox.emptyMessage': { en: 'Nothing found', ru: 'Ничего не найдено' },
  // Ошибка `loadOptions` и кнопка повтора в пустом состоянии списка
  'formSelection.combobox.errorMessage': { en: 'Failed to load', ru: 'Не удалось загрузить' },
  'formSelection.combobox.retry': { en: 'Retry', ru: 'Повторить' },
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
  // `aria-label` кнопки очистки значения у Select/Combobox
  'formSelection.clear': { en: 'Clear', ru: 'Очистить' },
  // Оптимистичное действие не подтвердилось (§16.7); `{label}` подставляет поле
  'formSelection.settleError': { en: 'Could not save “{label}”', ru: 'Не удалось сохранить «{label}»' },
  // Зависимое поле (`dependsOn`, §18): подсказка под заблокированным полем и объявление автоочистки.
  // `{parent}` — метка родителя (или несколько через запятую), `{field}` — метка самого поля; подставляет поле
  'formSelection.dependsOnHint': { en: 'Select “{parent}” first', ru: 'Сначала выберите «{parent}»' },
  'formSelection.dependentCleared': {
    en: '“{field}” was cleared: “{parent}” changed',
    ru: 'Поле «{field}» очищено: изменилось поле «{parent}»',
  },
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
export function resolveSelectionString(
  i18n: ReturnType<typeof useFormI18n>,
  key: SelectionStringKey,
  noProviderLocale?: string,
): string {
  const builtin = (locale: string) => buildBuiltinString(key, locale)
  // Скин может выбрать язык без провайдера сам (shadcn-скин остаётся русским, Chakra — английским)
  return !i18n && noProviderLocale ? builtin(noProviderLocale) : resolveStaticFormText(i18n, key, builtin)
}

/**
 * Хук-обёртка над `resolveSelectionString` для полей выбора.
 *
 * ⚠️ Вызывать только из `useFieldState` поля, не из его `render`: `render` в `createField` —
 * не компонент, а колбэк внутри `form.Field`, хуки там небезопасны (тот же приём, что у
 * `useMinCharsHint`).
 */
export function useSelectionString(key: SelectionStringKey, noProviderLocale?: string): string {
  return resolveSelectionString(useFormI18n(), key, noProviderLocale)
}
