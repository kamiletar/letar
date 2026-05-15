import { Container, Heading, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { HireForm } from './_components/hire-form'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'hire' })
  return {
    title: t('title'),
    alternates: {
      canonical: `/${locale}/hire`,
      languages: { ru: '/ru/hire', en: '/en/hire' },
    },
    openGraph: { url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://kami.letar.best'}/${locale}/hire` },
  }
}

export default async function HirePage() {
  const t = await getTranslations('hire')

  return (
    <Container maxW="2xl" py={12}>
      <VStack gap={8} align="stretch">
        <VStack gap={2} textAlign="center">
          <Heading as="h1" size="2xl">
            {t('title')}
          </Heading>
          <Text color="fg.muted">{t('subtitle')}</Text>
        </VStack>
        <HireForm />
      </VStack>
    </Container>
  )
}
