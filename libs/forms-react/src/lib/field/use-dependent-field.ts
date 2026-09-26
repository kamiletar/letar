'use client'

import {
  areDepsReady,
  buildDeps,
  type FieldDeps,
  getValueAtPath,
  isEmptyDepValue,
  type ResolvedDependency,
  resolveDependsOn,
  serializeDeps,
} from '@letar/forms-core/uikit'
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useDeclarativeFormOptional } from '../context/form-context'
import { useFormGroup } from '../context/form-group'

export interface UseFieldDepsOptions<TDeps extends FieldDeps = FieldDeps> {
  /** Готовность родителей; по умолчанию все значения непустые */
  depsReady?: (deps: TDeps) => boolean
  /** Метка родителя для подсказок (`ui.title` схемы); по умолчанию — последний сегмент имени поля */
  getParentLabel?: (path: string, key: string) => string | undefined
}

export interface FieldDepsState<TDeps extends FieldDeps = FieldDeps> {
  /** Есть ли `dependsOn` вообще */
  active: boolean
  /** Значения родителей под ключами из `dependsOn`; без `dependsOn` — `{}` */
  deps: TDeps
  /** Ключ зависимостей (`serializeDeps`): меняется, когда меняется значение любого родителя */
  depsKey: string
  /** Родители «готовы»: можно грузить список и выбирать */
  ready: boolean
  /** Полные пути родителей — как в реестре зависимостей формы */
  parentPaths: string[]
  /** Метки всех родителей */
  parentLabels: string[]
  /** Метки родителей, из-за которых поле не готово (для «Сначала выберите «Страна»») */
  missingParentLabels: string[]
}

const NO_ENTRIES: ResolvedDependency[] = []

function lastSegment(path: string): string {
  const index = path.lastIndexOf('.')
  return index === -1 ? path : path.slice(index + 1)
}

/**
 * Подписка на значения родителей `dependsOn` (§18.2): `deps`, ключ зависимостей и готовность. Путь — относительно
 * группы поля (строка массива), с ведущим «/» — от корня формы. Нужен и компонентам реестра `createForm`, которые
 * не оборачивают `Field.Select`/`Field.Combobox`. Вне формы (или без `dependsOn`) возвращает пустое состояние.
 */
export function useFieldDeps<TDeps extends FieldDeps = FieldDeps>(
  dependsOn: string | readonly string[] | undefined,
  options: UseFieldDepsOptions<TDeps> = {},
): FieldDepsState<TDeps> {
  const context = useDeclarativeFormOptional()
  const group = useFormGroup()
  const groupPath = group?.name ?? null
  const shape = JSON.stringify([dependsOn ?? null, groupPath])
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `shape` — сериализованные `dependsOn` и путь группы
  const entries = useMemo(() => (dependsOn === undefined ? NO_ENTRIES : resolveDependsOn(dependsOn, groupPath)), [
    shape,
  ])
  const keys = useMemo(() => entries.map((entry) => entry.key), [entries])

  const form = context?.form
  // Ключ зависимостей — строка, поэтому снимок стабилен и лишних рендеров нет
  const subscribe = useCallback(
    (callback: () => void) => {
      if (!form) {
        return () => undefined
      }
      const subscription = form.store.subscribe(callback)
      // Версии @tanstack/store: `subscribe` возвращает либо функцию, либо `{ unsubscribe }`
      return typeof subscription === 'function' ? subscription : () => subscription.unsubscribe()
    },
    [form],
  )
  const getSnapshot = useCallback(
    () => (form ? serializeDeps(keys, buildDeps(entries, form.state.values)) : serializeDeps(keys, {})),
    [form, keys, entries],
  )
  const depsKey = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const getParentLabel = options.getParentLabel
  const depsReady = options.depsReady
  return useMemo(() => {
    const deps = (entries.length === 0 ? {} : buildDeps(entries, form?.state.values)) as TDeps
    const ready = areDepsReady(keys, deps, depsReady)
    const labelOf = (entry: ResolvedDependency) => getParentLabel?.(entry.path, entry.key) ?? lastSegment(entry.path)
    const missing = depsReady
      ? (ready ? [] : entries)
      : entries.filter((entry) => isEmptyDepValue(deps[entry.key]))
    return {
      active: entries.length > 0,
      deps,
      depsKey,
      ready,
      parentPaths: entries.map((entry) => entry.path),
      parentLabels: entries.map(labelOf),
      missingParentLabels: missing.map(labelOf),
    }
    // `deps` пересчитываем строго по `depsKey`: значения читаются из формы в момент смены ключа
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depsKey, entries, keys, form, getParentLabel, depsReady])
}

export interface UseDependentFieldOptions<TDeps extends FieldDeps = FieldDeps> extends UseFieldDepsOptions<TDeps> {
  /** Полный путь этого поля в форме */
  fullPath: string
  dependsOn?: string | readonly string[]
  /** Очищать значение, когда пользователь сменил родителя (по умолчанию `true`) */
  clearOnParentChange?: boolean
  /** Блокировать, пока родители не готовы (по умолчанию `true`) */
  disableWhenParentEmpty?: boolean
  /** Пустое значение, которое пишет очистка: то же, что пишет собственная кнопка очистки поля; по умолчанию `''` */
  emptyValue?: unknown
}

export interface DependentFieldState<TDeps extends FieldDeps = FieldDeps> extends FieldDepsState<TDeps> {
  /** Поле надо заблокировать: `dependsOn` задан, родители не готовы, блокировка не отключена */
  blocked: boolean
  /**
   * Последняя автоочистка (`null` — не было): по ней скин объявляет «Поле очищено: изменилось поле «Страна»».
   * `id` растёт с каждой очисткой — смена объекта гарантирует повторное объявление
   */
  cleared: { id: number; parentLabel: string } | null
}

/**
 * Зависимое поле формы (§18): `useFieldDeps` + регистрация в реестре зависимостей формы — очистка по **правке**
 * родителя (`setFieldValue`/`handleChange`); гидратация, `reset`, восстановление черновика и `update()` поле не
 * трогают. Регистрация снимается при размонтировании. Скин использует `deps`/`depsKey` для загрузчиков,
 * `blocked` — для `disabled`, `cleared` — для live-области.
 */
export function useDependentField<TDeps extends FieldDeps = FieldDeps>(
  options: UseDependentFieldOptions<TDeps>,
): DependentFieldState<TDeps> {
  const {
    fullPath,
    dependsOn,
    clearOnParentChange = true,
    disableWhenParentEmpty = true,
    emptyValue = '',
    ...depsOptions
  } = options
  const context = useDeclarativeFormOptional()
  const form = context?.form
  const dependents = context?.dependents
  const state = useFieldDeps<TDeps>(dependsOn, depsOptions)
  const [cleared, setCleared] = useState<DependentFieldState['cleared']>(null)
  const clearedCounter = useRef(0)

  // Запоминаем актуальные значения родителей после каждого рендера: `reset`/`update` листенеры не зовут,
  // а сравнивать «правку» надо с тем, что видел пользователь
  useEffect(() => {
    if (!dependents) {
      return
    }
    state.parentPaths.forEach((path) => dependents.observe(path, getValueAtPath(form?.state.values, path)))
  }, [dependents, form, state.depsKey, state.parentPaths])

  const emptyRef = useRef(emptyValue)
  const labelsRef = useRef(state.parentLabels)
  useEffect(() => {
    emptyRef.current = emptyValue
    labelsRef.current = state.parentLabels
  })

  const parentKey = state.parentPaths.join('\u0000')
  useEffect(() => {
    if (!dependents || !form || !clearOnParentChange || state.parentPaths.length === 0) {
      return
    }
    const parentPaths = state.parentPaths
    try {
      return dependents.register({
        childPath: fullPath,
        parentPaths,
        clear: ({ parentPath }) => {
          const current = getValueAtPath(form.state.values, fullPath)
          if (isEmptyDepValue(current) || current === emptyRef.current) {
            return
          }
          // Значение стирается тем же способом, что и собственной кнопкой очистки, но без ошибки «обязательное
          // поле» на пустом (поле не тронуто) и без листенеров-подавления: цепочка внуков очищается тем же путём
          form.setFieldValue(fullPath, emptyRef.current, { dontUpdateMeta: true, dontValidate: true })
          clearedCounter.current += 1
          const index = parentPaths.indexOf(parentPath)
          setCleared({ id: clearedCounter.current, parentLabel: labelsRef.current[index] ?? parentPath })
        },
      })
    } catch (error) {
      // Цикл `dependsOn` — ошибка разработчика: в dev/тестах громко, в production поле остаётся без автоочистки
      const env = process.env.NODE_ENV
      if (env === 'development' || env === 'test') {
        throw error
      }
      console.error(error)
      return
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `parentKey` — сериализованные пути родителей
  }, [dependents, form, fullPath, clearOnParentChange, parentKey])

  return {
    ...state,
    blocked: state.active && !state.ready && disableWhenParentEmpty,
    cleared,
  }
}
