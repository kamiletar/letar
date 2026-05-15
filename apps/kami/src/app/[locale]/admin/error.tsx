'use client'

import { Box, Button, Container, Heading, Icon, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { useEffect } from 'react'
import { LuCircleAlert, LuLayoutDashboard, LuRefreshCw } from 'react-icons/lu'

/**
 * Error Boundary для админ-панели Kami
 *
 * Перехватывает ошибки внутри /admin и показывает
 * возможность вернуться на дашборд.
 */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Kami admin error boundary:', error)
  }, [error])

  return (
    <Container maxW="xl" py={20}>
      <VStack gap={6} textAlign="center">
        <Icon color="red.500" boxSize={16}>
          <LuCircleAlert />
        </Icon>

        <Heading size="2xl" color="fg">
          Ошибка в панели администрирования
        </Heading>

        <Text fontSize="lg" color="fg.muted">
          Произошла ошибка при загрузке раздела. Попробуйте обновить или вернуться на дашборд.
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
            <Link href="/admin">
              <Icon>
                <LuLayoutDashboard />
              </Icon>
              Вернуться на дашборд
            </Link>
          </Button>
        </VStack>
      </VStack>
    </Container>
  )
}
