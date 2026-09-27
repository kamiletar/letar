/**
 * Встроенные строки `onCreate`/`onUpdate`-конвейера `Field.Select` (Этап 3e) для headless
 * `forms-vue`. У Vue-стека ещё нет `FormI18nProvider`/`useFormI18n` — тот же осознанный вырез,
 * что и в `forms-vue-shadcn` (см. её `selection-strings.ts`): строки захардкожены на русском,
 * тем же словарём `formSelection.*`, что в `@letar/forms-react`, чтобы текст не расходился между
 * скинами. Набор полей у`же, чем в `forms-vue-shadcn` — `searchable`/`dependsOn` (Stage 3f) сюда
 * не входят, добавятся вместе с этим этапом.
 */
export interface SelectionStrings {
  /** Глагол пункта создания: «Добавить» (`+ Добавить…`) */
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
