/**
 * Правка записи справочника прямо из поля выбора (`onUpdate` у Select/Combobox) — framework-free
 * половина: типы, признак «опцию можно править» и чистые функции локального наложения правок.
 * Отрисовка карандаша и вызов `onUpdate` остаются в скине и в `@letar/forms-react`.
 */

import { CREATE_OPTION_VALUE, isCreateOptionValue, type SelectionActionContext } from './creatable-options'
import { getOptionText } from './group-options'

/** Что `onUpdate` возвращает полю */
export interface UpdatedOption<TData = unknown> {
  label: string
  /** Тот же value — правка подписи; другой — запись заменена (copy-on-write) */
  value: string | number
  /** Передан — заменяет data опции; не передан — data остаётся прежней */
  data?: TData
}

/**
 * Колбэк приложения: открывает своё окно правки (server action — на его стороне) и возвращает
 * сохранённую запись либо `null`, если пользователь отказался.
 */
export type UpdateOptionHandler<TOption, TData = unknown> = (
  option: TOption,
  ctx: SelectionActionContext<TData>,
) => Promise<UpdatedOption<TData> | null>

/** Вид действия поля: место под `'delete'` оставлено (см. PLAN.md, §4.6) */
export type SelectionActionKind = 'create' | 'edit'

/** Почему оптимистичное действие не подтвердилось */
export type SettleErrorReason = 'rejected' | 'declined' | 'timeout'

/** Что `onSettleError` получает, когда сервер не подтвердил показанное оптимистично (§16.7) */
export interface SettleErrorInfo<TData = unknown> {
  kind: SelectionActionKind
  /** Что было показано: у create `value` — временный, в форму он не попадал */
  preview: { label: string; value: string | number; data?: TData }
  /** `rejected` — throw, `declined` — `null` после `optimistic`, `timeout` — нет ответа за `settleTimeout` */
  reason: SettleErrorReason
  error?: unknown
}

/** Запись локального наложения правок — одна на исходное value */
export interface OptionOverlayEntry {
  fromValue: string
  label: string
  value: string | number
  data?: unknown
  hasData: boolean
  /** Текст опции ПРИЛОЖЕНИЯ в момент клика. Его смена = «приложение перезапросило список» */
  baselineText: string
  /** Оптимистичная правка ждёт подтверждения: опция видна приглушённой, не выбирается и не правится (§16.7) */
  pending?: boolean
}

/**
 * `onUpdate` есть, `editable !== false`, опция не `disabled`, value не пустой и не служебный
 * `CREATE_OPTION_VALUE`.
 */
export function isOptionEditable(
  option: { value: unknown; disabled?: boolean; editable?: boolean },
  hasOnUpdate: boolean,
): boolean {
  if (!hasOnUpdate || option.editable === false || option.disabled) {
    return false
  }
  if (option.value === '' || option.value === null || option.value === undefined) {
    return false
  }
  return !isCreateOptionValue(option.value) && String(option.value) !== CREATE_OPTION_VALUE
}

/** Добавить/заменить запись по `fromValue`; у повторной правки `baselineText` остаётся от первой */
export function upsertOptionOverlay(
  overlay: readonly OptionOverlayEntry[],
  entry: OptionOverlayEntry,
): OptionOverlayEntry[] {
  const existing = overlay.find((item) => item.fromValue === entry.fromValue)
  if (!existing) {
    return [...overlay, entry]
  }
  return overlay.map((item) =>
    item.fromValue === entry.fromValue ? { ...entry, baselineText: existing.baselineText } : item
  )
}

type OverlayOption = { value: string | number; label?: unknown; textValue?: string }

/**
 * Убрать устаревшие записи. Запись устаревает только по положительному сигналу от приложения:
 * - value тот же — в `appOptions` есть `fromValue` и его текст ≠ `baselineText` (пришла свежая подпись);
 * - value другой — в `appOptions` появился новый value (приложение знает о новой записи).
 * Отсутствие `fromValue` сигналом НЕ считается: во время async-загрузки `options = []`, и сброс по
 * отсутствию вернул бы после загрузки старую подпись из кеша запроса.
 *
 * Нечего убирать — возвращает ТОТ ЖЕ массив (важно для `setState` во время рендера).
 */
export function pruneOptionOverlay<T extends OverlayOption>(
  appOptions: readonly T[],
  overlay: readonly OptionOverlayEntry[],
): readonly OptionOverlayEntry[] {
  if (overlay.length === 0) {
    return overlay
  }
  const byValue = new Map(appOptions.map((opt) => [String(opt.value), opt]))
  const kept = overlay.filter((entry) => {
    if (String(entry.value) === entry.fromValue) {
      const fresh = byValue.get(entry.fromValue)
      return !(fresh && getOptionText(fresh) !== entry.baselineText)
    }
    return !byValue.has(String(entry.value))
  })
  return kept.length === overlay.length ? overlay : kept
}

/**
 * Наложить активные записи на итоговый список:
 * - value тот же — у опции `fromValue` заменяются `label`, `textValue = label` и `data` (если `hasData`);
 *   `group`, `disabled`, `editable` остаются от приложения;
 * - value другой — опция `fromValue` заменяется на месте новой `{ label, value, data }`; если `fromValue`
 *   в списке нет — дописывается в конец, чтобы выбранное новое значение имело подпись.
 */
export function applyOptionOverlay<T extends OverlayOption & { data?: unknown }>(
  options: readonly T[],
  overlay: readonly OptionOverlayEntry[],
): T[] {
  if (overlay.length === 0) {
    return options as T[]
  }
  let result: T[] = [...options]
  for (const entry of overlay) {
    const index = result.findIndex((opt) => String(opt.value) === entry.fromValue)
    if (String(entry.value) === entry.fromValue) {
      if (index >= 0) {
        const opt = result[index]
        result[index] = {
          ...opt,
          label: entry.label,
          textValue: entry.label,
          ...(entry.hasData && { data: entry.data }),
          ...(entry.pending && { pending: true }),
        }
      }
      continue
    }
    const replacement = {
      label: entry.label,
      textValue: entry.label,
      value: entry.value,
      ...(entry.hasData && { data: entry.data }),
      ...(entry.pending && { pending: true }),
    } as unknown as T
    if (index >= 0) {
      result[index] = replacement
    } else {
      result = [...result, replacement]
    }
  }
  return result
}
