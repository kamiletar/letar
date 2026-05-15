'use client'

import { Link } from '@/i18n/navigation'
import { Box, Button, Container, Heading, Icon, Text, VStack } from '@chakra-ui/react'
import { LuLock, LuLogIn, LuUserPlus } from 'react-icons/lu'

/**
 * Компонент уведомления о необходимости авторизации для просмотра каталога
 */
export function AuthRequiredNotice() {
  return (
    <Container maxW="lg" py={20}>
      <VStack gap={8} textAlign="center">
        <Box p={6} borderRadius="full" bg="fg.muted/10">
          <Icon as={LuLock} boxSize={16} color="fg" />
        </Box>

        <VStack gap={4}>
          <Heading size="2xl">Добро пожаловать в наш каталог</Heading>

          <Text fontSize="lg" color="fg.muted" maxW="md">
            Для просмотра эксклюзивной коллекции дизайнерской одежды от Елены Аксяновой необходимо представиться.
            Пожалуйста, войдите в аккаунт или зарегистрируйтесь.
          </Text>
        </VStack>

        <VStack gap={4} w="full" maxW="sm">
          <Button asChild size="xl" w="full" colorPalette="fg" data-testid="signin-button">
            <Link href="/auth/signin">
              <Icon as={LuLogIn} />
              Войти
            </Link>
          </Button>

          <Button asChild size="xl" w="full" variant="outline" colorPalette="fg" data-testid="register-button">
            <Link href="/auth/register">
              <Icon as={LuUserPlus} />
              Зарегистрироваться
            </Link>
          </Button>
        </VStack>

        <Text fontSize="sm" color="fg.muted">
          Регистрация займёт всего минуту и откроет доступ к полной коллекции
        </Text>
      </VStack>
    </Container>
  )
}
