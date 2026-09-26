import type { OptionsSourceProps } from '@letar/forms-core/uikit'
import type { ReactNode } from 'react'
import { useMemo } from 'react'

/** Опция в форме, которую понимают `Field.Select` и `Field.Combobox` обоих скинов */
export interface QueryOption<TValue extends string | number = string> {
  label: ReactNode
  value: TValue
  /** Строковая форма подписи — поиск, typeahead; нужна, если `label` — не строка */
  textValue?: string
  disabled?: boolean
  group?: string
  /** `false` прячет карандаш этой опции у полей с `onUpdate` */
  editable?: boolean
  /** Запись ещё не подтверждена сервером: видна, приглушена, не выбирается и не правится (§16.7) */
  pending?: boolean
}

/** Результат запроса: подходит `UseQueryResult` */
export interface OptionsQueryResult<TRow> {
  data?: TRow[]
  isLoading?: boolean
  error?: unknown
}

/** Дополнительные настройки `useQueryOptions` */
export interface UseQueryOptionsSettings<TRow> {
  /**
   * Строка ещё не подтверждена сервером (временная запись оптимистичной мутации): опция получает `pending: true`.
   * Стабильная функция, как и `map`.
   */
  isPending?: (row: TRow) => boolean
}

export interface UseQueryOptionsResult<TRow, TOption> {
  /** Распыляется в поле: `<Field.Select name="regionId" {...regions.fieldProps} />` */
  fieldProps: OptionsSourceProps<TOption & { data: TRow }>
  /** Ошибка запроса — показывает приложение (Select не рисует её сам) */
  error: unknown
}

/**
 * Результат запроса → `options` и `loading` для `Field.Select`/`Field.Combobox` со статичными опциями.
 * Строка справочника кладётся в `option.data` сама — она же приходит в `renderOption` и `onUpdate`.
 * `map` — стабильная функция (на уровне модуля или в `useCallback`): по ней и по `data` мемоизируется список.
 * `settings.isPending` помечает временные строки оптимистичной мутации: поле не даст их выбрать (§16.7).
 *
 * @example
 * ```tsx
 * const regions = useQueryOptions(useFindManyRegion(), (r) => ({ label: r.name, value: r.id }))
 * <Field.Select name="regionId" {...regions.fieldProps} />
 * ```
 */
export function useQueryOptions<TRow, TOption extends QueryOption<string | number> = QueryOption>(
  result: OptionsQueryResult<TRow>,
  map: (row: TRow) => TOption,
  settings?: UseQueryOptionsSettings<TRow>,
): UseQueryOptionsResult<TRow, TOption> {
  const { data, isLoading, error } = result
  const isPending = settings?.isPending
  const options = useMemo(
    () =>
      (data ?? []).map((row) => {
        const option = { ...map(row), data: row }
        return isPending?.(row) ? { ...option, pending: true } : option
      }),
    [data, map, isPending],
  )
  return { fieldProps: { options, loading: !!isLoading }, error }
}
