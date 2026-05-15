import { LogoIcon } from '@/app/_components/icons/logo-icon'
import { Box, Container, HStack, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { ForgotPasswordForm } from './_components/forgot-password-form'

interface ForgotPasswordPageProps {
  searchParams: Promise<{ email?: string }>
}

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const { email } = await searchParams

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
            Восстановление пароля
          </Text>
          <Text color="fg.muted" fontSize="md">
            Введите email для получения ссылки на сброс пароля
          </Text>
        </VStack>

        {/* Форма */}
        <Box p={8} borderWidth="1px" borderColor="border" borderRadius="xl" bg="bg.panel" shadow="lg">
          <ForgotPasswordForm defaultEmail={email} />
        </Box>

        {/* Ссылка на вход */}
        <Text fontSize="sm" color="fg.muted" textAlign="center">
          Вспомнили пароль?{' '}
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
