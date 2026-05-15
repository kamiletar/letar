import { Box, Link as ChakraLink, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { LuArrowLeft } from 'react-icons/lu'

/**
 * Layout для страниц авторизации — центрированный минимальный UI
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <VStack minH="100vh" bg="bg.subtle" display="flex" alignItems="center" justifyContent="center">
      <ChakraLink
        asChild
        colorPalette="brand"
        display="inline-flex"
        alignItems="center"
        gap={1}
        px={4}
        py={4}
        alignSelf="flex-start"
      >
        <NextLink href="/">
          <LuArrowLeft />
          На главную
        </NextLink>
      </ChakraLink>
      <Box flex={1} display="flex" alignItems="center" justifyContent="center" w="full">
        {children}
      </Box>
    </VStack>
  )
}
