import { Box, Link as ChakraLink, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { LuArrowLeft } from 'react-icons/lu'

/**
 * Layout для страниц авторизации — центрированный минимальный UI
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <VStack minH="100dvh" bg="bg.subtle" display="flex" alignItems="center" justifyContent="center">
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
      <Box asChild flex={1} minW={0} display="flex" alignItems="center" justifyContent="center" w="full" pb={12}>
        <main>{children}</main>
      </Box>
    </VStack>
  )
}
