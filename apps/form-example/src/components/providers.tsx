'use client'

import { Nav } from '@/components/nav'
import { system } from '@/theme'
import { Box, ChakraProvider } from '@chakra-ui/react'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ChakraProvider value={system}>
      <Nav />
      <Box ml="240px" p={8} maxW="800px">
        {children}
      </Box>
    </ChakraProvider>
  )
}
