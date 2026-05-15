import { Card, Container, Heading, Link, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { ForgotPasswordForm } from './_components/forgot-password-form'

export const metadata = {
  title: 'Восстановление пароля — Премиум РосСтиль',
  description: 'Восстановление доступа к аккаунту',
}

export default function ForgotPasswordPage() {
  return (
    <Container maxW="container.sm" py={20}>
      <VStack gap={8}>
        <VStack gap={4} textAlign="center">
          <Heading size="2xl">Восстановление пароля</Heading>
          <Text color="fg.muted">Введите email, использованный при регистрации</Text>
        </VStack>

        <Card.Root width="full">
          <Card.Body>
            <ForgotPasswordForm />
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
