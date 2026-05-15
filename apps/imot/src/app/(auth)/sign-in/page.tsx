import { signInWithProviderAction } from '@/app/_actions/auth.actions'
import { AuthButton } from '@/app/_components/auth-button'
import { ImotLogo } from '@/app/_components/imot-logo'
import { Box, Container, HStack, Separator, Stack, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { FaYandex } from 'react-icons/fa'
import { RiGoogleFill } from 'react-icons/ri'
import { SignInForm } from './_components/signin-form'

export default function SignInPage() {
  return (
    <Container maxW="md" py={12}>
      <VStack gap={8} align="stretch">
        {/* Логотип IMOT */}
        <Box display="flex" justifyContent="center" mb={4}>
          <ImotLogo size="lg" animated />
        </Box>

        {/* Заголовок */}
        <VStack gap={2} textAlign="center">
          <Text
            fontSize="3xl"
            fontWeight="bold"
            bgGradient="to-r"
            gradientFrom="purple.500"
            gradientTo="purple.700"
            bgClip="text"
          >
            Добро пожаловать
          </Text>
          <Text color="fg.muted" fontSize="md">
            Войдите в систему для продолжения
          </Text>
        </VStack>

        {/* Форма входа */}
        <Box p={8} borderWidth="1px" borderColor="border" borderRadius="xl" bg="bg.panel" shadow="lg">
          <Stack gap={6}>
            {/* Форма входа по email/паролю */}
            <SignInForm />

            {/* Разделитель */}
            <HStack gap={4}>
              <Separator flex="1" />
              <Text fontSize="sm" color="fg.muted" whiteSpace="nowrap">
                Или войдите через
              </Text>
              <Separator flex="1" />
            </HStack>

            {/* OAuth провайдеры */}
            <Stack gap={3}>
              {/* Google */}
              <form action={signInWithProviderAction.bind(null, 'google')}>
                <AuthButton provider="google" icon={<RiGoogleFill />} type="submit">
                  Войти через Google
                </AuthButton>
              </form>

              {/* Yandex */}
              <form action={signInWithProviderAction.bind(null, 'yandex')}>
                <AuthButton provider="yandex" icon={<FaYandex />} type="submit">
                  Войти через Яндекс
                </AuthButton>
              </form>

              {/* Telegram — TODO: адаптировать для Better Auth */}
              {/*
              <form action={signInWithProviderAction.bind(null, 'telegram')}>
                <AuthButton provider="telegram" icon={<RiTelegramFill />} type="submit">
                  Войти через Telegram
                </AuthButton>
              </form>
              */}
            </Stack>
          </Stack>
        </Box>

        {/* Описание методики */}
        <Box p={6} bg="purple.50" borderRadius="lg" borderWidth="1px" borderColor="purple.200">
          <VStack gap={3} align="start">
            <Text fontWeight="semibold" color="purple.900">
              О методике ИМОТ:
            </Text>
            <Text fontSize="sm" color="purple.800">
              Авторская терапевтическая коучинговая методология Елены Рос для комплексной трансформации личности на всех
              уровнях: нумерология, нейропсихология, энергетика, тело и стиль.
            </Text>
          </VStack>
        </Box>

        {/* Ссылка на регистрацию */}
        <Text fontSize="sm" color="fg.muted" textAlign="center">
          Нет аккаунта?{' '}
          <Link href="/sign-up">
            <Text as="span" color="purple.600" fontWeight="medium" textDecoration="underline">
              Зарегистрироваться
            </Text>
          </Link>
        </Text>
      </VStack>
    </Container>
  )
}
