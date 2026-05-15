import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ code?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'dataDeletion' })

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}/data-deletion`,
      languages: { ru: '/ru/data-deletion', en: '/en/data-deletion' },
    },
    openGraph: { url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://kami.letar.best'}/${locale}/data-deletion` },
  }
}

export default async function DataDeletionPage({ params, searchParams }: Props) {
  const { locale } = await params
  const { code } = await searchParams
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'dataDeletion' })

  return (
    <Box py={{ base: 12, md: 20 }}>
      <Container maxW="4xl">
        <VStack gap={6} align="stretch">
          <Heading as="h1" fontSize={{ base: '3xl', md: '4xl' }}>
            {t('title')}
          </Heading>

          {code ? (
            <VStack gap={4} align="stretch">
              <Text color="fg.muted">{t('statusComplete')}</Text>
              <Box p={4} borderWidth="1px" borderRadius="md" bg="bg.muted">
                <Text fontSize="sm" color="fg.muted">
                  {t('confirmationCode')}: <strong>{code}</strong>
                </Text>
              </Box>
            </VStack>
          ) : (
            <Text color="fg.muted">{t('description')}</Text>
          )}
        </VStack>
      </Container>
    </Box>
  )
}
