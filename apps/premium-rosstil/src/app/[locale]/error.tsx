'use client'

import { Link } from '@/i18n/navigation'
import { Box, Button, Container, Heading, Text, VStack } from '@chakra-ui/react'
import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Log error to error reporting service
    console.error('Global error boundary caught:', error)
  }, [error])

  return (
    <Container maxW="xl" py={20}>
      <VStack gap={6} textAlign="center">
        <Heading size="2xl" color="red.500">
          Что-то пошло не так
        </Heading>
        <Text fontSize="lg" color="gray.600">
          Произошла непредвиденная ошибка. Мы уже работаем над её исправлением.
        </Text>
        {error.message && (
          <Box bg="red.50" border="1px solid" borderColor="red.200" borderRadius="md" p={4} maxW="full" overflow="auto">
            <Text fontSize="sm" fontFamily="mono" color="red.700">
              {error.message}
            </Text>
          </Box>
        )}
        <VStack gap={3}>
          <Button onClick={reset} colorPalette="fg" size="lg">
            Попробовать снова
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link href="/">Вернуться на главную</Link>
          </Button>
        </VStack>
      </VStack>
    </Container>
  )
}
