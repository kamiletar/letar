'use client'

import { Box, Container, HStack, Link, Text, VStack } from '@chakra-ui/react'
import { BuildVersion, CookieSettingsButton, StudioCredit, TouchLink } from '@letar/ui'
import packageJson from '../../../package.json'

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
            <TouchLink href="/privacy" color="gray.500" fontSize="sm" _hover={{ color: 'white' }}>
              Конфиденциальность
            </TouchLink>
          </HStack>

          <HStack gap={3} flexWrap="wrap" justify="center">
            <Text color="gray.600" fontSize="xs">
              © {currentYear} Animatrona. Сделано с ❤️ для аниме-сообщества.
            </Text>
            <StudioCredit app="animatrona-landing" color="gray.600" />
            <BuildVersion version={packageJson.version} color="gray.600" />
            <CookieSettingsButton appKey="animatrona-landing" />
          </HStack>
        </VStack>
      </Container>
    </Box>
  )
}
