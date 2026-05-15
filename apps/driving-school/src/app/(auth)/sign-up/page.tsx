import { LogoWithText } from '@/app/_components/logo-with-text'
import { OAuthButtons } from '@/lib/auth-client'
import { Box, Container, Flex, Separator, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { RegisterForm } from './_components/register-form'

export default function SignUpPage() {
  return (
    <Container maxW={{ base: 'md', md: '4xl' }} py={12}>
      <VStack gap={8} align="stretch">
        {/* Заголовок */}
        <VStack gap={4} textAlign="center">
          <LogoWithText size="lg" />
          <VStack gap={1}>
            <Text fontSize="2xl" fontWeight="semibold" color="fg">
              Регистрация
            </Text>
            <Text color="fg.muted" fontSize="md">
              Создайте аккаунт, чтобы начать
            </Text>
          </VStack>
        </VStack>

        {/* Форма регистрации */}
        <Box p={8} borderWidth="1px" borderColor="border" borderRadius="xl" bg="bg.panel" shadow="lg">
          <Flex direction={{ base: 'column', md: 'row' }} gap={8} align="stretch">
            {/* OAuth провайдеры */}
            <VStack flex={1} gap={4} align="stretch">
              <Text fontWeight="medium" textAlign="center">
                Быстрая регистрация
              </Text>
              <Flex flex={1} align="center" justify="center">
                <OAuthButtons callbackUrl="/onboarding" providers={['google', 'yandex', 'vk']} />
              </Flex>
            </VStack>

            {/* Разделитель - горизонтальный на мобилке, вертикальный на десктопе */}
            <Flex align="center" justify="center" display={{ base: 'flex', md: 'none' }}>
              <Separator flex={1} />
              <Text px={4} color="fg.muted" fontSize="sm">
                или
              </Text>
              <Separator flex={1} />
            </Flex>
            <Separator orientation="vertical" display={{ base: 'none', md: 'block' }} />

            {/* Форма регистрации по email/паролю */}
            <VStack flex={1} gap={4} align="stretch">
              <Text fontWeight="medium" textAlign="center">
                По email
              </Text>
              <RegisterForm />
            </VStack>
          </Flex>
        </Box>

        {/* Ссылка на вход */}
        <Text fontSize="sm" color="fg.muted" textAlign="center">
          Уже есть аккаунт?{' '}
          <Link href="/sign-in">
            <Text as="span" color="orange.600" fontWeight="medium" textDecoration="underline">
              Войти
            </Text>
          </Link>
        </Text>
      </VStack>
    </Container>
  )
}
