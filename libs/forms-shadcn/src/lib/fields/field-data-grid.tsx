'use client'

import { lazy, Suspense } from 'react'
import type { DataGridFieldProps } from './field-data-grid-types'

// `@tanstack/react-table` — тяжёлый peer-dep, нужный только этому полю (и FieldTableEditor,
// который его не тянет — там native `<table>`). Реализация вынесена в field-data-grid-impl.tsx
// и подгружается через `lazy()` + dynamic `import()`, тот же паттерн, что у `FieldRichText`.
const LazyFieldDataGrid = lazy(() => import('./field-data-grid-impl').then((m) => ({ default: m.FieldDataGrid })))

/**
 * Form.Field.DataGrid — shadcn-скин. Большая таблица на TanStack Table: сортировка,
 * фильтрация, пагинация, инлайн-редактирование, CSV-экспорт.
 *
 * @example
 * ```tsx
 * <Form.Field.DataGrid
 *   name="employees"
 *   columns={[{ name: 'name', filter: true }, { name: 'salary', align: 'right' }]}
 *   pageSize={20}
 *   rowSelection
 * />
 * ```
 */
export function FieldDataGrid(props: DataGridFieldProps) {
  return (
    <Suspense fallback={<div className="border-input bg-muted/30 h-[200px] animate-pulse rounded-md border" />}>
      <LazyFieldDataGrid {...props} />
    </Suspense>
  )
}
