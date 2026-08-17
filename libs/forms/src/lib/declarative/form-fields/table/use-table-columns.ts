'use client'

import {
  camelToTitle,
  fieldInfoToColumn,
  getArrayElementFields,
  mapZodType,
  mergeColumns,
  resolveTableColumns,
} from '@letar/forms-core/table'
import { useMemo } from 'react'
import type { ResolvedColumn, TableColumnDef } from './table-types'

// Для экспорта в тестах — реэкспорт framework-free утилит из @letar/forms-core/table
export { camelToTitle, fieldInfoToColumn, getArrayElementFields, mapZodType, mergeColumns }

/**
 * Хук для резолва колонок таблицы из schema и/или пользовательских определений.
 *
 * Тонкая React-обёртка (`useMemo`) над framework-free `resolveTableColumns`
 * (`@letar/forms-core/table`) — общей логикой с `@letar/forms-shadcn`/`@letar/forms-angular`/
 * `@letar/forms-vue`.
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
  userColumns?: TableColumnDef[],
): ResolvedColumn[] {
  return useMemo(
    () => resolveTableColumns(schema, arrayPath, userColumns),
    [schema, arrayPath, userColumns],
  )
}
