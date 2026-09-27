import type { FieldDeps, LoadContext } from '@letar/forms-core/uikit'
import { computed, type ComputedRef, onBeforeUnmount, ref, watch } from 'vue'

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

export interface UseOptionsLoaderResult<TOption> {
  /** Распыляется в поле: `<FieldSelect v-bind="fieldProps.value" />` (Этап 3–4) */
  fieldProps: ComputedRef<{ options: TOption[]; loading: boolean }>
  /** Ошибка последней загрузки (`null` — нет); её показывает приложение — свой текст и повтор через `reload` */
  error: ComputedRef<unknown>
  /** Загрузить заново с теми же `deps` */
  reload: () => void
}

export interface UseOptionsLoaderOptions {
  /**
   * При смене `deps` показывать прежние опции, пока идёт запрос (по умолчанию `true`). Для зависимых полей —
   * `false`: опции прежнего родителя чужие, их нельзя выбрать. На `reload` прежние опции остаются всегда.
   */
  keepPrevious?: boolean
  /** Значения родителей (`dependsOn`, §18) — геттер; по умолчанию `() => {}` */
  fieldDeps?: () => FieldDeps
  /**
   * Загружать ли сейчас — геттер, по умолчанию `() => true`. Зависимое поле с неготовыми родителями (§18.3)
   * не шлёт запрос (`loading: false`); последние загруженные опции (если были) остаются как есть — как и в
   * React-версии, `enabled` не участвует в выборе «прежние опции или пусто», только `keepPrevious`.
   */
  enabled?: () => boolean
}

const NO_OPTIONS: never[] = []
const NO_FIELD_DEPS: FieldDeps = {}

/**
 * Vue-эквивалент React `useOptionsLoader`: разовая загрузка списка промисом для Select/Combobox со
 * статичными опциями (server action, `fetch`, SDK). Запрос на смену `deps`/`reload`, отмена при смене
 * `deps` и при уничтожении композабла (`onBeforeUnmount`), гонок нет (применяется результат последнего
 * запроса — по токену объекта, а не только по `AbortController.signal.aborted`: не каждый `load` реально
 * проверяет сигнал), кэша нет.
 *
 * Отличие от React-версии — механика отслеживания `deps`: вместо `DependencyList` (массив значений,
 * сравниваемых `Object.is` React-рантаймом на каждый рендер) Vue-версия принимает `depsWatch` —
 * геттер-функцию, читающую те же реактивные источники, что и `load`; `watch` сам решает, когда
 * перезапускать эффект, и передаёт «сигнатуру» зависимостей (результат `depsWatch()`) как есть — без
 * дополнительной сериализации, потому что `watch` сравнивает результат по значению/ссылке сам.
 */
export function useOptionsLoader<TOption>(
  load: (ctx: LoadContext) => Promise<TOption[]>,
  depsWatch: () => unknown,
  { keepPrevious = true, fieldDeps = () => NO_FIELD_DEPS, enabled = () => true }: UseOptionsLoaderOptions = {},
): UseOptionsLoaderResult<TOption> {
  const options = ref<TOption[]>(NO_OPTIONS) as { value: TOption[] }
  const loading = ref(false)
  const error = ref<unknown>(null)
  const nonce = ref(0)

  let alive = true
  let controller: AbortController | undefined
  let activeToken: object | null = null
  let settledDepsSignature: unknown

  function start(depsSignature: unknown): void {
    const localController = new AbortController()
    controller = localController
    const token = {}
    activeToken = token
    loading.value = true
    const depsSnapshot = fieldDeps()
    void callLoader(() => load({ signal: localController.signal, deps: depsSnapshot })).then(
      (result) => {
        if (!alive || activeToken !== token) {
          return
        }
        options.value = result
        error.value = null
        loading.value = false
        settledDepsSignature = depsSignature
      },
      (err: unknown) => {
        if (!alive || activeToken !== token || localController.signal.aborted || isAbortError(err)) {
          return
        }
        if (!keepPrevious) {
          options.value = NO_OPTIONS
        }
        error.value = err
        loading.value = false
        settledDepsSignature = depsSignature
      },
    )
  }

  watch(
    () => [depsWatch(), nonce.value, enabled()] as const,
    ([depsSignature, , isEnabled]) => {
      controller?.abort()
      activeToken = null
      if (!isEnabled) {
        loading.value = false
        return
      }
      // Смена `deps` (не `reload`, не первый запуск) — прежние опции держим только с `keepPrevious`
      if (!keepPrevious && settledDepsSignature !== depsSignature) {
        options.value = NO_OPTIONS
      }
      start(depsSignature)
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

  const fieldProps = computed(() => ({ options: options.value, loading: loading.value }))

  return {
    fieldProps,
    error: computed(() => error.value),
    reload,
  }
}
