import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { OAuthButtonsWithI18n } from './_components/oauth-buttons-with-i18n'

export const metadata: Metadata = {
  title: 'Войти — Kami',
}

interface SignInPageProps {
  searchParams: Promise<{ callbackUrl?: string }>
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const t = await getTranslations('auth')
  const { callbackUrl } = await searchParams
  const redirectTo = callbackUrl || '/'

  return (
    <Container maxW="sm" py={{ base: 12, md: 20 }}>
      <VStack gap={8} align="stretch">
        {/* Заголовок */}
        <VStack gap={2} textAlign="center">
          <Heading size="2xl" fontFamily="mono">
            Kami
          </Heading>
          <Text fontSize="lg" fontWeight="semibold">
            {t('signIn')}
          </Text>
          <Text color="fg.muted" fontSize="sm">
            Вход через единую учётную запись letar.best
          </Text>
        </VStack>

        {/* Кнопка Ключницы */}
        <Box p={8} borderWidth="1px" borderColor="border" borderRadius="xl" bg="bg.panel" shadow="lg">
          <OAuthButtonsWithI18n callbackUrl={redirectTo} />
        </Box>
      </VStack>
    </Container>
  )
}
