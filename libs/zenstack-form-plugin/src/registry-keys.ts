import type { ModelInfo } from './types.js'

/**
 * Ключи реестра `createForm` (этап Е, `libs/forms/PLAN.md` §17): `@meta("form.fieldType", "Select.WorkCategory")`
 * ссылается на компонент, который приложение регистрирует в `extraSelects`/`lazySelects` (и т.д.) своего
 * инстанса `createForm`. Плагин видит только схему, поэтому разбирает синтаксис ключа, проверяет его и
 * пишет список ключей в `form-registry-keys.ts`.
 *
 * ⚠️ Регулярка намеренно своя, а не импорт `parseFieldRegistryType` из `@letar/forms-core`: плагин
 * публикуется в npm с пустыми `dependencies` и про `@letar/*` знать не должен. Одно правило в двух
 * местах, сверяется тестами (P1 здесь и E1 в `forms-core`).
 */

/** Пространства реестра, на которые можно сослаться из схемы (порядок — порядок в выходном файле) */
export const REGISTRY_NAMESPACES = ['Select', 'Combobox', 'Listbox'] as const

export type RegistryNamespace = (typeof REGISTRY_NAMESPACES)[number]

/** Грамматика ключа: имя должно быть допустимым свойством инстанса (`AppForm.Select.WorkCategory`) */
const REGISTRY_KEY_PATTERN = /^(Select|Combobox|Listbox)\.[A-Z][A-Za-z0-9]*$/

/** Ссылка на компонент реестра, разобранная из `form.fieldType` */
export interface FieldRegistryReference {
  namespace: RegistryNamespace
  key: string
}

/**
 * Разобрать `form.fieldType` как ключ реестра.
 * `null` — встроенный тип (camelCase без точки) или неверный синтаксис; различает их
 * {@link assertValidFieldType}.
 */
export function parseFieldRegistryType(fieldType: string): FieldRegistryReference | null {
  if (!REGISTRY_KEY_PATTERN.test(fieldType)) {
    return null
  }
  const dotIndex = fieldType.indexOf('.')
  return {
    namespace: fieldType.slice(0, dotIndex) as RegistryNamespace,
    key: fieldType.slice(dotIndex + 1),
  }
}

/**
 * Проверить `form.fieldType`: значение с точкой, не подходящее под грамматику ключа (`Foo.X`,
 * `Select.lower`, `Select.`), — ошибка generate. Встроенные типы (без точки) не проверяются:
 * их список открыт и живёт в `@letar/forms-core`.
 *
 * Ошибка, а не предупреждение: раньше ключей не было, значит существующие схемы такое значение
 * содержать не могут, а без проверки ключ молча становится текстовым полем.
 */
export function assertValidFieldType(modelName: string, fieldName: string, fieldType: string): void {
  if (!fieldType.includes('.') || parseFieldRegistryType(fieldType)) {
    return
  }

  const dotIndex = fieldType.indexOf('.')
  const namespace = fieldType.slice(0, dotIndex)
  const name = fieldType.slice(dotIndex + 1)

  const reason = (REGISTRY_NAMESPACES as readonly string[]).includes(namespace)
    ? `имя ключа «${name}» неверно: оно начинается с заглавной латинской буквы и состоит только из латинских букв и цифр`
    : `неизвестное пространство «${namespace}», допустимы ${REGISTRY_NAMESPACES.join(', ')}`

  throw new Error(
    `[zenstack-form-plugin] ${modelName}.${fieldName}: неверный ключ реестра @meta("form.fieldType", "${fieldType}") — `
      + `${reason}. Формат: ${REGISTRY_KEY_PATTERN.source}`,
  )
}

/** Данные для `form-registry-keys.ts` */
export interface RegistryKeysData {
  /** Уникальные отсортированные имена ключей по пространствам */
  keys: Record<RegistryNamespace, string[]>
  /** `'Select.WorkCategory'` → `['Work.categoryId', …]` в порядке объявления в схеме */
  usages: Record<string, string[]>
}

/**
 * Собрать ключи реестра по всем моделям схемы. Обход — по тем же моделям, что и генерация
 * (включая слитые импорты фрагментов `libs/*.zmodel`).
 */
export function collectRegistryKeys(models: readonly ModelInfo[]): RegistryKeysData {
  const keys: Record<RegistryNamespace, Set<string>> = {
    Select: new Set(),
    Combobox: new Set(),
    Listbox: new Set(),
  }
  const usages = new Map<string, string[]>()

  for (const model of models) {
    for (const field of model.fields) {
      const reference = field.formMeta.fieldType ? parseFieldRegistryType(field.formMeta.fieldType) : null
      if (!reference) {
        continue
      }
      keys[reference.namespace].add(reference.key)
      const usageKey = `${reference.namespace}.${reference.key}`
      const list = usages.get(usageKey) ?? []
      list.push(`${model.name}.${field.name}`)
      usages.set(usageKey, list)
    }
  }

  const sortedUsages: Record<string, string[]> = {}
  for (const namespace of REGISTRY_NAMESPACES) {
    for (const key of [...keys[namespace]].sort()) {
      sortedUsages[`${namespace}.${key}`] = usages.get(`${namespace}.${key}`) ?? []
    }
  }

  return {
    keys: {
      Select: [...keys.Select].sort(),
      Combobox: [...keys.Combobox].sort(),
      Listbox: [...keys.Listbox].sort(),
    },
    usages: sortedUsages,
  }
}

function renderStringArray(items: readonly string[]): string {
  return `[${items.map((item) => `'${item}'`).join(', ')}]`
}

/**
 * Код `<output>/form-registry-keys.ts` (§17.4). Без импортов: плагин не зависит от `@letar/forms`,
 * файл компилируется в любом приложении. Пустые пространства — `[]`.
 */
export function generateRegistryKeysCode(data: RegistryKeysData): string {
  const keyLines = REGISTRY_NAMESPACES.map((namespace) => `  ${namespace}: ${renderStringArray(data.keys[namespace])},`)

  const usageEntries = Object.entries(data.usages)
  const usagesLiteral = usageEntries.length === 0
    ? '{} as const'
    : `{\n${
      usageEntries.map(([usageKey, places]) => `  '${usageKey}': ${renderStringArray(places)},`).join('\n')
    }\n} as const`

  return `// AUTO-GENERATED by @letar/zenstack-form-plugin
// DO NOT EDIT MANUALLY

/** Ключи реестра createForm, на которые ссылается schema.zmodel */
export const formRegistryKeys = {
${keyLines.join('\n')}
} as const

/** Ключи \`Select.*\`, использованные в схеме */
export type FormSelectKey = (typeof formRegistryKeys.Select)[number]
/** Ключи \`Combobox.*\`, использованные в схеме */
export type FormComboboxKey = (typeof formRegistryKeys.Combobox)[number]
/** Ключи \`Listbox.*\`, использованные в схеме */
export type FormListboxKey = (typeof formRegistryKeys.Listbox)[number]

/** Где используется ключ: для сообщений об ошибках и ревью */
export const formRegistryUsages = ${usagesLiteral}
`
}

/**
 * Предупреждения по `form.relation.*` и ключам реестра (не ошибки: старые схемы не должны ронять generate).
 *
 * @param models  информация о моделях схемы
 * @param schemaFields  имя модели → имена всех её полей (с учётом миксинов); ключи — все модели схемы
 */
export function findRegistryWarnings(
  models: readonly ModelInfo[],
  schemaFields: ReadonlyMap<string, ReadonlySet<string>>,
): string[] {
  const warnings: string[] = []
  const prefix = '[zenstack-form-plugin]'

  for (const model of models) {
    for (const field of model.fields) {
      const { fieldType, relation } = field.formMeta
      if (!relation) {
        continue
      }
      const where = `${model.name}.${field.name}`

      // Ключ реестра побеждает: компонент грузит данные сам, relation игнорируется
      if (fieldType && parseFieldRegistryType(fieldType)) {
        warnings.push(
          `${prefix} ${where}: заданы ключ реестра «${fieldType}» и @meta("form.relation.*") — `
            + `побеждает ключ, relation игнорируется. Уберите form.relation.* или ключ.`,
        )
        continue
      }

      // Целевая модель: явная form.relation.model, иначе тип поля (поле-ссылка на модель)
      const targetName = relation.model ?? (schemaFields.has(field.type) ? field.type : undefined)
      if (relation.model !== undefined && !schemaFields.has(relation.model)) {
        warnings.push(
          `${prefix} ${where}: @meta("form.relation.model", "${relation.model}") — в схеме нет модели «${relation.model}».`,
        )
        continue
      }
      const targetFields = targetName ? schemaFields.get(targetName) : undefined
      if (!targetName || !targetFields) {
        continue
      }

      const checks: Array<['labelField' | 'descriptionField', string | undefined]> = [
        ['labelField', relation.labelField],
        ['descriptionField', relation.descriptionField],
      ]
      for (const [key, value] of checks) {
        if (typeof value === 'string' && !targetFields.has(value)) {
          warnings.push(
            `${prefix} ${where}: @meta("form.relation.${key}", "${value}") — у модели «${targetName}» нет поля «${value}».`,
          )
        }
      }
    }
  }

  return warnings
}
