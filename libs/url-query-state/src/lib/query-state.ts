/**
 * Заповедь №18 студии: фильтры живут в URL, не только в состоянии. Эта часть закрывает
 * тоглы/чипы фасетов — состояние, которое должно быть настоящей ссылкой `<a href>` (заповедь
 * №14: клик, средний клик, копирование ссылки, right-click → "Копировать ссылку" — всё должно
 * работать без единой строки onClick-обработчика). Текстовые/диапазонные поля фильтров, где
 * состояние меняется вводом, а не кликом по ссылке — это `@letar/forms`
 * (`FormUrlSync`/`useFormUrlSync`), не эта библиотека.
 *
 * Не завязана на React/Next.js — чистые функции, тестируемые в изоляции. React-хук для
 * Next.js App Router — в `@letar/url-query-state/client`.
 *
 * Обобщает паттерн `houses/_lib/query-state.ts` из domwellbes
 * (`.claude/docs/faceted-catalog-pitfalls.md` §5): единая функция сборки href от полного
 * состояния + patch, а не независимые билдеры на каждое измерение фильтров.
 */

export type QueryValue = string | readonly string[] | undefined

export interface QueryStateCodec<T extends Record<string, QueryValue>> {
  defaults: T
  /** Читает состояние из query-параметров, дефолты — для отсутствующих ключей. */
  parse(params: URLSearchParams): T
  /** Сериализует состояние в query-параметры, опуская значения, совпадающие с дефолтом. */
  serialize(state: T): URLSearchParams
}

function valuesEqual(a: QueryValue, b: QueryValue): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => v === b[i])
  }
  return a === b
}

/**
 * Строит кодек по образцу defaults — тип каждого поля (строка/массив) определяется по значению
 * в defaults, отдельная схема не нужна.
 */
export function createQueryStateCodec<T extends Record<string, QueryValue>>(defaults: T): QueryStateCodec<T> {
  const keys = Object.keys(defaults) as (keyof T & string)[]

  return {
    defaults,
    parse(params) {
      const result = { ...defaults }
      for (const key of keys) {
        if (Array.isArray(defaults[key])) {
          const all = params.getAll(key)
          if (all.length > 0) {
            result[key] = all as unknown as T[typeof key]
          }
        } else {
          const value = params.get(key)
          if (value !== null) {
            result[key] = value as unknown as T[typeof key]
          }
        }
      }
      return result
    },
    serialize(state) {
      const params = new URLSearchParams()
      for (const key of keys) {
        const value: QueryValue = state[key]
        if (valuesEqual(value, defaults[key])) { continue }
        if (typeof value === 'string') {
          params.set(key, value)
        } else if (Array.isArray(value)) {
          for (const v of value) { params.append(key, v) }
        }
      }
      return params
    },
  }
}

/** Патч поверх текущего состояния — остальные измерения фильтров берутся из state, не забыты. */
export function mergeQueryState<T extends Record<string, QueryValue>>(current: T, patch: Partial<T>): T {
  return { ...current, ...patch }
}

export function buildQueryHref(basePath: string, params: URLSearchParams): string {
  const qs = params.toString()
  return qs ? `${basePath}?${qs}` : basePath
}

/** Единая точка сборки ссылки — patch применяется к текущему состоянию, не к пустому объекту. */
export function buildQueryStateHref<T extends Record<string, QueryValue>>(
  basePath: string,
  codec: QueryStateCodec<T>,
  current: T,
  patch: Partial<T> = {},
): string {
  const next = mergeQueryState(current, patch)
  return buildQueryHref(basePath, codec.serialize(next))
}

export interface ActiveFilterEntry<T extends Record<string, QueryValue>> {
  key: keyof T & string
  value: T[keyof T & string]
}

/** Какие поля сейчас отличаются от дефолта — для чипов и видимости "Сбросить всё". */
export function diffFromDefaults<T extends Record<string, QueryValue>>(
  state: T,
  defaults: T,
): ActiveFilterEntry<T>[] {
  return (Object.keys(defaults) as (keyof T & string)[])
    .filter((key) => !valuesEqual(state[key], defaults[key]))
    .map((key) => ({ key, value: state[key] }))
}

export function hasActiveFilters<T extends Record<string, QueryValue>>(state: T, defaults: T): boolean {
  return diffFromDefaults(state, defaults).length > 0
}
