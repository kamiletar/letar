'use client'

import { Box, Button, Center, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'

/** Error boundary для плеера */
export default function PlayerError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Center minH="100vh" bg="black" color="white">
      <VStack gap={4} textAlign="center" p={{ base: 4, md: 8 }}>
        <Box fontSize="5xl">📺</Box>
        <Heading size="lg">Ошибка воспроизведения</Heading>
        <Text color="whiteAlpha.700" maxW={{ base: '90%', md: '400px' }}>
          {error.message || 'Не удалось загрузить видео. Попробуйте обновить страницу или выбрать другой эпизод.'}
        </Text>
        <HStack gap={3}>
          <Button colorPalette="brand" onClick={reset}>
            Попробовать снова
          </Button>
          <Button asChild variant="outline" borderColor="whiteAlpha.300" color="white">
            <NextLink href="/anime">В каталог</NextLink>
          </Button>
        </HStack>
      </VStack>
    </Center>
  )
}
