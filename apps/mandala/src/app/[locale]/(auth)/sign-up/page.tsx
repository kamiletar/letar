import { LogoWithText } from '@/app/_components/logo-with-text'
import { Link } from '@/i18n/navigation'
import { OAuthButtons } from '@/lib/auth-client'
import { Box, Container, Flex, Separator, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { RegisterForm } from './_components/register-form'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'auth.signUpPage' })

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  }
}

export default async function SignUpPage() {
  const t = await getTranslations('auth')
  const tPage = await getTranslations('auth.signUpPage')
  const tCommon = await getTranslations('common')

  return (
    <Container maxW={{ base: 'md', md: '4xl' }} py={12}>
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

        {/* Карточка формы регистрации */}
        <Box p={8} borderWidth="1px" borderColor="border" borderRadius="xl" bg="bg.panel" shadow="lg">
          <Flex direction={{ base: 'column', md: 'row' }} gap={8} align="stretch">
            {/* OAuth провайдеры */}
            <VStack flex={1} gap={4} align="stretch">
              <Text fontWeight="medium" textAlign="center">
                {t('continueWith', { provider: 'OAuth' }).replace(' OAuth', '')}
              </Text>
              <Flex flex={1} align="center" justify="center">
                <OAuthButtons callbackUrl="/account" />
              </Flex>
            </VStack>

            {/* Разделитель - горизонтальный на мобилке, вертикальный на десктопе */}
            <Flex align="center" justify="center" display={{ base: 'flex', md: 'none' }}>
              <Separator flex={1} />
              <Text px={4} color="fg.muted" fontSize="sm">
                {tCommon('or')}
              </Text>
              <Separator flex={1} />
            </Flex>
            <Separator orientation="vertical" display={{ base: 'none', md: 'block' }} />

            {/* Форма регистрации по email/паролю */}
            <VStack flex={1} gap={4} align="stretch">
              <Text fontWeight="medium" textAlign="center">
                {t('email')}
              </Text>
              <RegisterForm />
            </VStack>
          </Flex>
        </Box>

        {/* Ссылка на вход */}
        <Text fontSize="sm" color="fg.muted" textAlign="center">
          {t('haveAccount')}{' '}
          <Link href="/sign-in">
            <Text as="span" color="fg" fontWeight="medium" textDecoration="underline">
              {t('signIn')}
            </Text>
          </Link>
        </Text>
      </VStack>
    </Container>
  )
}
