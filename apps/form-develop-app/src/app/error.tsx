'use client'

import { Box, Button, Code, Heading, Text, VStack } from '@chakra-ui/react'
import { useEffect } from 'react'

/**
 * Error boundary для form-develop-app
 * Обрабатывает runtime ошибки и показывает fallback UI
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Логируем ошибку в консоль для отладки
    console.error('Form Develop App Error:', error)
  }, [error])

  return (
    <Box p={8} maxW="600px" mx="auto">
      <VStack gap={6} align="stretch">
        <Heading size="lg" color="red.500">
          Произошла ошибка
        </Heading>

        <Text color="fg.muted">Что-то пошло не так при рендеринге страницы. Попробуйте перезагрузить.</Text>

        <Box
          p={4}
          bg="red.50"
          borderRadius="md"
          borderWidth="1px"
          borderColor="red.200"
          _dark={{ bg: 'red.900/20', borderColor: 'red.700' }}
        >
          <Text fontWeight="bold" mb={2}>
            Детали ошибки:
          </Text>
          <Code display="block" whiteSpace="pre-wrap" p={2} bg="white" borderRadius="sm" _dark={{ bg: 'gray.900' }}>
            {error.message}
          </Code>
          {error.digest && (
            <Text fontSize="xs" color="fg.muted" mt={2}>
              Error Digest: {error.digest}
            </Text>
          )}
        </Box>

        <Button colorPalette="blue" onClick={reset}>
          Попробовать снова
        </Button>
      </VStack>
    </Box>
  )
}
