'use client'

import { Box, Container, HStack, Link, Text, VStack } from '@chakra-ui/react'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <Box as="footer" py={8} borderTop="1px solid" borderColor="gray.800">
      <Container maxW="container.xl">
        <VStack gap={4}>
          <HStack gap={6} wrap="wrap" justify="center">
            <Link
              href="https://github.com/kamiletar/letar/tree/main/apps/animatrona"
              target="_blank"
              rel="noopener noreferrer"
              color="gray.500"
              fontSize="sm"
              _hover={{ color: 'white' }}
            >
              GitHub
            </Link>
            <Link
              href="https://github.com/kamiletar/letar/releases"
              target="_blank"
              rel="noopener noreferrer"
              color="gray.500"
              fontSize="sm"
              _hover={{ color: 'white' }}
            >
              Релизы
            </Link>
            <Link
              href="https://github.com/kamiletar/letar/issues"
              target="_blank"
              rel="noopener noreferrer"
              color="gray.500"
              fontSize="sm"
              _hover={{ color: 'white' }}
            >
              Сообщить о баге
            </Link>
            <Link
              href="https://github.com/kamiletar/letar/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              color="gray.500"
              fontSize="sm"
              _hover={{ color: 'white' }}
            >
              Лицензия MIT
            </Link>
          </HStack>

          <Text color="gray.600" fontSize="xs">
            © {currentYear} Animatrona. Сделано с ❤️ для аниме-сообщества.
          </Text>
        </VStack>
      </Container>
    </Box>
  )
}
