'use client'

import { Link } from '@/i18n/navigation'
import { Box, Container, Flex, Heading, Separator, Text, VStack } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { OAuthButtonsWithI18n } from '../sign-in/_components/oauth-buttons-with-i18n'
import { RegisterForm } from './_components/register-form'

export default function SignUpPage() {
  const t = useTranslations('auth')
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)

  // После успешной регистрации показываем сообщение
  if (registeredEmail) {
    return (
      <Container maxW="md" py={12}>
        <VStack gap={6} align="stretch" textAlign="center">
          <Heading size="xl">{t('checkEmail')}</Heading>
          <Text color="fg.muted">{t('verificationSent', { email: registeredEmail })}</Text>
          <Text fontSize="sm" color="fg.muted">
            {t('checkSpam')}
          </Text>
        </VStack>
      </Container>
    )
  }

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
              {t('signUp')}
            </Text>
            <Text color="fg.muted" fontSize="md">
              {t('signUpSubtitle')}
            </Text>
          </VStack>
        </VStack>

        {/* Форма регистрации */}
        <Box p={8} borderWidth="1px" borderColor="border" borderRadius="xl" bg="bg.panel" shadow="lg">
          <Flex direction={{ base: 'column', lg: 'row' }} gap={8} align="stretch">
            {/* OAuth провайдеры */}
            <VStack flex={1} gap={4} align="stretch">
              <Text fontWeight="medium" textAlign="center">
                {t('quickSignUp')}
              </Text>
              <Flex flex={1} align="center" justify="center">
                <OAuthButtonsWithI18n callbackUrl={callbackUrl} />
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

            {/* Форма регистрации по email/паролю */}
            <VStack flex={1} gap={4} align="stretch">
              <Text fontWeight="medium" textAlign="center">
                {t('byEmail')}
              </Text>
              <RegisterForm onSuccess={setRegisteredEmail} />
            </VStack>
          </Flex>
        </Box>

        {/* Ссылка на вход */}
        <Text fontSize="sm" color="fg.muted" textAlign="center">
          {t('haveAccount')}{' '}
          <Link href="/sign-in">
            <Text as="span" color="brand.600" fontWeight="medium" textDecoration="underline">
              {t('signIn')}
            </Text>
          </Link>
        </Text>
      </VStack>
    </Container>
  )
}
