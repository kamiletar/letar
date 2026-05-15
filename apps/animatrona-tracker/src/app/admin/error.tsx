'use client'

import { Box, Button, Center, Heading, Text, VStack } from '@chakra-ui/react'

/** Error boundary для админ-панели */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Center minH="60vh">
      <VStack gap={4} textAlign="center" p={{ base: 4, md: 8 }}>
        <Box fontSize="5xl">⚙️</Box>
        <Heading size="lg">Ошибка админ-панели</Heading>
        <Text color="fg.muted" maxW={{ base: '90%', md: '400px' }}>
          {error.message || 'Произошла ошибка при загрузке данных админ-панели.'}
        </Text>
        <Button colorPalette="brand" onClick={reset}>
          Попробовать снова
        </Button>
      </VStack>
    </Center>
  )
}
