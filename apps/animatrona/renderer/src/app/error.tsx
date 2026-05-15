'use client'

/**
 * Глобальный Error Boundary для приложения
 *
 * Ловит ошибки во всех страницах и позволяет recovery
 */

import { Box, Button, Card, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { useEffect } from 'react'
import { LuHouse, LuRefreshCw, LuTriangleAlert } from 'react-icons/lu'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Логируем ошибку для отладки
    console.error('[App] Global error:', error)
  }, [error])

  return (
    <Box minH="100vh" bg="bg" display="flex" alignItems="center" justifyContent="center" p={8}>
      <Card.Root maxW="md" bg="bg.panel" border="1px" borderColor="border.subtle">
        <Card.Body>
          <VStack gap={6} align="center" textAlign="center">
            {/* Иконка ошибки */}
            <Box p={4} borderRadius="full" bg="red.subtle">
              <LuTriangleAlert size={48} color="var(--chakra-colors-red-solid)" />
            </Box>

            {/* Заголовок */}
            <VStack gap={2}>
              <Heading size="lg">Что-то пошло не так</Heading>
              <Text color="fg.muted">Произошла непредвиденная ошибка</Text>
            </VStack>

            {/* Детали ошибки (для отладки) */}
            <Box w="full" p={3} bg="bg.muted" borderRadius="md">
              <Text fontSize="xs" color="fg.subtle" fontFamily="mono">
                {error.message || 'Неизвестная ошибка'}
              </Text>
            </Box>

            {/* Действия */}
            <HStack gap={3}>
              <Button variant="outline" onClick={() => (window.location.href = '/')}>
                <LuHouse />
                На главную
              </Button>
              <Button colorPalette="purple" onClick={reset}>
                <LuRefreshCw />
                Попробовать снова
              </Button>
            </HStack>
          </VStack>
        </Card.Body>
      </Card.Root>
    </Box>
  )
}
