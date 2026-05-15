import { Box, Container, Heading } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { CheckoutForm } from './_components/checkout-form'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'checkout.page' })

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  }
}

export default async function CheckoutPage() {
  const t = await getTranslations('checkout.page')

  return (
    <Box minH="100vh" py={8}>
      <Container maxW="container.xl">
        <Heading size="xl" mb={6} color="fg">
          {t('title')}
        </Heading>
        <CheckoutForm />
      </Container>
    </Box>
  )
}
