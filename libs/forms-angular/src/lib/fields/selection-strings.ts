/**
 * Строки onCreate/onUpdate/searchable/dependsOn-конвейера `Field.Select` (Этапы 3h-3i паритета
 * Select/Combobox, `forms-vue-angular-select-parity`) — тот же текст, что у
 * `forms-vue`/`forms-vue-shadcn` (их `selection-strings.ts`), чтобы формулировки не расходились
 * между скинами. У Angular-порта ещё нет своего `FormI18nProvider`, поэтому строки захардкожены
 * на русском — тот же осознанный вырез, что и у остальных скинов на момент их Этапа 3e/3d/3f.
 */
export interface SelectionStrings {
  /** Глагол пункта создания: «Добавить» (служебный пункт — «+ Добавить…», без поиска другого текста не бывает) */
  createVerb: string
  /** Подпись карандаша («Изменить»); `aria-label` — «<подпись>: <текст опции>» */
  edit: string
  /** Шаблон отказа оптимистичного действия: `«{label}»` подставляет поле */
  settleError: string
  /** Поле поиска внутри списка (Этап 3i `searchable`): подсказка и `aria-label` по умолчанию */
  searchPlaceholder: string
  searchAria: string
  /** Пустой результат поиска */
  empty: string
  /** Зависимое поле (`dependsOn`, §18, Этап 3i): подсказка под заблокированным полем и объявление
   * автоочистки. `{parent}`/`{field}` подставляет `interpolate()` (`@letar/forms-core/i18n`) */
  dependsOnHint: string
  dependentCleared: string
}

export const selectionStrings: SelectionStrings = {
  createVerb: 'Добавить',
  edit: 'Изменить',
  settleError: 'Не удалось сохранить',
  searchPlaceholder: 'Поиск...',
  searchAria: 'Поиск по списку',
  empty: 'Ничего не найдено',
  dependsOnHint: 'Сначала выберите «{parent}»',
  dependentCleared: 'Поле «{field}» очищено: изменилось поле «{parent}»',
}
