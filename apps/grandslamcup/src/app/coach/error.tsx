'use client'

import { Button, Center, Heading, Text, VStack } from '@chakra-ui/react'

export default function CoachError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <Center minH="60vh">
      <VStack gap={4} textAlign="center">
        <Heading size="lg">Что-то пошло не так</Heading>
        <Text color="fg.muted">{error.message || 'Не удалось загрузить страницу. Попробуйте обновить.'}</Text>
        <Button colorPalette="teal" onClick={reset}>
          Попробовать снова
        </Button>
      </VStack>
    </Center>
  )
}
