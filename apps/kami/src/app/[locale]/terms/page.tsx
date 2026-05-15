import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { useTranslations } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'terms' })

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}/terms`,
      languages: { ru: '/ru/terms', en: '/en/terms' },
    },
    openGraph: { url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://kami.letar.best'}/${locale}/terms` },
  }
}

export default async function TermsPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  return <TermsContent />
}

function TermsContent() {
  const t = useTranslations('terms')

  return (
    <Box py={{ base: 12, md: 20 }}>
      <Container maxW="4xl">
        <VStack gap={8} align="stretch">
          <Heading as="h1" fontSize={{ base: '3xl', md: '4xl' }}>
            {t('title')}
          </Heading>

          <Text color="fg.muted" fontSize="sm">
            {t('lastUpdated')}
          </Text>

          <VStack gap={6} align="stretch">
            <Section title={t('sections.acceptance.title')} content={t('sections.acceptance.content')} />
            <Section title={t('sections.services.title')} content={t('sections.services.content')} />
            <Section title={t('sections.accounts.title')} content={t('sections.accounts.content')} />
            <Section title={t('sections.intellectual.title')} content={t('sections.intellectual.content')} />
            <Section title={t('sections.liability.title')} content={t('sections.liability.content')} />
            <Section title={t('sections.changes.title')} content={t('sections.changes.content')} />
          </VStack>
        </VStack>
      </Container>
    </Box>
  )
}

function Section({ title, content }: { title: string; content: string }) {
  return (
    <VStack gap={2} align="stretch">
      <Heading as="h2" fontSize="xl">
        {title}
      </Heading>
      <Text color="fg.muted" whiteSpace="pre-line">
        {content}
      </Text>
    </VStack>
  )
}
