'use client'

import {
  camelToTitle,
  fieldInfoToColumn,
  getArrayElementFields,
  mapZodType,
  mergeColumns,
  resolveTableColumns,
} from '@letar/forms-core/table'
import type { ResolvedColumn, TableColumnDef } from '@letar/forms-core/table'
import { useMemo } from 'react'

// Для экспорта в тестах — реэкспорт framework-free утилит из @letar/forms-core/table
export { camelToTitle, fieldInfoToColumn, getArrayElementFields, mapZodType, mergeColumns }

/**
 * Хук для резолва колонок таблицы из schema и/или пользовательских определений.
 *
 * Тонкая React-обёртка (`useMemo`) над framework-free `resolveTableColumns`
 * (`@letar/forms-core/table`) — общей логикой с `@letar/forms`/`@letar/forms-angular`/
 * `@letar/forms-vue`.
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
