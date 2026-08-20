'use client'

import { lazy, Suspense, useEffect, useState } from 'react'
import type { DataGridFieldProps } from './field-data-grid-types'

// `@tanstack/react-table` — тяжёлый peer-dep, нужный только этому полю (и FieldTableEditor,
// который его не тянет — там native `<table>`). Реализация вынесена в field-data-grid-impl.tsx
// и подгружается через `lazy()` + dynamic `import()`, тот же паттерн, что у `FieldRichText`.
const LazyFieldDataGrid = lazy(() => import('./field-data-grid-impl').then((m) => ({ default: m.FieldDataGrid })))

const fallback = <div className="border-input bg-muted/30 h-[200px] animate-pulse rounded-md border" />

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
  // ⚠️ Suspense монтируется только после клиентского маунта — иначе SSR-стриминг вешает
  // раскрытие boundary на requestAnimationFrame, который не тикает в фоновой/скрытой вкладке.
  // Разбор: .claude/docs/letar-forms-lazy-component-ssr-stuck-suspense.md
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) { return fallback }

  return (
    <Suspense fallback={fallback}>
      <LazyFieldDataGrid {...props} />
    </Suspense>
  )
}
