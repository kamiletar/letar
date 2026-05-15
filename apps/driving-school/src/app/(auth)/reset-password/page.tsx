import { markResetPageOpened, validateResetToken } from '@/app/(auth)/_actions/reset-password.action'
import { LogoIcon } from '@/app/_components/icons/logo-icon'
import { Box, Button, Container, HStack, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { ResetPasswordForm } from './_components/reset-password-form'

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token } = await searchParams

  // Проверяем наличие токена
  if (!token) {
    return (
      <Container maxW="md" py={12}>
        <VStack gap={8} align="stretch">
          <VStack gap={2} textAlign="center">
            <HStack justify="center">
              <LogoIcon boxSize={10} />
              <Text fontSize="3xl" fontWeight="bold" color="fg">
                НаПрава.РФ
              </Text>
            </HStack>
            <Text fontSize="2xl" fontWeight="semibold" color="error.solid">
              Ошибка
            </Text>
          </VStack>

          <Box p={8} borderWidth="1px" borderColor="border" borderRadius="xl" bg="bg.panel" shadow="lg">
            <VStack gap={4}>
              <Text color="fg.muted" textAlign="center">
                Отсутствует токен для сброса пароля. Пожалуйста, запросите новую ссылку.
              </Text>
              <Link href="/forgot-password">
                <Button colorPalette="brand">Запросить новую ссылку</Button>
              </Link>
            </VStack>
          </Box>
        </VStack>
      </Container>
    )
  }

  // Проверяем валидность токена
  const tokenValidation = await validateResetToken(token)

  // Помечаем что страница открыта (для SSE уведомлений)
  if (tokenValidation.valid) {
    await markResetPageOpened(tokenValidation.email)
  }

  if (!tokenValidation.valid) {
    const errorMessage =
      tokenValidation.error === 'TOKEN_EXPIRED'
        ? 'Срок действия ссылки истёк. Пожалуйста, запросите новую.'
        : 'Недействительная ссылка для сброса пароля.'

    return (
      <Container maxW="md" py={12}>
        <VStack gap={8} align="stretch">
          <VStack gap={2} textAlign="center">
            <HStack justify="center">
              <LogoIcon boxSize={10} />
              <Text fontSize="3xl" fontWeight="bold" color="fg">
                НаПрава.РФ
              </Text>
            </HStack>
            <Text fontSize="2xl" fontWeight="semibold" color="error.solid">
              Ссылка недействительна
            </Text>
          </VStack>

          <Box p={8} borderWidth="1px" borderColor="border" borderRadius="xl" bg="bg.panel" shadow="lg">
            <VStack gap={4}>
              <Text color="fg.muted" textAlign="center">
                {errorMessage}
              </Text>
              <Link href="/forgot-password">
                <Button colorPalette="brand">Запросить новую ссылку</Button>
              </Link>
            </VStack>
          </Box>
        </VStack>
      </Container>
    )
  }

  return (
    <Container maxW="md" py={12}>
      <VStack gap={8} align="stretch">
        {/* Заголовок */}
        <VStack gap={2} textAlign="center">
          <HStack justify="center">
            <LogoIcon boxSize={10} />
            <Text fontSize="3xl" fontWeight="bold" color="fg">
              НаПрава.РФ
            </Text>
          </HStack>
          <Text
            fontSize="2xl"
            fontWeight="semibold"
            bgGradient="to-r"
            gradientFrom="orange.500"
            gradientTo="orange.700"
            bgClip="text"
          >
            Новый пароль
          </Text>
          <Text color="fg.muted" fontSize="md">
            Введите новый пароль для аккаунта {tokenValidation.email}
          </Text>
        </VStack>

        {/* Форма */}
        <Box p={8} borderWidth="1px" borderColor="border" borderRadius="xl" bg="bg.panel" shadow="lg">
          <ResetPasswordForm token={token} />
        </Box>

        {/* Ссылка на вход */}
        <Text fontSize="sm" color="fg.muted" textAlign="center">
          Вспомнили пароль?{' '}
          <Link href="/sign-in">
            <Text as="span" color="accent.fg" fontWeight="medium" textDecoration="underline">
              Войти
            </Text>
          </Link>
        </Text>
      </VStack>
    </Container>
  )
}
