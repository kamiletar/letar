'use client'

import { Link } from '@/i18n/navigation'
import { Box, Button, Container, Heading, Text, VStack } from '@chakra-ui/react'
import { useEffect } from 'react'

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Admin panel error:', error)
  }, [error])

  return (
    <Container maxW="7xl" py={20}>
      <VStack gap={6} textAlign="center">
        <Heading size="xl" color="red.500">
          Ошибка в панели администратора
        </Heading>
        <Text fontSize="lg" color="gray.600">
          Произошла ошибка при работе с административной панелью.
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
            <Link href="/admin">Вернуться в админ панель</Link>
          </Button>
        </VStack>
      </VStack>
    </Container>
  )
}
