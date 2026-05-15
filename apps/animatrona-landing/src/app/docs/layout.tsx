import { DocsSidebar } from '@/app/docs/_components/docs-sidebar'
import { Box, Container, Flex } from '@chakra-ui/react'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Документация',
  description: 'Документация Animatrona — руководство пользователя, горячие клавиши, профили кодирования',
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box minH="100vh" bg="gray.950">
      {/* Навбар документации */}
      <Box
        position="fixed"
        top={0}
        left={0}
        right={0}
        h="60px"
        bg="rgba(17, 17, 27, 0.95)"
        backdropFilter="blur(12px)"
        borderBottom="1px solid"
        borderColor="gray.800"
        zIndex={100}
      >
        <Container maxW="container.xl" h="full">
          <Flex align="center" h="full" justify="space-between">
            <Link href="/">
              <Box fontSize="lg" fontWeight="bold" className="gradient-text" _hover={{ opacity: 0.8 }}>
                Animatrona
              </Box>
            </Link>
            <Box fontSize="sm" color="gray.400">
              Документация
            </Box>
          </Flex>
        </Container>
      </Box>

      {/* Контент */}
      <Container maxW="container.xl" pt="80px" pb={16}>
        <Flex gap={8} direction={{ base: 'column', md: 'row' }}>
          {/* Sidebar */}
          <DocsSidebar />

          {/* Основной контент */}
          <Box flex={1} minW={0}>
            {children}
          </Box>
        </Flex>
      </Container>
    </Box>
  )
}
