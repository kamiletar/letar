/**
 * Встроенные строки `onCreate`/`onUpdate`-конвейера и `searchable`/`dependsOn` `Field.Select`
 * (Этапы 3e-3f) для headless `forms-vue`. У Vue-стека ещё нет `FormI18nProvider`/`useFormI18n` —
 * тот же осознанный вырез, что и в `forms-vue-shadcn` (см. её `selection-strings.ts`): строки
 * захардкожены на русском, тем же словарём `formSelection.*`, что в `@letar/forms-react`, чтобы
 * текст не расходился между скинами.
 */
export interface SelectionStrings {
  /** Глагол пункта создания: «Добавить» (`+ Добавить…`, `+ Добавить "текст"`) */
  createVerb: string
  /** Подпись карандаша («Изменить»); `aria-label` — «<подпись>: <текст опции>» */
  edit: string
  /** Шаблон отказа оптимистичного действия: `{label}` подставляет поле */
  settleError: string
  /** Поле поиска внутри списка (Этап 3f `searchable`): подсказка и `aria-label` */
  searchPlaceholder: string
  searchAria: string
  /** Пустой результат поиска/список без опций */
  empty: string
  /** Зависимое поле (`dependsOn`, §18, Этап 3f): подсказка под заблокированным полем и объявление
   * автоочистки. `{parent}`/`{field}` подставляет `interpolate()` (`@letar/forms-core/i18n`) */
  dependsOnHint: string
  dependentCleared: string
}

export const selectionStrings: SelectionStrings = {
  createVerb: 'Добавить',
  edit: 'Изменить',
  settleError: 'Не удалось сохранить «{label}»',
  searchPlaceholder: 'Поиск...',
  searchAria: 'Поиск по списку',
  empty: 'Ничего не найдено',
  dependsOnHint: 'Сначала выберите «{parent}»',
  dependentCleared: 'Поле «{field}» очищено: изменилось поле «{parent}»',
}
