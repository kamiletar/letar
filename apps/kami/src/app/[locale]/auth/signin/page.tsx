import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server'
import { OAuthButtons } from './_components/oauth-buttons'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'auth' })

  return {
    title: t('signIn'),
  }
}

export default async function SignInPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const currentLocale = await getLocale()

  return (
    <Box py={{ base: 12, md: 20 }}>
      <Container maxW="md">
        <VStack gap={8} align="stretch">
          <VStack gap={4} textAlign="center">
            <Heading as="h1" fontSize={{ base: '2xl', md: '3xl' }}>
              {currentLocale === 'ru' ? 'Вход' : 'Sign In'}
            </Heading>
            <Text color="fg.muted">
              {currentLocale === 'ru'
                ? 'Войдите для доступа к дополнительным функциям'
                : 'Sign in to access additional features'}
            </Text>
          </VStack>

          <Box
            p={8}
            borderRadius="xl"
            bg={{ base: 'white', _dark: 'gray.900' }}
            border="1px solid"
            borderColor={{ base: 'gray.200', _dark: 'gray.700' }}
          >
            <OAuthButtons locale={locale} />
          </Box>
        </VStack>
      </Container>
    </Box>
  )
}
