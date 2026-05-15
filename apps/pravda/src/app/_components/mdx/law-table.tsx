import { Box, Table, Text } from '@chakra-ui/react'
import type { ReactNode } from 'react'

interface LawTableProps {
  /** Заголовок таблицы */
  caption?: string
  /** Содержимое таблицы (thead, tbody) */
  children: ReactNode
}

/**
 * Стилизованная таблица для законодательных документов.
 * Используется для штрафов, тарифов, ставок.
 * Server Component — нет хуков.
 */
export function LawTable({ caption, children }: LawTableProps) {
  return (
    <Box my={6} overflowX="auto" maxW="100%">
      {caption && (
        <Text
          fontSize="sm"
          fontWeight="semibold"
          textTransform="uppercase"
          color="fg.muted"
          mb={2}
          letterSpacing="wide"
        >
          {caption}
        </Text>
      )}
      <Table.Root size="sm" variant="outline" striped>
        {children}
      </Table.Root>
    </Box>
  )
}

// Экспорт частей таблицы для удобства использования в MDX
export const TableHeader = Table.Header
export const TableBody = Table.Body
export const TableRow = Table.Row
export const TableColumnHeader = Table.ColumnHeader
export const TableCell = Table.Cell
