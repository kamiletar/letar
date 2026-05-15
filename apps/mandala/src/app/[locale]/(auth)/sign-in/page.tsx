import { LogoWithText } from '@/app/_components/logo-with-text'
import { Link } from '@/i18n/navigation'
import { OAuthButtons } from '@/lib/auth-client'
import { Box, Container, Flex, Separator, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { LoginForm } from './_components/login-form'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ callbackUrl?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'auth.signInPage' })

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  }
}

export default async function SignInPage({ searchParams }: Props) {
  const { callbackUrl } = await searchParams
  const t = await getTranslations('auth')
  const tPage = await getTranslations('auth.signInPage')
  const tCommon = await getTranslations('common')

  // Определяем URL для редиректа после входа
  const redirectTo = callbackUrl || '/'

  return (
    <Container maxW={{ base: 'md', lg: '4xl' }} py={12}>
      <VStack gap={8} align="stretch">
        {/* Заголовок */}
        <VStack gap={4} textAlign="center">
          <LogoWithText size="lg" />
          <VStack gap={1}>
            <Text fontSize="2xl" fontWeight="semibold" color="fg">
              {tPage('title')}
            </Text>
            <Text color="fg.muted" fontSize="md">
              {tPage('subtitle')}
            </Text>
          </VStack>
        </VStack>

        {/* Карточка формы входа */}
        <Box p={8} borderWidth="1px" borderColor="border" borderRadius="xl" bg="bg.panel" shadow="lg">
          <Flex direction={{ base: 'column', lg: 'row' }} gap={8} align="stretch">
            {/* OAuth провайдеры */}
            <VStack flex={1} gap={4} align="stretch">
              <Text fontWeight="medium" textAlign="center">
                {t('continueWith', { provider: 'OAuth' }).replace(' OAuth', '')}
              </Text>
              <Flex flex={1} align="center" justify="center">
                <OAuthButtons callbackUrl={redirectTo} />
              </Flex>
            </VStack>

            {/* Разделитель - горизонтальный на мобилке, вертикальный на десктопе */}
            <Flex align="center" justify="center" display={{ base: 'flex', lg: 'none' }}>
              <Separator flex={1} />
              <Text px={4} color="fg.muted" fontSize="sm">
                {tCommon('or')}
              </Text>
              <Separator flex={1} />
            </Flex>
            <Separator orientation="vertical" display={{ base: 'none', lg: 'block' }} />

            {/* Форма входа по email/паролю */}
            <VStack flex={1} gap={4} align="stretch">
              <Text fontWeight="medium" textAlign="center">
                {t('email')}
              </Text>
              <LoginForm callbackUrl={redirectTo} />
            </VStack>
          </Flex>
        </Box>

        {/* Ссылка на регистрацию */}
        <Text fontSize="sm" color="fg.muted" textAlign="center">
          {t('noAccount')}{' '}
          <Link href="/sign-up">
            <Text as="span" color="fg" fontWeight="medium" textDecoration="underline">
              {t('signUp')}
            </Text>
          </Link>
        </Text>
      </VStack>
    </Container>
  )
}
