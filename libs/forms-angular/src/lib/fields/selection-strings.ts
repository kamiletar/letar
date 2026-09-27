/**
 * Строки onCreate/onUpdate-конвейера `Field.Select` (Этап 3h паритета Select/Combobox,
 * `forms-vue-angular-select-parity`) — тот же текст, что у `forms-vue`/`forms-vue-shadcn`
 * (их `selection-strings.ts`), чтобы формулировки не расходились между скинами. У Angular-порта
 * ещё нет своего `FormI18nProvider`, поэтому строки захардкожены на русском — тот же осознанный
 * вырез, что и у остальных скинов на момент их Этапа 3e/3d.
 *
 * Набор уже сокращён под объём 3h (без `searchable`/`dependsOn` — Этап 3i): нет
 * `createWithSearch`/`searchPlaceholder`/`empty`/`dependsOnHint` и т.п. — они добавятся вместе с
 * соответствующей функциональностью, не раньше.
 */
export interface SelectionStrings {
  /** Глагол пункта создания: «Добавить» (служебный пункт — «+ Добавить…», без поиска другого текста не бывает) */
  createVerb: string
  /** Подпись карандаша («Изменить»); `aria-label` — «<подпись>: <текст опции>» */
  edit: string
  /** Шаблон отказа оптимистичного действия: `«{label}»` подставляет поле */
  settleError: string
}

export const selectionStrings: SelectionStrings = {
  createVerb: 'Добавить',
  edit: 'Изменить',
  settleError: 'Не удалось сохранить',
}
