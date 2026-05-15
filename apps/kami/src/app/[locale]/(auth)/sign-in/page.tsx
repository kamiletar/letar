import { Link } from '@/i18n/navigation'
import { Box, Container, Flex, Heading, Separator, Text, VStack } from '@chakra-ui/react'
import { getTranslations } from 'next-intl/server'
import { LoginForm } from './_components/login-form'
import { MagicLinkForm } from './_components/magic-link-form'
import { OAuthButtonsWithI18n } from './_components/oauth-buttons-with-i18n'

interface SignInPageProps {
  searchParams: Promise<{ callbackUrl?: string }>
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const t = await getTranslations('auth')
  const { callbackUrl } = await searchParams
  const redirectTo = callbackUrl || '/'

  return (
    <Container maxW={{ base: 'md', lg: '4xl' }} py={12}>
      <VStack gap={8} align="stretch">
        {/* Заголовок */}
        <VStack gap={4} textAlign="center">
          <Heading size="2xl" fontFamily="mono">
            Kami
          </Heading>
          <VStack gap={1}>
            <Text fontSize="2xl" fontWeight="semibold" color="fg">
              {t('signIn')}
            </Text>
            <Text color="fg.muted" fontSize="md">
              {t('signInSubtitle')}
            </Text>
          </VStack>
        </VStack>

        {/* Форма входа */}
        <Box p={8} borderWidth="1px" borderColor="border" borderRadius="xl" bg="bg.panel" shadow="lg">
          <Flex direction={{ base: 'column', lg: 'row' }} gap={8} align="stretch">
            {/* OAuth провайдеры */}
            <VStack flex={1} gap={4} align="stretch">
              <Text fontWeight="medium" textAlign="center">
                {t('quickSignIn')}
              </Text>
              <Flex flex={1} align="center" justify="center">
                <OAuthButtonsWithI18n callbackUrl={redirectTo} />
              </Flex>
            </VStack>

            {/* Разделитель */}
            <Flex align="center" justify="center" display={{ base: 'flex', lg: 'none' }}>
              <Separator flex={1} />
              <Text px={4} color="fg.muted" fontSize="sm">
                {t('or')}
              </Text>
              <Separator flex={1} />
            </Flex>
            <Separator orientation="vertical" display={{ base: 'none', lg: 'block' }} />

            {/* Форма входа по email/паролю */}
            <VStack flex={1} gap={4} align="stretch">
              <Text fontWeight="medium" textAlign="center">
                {t('byEmail')}
              </Text>
              <LoginForm callbackUrl={redirectTo} />

              {/* Magic Link */}
              <Separator />
              <Text fontWeight="medium" textAlign="center" fontSize="sm" color="fg.muted">
                {t('orUseMagicLink')}
              </Text>
              <MagicLinkForm />
            </VStack>
          </Flex>
        </Box>

        {/* Ссылка на регистрацию */}
        <Text fontSize="sm" color="fg.muted" textAlign="center">
          {t('noAccount')}{' '}
          <Link href="/sign-up">
            <Text as="span" color="brand.600" fontWeight="medium" textDecoration="underline">
              {t('signUp')}
            </Text>
          </Link>
        </Text>
      </VStack>
    </Container>
  )
}
