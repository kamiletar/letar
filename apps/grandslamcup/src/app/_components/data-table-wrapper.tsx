/**
 * Обёртка для таблиц данных — скролл, рамка, скругления.
 */

import { Box, type BoxProps } from '@chakra-ui/react'

interface DataTableWrapperProps extends BoxProps {
  children: React.ReactNode
}

export function DataTableWrapper({ children, ...props }: DataTableWrapperProps) {
  return (
    <Box overflowX="auto" borderWidth="1px" borderColor="border" borderRadius="xl" overflow="hidden" {...props}>
      {children}
    </Box>
  )
}
