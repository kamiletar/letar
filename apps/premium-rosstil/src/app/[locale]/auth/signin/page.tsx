import { Box, Container, Heading, Separator, Stack, Text, VStack } from '@chakra-ui/react'
import { OAuthButtons } from './_components/oauth-buttons'
import { SignInForm } from './_components/signin-form'
import { TelegramLoginButton } from './_components/telegram-login-button'

export default function SignIn() {
  const telegramBotUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME

  return (
    <Container maxW="md" py={20}>
      <VStack gap={8}>
        <Box textAlign="center">
          <Heading size="2xl" mb={4}>
            Войти
          </Heading>
          <Text color="fg.muted">Войдите, чтобы получить доступ к личному кабинету</Text>
        </Box>

        <VStack w="full" gap={4}>
          <SignInForm />

          {/* OAuth кнопки — клиентский компонент для правильных POST запросов */}
          <OAuthButtons />

          {telegramBotUsername && (
            <>
              <Separator />

              <Stack w="full" align="center">
                <TelegramLoginButton botUsername={telegramBotUsername} />
              </Stack>
            </>
          )}
        </VStack>
      </VStack>
    </Container>
  )
}
