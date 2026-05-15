'use client'

import { Box, Button, Container, Heading, Icon, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { useEffect } from 'react'
import { LuCircleAlert, LuHouse, LuRefreshCw } from 'react-icons/lu'

/**
 * Глобальный Error Boundary для приложения
 *
 * Перехватывает необработанные ошибки на уровне приложения.
 * Показывает пользователю информативный UI с возможностью:
 * - Попробовать снова (reset)
 * - Вернуться на главную
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Логируем ошибку для отладки
    console.error('Global error boundary caught:', error)
  }, [error])

  return (
    <Container maxW="xl" py={20}>
      <VStack gap={6} textAlign="center">
        {/* Иконка ошибки */}
        <Icon color="red.500" boxSize={16}>
          <LuCircleAlert />
        </Icon>

        {/* Заголовок */}
        <Heading size="2xl" color="fg">
          Что-то пошло не так
        </Heading>

        {/* Описание */}
        <Text fontSize="lg" color="fg.muted">
          Произошла непредвиденная ошибка. Попробуйте обновить страницу или вернуться на главную.
        </Text>

        {/* Детали ошибки (только в dev) */}
        {process.env.NODE_ENV === 'development' && error.message && (
          <Box
            layerStyle="panel.error"
            p={4}
            maxW="full"
            overflow="auto"
            borderRadius="lg"
            role="alert"
            aria-live="polite"
          >
            <Text fontSize="sm" fontFamily="mono">
              {error.message}
            </Text>
            {error.digest && (
              <Text fontSize="xs" color="fg.muted" mt={2}>
                Digest: {error.digest}
              </Text>
            )}
          </Box>
        )}

        {/* Действия */}
        <VStack gap={3} pt={4}>
          <Button onClick={reset} colorPalette="brand" size="lg">
            <Icon>
              <LuRefreshCw />
            </Icon>
            Попробовать снова
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link href="/">
              <Icon>
                <LuHouse />
              </Icon>
              Вернуться на главную
            </Link>
          </Button>
        </VStack>
      </VStack>
    </Container>
  )
}
