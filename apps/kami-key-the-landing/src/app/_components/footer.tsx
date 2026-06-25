'use client'

import { Box, Container, Flex, HStack, Text } from '@chakra-ui/react'
import { BuildVersion, StudioCredit } from '@letar/ui'
import { FaGithub, FaKeyboard } from 'react-icons/fa6'
import { LuExternalLink } from 'react-icons/lu'
import packageJson from '../../../package.json'

/**
 * Футер лендинга
 * Логотип, слоган, ссылки — Server Component
 */
export function Footer() {
  return (
    <Box as="footer" borderTop="1px solid rgba(57, 255, 20, 0.1)" py={{ base: 8, md: 12 }} mt={{ base: 8, md: 16 }}>
      <Container maxW="5xl" px={{ base: 4, md: 8 }}>
        <Flex direction={{ base: 'column', md: 'row' }} align="center" justify="space-between" gap={{ base: 6, md: 4 }}>
          {/* Левая часть — логотип и слоган */}
          <Flex direction="column" align={{ base: 'center', md: 'flex-start' }} gap={2}>
            <HStack gap={2}>
              <FaKeyboard size={16} color="#4dff7a" />
              <Text className="font-mono" fontSize="md" fontWeight="700" color="gray.200">
                KamiKeyThe
              </Text>
            </HStack>
            <Text fontSize="xs" color="gray.500">
              Сделано с {'\u2328\uFE0F'} для тех, кто ценит типографику
            </Text>
          </Flex>

          {/* Правая часть — ссылки */}
          <HStack gap={4}>
            <Box
              display="inline-flex"
              alignItems="center"
              gap={1.5}
              fontSize="xs"
              color="gray.500"
              className="font-mono"
              transition="color 0.2s ease"
              _hover={{ color: 'brand.400' }}
              asChild
            >
              <a href="#" aria-label="GitHub (скоро)">
                <FaGithub size={14} />
                GitHub
              </a>
            </Box>
            <Box
              display="inline-flex"
              alignItems="center"
              gap={1.5}
              fontSize="xs"
              color="gray.500"
              className="font-mono"
              transition="color 0.2s ease"
              _hover={{ color: 'brand.400' }}
              asChild
            >
              <a href="https://letar.best" target="_blank" rel="noopener noreferrer">
                Letar.best
                <LuExternalLink size={12} />
              </a>
            </Box>
          </HStack>
        </Flex>

        {/* Копирайт */}
        <HStack justify="center" gap={4} mt={6} flexWrap="wrap">
          <Text fontSize="xs" color="gray.600" className="font-mono">
            {'\u00A9'} 2026 KamiKeyThe
          </Text>
          <StudioCredit app="kami-key-the-landing" color="gray.600" />
          <BuildVersion version={packageJson.version} color="gray.600" />
        </HStack>
      </Container>
    </Box>
  )
}
