import { requireAdmin } from '@/lib/auth-utils'
import { Box, Container, Flex, Heading, HStack } from '@chakra-ui/react'
import Link from 'next/link'
import type { ReactNode } from 'react'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin()

  return (
    <Box minH="100dvh" bg="bg" color="fg">
      <Box as="header" borderBottomWidth="1px" borderColor="border" bg="bg.surface">
        <Container maxW="7xl" py={4}>
          <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
            <Heading size="lg" asChild>
              <Link href="/admin">Админка НейроАбоИ</Link>
            </Heading>
            <HStack gap={4} fontSize="sm">
              <Box asChild color="fg.muted" _hover={{ color: 'brand.solid' }}>
                <Link href="/admin/products">Товары</Link>
              </Box>
              <Box asChild color="fg.muted" _hover={{ color: 'brand.solid' }}>
                <Link href="/admin/orders">Заказы</Link>
              </Box>
              <Box asChild color="fg.muted" _hover={{ color: 'brand.solid' }}>
                <Link href="/admin/promos">Промо</Link>
              </Box>
              <Box asChild color="fg.muted" _hover={{ color: 'brand.solid' }}>
                <Link href="/admin/gift-certificates">Сертификаты</Link>
              </Box>
              <Box asChild color="fg.muted" _hover={{ color: 'brand.solid' }}>
                <Link href="/">На сайт</Link>
              </Box>
              <Box asChild color="red.fg" _hover={{ color: 'red.solid' }}>
                <Link href="/sign-out">Выйти</Link>
              </Box>
            </HStack>
          </Flex>
        </Container>
      </Box>
      <Container maxW="7xl" py={8}>
        {children}
      </Container>
    </Box>
  )
}
