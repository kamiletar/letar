'use client'

import { Box, HStack, Table } from '@chakra-ui/react'
import { type ColumnDef, flexRender, type RowData, stockFeatures, useTable } from '@tanstack/react-table'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { LuChevronDown, LuChevronsUpDown, LuChevronUp } from 'react-icons/lu'

/**
 * Набор фич `@tanstack/react-table` v9 для `DataTable`. `stockFeatures` (все стоковые фичи, как
 * в v8) — сознательный выбор вместо точечного набора: часть методов, которые в v8 считались
 * «core» и работали без выбора фич (например `row.getVisibleCells()` — на деле висит на
 * `columnVisibilityFeature`), в v9 распределены по фичам не всегда очевидным образом. Точечный
 * подбор экономит бандл, но требует трекать межфичевые зависимости методов вручную — не тот
 * компромисс для этой библиотеки. Модульная константа — не пересоздавать на каждый рендер.
 */
const dataTableFeatures = stockFeatures

/** Тип фич `DataTable` — нужен потребителям, которые типизируют `columns` вне компонента. */
export type DataTableFeatures = typeof dataTableFeatures

export interface DataTableProps<T extends RowData> {
  /** Данные для рендера (страница уже отфильтрована/отсортирована/пагинирована на сервере) */
  data: T[]
  /** Определения колонок — стандартный тип `@tanstack/react-table`, поддерживает `accessorKey`/`cell` */
  columns: ColumnDef<DataTableFeatures, T>[]
  /** Имя query-параметра сортировки. Значение — `field` (asc) или `-field` (desc) */
  sortParamName?: string
  /** Цветовая палитра для индикатора активной сортировки */
  colorPalette?: string
}

/**
 * Таблица на `@tanstack/react-table` для админ-панели: сортировка по клику на заголовок —
 * серверная (через URL-параметр, `router.push`), без клиентского sort/filter/pagination row model.
 * Данные приходят уже отсортированными и постранично от вызывающего Server Component — так же,
 * как это устроено у `Pagination`/`SearchFilter` в этой библиотеке.
 *
 * В отличие от `GenericAdminTable` — без DnD-порядка, bulk actions и мобильных карточек. Для
 * списков без ручной пересортировки и произвольным набором колонок (например, клиенты, заказы).
 *
 * @example
 * ```tsx
 * const columns: ColumnDef<Client>[] = [
 *   { accessorKey: 'name', header: 'Имя' },
 *   { accessorKey: 'phone', header: 'Телефон', enableSorting: false },
 *   { accessorKey: 'createdAt', header: 'Дата', cell: (c) => formatDate(c.getValue()) },
 * ]
 *
 * <DataTable data={clients} columns={columns} />
 * <Pagination total={total} pageSize={PAGE_SIZE} />
 * ```
 */
export function DataTable<T extends RowData>(
  { data, columns, sortParamName = 'sort', colorPalette = 'purple' }: DataTableProps<T>,
) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const rawSort = searchParams.get(sortParamName) ?? ''
  const sortDesc = rawSort.startsWith('-')
  const sortField = sortDesc ? rawSort.slice(1) : rawSort

  const table = useTable({
    features: dataTableFeatures,
    data,
    columns,
  })

  const toggleSort = (columnId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    const isActive = sortField === columnId

    if (isActive && !sortDesc) {
      params.set(sortParamName, `-${columnId}`)
    } else if (isActive && sortDesc) {
      params.delete(sortParamName)
    } else {
      params.set(sortParamName, columnId)
    }

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  return (
    <Table.Root opacity={isPending ? 0.7 : 1} transition="opacity 0.2s">
      <Table.Header>
        {table.getHeaderGroups().map((headerGroup) => (
          <Table.Row key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              const sortable = header.column.getCanSort()
              const isActive = sortField === header.column.id

              return (
                <Table.ColumnHeader
                  key={header.id}
                  cursor={sortable ? 'pointer' : undefined}
                  userSelect="none"
                  onClick={sortable ? () => toggleSort(header.column.id) : undefined}
                >
                  <HStack gap={1}>
                    <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                    {sortable && (
                      <Box as="span" color={isActive ? `${colorPalette}.500` : 'fg.muted'} opacity={isActive ? 1 : 0.4}>
                        {isActive ? (sortDesc ? <LuChevronDown /> : <LuChevronUp />) : <LuChevronsUpDown />}
                      </Box>
                    )}
                  </HStack>
                </Table.ColumnHeader>
              )
            })}
          </Table.Row>
        ))}
      </Table.Header>
      <Table.Body>
        {table.getRowModel().rows.map((row) => (
          <Table.Row key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <Table.Cell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</Table.Cell>
            ))}
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  )
}
