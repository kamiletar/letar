import type { FieldDeps, LoadOptionsFn } from '@letar/forms-core/uikit'
import { computed, type ComputedRef, onBeforeUnmount, type Ref, ref, watch } from 'vue'

/** Отказ из-за отмены запроса (`AbortController`) — не ошибка загрузки. Копия React `abort-utils.ts`:
 * функция в две строки, дублировать дешевле, чем тянуть кросс-импорт `forms-vue` → `forms-react`. */
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

export interface UsePromiseSearchOptions<TData, TDeps extends FieldDeps = FieldDeps> {
  /** Загрузчик записей по строке поиска (`undefined` — путь не используется, композабл простаивает) */
  loadOptions?: LoadOptionsFn<TData, TDeps>
  /** Строка поиска после дебаунса и порога `minChars` — геттер */
  search: () => string
  /** Запрашивать ли сейчас (родители готовы, список открывали, порог `minChars` пройден) — геттер */
  enabled: () => boolean
  /** Ошибка загрузки — для лога или тоста; отмена запроса сюда не попадает */
  onLoadError?: (error: unknown) => void
  /** Значения родителей (`dependsOn`, §18) — уходят в `ctx.deps`; по умолчанию `{}` */
  deps?: () => TDeps
  /** Ключ зависимостей: смена — новый запрос, прежние опции чужого родителя не остаются */
  depsKey?: () => string
}

export interface UsePromiseSearchResult<TData> {
  /** Результат последнего успешного запроса; при загрузке остаётся прежний, при ошибке — `undefined` */
  data: ComputedRef<TData[] | undefined>
  /** Идёт запрос для текущей строки поиска */
  isLoading: ComputedRef<boolean>
  /** Ошибка запроса для текущей строки поиска (`null` — нет) */
  error: ComputedRef<unknown>
  /** Повторить запрос с той же строкой (после ошибки; после `onCreate`/`onUpdate`) */
  reload: () => void
}

interface Settled<TData> {
  key: string
  /** Ключ зависимостей ответа: данные другого родителя не показываем, даже пока идёт новый запрос */
  depsKey: string
  data: TData[] | undefined
  error: unknown
}

const NO_DEPS: FieldDeps = {}

/**
 * Vue-эквивалент React `usePromiseSearch`: промис-путь поиска Combobox — запрос на каждую (уже
 * дебаунсенную вызывающим кодом) строку поиска. Свой `AbortController` на запрос, гонки — по
 * идентичности токена (тот же приём, что `use-options-loader.ts`): применяется только результат
 * последнего запуска, даже если загрузчик игнорирует `signal` (например, server action). Прошлые
 * результаты остаются на экране, пока идёт новый запрос по тому же родителю — `depsKey` меняется →
 * данные скрываются немедленно, не дожидаясь ответа. Автоповторов нет, кэша нет.
 */
export function usePromiseSearch<TData, TDeps extends FieldDeps = FieldDeps>(
  options: UsePromiseSearchOptions<TData, TDeps>,
): UsePromiseSearchResult<TData> {
  const { loadOptions, search, enabled, onLoadError, deps = () => NO_DEPS as TDeps, depsKey = () => '' } = options

  const nonce = ref(0)
  // Приведение типа: generic `TData` внутри `ref()` даёт `UnwrapRefSimple<TData>` — несовместимый тип
  // при неизвестном `TData`, хотя рантайм-поведение то же самое
  const settled = ref<Settled<TData> | null>(null) as Ref<Settled<TData> | null>

  let alive = true
  let controller: AbortController | undefined
  let activeToken: object | null = null

  const key = computed(() => `${nonce.value}\u0000${depsKey()}\u0000${search()}`)
  const active = computed(() => enabled() && !!loadOptions)

  watch(
    () => [active.value, key.value] as const,
    ([isActive, currentKey]) => {
      controller?.abort()
      activeToken = null
      const load = loadOptions
      if (!isActive || !load) {
        return
      }
      const localController = new AbortController()
      controller = localController
      const token = {}
      activeToken = token
      const searchValue = search()
      const currentDepsKey = depsKey()
      const depsSnapshot = deps()
      void callLoader(() => load(searchValue, { signal: localController.signal, deps: depsSnapshot })).then(
        (data) => {
          if (!alive || activeToken !== token) {
            return
          }
          settled.value = { key: currentKey, depsKey: currentDepsKey, data, error: null }
        },
        (error: unknown) => {
          if (!alive || activeToken !== token || localController.signal.aborted || isAbortError(error)) {
            return
          }
          settled.value = { key: currentKey, depsKey: currentDepsKey, data: undefined, error }
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

  const reload = (): void => {
    nonce.value += 1
  }

  const current = computed(() => settled.value?.key === key.value)
  // Прежние результаты остаются, пока идёт новый запрос по той же строке родителя; ответ другого родителя — нет
  const sameDeps = computed(() => settled.value?.depsKey === depsKey())

  return {
    data: computed(() => (sameDeps.value ? settled.value?.data : undefined)),
    isLoading: computed(() => active.value && !current.value),
    error: computed(() => (current.value ? settled.value?.error ?? null : null)),
    reload,
  }
}
