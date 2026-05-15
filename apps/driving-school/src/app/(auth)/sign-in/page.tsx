import { LogoWithText } from '@/app/_components/logo-with-text'
import { OAuthButtons } from '@/lib/auth-client'
import { Box, Container, Flex, Separator, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { LoginForm } from './_components/login-form'

interface SignInPageProps {
  searchParams: Promise<{ callbackUrl?: string }>
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { callbackUrl } = await searchParams
  // Определяем URL для редиректа после входа (по умолчанию /dashboard)
  const redirectTo = callbackUrl || '/dashboard'
  return (
    <Container maxW={{ base: 'md', lg: '4xl' }} py={12}>
      <VStack gap={8} align="stretch">
        {/* Заголовок */}
        <VStack gap={4} textAlign="center">
          <LogoWithText size="lg" />
          <VStack gap={1}>
            <Text fontSize="2xl" fontWeight="semibold" color="fg">
              Вход
            </Text>
            <Text color="fg.muted" fontSize="md">
              Войдите в свой аккаунт
            </Text>
          </VStack>
        </VStack>

        {/* Форма входа */}
        <Box p={8} borderWidth="1px" borderColor="border" borderRadius="xl" bg="bg.panel" shadow="lg">
          <Flex direction={{ base: 'column', lg: 'row' }} gap={8} align="stretch">
            {/* OAuth провайдеры */}
            <VStack flex={1} gap={4} align="stretch">
              <Text fontWeight="medium" textAlign="center">
                Быстрый вход
              </Text>
              <Flex flex={1} align="center" justify="center">
                <OAuthButtons callbackUrl={redirectTo} providers={['google', 'yandex', 'vk']} />
              </Flex>
            </VStack>

            {/* Разделитель - горизонтальный на мобилке, вертикальный на десктопе */}
            <Flex align="center" justify="center" display={{ base: 'flex', lg: 'none' }}>
              <Separator flex={1} />
              <Text px={4} color="fg.muted" fontSize="sm">
                или
              </Text>
              <Separator flex={1} />
            </Flex>
            <Separator orientation="vertical" display={{ base: 'none', lg: 'block' }} />

            {/* Форма входа по email/паролю */}
            <VStack flex={1} gap={4} align="stretch">
              <Text fontWeight="medium" textAlign="center">
                По email
              </Text>
              <LoginForm callbackUrl={redirectTo} />
            </VStack>
          </Flex>
        </Box>

        {/* Ссылка на регистрацию */}
        <Text fontSize="sm" color="fg.muted" textAlign="center">
          Нет аккаунта?{' '}
          <Link href="/sign-up">
            <Text as="span" color="orange.600" fontWeight="medium" textDecoration="underline">
              Зарегистрироваться
            </Text>
          </Link>
        </Text>
      </VStack>
    </Container>
  )
}
