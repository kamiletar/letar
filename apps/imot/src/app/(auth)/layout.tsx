import { Box, Flex } from '@chakra-ui/react'
import type { ReactNode } from 'react'

interface AuthLayoutProps {
  children: ReactNode
}

/**
 * Минимальный layout для страниц аутентификации
 * Без навигации, только центрированный контент
 * Используется для страниц:
 * - /auth/signin
 * - /auth/signup
 * - /auth/error
 * - /auth/verify-request
 */
export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <Flex minH="100vh" align="center" justify="center" bg="gray.50" _dark={{ bg: 'gray.900' }} p={{ base: 4, md: 6 }}>
      <Box maxW="md" w="full">
        {children}
      </Box>
    </Flex>
  )
}
