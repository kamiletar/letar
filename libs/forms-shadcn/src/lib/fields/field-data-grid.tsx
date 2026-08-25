'use client'

import { createLazyComponent } from '@letar/forms-react'
import type { ComponentType } from 'react'
import type { DataGridFieldProps } from './field-data-grid-types'

const fallback = () => <div className="border-input bg-muted/30 h-[200px] animate-pulse rounded-md border" />

/**
 * Form.Field.DataGrid — shadcn-скин. Большая таблица на TanStack Table: сортировка,
 * фильтрация, пагинация, инлайн-редактирование, CSV-экспорт.
 *
 * `@tanstack/react-table` — тяжёлый peer-dep, нужный только этому полю (и FieldTableEditor,
 * который его не тянет — там native `<table>`). Реализация вынесена в field-data-grid-impl.tsx
 * и подгружается через `createLazyComponent` (`@letar/forms-react`) — mounted-гейт + Suspense,
 * фикс зависшего серверного Suspense-boundary. Разбор:
 * .claude/docs/letar-forms-lazy-component-ssr-stuck-suspense.md
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
export const FieldDataGrid = createLazyComponent<ComponentType<DataGridFieldProps>>(
  () => import('./field-data-grid-impl').then((m) => ({ default: m.FieldDataGrid })),
  fallback,
)
