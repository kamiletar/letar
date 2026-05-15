import { Box, Button, Center, Heading, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'

/** Кастомная 404 страница */
export default function NotFound() {
  return (
    <Center minH="60vh">
      <VStack gap={4} textAlign="center" p={8}>
        <Box fontSize="6xl">🔍</Box>
        <Heading size="2xl">404</Heading>
        <Heading size="md">Страница не найдена</Heading>
        <Text color="fg.muted" maxW="400px">
          Запрашиваемая страница не существует или была удалена.
        </Text>
        <Button asChild colorPalette="brand">
          <NextLink href="/">На главную</NextLink>
        </Button>
      </VStack>
    </Center>
  )
}
