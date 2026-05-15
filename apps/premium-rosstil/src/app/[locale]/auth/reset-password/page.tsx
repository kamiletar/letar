import { Alert, Card, Container, Heading, Link, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { ResetPasswordForm } from './_components/reset-password-form'

export const metadata = {
  title: 'Сброс пароля — Премиум РосСтиль',
  description: 'Установка нового пароля',
}

interface PageProps {
  searchParams: Promise<{ token?: string }>
}

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const params = await searchParams
  const token = params.token

  if (!token) {
    return (
      <Container maxW="container.sm" py={20}>
        <VStack gap={8}>
          <Heading size="2xl">Ошибка</Heading>

          <Alert.Root status="error">
            <Alert.Title>Отсутствует токен восстановления</Alert.Title>
            <Alert.Description>
              Перейдите по ссылке из письма или{' '}
              <Link asChild color="fg" fontWeight="semibold">
                <NextLink href="/auth/forgot-password">запросите новую ссылку</NextLink>
              </Link>
            </Alert.Description>
          </Alert.Root>
        </VStack>
      </Container>
    )
  }

  return (
    <Container maxW="container.sm" py={20}>
      <VStack gap={8}>
        <VStack gap={4} textAlign="center">
          <Heading size="2xl">Сброс пароля</Heading>
          <Text color="fg.muted">Введите новый пароль для вашего аккаунта</Text>
        </VStack>

        <Card.Root width="full">
          <Card.Body>
            <ResetPasswordForm token={token} />
          </Card.Body>
        </Card.Root>

        <Text fontSize="sm" color="fg.muted">
          Вспомнили пароль?{' '}
          <Link asChild color="fg" fontWeight="semibold">
            <NextLink href="/auth/signin">Войти</NextLink>
          </Link>
        </Text>
      </VStack>
    </Container>
  )
}
