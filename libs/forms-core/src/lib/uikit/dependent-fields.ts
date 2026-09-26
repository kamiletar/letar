/**
 * Зависимые (каскадные) поля выбора — этап З программы `forms-select-render-onupdate` (§18 плана).
 * Framework-free: типы, разбор `dependsOn`, ключ зависимостей и реестр зависимостей формы.
 * Подписка на значения родителей и рисование — в `forms-react` и скинах.
 */

/** Значения родителей по ключам из `dependsOn` (ключ — строка как написана, без ведущего «/») */
export type FieldDeps = Readonly<Record<string, unknown>>

/** Общие пропсы Select и Combobox, зависящих от других полей формы */
export interface DependentFieldProps<TDeps extends FieldDeps = FieldDeps> {
  /**
   * Поле(я), от которых зависит список. Путь — относительно текущей группы (как у `name`);
   * ведущий «/» — от корня формы: `dependsOn="/countryId"` из строки массива.
   */
  dependsOn?: string | readonly string[]
  /** Родители «готовы» — можно грузить и выбирать. По умолчанию: все значения непустые */
  depsReady?: (deps: TDeps) => boolean
  /** Очищать значение, когда пользователь сменил родителя (по умолчанию `true`) */
  clearOnParentChange?: boolean
  /** Блокировать, пока родители не готовы (по умолчанию `true`) */
  disableWhenParentEmpty?: boolean
  /** Текст в заблокированном поле. По умолчанию — «Сначала выберите «{метка родителя}»» (i18n) */
  placeholderWhenDisabled?: string
}

/** Один родитель: `key` — под ним значение лежит в `deps`, `path` — полный путь поля в форме */
export interface ResolvedDependency {
  key: string
  path: string
}

/** «Пусто» для зависимостей: `undefined`, `null`, `''`, пустой массив. `0` и `false` — значения */
export function isEmptyDepValue(value: unknown): boolean {
  return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)
}

/**
 * Разбор `dependsOn` в пары «ключ — полный путь». Путь без ведущего «/» — относительно группы поля
 * (`countryId` в строке `items.3` → `items.3.countryId`), с «/» — от корня формы. Одинаковые ключи (`a` и `/a`)
 * в одном списке — ошибка: в `deps` они заняли бы одну ячейку.
 */
export function resolveDependsOn(
  dependsOn: string | readonly string[] | undefined,
  groupPath: string | null | undefined,
): ResolvedDependency[] {
  if (dependsOn === undefined) {
    return []
  }
  const list = typeof dependsOn === 'string' ? [dependsOn] : dependsOn
  const result: ResolvedDependency[] = []
  const seen = new Set<string>()
  for (const raw of list) {
    const fromRoot = raw.startsWith('/')
    const key = fromRoot ? raw.slice(1) : raw
    if (!key) {
      throw new Error('[@letar/forms] dependsOn: пустое имя поля')
    }
    if (seen.has(key)) {
      throw new Error(
        `[@letar/forms] dependsOn: поле «${key}» указано дважды (относительный путь и «/${key}» дают один ключ в deps)`,
      )
    }
    seen.add(key)
    result.push({ key, path: fromRoot || !groupPath ? key : `${groupPath}.${key}` })
  }
  return result
}

/** Значение по пути вида `items.0.regionId` */
export function getValueAtPath(values: unknown, path: string): unknown {
  let current: unknown = values
  for (const part of path.split('.')) {
    if (current !== null && typeof current === 'object') {
      current = (current as Record<string, unknown>)[part]
    } else {
      return undefined
    }
  }
  return current
}

/** `deps` из значений формы: по ключам `dependsOn` */
export function buildDeps(entries: readonly ResolvedDependency[], values: unknown): FieldDeps {
  const deps: Record<string, unknown> = {}
  for (const { key, path } of entries) {
    deps[key] = getValueAtPath(values, path)
  }
  return deps
}

/**
 * Ключ зависимостей — по нему поле понимает, что список другого родителя: `JSON.stringify` значений в порядке
 * `keys`. `undefined` и `null` — одно и то же; число и строка различаются (`1` ≠ `'1'`).
 */
export function serializeDeps(keys: readonly string[], deps: FieldDeps): string {
  return JSON.stringify(keys.map((key) => deps[key] ?? null))
}

/** Родители готовы: своя `depsReady` либо «все значения непустые». Без зависимостей — всегда готово */
export function areDepsReady<TDeps extends FieldDeps>(
  keys: readonly string[],
  deps: TDeps,
  depsReady?: (deps: TDeps) => boolean,
): boolean {
  if (keys.length === 0) {
    return true
  }
  if (depsReady) {
    return depsReady(deps)
  }
  return keys.every((key) => !isEmptyDepValue(deps[key]))
}

export interface DependentRegistration {
  /** Полный путь зависимого поля */
  childPath: string
  /** Полные пути родителей */
  parentPaths: readonly string[]
  /**
   * Очистить зависимое поле: вызывается только когда правка родителя реальная (не гидратация, не `suppress`).
   * Запись пустого значения — дело поля (`''` или `null`), оно же само решает, есть ли что стирать.
   */
  clear: (cause: { parentPath: string }) => void
}

export interface DependentsRegistry {
  /** Зарегистрировать зависимое поле; возвращает функцию «снять». Цикл (в т. ч. поле от себя) — ошибка */
  register: (registration: DependentRegistration) => () => void
  /** Запомнить текущее значение родителя (после `reset`/`update`/рендера) — без очистки зависимых */
  observe: (path: string, value: unknown) => void
  /** Для form-level `listeners.onChange`: значение поля `path` записано правкой (`setFieldValue`/`handleChange`) */
  handleFieldChange: (path: string, value: unknown) => void
  /** Выполнить запись без очистки зависимых (восстановление черновика, «страна и город разом») */
  suppress: <T>(fn: () => T) => T
  isSuppressed: () => boolean
}

function valueKey(value: unknown): string {
  return JSON.stringify(value ?? null) ?? 'undefined'
}

export function createDependentsRegistry(): DependentsRegistry {
  const registrations = new Set<DependentRegistration>()
  // Последнее известное значение родителей: сравниваем с ним, чтобы отличить смену от повторной записи того же
  const seen = new Map<string, string>()
  let suppressDepth = 0

  const reaches = (from: string, target: string, visited = new Set<string>()): boolean => {
    if (from === target) {
      return true
    }
    if (visited.has(from)) {
      return false
    }
    visited.add(from)
    for (const reg of registrations) {
      if (reg.parentPaths.includes(from) && reaches(reg.childPath, target, visited)) {
        return true
      }
    }
    return false
  }

  return {
    register(registration) {
      for (const parent of registration.parentPaths) {
        // Родитель уже достижим из ребёнка — новая связь замкнёт цикл (в том числе «поле от самого себя»)
        if (reaches(registration.childPath, parent)) {
          throw new Error(
            `[@letar/forms] dependsOn: циклическая зависимость «${registration.childPath}» ↔ «${parent}»`,
          )
        }
      }
      registrations.add(registration)
      return () => {
        registrations.delete(registration)
      }
    },

    observe(path, value) {
      seen.set(path, valueKey(value))
    },

    handleFieldChange(path, value) {
      const next = valueKey(value)
      const changed = seen.get(path) !== next
      seen.set(path, next)
      if (!changed || suppressDepth > 0) {
        return
      }
      for (const reg of [...registrations]) {
        if (reg.parentPaths.includes(path)) {
          reg.clear({ parentPath: path })
        }
      }
    },

    suppress(fn) {
      suppressDepth += 1
      try {
        return fn()
      } finally {
        suppressDepth -= 1
      }
    },

    isSuppressed: () => suppressDepth > 0,
  }
}
