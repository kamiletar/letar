import { LogoIcon } from '@/app/_components/icons/logo-icon'
import { Box, Button, Container, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { LuCircleX } from 'react-icons/lu'
import { verifyEmailAction } from '../_actions/verify-email.action'
import { AutoLogin } from '../_components/auto-login'

interface VerifyEmailPageProps {
  params: Promise<{ token: string }>
}

export default async function VerifyEmailPage({ params }: VerifyEmailPageProps) {
  const { token } = await params

  // Верифицируем токен
  const result = await verifyEmailAction(token)

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
            Подтверждение email
          </Text>
        </VStack>

        {/* Результат верификации */}
        <Box p={8} borderWidth="1px" borderColor="border" borderRadius="xl" bg="bg.panel" shadow="lg">
          <VStack gap={6}>
            {result.success ? (
              // Успешная верификация — автоматический вход
              <AutoLogin email={result.email} autoLoginToken={result.autoLoginToken} />
            ) : (
              // Ошибка верификации
              <>
                <Icon color="error.solid" boxSize={16}>
                  <LuCircleX />
                </Icon>
                <VStack gap={2}>
                  <Text fontSize="xl" fontWeight="semibold" color="error.fg">
                    {result.error === 'TOKEN_NOT_FOUND' && 'Ссылка недействительна'}
                    {result.error === 'TOKEN_EXPIRED' && 'Срок действия ссылки истёк'}
                    {result.error === 'ALREADY_VERIFIED' && 'Email уже подтверждён'}
                    {result.error === 'UNKNOWN_ERROR' && 'Произошла ошибка'}
                  </Text>
                  <Text color="fg.muted" textAlign="center">
                    {result.error === 'TOKEN_NOT_FOUND' &&
                      'Эта ссылка для подтверждения email недействительна. Возможно, она была использована ранее.'}
                    {result.error === 'TOKEN_EXPIRED' &&
                      'Срок действия ссылки истёк. Запросите новую ссылку для подтверждения email.'}
                    {result.error === 'ALREADY_VERIFIED' &&
                      'Ваш email уже был подтверждён ранее. Вы можете войти в свой аккаунт.'}
                    {result.error === 'UNKNOWN_ERROR' &&
                      'Произошла непредвиденная ошибка. Попробуйте позже или обратитесь в поддержку.'}
                  </Text>
                </VStack>
                <VStack gap={3}>
                  {result.error === 'ALREADY_VERIFIED' && (
                    <Link href="/sign-in">
                      <Button colorPalette="brand" size="lg">
                        Войти в аккаунт
                      </Button>
                    </Link>
                  )}
                  {(result.error === 'TOKEN_EXPIRED' || result.error === 'TOKEN_NOT_FOUND') && (
                    <Link href="/sign-up">
                      <Button colorPalette="brand" size="lg">
                        Зарегистрироваться заново
                      </Button>
                    </Link>
                  )}
                  <Link href="/support">
                    <Button variant="outline" size="md">
                      Обратиться в поддержку
                    </Button>
                  </Link>
                </VStack>
              </>
            )}
          </VStack>
        </Box>
      </VStack>
    </Container>
  )
}
