'use client'

import { Box, Button, Container, Heading, Icon, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { useEffect } from 'react'
import { LuCircleAlert, LuHouse, LuRefreshCw } from 'react-icons/lu'

/**
 * Глобальный Error Boundary для Kami
 *
 * Перехватывает необработанные ошибки на уровне [locale].
 * Показывает пользователю UI с возможностью повторить или вернуться на главную.
 */
export default function LocaleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Kami error boundary:', error)
  }, [error])

  return (
    <Container maxW="xl" py={20}>
      <VStack gap={6} textAlign="center">
        <Icon color="red.500" boxSize={16}>
          <LuCircleAlert />
        </Icon>

        <Heading size="2xl" color="fg">
          Что-то пошло не так
        </Heading>

        <Text fontSize="lg" color="fg.muted">
          Произошла непредвиденная ошибка. Попробуйте обновить страницу или вернуться на главную.
        </Text>

        {process.env.NODE_ENV === 'development' && error.message && (
          <Box
            p={4}
            maxW="full"
            overflow="auto"
            borderRadius="lg"
            bg="bg.code"
            color="gray.100"
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

        <VStack gap={3} pt={4}>
          <Button onClick={reset} colorPalette="fg" size="lg">
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
