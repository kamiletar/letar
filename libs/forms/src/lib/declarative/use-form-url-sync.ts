'use client'

import { useEffect, useRef } from 'react'
import { useFormContext } from '../context'
import { generatePrefillUrl } from './use-url-prefill'

/**
 * Options for useFormUrlSync
 */
export interface FormUrlSyncOptions<TData extends object> {
  /** Whitelist of field names to sync with URL */
  fields: (keyof TData & string)[]
  /**
   * Default values — fields matching defaults are omitted from URL
   * to keep it clean.
   */
  defaults: TData
  /**
   * Debounce delay in ms before writing to URL (default: 300).
   * Prevents URL spam while the user is typing.
   */
  debounce?: number
  /**
   * Use history.replaceState instead of pushState (default: true).
   * With `replace: true` — no extra browser history entries on each keystroke.
   */
  replace?: boolean
  /**
   * Custom router for Next.js App Router integration.
   * When not provided, falls back to native history API.
   *
   * @example
   * ```tsx
   * import { useRouter } from 'next/navigation'
   * const router = useRouter()
   * useFormUrlSync({ ..., router })
   * ```
   */
  router?: {
    replace: (url: string, options?: { scroll?: boolean }) => void
    push: (url: string, options?: { scroll?: boolean }) => void
  }
}

/**
 * Hook that reads initial values from URL params (like useUrlPrefill)
 * to be used as form initialValue.
 *
 * Pair with <Form.UrlSync> inside <Form> to write values back to URL on change.
 *
 * @example
 * ```tsx
 * function FiltersPage() {
 *   const { initialValue } = useFormUrlSync({
 *     fields: ['search', 'category', 'minPrice'],
 *     defaults: defaultFilters,
 *     debounce: 300,
 *   })
 *
 *   return (
 *     <Form schema={FilterSchema} initialValue={initialValue} onSubmit={async () => {}}>
 *       <Form.Field.String name="search" />
 *       <Form.UrlSync fields={['search', 'category', 'minPrice']} defaults={defaultFilters} />
 *       <Form.Subscribe>{(filters) => <List filters={filters} />}</Form.Subscribe>
 *     </Form>
 *   )
 * }
 * ```
 */
export function useFormUrlSync<TData extends object>(options: FormUrlSyncOptions<TData>): { initialValue: TData } {
  const { fields, defaults } = options
  // Однократное чтение при маунте — без useMemo чтобы оставаться тестируемым
  const initialValue = readUrlValues(fields, defaults)
  return { initialValue }
}

/**
 * Читает значения из URL query params и возвращает их с учётом типов defaults.
 * Чистая функция — тестируется без React окружения.
 */
export function readUrlValues<TData extends object>(
  fields: (keyof TData & string)[],
  defaults: TData,
  searchParams?: URLSearchParams
): TData {
  if (typeof window === 'undefined' && !searchParams) return defaults

  const params = searchParams ?? new URLSearchParams(window.location.search)
  const extracted: Record<string, unknown> = {}

  for (const field of fields) {
    const allValues = params.getAll(field)
    if (allValues.length === 0) continue

    const defaultVal = defaults[field]
    if (Array.isArray(defaultVal)) {
      extracted[field] = allValues
    } else if (typeof defaultVal === 'number') {
      const num = Number(allValues[0])
      if (!isNaN(num)) extracted[field] = num
    } else if (typeof defaultVal === 'boolean') {
      extracted[field] = allValues[0] === 'true'
    } else {
      extracted[field] = allValues[0]
    }
  }

  return { ...defaults, ...extracted }
}

// --- Form.UrlSync component ---

export interface FormUrlSyncProps<TData extends object> extends FormUrlSyncOptions<TData> {}

/**
 * Renderless component that subscribes to form values and writes them to the URL.
 * Place inside <Form> to enable bidirectional URL sync.
 *
 * Fields with default values are omitted from the URL (keeps it clean).
 * Writes are debounced to avoid URL spam while typing.
 *
 * @example
 * ```tsx
 * <Form schema={FilterSchema} initialValue={initialValue}>
 *   <Form.UrlSync fields={['search', 'category']} defaults={defaultFilters} />
 *   <Form.Field.String name="search" />
 * </Form>
 * ```
 */
export function FormUrlSync<TData extends object>({
  fields,
  defaults,
  debounce: delay = 300,
  replace = true,
  router,
}: FormUrlSyncProps<TData>): null {
  const form = useFormContext()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const unsubscribe = form.store.subscribe(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const values = (form.state as any).values as Record<string, unknown>

      if (timerRef.current) clearTimeout(timerRef.current)

      timerRef.current = setTimeout(() => {
        // Оставляем только поля из whitelist, отличающиеся от defaults
        const filtered: Record<string, unknown> = {}
        for (const field of fields) {
          const val = values[field]
          const def = defaults[field] as unknown
          if (!isDefaultValue(val, def)) {
            filtered[field] = val
          }
        }

        // Сохраняем прочие параметры URL (utm, etc.)
        const currentParams = new URLSearchParams(window.location.search)
        const formParamKeys = new Set(fields)
        const otherParams: Record<string, string[]> = {}
        for (const [key, value] of currentParams.entries()) {
          if (!formParamKeys.has(key as keyof TData & string)) {
            if (!otherParams[key]) otherParams[key] = []
            otherParams[key].push(value)
          }
        }

        // Строим итоговый URL
        const allParams: Record<string, unknown> = { ...filtered }
        for (const [key, values] of Object.entries(otherParams)) {
          allParams[key] = values.length === 1 ? values[0] : values
        }

        const newUrl = generatePrefillUrl(window.location.pathname, allParams)

        if (router) {
          if (replace) {
            router.replace(newUrl, { scroll: false })
          } else {
            router.push(newUrl, { scroll: false })
          }
        } else if (replace) {
          window.history.replaceState(window.history.state, '', newUrl)
        } else {
          window.history.pushState(window.history.state, '', newUrl)
        }
      }, delay)
      // Форсируем union-тип: инсталлированная в этом lib-контексте версия @tanstack/store
      // типизирует subscribe() как чистую функцию, но у consuming apps (например mandala)
      // может быть резолвлена версия ^0.11+, где subscribe() возвращает { unsubscribe }
    }) as (() => void) | { unsubscribe: () => void }

    return () => {
      // TanStack Store v0.9+ возвращает объект { unsubscribe }, а не функцию
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      } else {
        unsubscribe.unsubscribe()
      }
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [form, fields, defaults, delay, replace, router])

  return null
}

/** Проверяет, совпадает ли значение с дефолтным (с поддержкой массивов) */
function isDefaultValue(value: unknown, defaultValue: unknown): boolean {
  if (value === defaultValue) return true
  if (Array.isArray(value) && Array.isArray(defaultValue)) {
    if (value.length !== defaultValue.length) return false
    return value.every((v, i) => v === defaultValue[i])
  }
  return false
}
