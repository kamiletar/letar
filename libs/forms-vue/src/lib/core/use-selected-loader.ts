import type { FieldDeps, LoadSelectedFn } from '@letar/forms-core/uikit'
import { computed, type ComputedRef, onBeforeUnmount, ref, watch } from 'vue'

/** Отказ из-за отмены запроса (`AbortController`) — не ошибка загрузки. Копия — см. `use-promise-search.ts` */
function isAbortError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { name?: unknown }).name === 'AbortError'
}

/** Вызов загрузчика с приведением синхронного `throw` к отказу промиса */
function callLoader<TResult>(load: () => Promise<TResult>): Promise<TResult> {
  try {
    return load()
  } catch (error) {
    return Promise.reject(error)
  }
}

export interface UseSelectedLoaderOptions<TData, TDeps extends FieldDeps = FieldDeps> {
  /** Загрузчик записи по значению (`undefined` — путь не используется) */
  loadSelected?: LoadSelectedFn<TData, TDeps>
  /** Текущее значение поля (пустая строка — ничего не выбрано) — геттер */
  value: () => string
  /** Нужна ли догрузка сейчас: значения нет в текущих результатах и нет `initialLabel` — геттер */
  enabled: () => boolean
  onLoadError?: (error: unknown) => void
  /** Значения родителей (`dependsOn`, §18) — уходят в `ctx.deps`; по умолчанию `{}`. Кэш по `value` от них не зависит */
  deps?: () => TDeps
}

export interface UseSelectedLoaderResult<TData> {
  /** Запись значения (`null` — загрузчик сказал, что записи нет; `undefined` — ещё не загружена) */
  data: ComputedRef<TData | null | undefined>
  isLoading: ComputedRef<boolean>
  /** Сбросить закэшированную запись значения — после `onUpdate` этой записи (прежняя остаётся до ответа) */
  invalidate: (value: string) => void
}

const NO_DEPS: FieldDeps = {}

interface CacheEntry<TData> {
  data: TData | null
  fresh: boolean
}

/**
 * Vue-эквивалент React `useSelectedLoader`: догрузка записи выбранного значения промисом.
 * Результаты по значению хранятся в экземпляре композабла — иначе запрос уходил бы на каждое
 * открытие; `invalidate` помечает запись устаревшей, прежнее значение остаётся на экране, пока не
 * придёт новое. Отмена запроса — при смене значения и при уничтожении композабла.
 *
 * Кэш записи — по `value` (идентификаторы уникальны между родителями), смена `deps`/`depsKey` его
 * не сбрасывает (в отличие от `usePromiseSearch`) — та же запись справочника видна одинаково,
 * независимо от того, какой родитель сейчас выбран.
 */
export function useSelectedLoader<TData, TDeps extends FieldDeps = FieldDeps>(
  options: UseSelectedLoaderOptions<TData, TDeps>,
): UseSelectedLoaderResult<TData> {
  const { loadSelected, value, enabled, onLoadError, deps = () => NO_DEPS as TDeps } = options

  const cache = ref<Record<string, CacheEntry<TData>>>({})

  let alive = true
  let controller: AbortController | undefined
  let activeToken: object | null = null

  const entry = computed(() => {
    const key = value()
    return key ? cache.value[key] : undefined
  })
  const needsLoad = computed(() => enabled() && !!loadSelected && !!value() && (!entry.value || !entry.value.fresh))

  watch(
    () => [needsLoad.value, value()] as const,
    ([shouldLoad, targetValue]) => {
      controller?.abort()
      activeToken = null
      const load = loadSelected
      if (!shouldLoad || !load) {
        return
      }
      const localController = new AbortController()
      controller = localController
      const token = {}
      activeToken = token
      const depsSnapshot = deps()
      void callLoader(() => load(targetValue, { signal: localController.signal, deps: depsSnapshot })).then(
        (data) => {
          if (!alive || activeToken !== token) {
            return
          }
          cache.value = { ...cache.value, [targetValue]: { data, fresh: true } }
        },
        (error: unknown) => {
          if (!alive || activeToken !== token || localController.signal.aborted || isAbortError(error)) {
            return
          }
          onLoadError?.(error)
        },
      )
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    alive = false
    controller?.abort()
  })

  const invalidate = (target: string): void => {
    const existing = cache.value[target]
    if (existing && existing.fresh) {
      cache.value = { ...cache.value, [target]: { ...existing, fresh: false } }
    }
  }

  return {
    data: computed(() => entry.value?.data),
    isLoading: needsLoad,
    invalidate,
  }
}
