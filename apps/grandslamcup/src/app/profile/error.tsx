'use client'

import { Button, Center, Heading, Text, VStack } from '@chakra-ui/react'

export default function ProfileError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <Center minH="60vh">
      <VStack gap={4} textAlign="center">
        <Heading size="lg">Ошибка загрузки профиля</Heading>
        <Text color="fg.muted">{error.message || 'Не удалось загрузить профиль. Попробуйте обновить.'}</Text>
        <Button colorPalette="brand" onClick={reset}>
          Попробовать снова
        </Button>
      </VStack>
    </Center>
  )
}
