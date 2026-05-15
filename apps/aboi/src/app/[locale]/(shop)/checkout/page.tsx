import { getCartViewAction } from '@/lib/cart'
import { Box, Container, Heading, Stack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { CheckoutClientWrapper } from './_components/checkout-client-wrapper'

export const metadata: Metadata = {
  title: 'Оформление заказа',
  robots: { index: false, follow: false },
}

export default async function CheckoutPage() {
  const cart = await getCartViewAction()

  if (cart.items.length === 0) {
    redirect('/cart')
  }

  const totalMeters = cart.items.reduce((sum, item) => sum + Number(item.lengthMeters), 0)

  return (
    <Box bg="bg" color="fg" minH="100dvh">
      <Container maxW="6xl" py={{ base: 8, md: 12 }}>
        <Stack gap={8}>
          <Heading as="h1" size="3xl">
            Оформление заказа
          </Heading>

          <CheckoutClientWrapper cart={cart} totalMeters={totalMeters} />
        </Stack>
      </Container>
    </Box>
  )
}
