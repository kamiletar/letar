import { Link } from '@/i18n/navigation'
import { Box, Link as ChakraLink, VStack } from '@chakra-ui/react'
import { LuArrowLeft } from 'react-icons/lu'

/**
 * Layout для страниц авторизации.
 * Центрирует контент и добавляет ссылку "На главную".
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
        <Link href="/">
          <LuArrowLeft />
          На главную
        </Link>
      </ChakraLink>
      <Box flex={1} display="flex" alignItems="center" justifyContent="center" width="100%">
        {children}
      </Box>
    </VStack>
  )
}
