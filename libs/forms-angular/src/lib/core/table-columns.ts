import { type SchemaFieldInfo, traverseSchema } from '@letar/forms-core/schema'
import type { CellFieldType, ResolvedColumn, TableColumnDef } from '@letar/forms-core/table'

/** Маппинг zodType → CellFieldType. Порт `mapZodType` (`@letar/forms-vue`, `table-columns.ts`). */
function mapZodType(zodType: string): CellFieldType {
  switch (zodType) {
    case 'string':
      return 'string'
    case 'number':
    case 'bigint':
      return 'number'
    case 'boolean':
      return 'boolean'
    case 'date':
      return 'date'
    case 'enum':
    case 'literal':
      return 'enum'
    default:
      return 'unknown'
  }
}

/** Найти поле по dot-path в дереве `SchemaFieldInfo`. */
function findFieldByPath(fields: SchemaFieldInfo[], path: string): SchemaFieldInfo | undefined {
  const parts = path.split('.')
  let current = fields
  for (let i = 0; i < parts.length; i++) {
    const found = current.find((f) => f.name === parts[i])
    if (!found) {
      return undefined
    }
    if (i === parts.length - 1) {
      return found
    }
    if (found.children) {
      current = found.children
    } else {
      return undefined
    }
  }
  return undefined
}

/** Получить `SchemaFieldInfo[]` из массива array-поля. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Zod-схема без публичного типа обхода
function getArrayElementFields(schema: any, arrayPath: string): SchemaFieldInfo[] {
  const allFields = traverseSchema(schema)
  const field = findFieldByPath(allFields, arrayPath)
  if (field?.zodType === 'array' && field.element?.children) {
    return field.element.children
  }
  return []
}

/** camelCase → Title Case */
function camelToTitle(str: string): string {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim()
}

/** Создать `ResolvedColumn` из `SchemaFieldInfo` (авто-колонка) */
function fieldInfoToColumn(info: SchemaFieldInfo): ResolvedColumn {
  return {
    name: info.name,
    label: info.ui?.title ?? camelToTitle(info.name),
    width: 'auto',
    align: mapZodType(info.zodType) === 'number' ? 'right' : 'left',
    fieldType: mapZodType(info.zodType),
    readOnly: false,
    required: info.required,
    enumValues: info.enumValues,
    placeholder: info.ui?.placeholder,
  }
}

/** Мерж пользовательских `TableColumnDef` с авто-колонками из schema */
function mergeColumns(userColumns: TableColumnDef[], schemaColumns: ResolvedColumn[]): ResolvedColumn[] {
  return userColumns
    .filter((col) => !col.hidden)
    .map((col) => {
      const schemaCol = schemaColumns.find((sc) => sc.name === col.name)

      if (col.computed) {
        return {
          name: col.name,
          label: col.label ?? camelToTitle(col.name),
          width: col.width ?? 'auto',
          align: col.align ?? 'right',
          fieldType: 'number' as CellFieldType,
          computed: col.computed,
          format: col.format,
          readOnly: true,
          required: false,
        }
      }

      return {
        name: col.name,
        label: col.label ?? schemaCol?.label ?? camelToTitle(col.name),
        width: col.width ?? schemaCol?.width ?? 'auto',
        align: col.align ?? schemaCol?.align ?? 'left',
        fieldType: schemaCol?.fieldType ?? 'string',
        readOnly: col.readOnly ?? schemaCol?.readOnly ?? false,
        required: schemaCol?.required ?? false,
        enumValues: schemaCol?.enumValues,
        placeholder: schemaCol?.placeholder,
        format: col.format,
      }
    })
}

/**
 * Резолвит колонки таблицы из schema и/или пользовательских определений — точный порт
 * `resolveTableColumns` (`@letar/forms-vue`, `core/table-columns.ts`), логика framework-free
 * (использует только `traverseSchema`/`getZodConstraints` из `@letar/forms-core`), поэтому
 * скопирована без изменений, а не переиспользована напрямую — `@letar/forms-vue` не публикует
 * этот модуль через свои `exports` (внутренний файл пакета).
 */
export function resolveTableColumns(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Zod-схема без публичного типа обхода
  schema: any,
  arrayPath: string,
  userColumns?: TableColumnDef[],
): ResolvedColumn[] {
  const schemaFields = getArrayElementFields(schema, arrayPath)
  const autoColumns = schemaFields.map(fieldInfoToColumn)

  if (!userColumns || userColumns.length === 0) {
    return autoColumns
  }

  return mergeColumns(userColumns, autoColumns)
}
