import { Box, Heading, Link, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'

/**
 * 404 страница для form-develop-app
 */
export default function NotFound() {
  return (
    <Box p={8} maxW="600px" mx="auto" textAlign="center">
      <VStack gap={6}>
        <Heading size="xl" color="fg.muted">
          404
        </Heading>

        <Heading size="lg">Страница не найдена</Heading>

        <Text color="fg.muted">Демо-страница, которую вы ищете, не существует или была перемещена.</Text>

        <Link asChild colorPalette="blue">
          <NextLink href="/">← Вернуться на главную</NextLink>
        </Link>
      </VStack>
    </Box>
  )
}
