'use client'

import { resolveSelectionString, type SelectionStringKey, useFormI18n } from '@letar/forms-react'

/**
 * Язык встроенных строк без `FormI18nProvider`. У shadcn-скина по умолчанию русский: поле не становится
 * англоязычным посреди русской формы. Провайдер с `t` или `locale` (ru/en) переопределяет — тем же порядком
 * `resolveStaticFormText`, что и у Chakra-скина (тот без провайдера остаётся английским).
 */
export const SHADCN_NO_PROVIDER_LOCALE = 'ru'

/** Встроенные строки Select/Combobox shadcn-скина — из общего словаря `formSelection.*` (`@letar/forms-react`) */
export interface SelectionStrings {
  /** Глагол пункта создания: «Добавить» (`+ Добавить "текст"`, `+ Добавить…`) */
  createVerb: string
  /** Подпись карандаша («Изменить»); `aria-label` — «<подпись>: <текст опции>» */
  edit: string
  /** Подсказка про F2 */
  hotkeyHint: string
  /** Поле поиска: подсказка и `aria-label` */
  searchPlaceholder: string
  searchAria: string
  /** `aria-label` кнопки очистки */
  clear: string
  /** Индикатор загрузки и пустой результат */
  loading: string
  empty: string
  /** Ошибка `loadOptions` Combobox и кнопка повтора */
  loadError: string
  retry: string
  /** Шаблон отказа оптимистичного действия: `{label}` подставляет поле */
  settleError: string
  /** Placeholder `Form.Field.Autocomplete` (`allowCustomValue`, статичные `suggestions`) */
  autocompletePlaceholder: string
}

/**
 * Все встроенные строки поля выбора одним вызовом (один `useFormI18n`). Тот же механизм, что у Chakra-скина
 * (`resolveSelectionString`): перевод приложения по ключу → словарь по `locale` → русский без провайдера.
 * Вызывать из `useFieldState` поля, не из `render`: там хуки небезопасны.
 */
export function useSelectionStrings(): SelectionStrings {
  const i18n = useFormI18n()
  const t = (key: SelectionStringKey) => resolveSelectionString(i18n, key, SHADCN_NO_PROVIDER_LOCALE)
  return {
    createVerb: t('formSelection.createOption'),
    edit: t('formSelection.editOption'),
    hotkeyHint: t('formSelection.editHotkeyHint'),
    searchPlaceholder: t('formSelection.search.placeholder'),
    searchAria: t('formSelection.search.aria'),
    clear: t('formSelection.clear'),
    loading: t('formSelection.combobox.loadingMessage'),
    empty: t('formSelection.combobox.emptyMessage'),
    loadError: t('formSelection.combobox.errorMessage'),
    retry: t('formSelection.combobox.retry'),
    settleError: t('formSelection.settleError'),
    autocompletePlaceholder: t('formSelection.autocomplete.placeholder'),
  }
}
