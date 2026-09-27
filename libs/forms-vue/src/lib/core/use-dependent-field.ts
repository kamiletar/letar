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
import { computed, type ComputedRef, onBeforeUnmount, type Ref, ref, watch } from 'vue'

export interface UseFieldDepsOptions<TDeps extends FieldDeps = FieldDeps> {
  /** Поле(я), от которых зависит список — геттер (обычно статичный проп поля, но допускает смену) */
  dependsOn: () => string | readonly string[] | undefined
  /** Путь текущей `FormGroup` (`useFormGroup()?.name`) — геттер; по умолчанию `() => null` */
  groupPath?: () => string | null
  /**
   * Снимок значений формы целиком — геттер. Должен быть реактивным (обычно обёртка над
   * `form.useStore((state) => state.values)`, как в `field-cascading-select.ts`), иначе `deps`/`depsKey`
   * не пересчитаются на правку родителя
   */
  values: () => unknown
  /** Родители «готовы»; по умолчанию все значения непустые */
  depsReady?: (deps: TDeps) => boolean
  /** Метка родителя для подсказок (`ui.title` схемы); по умолчанию — последний сегмент пути */
  getParentLabel?: (path: string, key: string) => string | undefined
}

export interface FieldDepsState<TDeps extends FieldDeps = FieldDeps> {
  /** Есть ли `dependsOn` вообще */
  active: ComputedRef<boolean>
  /** Значения родителей под ключами из `dependsOn`; без `dependsOn` — `{}` */
  deps: ComputedRef<TDeps>
  /** Ключ зависимостей (`serializeDeps`): меняется, когда меняется значение любого родителя */
  depsKey: ComputedRef<string>
  /** Родители «готовы»: можно грузить список и выбирать */
  ready: ComputedRef<boolean>
  /** Полные пути родителей — как в реестре зависимостей формы */
  parentPaths: ComputedRef<string[]>
  /** Метки всех родителей */
  parentLabels: ComputedRef<string[]>
  /** Метки родителей, из-за которых поле не готово (для «Сначала выберите «Страна»») */
  missingParentLabels: ComputedRef<string[]>
}

const NO_ENTRIES: ResolvedDependency[] = []

function lastSegment(path: string): string {
  const index = path.lastIndexOf('.')
  return index === -1 ? path : path.slice(index + 1)
}

/**
 * Vue-эквивалент React `useFieldDeps`: подписка на значения родителей `dependsOn` (§18.2) — `deps`, ключ
 * зависимостей и готовность. Путь — относительно группы поля, с ведущим «/» — от корня формы. Всё
 * возвращаемое — `computed`, реактивность приходит от того, что `values()`/`dependsOn()`/`groupPath()`
 * читают внутри себя (обычно `ref.value` или `form.useStore`), а не от собственного состояния композабла.
 */
export function useFieldDeps<TDeps extends FieldDeps = FieldDeps>(
  options: UseFieldDepsOptions<TDeps>,
): FieldDepsState<TDeps> {
  const { dependsOn, groupPath = () => null, values, depsReady, getParentLabel } = options

  const entries = computed<ResolvedDependency[]>(() => {
    const value = dependsOn()
    return value === undefined ? NO_ENTRIES : resolveDependsOn(value, groupPath())
  })
  const keys = computed(() => entries.value.map((entry) => entry.key))
  const deps = computed<TDeps>(
    () => (entries.value.length === 0 ? ({} as TDeps) : (buildDeps(entries.value, values()) as TDeps)),
  )
  const depsKey = computed(() => serializeDeps(keys.value, deps.value))
  const ready = computed(() => areDepsReady(keys.value, deps.value, depsReady))

  const labelOf = (entry: ResolvedDependency) => getParentLabel?.(entry.path, entry.key) ?? lastSegment(entry.path)
  const parentPaths = computed(() => entries.value.map((entry) => entry.path))
  const parentLabels = computed(() => entries.value.map(labelOf))
  const missingParentLabels = computed(() => {
    const currentDeps = deps.value
    const missing = depsReady
      ? (ready.value ? [] : entries.value)
      : entries.value.filter((entry) => isEmptyDepValue(currentDeps[entry.key]))
    return missing.map(labelOf)
  })

  return {
    active: computed(() => entries.value.length > 0),
    deps,
    depsKey,
    ready,
    parentPaths,
    parentLabels,
    missingParentLabels,
  }
}

export interface UseDependentFieldOptions<TDeps extends FieldDeps = FieldDeps> extends UseFieldDepsOptions<TDeps> {
  /** Полный путь этого поля в форме */
  fullPath: string
  /**
   * Реестр зависимых полей формы (`createDependentsRegistry()` из `@letar/forms-core/uikit`), один на
   * форму. `null`/`undefined` — авточистка при смене родителя выключена (поле ведёт себя как вне формы)
   */
  dependents?: DependentsRegistry | null
  /** Записать пустое значение в форму (`form.setFieldValue(fullPath, ...)`) */
  setValue: (value: unknown) => void
  /** Очищать значение, когда пользователь сменил родителя (по умолчанию `true`) */
  clearOnParentChange?: boolean
  /** Блокировать, пока родители не готовы (по умолчанию `true`) */
  disableWhenParentEmpty?: boolean
  /** Пустое значение, которое пишет очистка; по умолчанию `''` */
  emptyValue?: unknown
}

export interface DependentFieldState<TDeps extends FieldDeps = FieldDeps> extends FieldDepsState<TDeps> {
  /** Поле надо заблокировать: `dependsOn` задан, родители не готовы, блокировка не отключена */
  blocked: ComputedRef<boolean>
  /**
   * Последняя автоочистка (`null` — не было): по ней скин объявляет «Поле очищено: изменилось поле
   * «Страна»». `id` растёт с каждой очисткой — смена объекта гарантирует повторное объявление
   */
  cleared: Ref<{ id: number; parentLabel: string } | null>
}

/**
 * Vue-эквивалент React `useDependentField`: зависимое поле формы (§18) — `useFieldDeps` + регистрация в
 * реестре зависимостей формы (очистка по **правке** родителя — `setFieldValue`/`handleChange` вызовет
 * `dependents.handleFieldChange(path, value)` где-то на уровне формы; гидратация, `reset`, восстановление
 * черновика поле не трогают, если тот код формы использует `dependents.suppress(...)`).
 *
 * Отличие от React-версии — в вводных: вместо чтения `useDeclarativeFormOptional()`/`useFormGroup()`
 * из общего контекста React-версия хука привязана к конкретной форме `@letar/forms-react`, а здесь
 * композабл принимает `values`/`dependents`/`setValue` явными параметрами. Так он не зависит от того,
 * как именно Этап 3–4 расширит `AppFormContext` (`@letar/forms-vue/core/form-context.ts`) под `dependsOn` —
 * контракт минимальный и вызывающая сторона (будущий `FieldSelect`) сама решает, откуда брать значения.
 */
export function useDependentField<TDeps extends FieldDeps = FieldDeps>(
  options: UseDependentFieldOptions<TDeps>,
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
  const state = useFieldDeps<TDeps>(depsOptions)
  const cleared = ref<{ id: number; parentLabel: string } | null>(null)
  let clearedCounter = 0
  let unregister: (() => void) | undefined

  // Запоминаем актуальные значения родителей после каждого изменения `deps`: `reset`/`update` не считаются
  // правкой (та логика — на уровне `dependents.suppress()` в форме), а сравнивать «правку» надо с тем, что
  // видел пользователь
  watch(
    () => state.depsKey.value,
    () => {
      if (!dependents) {
        return
      }
      const currentValues = depsOptions.values()
      state.parentPaths.value.forEach((path) => dependents.observe(path, getValueAtPath(currentValues, path)))
    },
    { immediate: true },
  )

  watch(
    () => state.parentPaths.value.join('\u0000'),
    () => {
      unregister?.()
      unregister = undefined
      const parentPaths = state.parentPaths.value
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
            // Значение стирается тем же способом, что и собственной кнопкой очистки поля
            setValue(emptyValue)
            clearedCounter += 1
            const index = parentPaths.indexOf(parentPath)
            cleared.value = { id: clearedCounter, parentLabel: state.parentLabels.value[index] ?? parentPath }
          },
        })
      } catch (error) {
        // Цикл `dependsOn` — ошибка разработчика: в dev/тестах громко, в production поле остаётся без автоочистки
        const env = process.env.NODE_ENV
        if (env === 'development' || env === 'test') {
          throw error
        }
        console.error(error)
      }
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    unregister?.()
  })

  return {
    ...state,
    blocked: computed(() => state.active.value && !state.ready.value && disableWhenParentEmpty),
    cleared,
  }
}
