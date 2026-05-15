import { Link } from '@/i18n/navigation'
import { Container, Heading, Text, VStack } from '@chakra-ui/react'
import { RegisterForm } from './_components/register-form'

export const metadata = {
  title: 'Регистрация — Premium РосСтиль',
  description: 'Создайте аккаунт в Premium РосСтиль',
}

export default function RegisterPage() {
  return (
    <Container maxW="md" py={12}>
      <VStack gap={8} align="stretch">
        <VStack gap={2}>
          <Heading as="h1" size="2xl" textAlign="center">
            Регистрация
          </Heading>
          <Text color="gray.600" textAlign="center">
            Создайте аккаунт, чтобы получить доступ к личному кабинету
          </Text>
        </VStack>

        <RegisterForm />

        <Text textAlign="center" fontSize="sm" color="gray.600">
          Уже есть аккаунт?{' '}
          <Link href="/auth/signin" style={{ color: '#CA9E67' }}>
            Войти
          </Link>
        </Text>
      </VStack>
    </Container>
  )
}
