'use client'

import { Link } from '@/i18n/navigation'
import { Button, Container, Heading, Spinner, Text, VStack } from '@chakra-ui/react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const token = searchParams?.get('token')

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      // Use setTimeout to defer state update to next tick
      setTimeout(() => {
        setStatus('error')
        setMessage('Токен верификации не найден')
      }, 0)
      return
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch(`/api/auth/verify-email?token=${token}`)
        const data = await response.json()

        if (response.ok) {
          setStatus('success')
          setMessage(data.message || 'Email успешно подтвержден')
        } else {
          setStatus('error')
          setMessage(data.error || 'Ошибка верификации email')
        }
      } catch (error) {
        console.error('Verification error:', error)
        setStatus('error')
        setMessage('Не удалось выполнить верификацию. Попробуйте позже.')
      }
    }

    verifyEmail()
  }, [token])

  return (
    <Container maxW="md" py={12}>
      <VStack gap={8} align="stretch">
        <VStack gap={4}>
          <Heading as="h1" size="2xl" textAlign="center">
            Верификация Email
          </Heading>

          {status === 'loading' && (
            <VStack gap={4} py={8}>
              <Spinner size="xl" color="#CA9E67" />
              <Text color="gray.600">Проверяем ваш email...</Text>
            </VStack>
          )}

          {status === 'success' && (
            <VStack gap={4} py={4}>
              <Text fontSize="4xl" color="green.500">
                ✓
              </Text>
              <Text color="green.600" fontSize="lg" fontWeight="medium">
                {message}
              </Text>
              <Text color="gray.600" textAlign="center">
                Теперь вы можете войти в систему используя свой email и пароль.
              </Text>
              <Button asChild colorPalette="fg" size="lg" mt={4}>
                <Link href="/auth/signin">Войти</Link>
              </Button>
            </VStack>
          )}

          {status === 'error' && (
            <VStack gap={4} py={4}>
              <Text fontSize="4xl" color="red.500">
                ✗
              </Text>
              <Text color="red.600" fontSize="lg" fontWeight="medium">
                {message}
              </Text>
              <Text color="gray.600" textAlign="center" fontSize="sm">
                Если ссылка истекла, вы можете запросить новое письмо при попытке входа.
              </Text>
              <VStack gap={2} mt={4}>
                <Button asChild colorPalette="fg">
                  <Link href="/auth/signin">Перейти ко входу</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/auth/register">Зарегистрироваться заново</Link>
                </Button>
              </VStack>
            </VStack>
          )}
        </VStack>
      </VStack>
    </Container>
  )
}
