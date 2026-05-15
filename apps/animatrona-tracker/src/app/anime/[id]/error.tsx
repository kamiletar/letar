'use client'

import { Box, Button, Center, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'

/** Error boundary для страницы аниме */
export default function AnimeError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Center minH="60vh">
      <VStack gap={4} textAlign="center" p={{ base: 4, md: 8 }}>
        <Box fontSize="5xl">🎬</Box>
        <Heading size="lg">Не удалось загрузить аниме</Heading>
        <Text color="fg.muted" maxW={{ base: '90%', md: '400px' }}>
          {error.message || 'Произошла ошибка при загрузке данных. Возможно, IPFS gateway временно недоступен.'}
        </Text>
        <HStack gap={3}>
          <Button colorPalette="brand" onClick={reset}>
            Попробовать снова
          </Button>
          <Button asChild variant="outline">
            <NextLink href="/anime">Вернуться в каталог</NextLink>
          </Button>
        </HStack>
      </VStack>
    </Center>
  )
}
