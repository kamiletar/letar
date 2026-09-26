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
}

/** Результат запроса: подходит `UseQueryResult` */
export interface OptionsQueryResult<TRow> {
  data?: TRow[]
  isLoading?: boolean
  error?: unknown
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
): UseQueryOptionsResult<TRow, TOption> {
  const { data, isLoading, error } = result
  const options = useMemo(() => (data ?? []).map((row) => ({ ...map(row), data: row })), [data, map])
  return { fieldProps: { options, loading: !!isLoading }, error }
}
