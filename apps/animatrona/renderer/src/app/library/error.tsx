'use client'

/**
 * Error Boundary для страницы библиотеки
 *
 * Решает React error #310 ("Rendered more hooks than during the previous render")
 * через key-перемонтировку: при retry создаётся НОВЫЙ экземпляр компонента,
 * а не ререндер старого со сломанным счётчиком хуков.
 *
 * Автоматически пытается восстановиться один раз перед показом ошибки.
 */

import { Box, Button, Card, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LuHouse, LuRefreshCw, LuTriangleAlert } from 'react-icons/lu'

interface LibraryErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function LibraryError({ error, reset }: LibraryErrorProps) {
  const [retryCount, setRetryCount] = useState(0)
  const autoRetried = useRef(false)

  // Автоматическая первая попытка восстановления
  useEffect(() => {
    if (autoRetried.current) {
      return
    }
    autoRetried.current = true
    console.warn('[Library] Автоматическая попытка восстановления после ошибки:', error.message)
    // Небольшая задержка перед retry — даёт React время очистить внутреннее состояние
    const timer = setTimeout(() => {
      setRetryCount((c) => c + 1)
      reset()
    }, 100)
    return () => clearTimeout(timer)
  }, [error, reset])

  const handleRetry = useCallback(() => {
    setRetryCount((c) => c + 1)
    reset()
  }, [reset])

  // Логируем ошибку
  useEffect(() => {
    console.error(`[Library] Ошибка (попытка ${retryCount}):`, error)
  }, [error, retryCount])

  // Если это автоматическая первая попытка — показываем кратковременный спиннер
  if (!autoRetried.current || retryCount < 1) {
    return null
  }

  return (
    <Box minH="60vh" display="flex" alignItems="center" justifyContent="center" p={8}>
      <Card.Root maxW="md" bg="bg.panel" border="1px" borderColor="border.subtle">
        <Card.Body>
          <VStack gap={6} align="center" textAlign="center">
            <Box p={4} borderRadius="full" bg="red.subtle">
              <LuTriangleAlert size={48} color="var(--chakra-colors-red-solid)" />
            </Box>

            <VStack gap={2}>
              <Heading size="lg">Не удалось загрузить библиотеку</Heading>
              <Text color="fg.muted">Произошла ошибка при загрузке страницы. Попробуйте обновить.</Text>
            </VStack>

            <Box w="full" p={3} bg="bg.muted" borderRadius="md">
              <Text fontSize="xs" color="fg.subtle" fontFamily="mono">
                {error.message || 'Неизвестная ошибка'}
              </Text>
            </Box>

            <HStack gap={3}>
              <Button variant="outline" onClick={() => (window.location.href = '/')}>
                <LuHouse />
                На главную
              </Button>
              <Button colorPalette="purple" onClick={handleRetry}>
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
