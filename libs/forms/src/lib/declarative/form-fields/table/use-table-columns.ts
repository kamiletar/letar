'use client'

import { useMemo } from 'react'
import { type SchemaFieldInfo, traverseSchema } from '../../schema-traversal'
import type { CellFieldType, ResolvedColumn, TableColumnDef } from './table-types'

/**
 * Маппинг zodType → CellFieldType
 */
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

/**
 * Получить SchemaFieldInfo[] из массива array-поля.
 * Извлекает shape элемента массива из schema.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getArrayElementFields(schema: any, arrayPath: string): SchemaFieldInfo[] {
  // Обходим всю схему и ищем поле по пути
  const allFields = traverseSchema(schema)
  const field = findFieldByPath(allFields, arrayPath)

  if (field?.zodType === 'array' && field.element?.children) {
    return field.element.children
  }

  return []
}

/**
 * Найти поле по dot-path в дереве SchemaFieldInfo
 */
function findFieldByPath(fields: SchemaFieldInfo[], path: string): SchemaFieldInfo | undefined {
  const parts = path.split('.')

  let current = fields
  for (let i = 0; i < parts.length; i++) {
    const found = current.find((f) => f.name === parts[i])
    if (!found) return undefined

    if (i === parts.length - 1) return found

    if (found.children) {
      current = found.children
    } else {
      return undefined
    }
  }

  return undefined
}

/**
 * Создать ResolvedColumn из SchemaFieldInfo (авто-колонка)
 */
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

/**
 * Мерж пользовательских TableColumnDef с авто-колонками из schema
 */
function mergeColumns(userColumns: TableColumnDef[], schemaColumns: ResolvedColumn[]): ResolvedColumn[] {
  return userColumns
    .filter((col) => !col.hidden)
    .map((col) => {
      // Ищем соответствующую авто-колонку
      const schemaCol = schemaColumns.find((sc) => sc.name === col.name)

      // Вычисляемая колонка — не из schema
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
 * camelCase → Title Case
 */
function camelToTitle(str: string): string {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim()
}

// Для экспорта в тестах
export { camelToTitle, fieldInfoToColumn, getArrayElementFields, mapZodType, mergeColumns }

/**
 * Хук для резолва колонок таблицы из schema и/или пользовательских определений.
 *
 * @param schema - Zod schema формы (верхнего уровня)
 * @param arrayPath - Полный путь к array-полю (например "items" или "order.items")
 * @param userColumns - Пользовательские определения колонок (опционально)
 * @returns Массив ResolvedColumn
 */
export function useTableColumns(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: any,
  arrayPath: string,
  userColumns?: TableColumnDef[]
): ResolvedColumn[] {
  return useMemo(() => {
    // Извлекаем поля элемента массива из schema
    const schemaFields = getArrayElementFields(schema, arrayPath)
    const autoColumns = schemaFields.map(fieldInfoToColumn)

    // Если пользователь не задал колонки — возвращаем авто
    if (!userColumns || userColumns.length === 0) {
      return autoColumns
    }

    // Мержим пользовательские с авто
    return mergeColumns(userColumns, autoColumns)
  }, [schema, arrayPath, userColumns])
}
