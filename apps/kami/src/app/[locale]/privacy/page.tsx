import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { useTranslations } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'privacy' })

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}/privacy`,
      languages: { ru: '/ru/privacy', en: '/en/privacy' },
    },
    openGraph: { url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://kami.letar.best'}/${locale}/privacy` },
  }
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  return <PrivacyContent />
}

function PrivacyContent() {
  const t = useTranslations('privacy')

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
            <Section title={t('sections.collect.title')} content={t('sections.collect.content')} />
            <Section title={t('sections.use.title')} content={t('sections.use.content')} />
            <Section title={t('sections.cookies.title')} content={t('sections.cookies.content')} />
            <Section title={t('sections.thirdParty.title')} content={t('sections.thirdParty.content')} />
            <Section title={t('sections.security.title')} content={t('sections.security.content')} />
            <Section title={t('sections.contact.title')} content={t('sections.contact.content')} />
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
