import { getCartViewAction } from '@/lib/cart'
import { Box, Container, Heading, Stack, Text } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { CartLines } from './_components/cart-lines'

export const metadata: Metadata = {
  title: 'Корзина',
  description: 'Ваша корзина',
  robots: { index: false, follow: false },
}

export default async function CartPage() {
  const cart = await getCartViewAction()

  return (
    <Box bg="bg" color="fg" minH="100dvh">
      <Container maxW="5xl" py={{ base: 8, md: 12 }}>
        <Stack gap={6}>
          <Heading as="h1" size="3xl">
            Корзина
          </Heading>

          {cart.items.length === 0 ? (
            <Box p={20} bg="bg.subtle" borderRadius="xl" textAlign="center">
              <Text color="fg.muted">Корзина пуста. Загляните в каталог.</Text>
            </Box>
          ) : (
            <CartLines initial={cart} />
          )}
        </Stack>
      </Container>
    </Box>
  )
}
