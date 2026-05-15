'use client'

/**
 * Error Boundary для страницы транскодирования
 *
 * Ловит ошибки и позволяет пользователю попробовать снова
 */

import { Box, Button, Card, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { useEffect } from 'react'
import { LuRefreshCw, LuTriangleAlert } from 'react-icons/lu'

interface TranscodeErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function TranscodeError({ error, reset }: TranscodeErrorProps) {
  useEffect(() => {
    // Логируем ошибку для отладки
    console.error('[Transcode] Page error:', error)
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
              <Heading size="lg">Ошибка загрузки</Heading>
              <Text color="fg.muted">Не удалось загрузить страницу очереди кодирования</Text>
            </VStack>

            {/* Детали ошибки (для отладки) */}
            <Box w="full" p={3} bg="bg.muted" borderRadius="md">
              <Text fontSize="xs" color="fg.subtle" fontFamily="mono">
                {error.message || 'Неизвестная ошибка'}
              </Text>
            </Box>

            {/* Действия */}
            <HStack gap={3}>
              <Button variant="outline" onClick={() => window.location.reload()}>
                <LuRefreshCw />
                Перезагрузить страницу
              </Button>
              <Button colorPalette="purple" onClick={reset}>
                Попробовать снова
              </Button>
            </HStack>
          </VStack>
        </Card.Body>
      </Card.Root>
    </Box>
  )
}
