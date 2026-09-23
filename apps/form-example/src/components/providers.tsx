'use client'

import { Nav } from '@/components/nav'
import { system } from '@/theme'
import { Box } from '@chakra-ui/react'
import { RootChakraProvider } from '@letar/chakra-provider'
import { EmotionRegistry } from '@letar/chakra-provider/next'
import { FormI18nProvider } from '@letar/forms'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <EmotionRegistry>
      <RootChakraProvider value={system}>
        <FormI18nProvider locale="ru">
          <Nav />
          <Box ml="240px" p={8} maxW="800px">
            {children}
          </Box>
        </FormI18nProvider>
      </RootChakraProvider>
    </EmotionRegistry>
  )
}
