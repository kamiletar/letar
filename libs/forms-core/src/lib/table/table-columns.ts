import { type SchemaFieldInfo, traverseSchema } from '../schema'
import type { CellFieldType, ResolvedColumn, TableColumnDef } from './table-types'

/** Маппинг zodType → CellFieldType */
export function mapZodType(zodType: string): CellFieldType {
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

/** camelCase → Title Case */
export function camelToTitle(str: string): string {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim()
}

/** Найти поле по dot-path в дереве SchemaFieldInfo */
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

/** Получить SchemaFieldInfo[] из массива array-поля. */
export function getArrayElementFields(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Zod-схема без публичного типа обхода
  schema: any,
  arrayPath: string,
): SchemaFieldInfo[] {
  const allFields = traverseSchema(schema)
  const field = findFieldByPath(allFields, arrayPath)

  if (field?.zodType === 'array' && field.element?.children) {
    return field.element.children
  }

  return []
}

/** Создать ResolvedColumn из SchemaFieldInfo (авто-колонка) */
export function fieldInfoToColumn(info: SchemaFieldInfo): ResolvedColumn {
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

/** Мерж пользовательских TableColumnDef с авто-колонками из schema */
export function mergeColumns(userColumns: TableColumnDef[], schemaColumns: ResolvedColumn[]): ResolvedColumn[] {
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
 * Резолвит колонки таблицы из schema и/или пользовательских определений — общая логика
 * `Form.Field.DataGrid`/`Form.Field.TableEditor` для всех скинов (Chakra, shadcn, Angular, Vue).
 * Framework-free (только `traverseSchema` из `@letar/forms-core/schema`) — React-скины оборачивают
 * в `useMemo` сами (см. `useTableColumns` в `@letar/forms`/`@letar/forms-shadcn`).
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
