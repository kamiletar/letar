import { Link } from '@/i18n/navigation'
import { Box, Container, Heading, Link as ChakraLink, Stack, Text } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const nav = await getTranslations({ locale, namespace: 'nav' })
  const t = await getTranslations({ locale, namespace: 'home' })
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kami.letar.best'
  const path = locale === 'ru' ? '/friends/' : '/en/friends/'
  return {
    title: nav('friends'),
    description: t('friendsStatus'),
    alternates: {
      canonical: path,
      languages: { ru: '/friends/', en: '/en/friends/' },
    },
    openGraph: { title: nav('friends'), description: t('friendsStatus'), url: `${baseUrl}${path}` },
  }
}

/** Раздел «Для друзей»: вынесен с главной, чтобы стартовый экран оставался одним экраном (KM-039). */
export default async function FriendsPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const nav = await getTranslations('nav')
  const t = await getTranslations('home')
  return (
    <Box py={{ base: 12, md: 20 }}>
      <Container maxW="4xl" px={{ base: 6, md: 12 }}>
        <Stack gap={6} maxW="2xl">
          <Heading asChild size="3xl">
            <h1>{nav('friends')}</h1>
          </Heading>
          <Text fontSize="lg" lineHeight="tall" bg="bg" p={4} borderRadius="md">{t('friendsStatus')}</Text>
          <ChakraLink asChild minH="44px" fontWeight="medium" color="fg.muted">
            <Link href="/contacts/">{t('write')}</Link>
          </ChakraLink>
        </Stack>
      </Container>
    </Box>
  )
}
