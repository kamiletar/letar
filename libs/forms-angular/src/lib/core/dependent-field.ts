import { computed, DestroyRef, effect, inject, type Signal, signal } from '@angular/core'
import {
  areDepsReady,
  buildDeps,
  type DependentsRegistry,
  type FieldDeps,
  getValueAtPath,
  isEmptyDepValue,
  type ResolvedDependency,
  resolveDependsOn,
  serializeDeps,
} from '@letar/forms-core/uikit'

export interface CreateFieldDepsOptions<TDeps extends FieldDeps = FieldDeps> {
  /** Поле(я), от которых зависит список — геттер (обычно статичный `@Input()`, но допускает смену) */
  dependsOn: () => string | readonly string[] | undefined
  /** Путь текущей группы (если у Angular-версии появится аналог `FormGroup`-групп); по умолчанию `() => null` */
  groupPath?: () => string | null
  /**
   * Снимок значений формы целиком — геттер, вызывается внутри `effect()`. Должен читать реактивный
   * источник (сигнал/`toSignal(form.valueChanges)`), иначе `deps`/`depsKey` не пересчитаются на правку
   * родителя — см. `syncParentValue()` в `field-cascading-select.component.ts` за образцом такого моста
   */
  values: () => unknown
  /** Родители «готовы»; по умолчанию все значения непустые */
  depsReady?: (deps: TDeps) => boolean
  /** Метка родителя для подсказок (`ui.title` схемы); по умолчанию — последний сегмент пути */
  getParentLabel?: (path: string, key: string) => string | undefined
}

export interface FieldDepsState<TDeps extends FieldDeps = FieldDeps> {
  readonly active: Signal<boolean>
  readonly deps: Signal<TDeps>
  readonly depsKey: Signal<string>
  readonly ready: Signal<boolean>
  readonly parentPaths: Signal<string[]>
  readonly parentLabels: Signal<string[]>
  readonly missingParentLabels: Signal<string[]>
}

const NO_ENTRIES: ResolvedDependency[] = []

function lastSegment(path: string): string {
  const index = path.lastIndexOf('.')
  return index === -1 ? path : path.slice(index + 1)
}

/**
 * Angular-эквивалент React `useFieldDeps`/Vue `useFieldDeps` — фабрика сигналов, вызывается из
 * конструктора компонента поля. Framework-free половина (`resolveDependsOn`/`buildDeps`/`serializeDeps`/
 * `areDepsReady`) — та же, что у React/Vue-версий, в `@letar/forms-core/uikit`.
 */
export function createFieldDeps<TDeps extends FieldDeps = FieldDeps>(
  options: CreateFieldDepsOptions<TDeps>,
): FieldDepsState<TDeps> {
  const { dependsOn, groupPath = () => null, values, depsReady, getParentLabel } = options

  const entries = computed<ResolvedDependency[]>(() => {
    const value = dependsOn()
    return value === undefined ? NO_ENTRIES : resolveDependsOn(value, groupPath())
  })
  const keys = computed(() => entries().map((entry) => entry.key))
  const deps = computed<TDeps>(
    () => (entries().length === 0 ? ({} as TDeps) : (buildDeps(entries(), values()) as TDeps)),
  )
  const depsKey = computed(() => serializeDeps(keys(), deps()))
  const ready = computed(() => areDepsReady(keys(), deps(), depsReady))

  const labelOf = (entry: ResolvedDependency) => getParentLabel?.(entry.path, entry.key) ?? lastSegment(entry.path)
  const parentPaths = computed(() => entries().map((entry) => entry.path))
  const parentLabels = computed(() => entries().map(labelOf))
  const missingParentLabels = computed(() => {
    const currentDeps = deps()
    const missing = depsReady
      ? (ready() ? [] : entries())
      : entries().filter((entry) => isEmptyDepValue(currentDeps[entry.key]))
    return missing.map(labelOf)
  })

  return {
    active: computed(() => entries().length > 0),
    deps,
    depsKey,
    ready,
    parentPaths,
    parentLabels,
    missingParentLabels,
  }
}

export interface CreateDependentFieldOptions<TDeps extends FieldDeps = FieldDeps>
  extends CreateFieldDepsOptions<TDeps>
{
  /** Полный путь этого поля в форме */
  fullPath: string
  /**
   * Реестр зависимых полей формы (`createDependentsRegistry()`), один на форму. `null`/`undefined` —
   * авточистка при смене родителя выключена
   */
  dependents?: DependentsRegistry | null
  /** Записать пустое значение в форму (`ctrl.setValue(...)`) */
  setValue: (value: unknown) => void
  /** Очищать значение, когда пользователь сменил родителя (по умолчанию `true`) */
  clearOnParentChange?: boolean
  /** Блокировать, пока родители не готовы (по умолчанию `true`) */
  disableWhenParentEmpty?: boolean
  /** Пустое значение, которое пишет очистка; по умолчанию `''` */
  emptyValue?: unknown
}

export interface DependentFieldState<TDeps extends FieldDeps = FieldDeps> extends FieldDepsState<TDeps> {
  readonly blocked: Signal<boolean>
  /** Последняя автоочистка (`null` — не было); `id` растёт с каждой очисткой */
  readonly cleared: Signal<{ id: number; parentLabel: string } | null>
}

/**
 * Angular-эквивалент React `useDependentField`/Vue `useDependentField` — обычная фабрика сигналов
 * (вызывается из конструктора компонента поля, внутри injection context — нужен `inject(DestroyRef)`).
 *
 * Отличие от React-версии — в вводных: вместо чтения контекста формы фабрика принимает
 * `values`/`dependents`/`setValue` явными параметрами (тот же выбор, что у Vue-версии) — не привязывает
 * готовую реактивную логику к тому, как именно Этап 3–4 продлит `FieldBase`/`FormRootService` под
 * `dependsOn`.
 */
export function createDependentField<TDeps extends FieldDeps = FieldDeps>(
  options: CreateDependentFieldOptions<TDeps>,
): DependentFieldState<TDeps> {
  const {
    fullPath,
    dependents = null,
    setValue,
    clearOnParentChange = true,
    disableWhenParentEmpty = true,
    emptyValue = '',
    ...depsOptions
  } = options
  const destroyRef = inject(DestroyRef)
  const state = createFieldDeps<TDeps>(depsOptions)
  const clearedSignal = signal<{ id: number; parentLabel: string } | null>(null)
  let clearedCounter = 0
  let unregister: (() => void) | undefined

  // Запоминаем актуальные значения родителей на каждую смену `depsKey`: `reset`/`patchValue`-без-эмита не
  // считаются правкой (та логика — на уровне `dependents.suppress()` в форме)
  effect(() => {
    const depsKey = state.depsKey()
    void depsKey
    if (!dependents) {
      return
    }
    const currentValues = depsOptions.values()
    state.parentPaths().forEach((path) => dependents.observe(path, getValueAtPath(currentValues, path)))
  })

  effect(() => {
    const parentPaths = state.parentPaths()
    unregister?.()
    unregister = undefined
    if (!dependents || !clearOnParentChange || parentPaths.length === 0) {
      return
    }
    try {
      unregister = dependents.register({
        childPath: fullPath,
        parentPaths,
        clear: ({ parentPath }) => {
          const current = getValueAtPath(depsOptions.values(), fullPath)
          if (isEmptyDepValue(current) || current === emptyValue) {
            return
          }
          setValue(emptyValue)
          clearedCounter += 1
          const index = parentPaths.indexOf(parentPath)
          clearedSignal.set({ id: clearedCounter, parentLabel: state.parentLabels()[index] ?? parentPath })
        },
      })
    } catch (error) {
      // Цикл `dependsOn` — ошибка разработчика: в dev/тестах громко, в production поле остаётся без автоочистки
      const env = process.env['NODE_ENV']
      if (env === 'development' || env === 'test') {
        throw error
      }
      console.error(error)
    }
  })

  destroyRef.onDestroy(() => {
    unregister?.()
  })

  return {
    ...state,
    blocked: computed(() => state.active() && !state.ready() && disableWhenParentEmpty),
    cleared: clearedSignal.asReadonly(),
  }
}
