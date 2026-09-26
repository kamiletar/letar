/**
 * Создание записи справочника прямо из поля выбора (`onCreate` у Select/Combobox) —
 * framework-free половина: типы, служебное значение пункта «+ Добавить…» и чистые функции.
 * Отрисовка пункта и вызов `onCreate` остаются в скине.
 */

/**
 * Опция, которую `onCreate` возвращает приложению-поле: она добавляется в список и выбирается.
 * `data` — данные приложения для `renderOption`/`renderValue` (необязательные).
 */
export interface CreatedOption<TData = unknown> {
  label: string
  value: string | number
  data?: TData
}

/**
 * Колбэк приложения: открывает своё окно создания (server action — на его стороне) и возвращает
 * созданную запись либо `null`, если пользователь отказался. `search` — текст поиска Combobox;
 * у Select он пустой.
 */
export type CreateOptionHandler<TData = unknown> = (search: string) => Promise<CreatedOption<TData> | null>

/**
 * Служебное значение пункта «+ Добавить…». Не совпадает с реальными значениями справочника,
 * перехватывается в `onValueChange` поля и в форму никогда не попадает.
 */
export const CREATE_OPTION_VALUE = '__letar_create_option__'

export function isCreateOptionValue(value: unknown): boolean {
  return value === CREATE_OPTION_VALUE
}

/**
 * Дописывает созданные опции к списку приложения. Опция из базового списка сильнее созданной:
 * когда приложение перезагрузит справочник и новая запись придёт уже оттуда, дубля не будет.
 * Значения сравниваются как строки (`1` и `'1'` — одна опция).
 */
export function mergeCreatedOptions<T extends { value: string | number }>(base: T[], created: T[]): T[] {
  if (created.length === 0) {
    return base
  }
  const known = new Set(base.map((opt) => String(opt.value)))
  const extra = created.filter((opt) => !known.has(String(opt.value)))
  return extra.length === 0 ? base : [...base, ...extra]
}

/**
 * Предлагать ли «+ Добавить "<search>"»: поиск непустой и точного совпадения по подписи ещё нет
 * (без учёта регистра и краевых пробелов) — иначе пользователь создал бы дубль существующего.
 */
export function shouldOfferCreate(search: string, labels: string[]): boolean {
  const needle = search.trim().toLowerCase()
  if (!needle) {
    return false
  }
  return !labels.some((label) => label.trim().toLowerCase() === needle)
}
