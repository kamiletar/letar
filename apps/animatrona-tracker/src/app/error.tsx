'use client'

import { Box, Button, Center, Heading, Text, VStack } from '@chakra-ui/react'

/** Глобальный error boundary */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Center minH="60vh">
      <VStack gap={4} textAlign="center" p={{ base: 4, md: 8 }}>
        <Box fontSize="5xl">💥</Box>
        <Heading size="lg">Что-то пошло не так</Heading>
        <Text color="fg.muted" maxW={{ base: '90%', md: '400px' }}>
          {error.message || 'Произошла непредвиденная ошибка. Попробуйте обновить страницу.'}
        </Text>
        <Button colorPalette="brand" onClick={reset}>
          Попробовать снова
        </Button>
      </VStack>
    </Center>
  )
}
