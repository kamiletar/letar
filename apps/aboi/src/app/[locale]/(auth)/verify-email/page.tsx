import { Container, Heading, Stack, Text } from '@chakra-ui/react'
import { getTranslations } from 'next-intl/server'

/**
 * Страница после клика по ссылке из email.
 * Better Auth сам обрабатывает токен на /api/auth/verify-email и редиректит сюда —
 * страница используется только как лендинг с подтверждением.
 */
export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const t = await getTranslations('auth.verifyEmail')
  const { error } = await searchParams

  return (
    <Container maxW="md" py={{ base: 12, md: 20 }}>
      <Stack gap={4}>
        <Heading as="h1" size="2xl">
          {t('title')}
        </Heading>
        <Text color={error ? 'red.fg' : 'fg.muted'}>{error ? t('error') : t('success')}</Text>
      </Stack>
    </Container>
  )
}
