import { Skeleton, Table } from '@chakra-ui/react'

interface TableSkeletonProps {
  /** Количество строк */
  rows?: number
  /** Количество колонок */
  columns?: number
}

/**
 * Skeleton для таблицы при загрузке данных
 *
 * @example
 * ```tsx
 * <Suspense fallback={<TableSkeleton rows={5} columns={4} />}>
 *   <ProductsTable />
 * </Suspense>
 * ```
 */
export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <Table.Root>
      <Table.Header>
        <Table.Row>
          {Array.from({ length: columns }).map((_, i) => (
            <Table.ColumnHeader key={`col-${i}`}>
              <Skeleton height="4" width="80%" />
            </Table.ColumnHeader>
          ))}
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <Table.Row key={`row-${rowIndex}`}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Table.Cell key={`cell-${rowIndex}-${colIndex}`}>
                <Skeleton height="4" width={colIndex === 0 ? '60%' : colIndex === columns - 1 ? '40%' : '80%'} />
              </Table.Cell>
            ))}
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  )
}
