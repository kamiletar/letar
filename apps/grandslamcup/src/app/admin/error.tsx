'use client'

import { Button, Center, Heading, Text, VStack } from '@chakra-ui/react'

export default function AdminError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <Center minH="60vh">
      <VStack gap={4} textAlign="center">
        <Heading size="lg">Ошибка</Heading>
        <Text color="fg.muted">{error.message || 'Произошла ошибка при загрузке данных.'}</Text>
        <Button colorPalette="brand" onClick={reset}>
          Попробовать снова
        </Button>
      </VStack>
    </Center>
  )
}
