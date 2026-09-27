/**
 * Встроенные строки Select/Combobox (Stage 3b) для forms-vue-shadcn. В Vue-стеке ещё нет
 * `FormI18nProvider`/`useFormI18n` (`@letar/forms-react`, `resolveSelectionString`) — портировать
 * весь i18n-механизм не входит в объём этой стадии, поэтому строки захардкожены на русском,
 * как у shadcn-React-скина БЕЗ провайдера (`SHADCN_NO_PROVIDER_LOCALE`, `field-select.tsx`).
 * Ключи и формулировки — тот же словарь `formSelection.*`, что в `@letar/forms-react`
 * (`selection-strings.ts`), чтобы текст не разошёлся между скинами. Когда i18n доедет до Vue —
 * этот модуль заменяется на реальный `useFormI18n`-хук по тому же образцу.
 */
export interface SelectionStrings {
  /** Глагол пункта создания: «Добавить» (`+ Добавить "текст"`, `+ Добавить…`) */
  createVerb: string
  /** Подпись карандаша («Изменить»); `aria-label` — «<подпись>: <текст опции>» */
  edit: string
  /** Шаблон отказа оптимистичного действия: `{label}` подставляет поле */
  settleError: string
}

export const selectionStrings: SelectionStrings = {
  createVerb: 'Добавить',
  edit: 'Изменить',
  settleError: 'Не удалось сохранить «{label}»',
}
