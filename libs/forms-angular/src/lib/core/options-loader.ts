import { DestroyRef, effect, inject, type Signal, signal } from '@angular/core'
import type { FieldDeps, LoadContext } from '@letar/forms-core/uikit'

/** Отказ из-за отмены запроса (`AbortController`) — не ошибка загрузки. Копия React `abort-utils.ts` —
 * см. то же примечание в `@letar/forms-vue` (`use-options-loader.ts`) про дублирование вместо кросс-импорта. */
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

export interface OptionsLoaderResult<TOption> {
  /** Опции текущей загрузки (см. `keepPrevious` — при смене `deps` может быть прежний список) */
  readonly options: Signal<readonly TOption[]>
  readonly loading: Signal<boolean>
  /** Ошибка последней загрузки (`null` — нет); её показывает компонент поля — свой текст и повтор через `reload` */
  readonly error: Signal<unknown>
  /** Загрузить заново с теми же `deps` */
  reload: () => void
}

export interface CreateOptionsLoaderOptions {
  /**
   * При смене `deps` показывать прежние опции, пока идёт запрос (по умолчанию `true`). Для зависимых полей —
   * `false`: опции прежнего родителя чужие, их нельзя выбрать. На `reload` прежние опции остаются всегда.
   */
  keepPrevious?: boolean
  /** Значения родителей (`dependsOn`, §18) — геттер; по умолчанию `() => {}` */
  fieldDeps?: () => FieldDeps
  /**
   * Загружать ли сейчас — геттер, по умолчанию `() => true`. Как и в React/Vue-версиях, выключение не
   * само по себе не очищает уже загруженные опции — только останавливает запрос (`loading: false`).
   */
  enabled?: () => boolean
}

const NO_OPTIONS: never[] = []
const NO_FIELD_DEPS: FieldDeps = {}

/**
 * Angular-эквивалент React `useOptionsLoader`/Vue `useOptionsLoader` — обычная фабрика сигналов
 * (вызывается один раз из конструктора компонента поля, внутри injection context, что требует
 * `inject(DestroyRef)`). Разовая загрузка списка промисом для Select/Combobox со статичными опциями,
 * отмена при смене `deps`/уничтожении, гонок нет (по токену объекта, не только по `signal.aborted`).
 *
 * Отслеживание `deps` — через `effect()`: `depsSignal` обычно сам `computed()` компонента поля
 * (например значения родителей из `dependsOn`), `effect` перезапускается сигнальным графом Angular
 * так же, как `watch` у Vue-версии — реактивность здесь не эмулируется вручную.
 */
export function createOptionsLoader<TOption>(
  load: (ctx: LoadContext) => Promise<TOption[]>,
  depsSignal: Signal<unknown>,
  { keepPrevious = true, fieldDeps = () => NO_FIELD_DEPS, enabled = () => true }: CreateOptionsLoaderOptions = {},
): OptionsLoaderResult<TOption> {
  const destroyRef = inject(DestroyRef)

  const optionsSignal = signal<readonly TOption[]>(NO_OPTIONS)
  const loadingSignal = signal(false)
  const errorSignal = signal<unknown>(null)
  const nonceSignal = signal(0)

  let alive = true
  let controller: AbortController | undefined
  let activeToken: object | null = null
  let settledDepsSignature: unknown

  function start(depsSignature: unknown): void {
    const localController = new AbortController()
    controller = localController
    const token = {}
    activeToken = token
    loadingSignal.set(true)
    const depsSnapshot = fieldDeps()
    void callLoader(() => load({ signal: localController.signal, deps: depsSnapshot })).then(
      (result) => {
        if (!alive || activeToken !== token) {
          return
        }
        optionsSignal.set(result)
        errorSignal.set(null)
        loadingSignal.set(false)
        settledDepsSignature = depsSignature
      },
      (err: unknown) => {
        if (!alive || activeToken !== token || localController.signal.aborted || isAbortError(err)) {
          return
        }
        if (!keepPrevious) {
          optionsSignal.set(NO_OPTIONS)
        }
        errorSignal.set(err)
        loadingSignal.set(false)
        settledDepsSignature = depsSignature
      },
    )
  }

  effect(() => {
    const depsSignature = depsSignal()
    // `enabled`/`fieldDeps` не сигналы (обычные геттеры, как параметры функции) — читаются внутри
    // `effect`, но граф зависимостей `effect()` строится по `depsSignal()` выше, это осознанно:
    // компонент поля обязан передать в `depsSignal` тот же источник, от которого зависят `enabled`/`fieldDeps`
    const isEnabled = enabled()
    nonceSignal()
    controller?.abort()
    activeToken = null
    if (!isEnabled) {
      loadingSignal.set(false)
      return
    }
    if (!keepPrevious && settledDepsSignature !== depsSignature) {
      optionsSignal.set(NO_OPTIONS)
    }
    start(depsSignature)
  })

  destroyRef.onDestroy(() => {
    alive = false
    controller?.abort()
  })

  const reload = (): void => {
    nonceSignal.update((value) => value + 1)
  }

  return {
    options: optionsSignal.asReadonly(),
    loading: loadingSignal.asReadonly(),
    error: errorSignal.asReadonly(),
    reload,
  }
}
