import { Box, Container, Heading } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { CartItems } from './_components/cart-items'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'cart.page' })

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  }
}

export default async function CartPage() {
  const t = await getTranslations('cart.page')

  return (
    <Box minH="100vh" py={8}>
      <Container maxW="container.lg">
        <Heading size="xl" mb={6} color="fg">
          {t('title')}
        </Heading>
        <CartItems />
      </Container>
    </Box>
  )
}
